#!/usr/bin/env bun
/**
 * migrate-blocks.ts — Reconcile `blocks` frontmatter against `dependsOn`
 *
 * MDT-189 TASK-migration. One-shot. After this script runs (with --write),
 * every ticket's `blocks` field equals the sorted inverse of all `dependsOn`
 * edges pointing at it. Per architecture D2, the script writes via direct
 * frontmatter rewrite (mirrors scripts/sync-dates.ts), NOT through
 * TicketService (which now rejects direct blocks writes — that's the point).
 *
 * The script is dry-run by default. --write applies the changes; --yes
 * skips the interactive contradiction prompt using the documented default
 * (keep dependsOn, drop contradicted blocks).
 *
 * Usage:
 *   bun scripts/migrate-blocks.ts                  # dry run, print report
 *   bun scripts/migrate-blocks.ts --write          # apply, prompt per contradiction
 *   bun scripts/migrate-blocks.ts --write --yes    # apply, no prompts (CI)
 *
 * Exit codes:
 *   0 — dry-run completed, or write completed cleanly
 *   1 — write was aborted (operator answered n/EOF to a contradiction prompt,
 *       or no terminal available and --yes was not passed)
 *
 * Output report: docs/CRs/MDT-189/blocks-migration-report.md (always written,
 * even in dry-run, so it can be reviewed before the real run).
 */

import type { MigrationChange } from './lib/migrate-blocks.js'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import {
  applyChangeToBlocks,
  computeMigrationPlan,

  verifyInvariant,
} from './lib/migrate-blocks.js'

// ── Flag parsing ───────────────────────────────────────────────────────

const args = process.argv.slice(2)
const doWrite = args.includes('--write')
const assumeYes = args.includes('--yes')

if (args.includes('--help') || args.includes('-h')) {
  console.log(`migrate-blocks.ts — reconcile blocks := inverse(dependsOn)

Usage:
  bun scripts/migrate-blocks.ts                # dry run, print report
  bun scripts/migrate-blocks.ts --write        # apply, prompt per contradiction
  bun scripts/migrate-blocks.ts --write --yes  # apply non-interactively (CI)

Flags:
  --write  Apply the changes to docs/CRs/*.md (default is dry-run).
  --yes    With --write, assume the documented default for every contradiction
           (keep dependsOn, drop the contradicted blocks entry). Required for
           non-interactive runs (CI).
  --help   Show this help.`)
  process.exit(0)
}

// ── Helpers ────────────────────────────────────────────────────────────

const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()

interface ReadTicket {
  code: string
  filePath: string
  dependsOn: string[]
  blocks: string[]
  status: string
  type: string
  title: string
}

async function loadAllTickets(): Promise<{ projectCode: string, tickets: ReadTicket[] }[]> {
  const projectService = new ProjectService(true)
  const projects = await projectService.getAllProjects(true)

  const result: { projectCode: string, tickets: ReadTicket[] }[] = []
  for (const project of projects) {
    const ticketsPath = path.join(project.project.path, project.project.ticketsPath)
    if (!fs.existsSync(ticketsPath))
      continue

    const tickets = await MarkdownService.scanMarkdownFiles(
      ticketsPath,
      project.project.path,
    )
    result.push({
      projectCode: project.project.code,
      tickets: tickets.map(t => ({
        code: t.code,
        filePath: t.filePath,
        dependsOn: t.dependsOn ?? [],
        blocks: t.blocks ?? [],
        status: t.status,
        type: t.type,
        title: t.title,
      })),
    })
  }
  return result
}

/**
 * Read a ticket file's raw content, replace the `blocks:` line (or add it if
 * absent), and return the new content. Does NOT write — the caller writes.
 *
 * Empty blocks array removes the line entirely (per MarkdownService
 * generateYamlFrontmatter convention: empty arrays are omitted, not emitted
 * as `blocks: []`).
 */
function rewriteBlocksField(content: string, newBlocks: string[]): string {
  const lines = content.split('\n')
  let inFrontmatter = false
  let frontmatterEnd = -1

  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true
      }
      else {
        frontmatterEnd = i
        break
      }
    }
  }

  if (frontmatterEnd === -1)
    return content // no frontmatter; bail

  // Find existing blocks line, replace or remove.
  for (let i = 0; i < frontmatterEnd; i++) {
    if (/^blocks:\s*(?:\S.*|[\t\v\f \xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF])$/.test(lines[i]!)) {
      if (newBlocks.length === 0) {
        lines.splice(i, 1)
      }
      else {
        lines[i] = `blocks: ${newBlocks.join(', ')}`
      }
      return lines.join('\n')
    }
  }

  // No existing blocks line — insert only if non-empty.
  if (newBlocks.length > 0) {
    lines.splice(frontmatterEnd, 0, `blocks: ${newBlocks.join(', ')}`)
  }
  return lines.join('\n')
}

/**
 * Interactive contradiction prompt. Reads a single y/n from stdin.
 *
 * Returns:
 *   - `true`   for "yes, keep dependsOn, drop blocks" (the documented default)
 *   - `false`  for "no/EOF" (operator declined — abort this project)
 *   - `'skip'` for "dry-run, or non-interactive without --yes" — record the
 *              contradiction in the report but don't actually decide it.
 *              The write step is skipped for this ticket either way.
 *
 * The hard-abort case (non-TTY + --write + no --yes) is the only path that
 * exits the process; it happens before any writes, and the caller has the
 * chance to write the partial report first by signaling via the return.
 */
function promptContradiction(
  change: MigrationChange,
  target: string,
): boolean | 'skip' {
  // Dry-run: never prompt. Record and move on so the full report renders.
  if (!doWrite)
    return 'skip'

  if (!process.stdin.isTTY && !assumeYes) {
    console.error(
      `\n❌ Non-interactive stdin and --yes not set; cannot decide contradiction `
      + `${change.ticketCode} ↔ ${target} during a --write run. Re-run with --yes `
      + `to apply the documented default (keep dependsOn, drop blocks).`,
    )
    return false
  }
  if (assumeYes)
    return true

  process.stdout.write(
    `\n⚠️  ${change.ticketCode} both dependsOn and blocks ${target}. `
    + `Keep dependsOn, drop blocks? [y/N] `,
  )
  const answer = fs.readFileSync(0, 'utf8').trim().toLowerCase()
  return answer === 'y' || answer === 'yes'
}

// ── Main ───────────────────────────────────────────────────────────────

console.log(`\n📋 blocks migration (MDT-189)`)
console.log(`   Mode: ${doWrite ? '✏️  WRITE' : '👁  DRY RUN (--write to apply)'}\n`)

const allProjectTickets = await loadAllTickets()

if (allProjectTickets.length === 0) {
  console.log('No projects or tickets found. Nothing to do.\n')
  process.exit(0)
}

const perProjectPlans = allProjectTickets.map(({ projectCode, tickets }) => ({
  projectCode,
  plan: computeMigrationPlan(tickets as never, projectCode),
  tickets,
}))

let totalChanged = 0
let totalContradictions = 0
let totalUnchanged = 0
const reportLines: string[] = []
let aborted = false

for (const { projectCode, plan, tickets } of perProjectPlans) {
  console.log(`── ${projectCode} (${plan.counts.total} tickets) ──`)
  reportLines.push(`## Project ${projectCode}`)
  reportLines.push('')
  reportLines.push(`- Total tickets: ${plan.counts.total}`)
  reportLines.push(`- Changed: ${plan.counts.changed}`)
  reportLines.push(`- Contradictions: ${plan.counts.contradictions}`)
  reportLines.push(`- Unchanged: ${plan.counts.unchanged}`)
  reportLines.push('')

  totalChanged += plan.counts.changed
  totalContradictions += plan.counts.contradictions
  totalUnchanged += plan.counts.unchanged

  for (const change of plan.changes) {
    const contradictionTag = change.isContradiction ? ' ⚠️ contradiction' : ''
    console.log(`  ${doWrite ? '✏️' : '🔍'} ${change.ticketCode}${contradictionTag}`)

    if (change.added.length > 0) {
      console.log(`     + add blocks: ${change.added.join(', ')}`)
      reportLines.push(`- ${change.ticketCode}: add blocks [${change.added.join(', ')}]`)
    }
    if (change.removed.length > 0) {
      console.log(`     - remove blocks: ${change.removed.join(', ')}`)
      reportLines.push(`- ${change.ticketCode}: remove blocks [${change.removed.join(', ')}]`)
    }
    if (change.isContradiction) {
      let skipWriteForThisTicket = false
      for (const target of change.contradictionTargets) {
        const decision = promptContradiction(change, target)
        if (decision === 'skip') {
          // Dry-run: record and move on; no write attempted (doWrite is false
          // anyway, but be explicit so the writer below sees a clean skip).
          console.log(`     ⚠️ dry-run: contradiction ${change.ticketCode} ↔ ${target} (would default to keeping dependsOn, dropping blocks)`)
          reportLines.push(
            `- ${change.ticketCode}: CONTRADICTION with ${target} — dry-run, would default to keeping dependsOn, dropping blocks`,
          )
          skipWriteForThisTicket = true
        }
        else if (decision === false) {
          console.log(`     ⛔ operator chose to abort on ${change.ticketCode} ↔ ${target}`)
          reportLines.push(
            `- ${change.ticketCode}: CONTRADICTION with ${target} — operator aborted, no write`,
          )
          aborted = true
          break
        }
        else {
          console.log(`     ✓ contradiction ${change.ticketCode} ↔ ${target}: keeping dependsOn, dropping blocks`)
          reportLines.push(
            `- ${change.ticketCode}: CONTRADICTION with ${target} — resolved by keeping dependsOn, dropping blocks`,
          )
        }
      }
      if (aborted)
        break
      if (skipWriteForThisTicket)
        continue
    }

    if (doWrite && !aborted) {
      const newBlocks = applyChangeToBlocks(change, true)
      const filePath = change.filePath || path.join(repoRoot, 'docs', 'CRs', `${change.ticketCode}.md`)
      if (!fs.existsSync(filePath)) {
        console.error(`     ❌ file not found: ${filePath}`)
        continue
      }
      const content = fs.readFileSync(filePath, 'utf8')
      const updated = rewriteBlocksField(content, newBlocks)
      if (updated !== content) {
        fs.writeFileSync(filePath, updated, 'utf8')
        console.log(`     ✓ wrote ${path.relative(repoRoot, filePath)}`)
      }
    }
  }
  reportLines.push('')

  // Don't continue to next project if this one was aborted.
  if (aborted)
    break

  // Verify invariant on this project.
  const invariant = verifyInvariant(tickets as never, projectCode)
  const pct = invariant.total === 0 ? 100 : Math.round((invariant.satisfied / invariant.total) * 100)
  // Note: in dry-run mode the invariant is checked against the ORIGINAL
  // data, so it will reflect the current broken state. After --write the
  // script would re-load and re-verify; for v1 we just report the pre-state.
  reportLines.push(`### ${projectCode} invariant (pre-write)`)
  reportLines.push(
    `Invariant satisfied for ${invariant.satisfied}/${invariant.total} (${pct}%) of tickets.`,
  )
  if (invariant.violating.length > 0) {
    reportLines.push(`Violating: ${invariant.violating.join(', ')}`)
  }
  reportLines.push('')
}

// ── Summary ────────────────────────────────────────────────────────────

console.log(`\n─── Summary ───`)
console.log(`  Files changed:    ${totalChanged}`)
console.log(`  Contradictions:   ${totalContradictions}`)
console.log(`  Files unchanged:  ${totalUnchanged}`)
if (aborted) {
  console.log(`\n  ⛔ Migration ABORTED — operator declined a contradiction prompt.`)
  console.log(`     No files after the abort point were modified.`)
}
else if (!doWrite && totalChanged > 0) {
  console.log(`\n  💡 Dry-run only. Re-run with --write to apply.`)
}
else if (doWrite && !aborted) {
  console.log(`\n  ✅ Migration applied.`)
}

// ── Write report ───────────────────────────────────────────────────────

const reportPath = path.join(repoRoot, 'docs', 'CRs', 'MDT-189', 'blocks-migration-report.md')
const reportHeader = `# blocks migration report (MDT-189)

Mode: ${doWrite ? 'WRITE (--write)' : 'DRY RUN'}
Run at: ${new Date().toISOString()}
Aborted: ${aborted}

## Totals

- Files changed: ${totalChanged}
- Contradictions: ${totalContradictions}
- Files unchanged: ${totalUnchanged}

## Per-project detail

`

fs.mkdirSync(path.dirname(reportPath), { recursive: true })
fs.writeFileSync(reportPath, `${reportHeader + reportLines.join('\n')}\n`, 'utf8')
console.log(`\n  📄 Report written to ${path.relative(repoRoot, reportPath)}\n`)

process.exit(aborted ? 1 : 0)
