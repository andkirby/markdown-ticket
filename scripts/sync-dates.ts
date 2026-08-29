#!/usr/bin/env bun
/**
 * sync-dates.ts — Synchronize frontmatter dates with Git history
 *
 * For every MDT ticket markdown file:
 *   - dateCreated → date of first commit that introduced the file
 *   - lastModified → date of last commit that touched the file
 *
 * Usage:
 *   bun scripts/sync-dates.ts              # dry run (show what would change)
 *   bun scripts/sync-dates.ts --write      # actually update files
 *   bun scripts/sync-dates.ts docs/CRs/MDT-143*.md  # specific file(s)
 */

import { execSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'

// ── Helpers ───────────────────────────────────────────────────────────

interface DateInfo {
  dateCreated: string | null
  lastModified: string | null
}

function getGitDates(filePath: string, repoRoot: string): DateInfo {
  const rel = path.relative(repoRoot, filePath)
  try {
    // First commit that introduced the file (dateCreated)
    const created = execSync(
      `git log --diff-filter=A --follow --format="%aI" -- "${rel}"`,
      { cwd: repoRoot, encoding: 'utf8' },
    ).trim().split('\n').filter(Boolean).pop() || null

    // Last commit that touched the file (lastModified)
    const modified = execSync(
      `git log -1 --format="%aI" -- "${rel}"`,
      { cwd: repoRoot, encoding: 'utf8' },
    ).trim() || null

    return { dateCreated: created, lastModified: modified }
  }
  catch {
    return { dateCreated: null, lastModified: null }
  }
}

function parseFrontmatterDates(content: string): { dateCreated: string | null, lastModified: string | null } {
  const fm = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fm)
    return { dateCreated: null, lastModified: null }
  const body = fm[1]
  const dc = body.match(/^dateCreated:(.+)$/m)?.[1]?.trim() || null
  const lm = body.match(/^lastModified:(.+)$/m)?.[1]?.trim() || null
  return { dateCreated: dc, lastModified: lm }
}

function hasFrontmatter(content: string): boolean {
  return /^---\n/.test(content) && /\n---/.test(content)
}

function setFrontmatterDate(content: string, field: string, value: string, exists: boolean): string {
  const iso = new Date(value).toISOString()
  if (exists) {
    return content.replace(new RegExp(`^(${field}:\\s*).+$`, 'm'), `$1${iso}`)
  }
  else {
    return content.replace(/^---\n/, `---\n${field}: ${iso}\n`)
  }
}

// ── Main ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const doWrite = args.includes('--write')
const pathArgs = args.filter(a => !a.startsWith('--'))

const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()

// Collect target files
const resolve = (list: string) => list.trim().split('\n').filter(Boolean).map(f => path.resolve(repoRoot, f))

let files: string[]
if (pathArgs.length > 0) {
  files = pathArgs.flatMap((p) => {
    const full = path.resolve(repoRoot, p)
    if (fs.existsSync(full) && fs.statSync(full).isFile())
      return [full]
    try {
      return resolve(execSync(`ls -1d ${p} 2>/dev/null`, { cwd: repoRoot, encoding: 'utf8' }))
    }
    catch {
      return []
    }
  })
}
else {
  files = [
    ...resolve(execSync('find docs/CRs -name "MDT-*.md" -maxdepth 1', { cwd: repoRoot, encoding: 'utf8' })),
    ...resolve(execSync('find docs/CRs -path "*/MDT-*/"*.md -not -path "*/.trace/*"', { cwd: repoRoot, encoding: 'utf8' })),
  ]
}

console.log(`\n📋 Syncing ${files.length} markdown files with Git history`)
console.log(`   Mode: ${doWrite ? '✏️  WRITE' : '👁  DRY RUN (--write to apply)'}\n`)

let updated = 0
let unchanged = 0
let skipped = 0

for (const file of files) {
  if (!fs.existsSync(file)) {
    skipped++
    continue
  }

  const content = fs.readFileSync(file, 'utf8')
  const fm = parseFrontmatterDates(content)
  const git = getGitDates(file, repoRoot)

  if (!git.dateCreated && !git.lastModified) {
    console.log(`  ⏭  ${path.relative(repoRoot, file)} — no git history (untracked?)`)
    skipped++
    continue
  }

  // Files without frontmatter: report only, don't inject
  if (!hasFrontmatter(content)) {
    const needs = [git.dateCreated && 'dateCreated', git.lastModified && 'lastModified'].filter(Boolean)
    if (needs.length > 0) {
      console.log(`  📄 ${path.relative(repoRoot, file)} — no frontmatter, needs: ${needs.join(', ')}`)
    }
    skipped++
    continue
  }

  const changes: string[] = []
  let newContent = content

  if (git.dateCreated) {
    const gitISO = new Date(git.dateCreated).toISOString()
    const fmISO = fm.dateCreated ? new Date(fm.dateCreated).toISOString() : null
    if (fmISO !== gitISO) {
      changes.push(`dateCreated: ${fm.dateCreated || '(none)'} → ${gitISO}`)
      newContent = setFrontmatterDate(newContent, 'dateCreated', git.dateCreated, !!fm.dateCreated)
    }
  }

  if (git.lastModified) {
    const gitISO = new Date(git.lastModified).toISOString()
    const fmISO = fm.lastModified ? new Date(fm.lastModified).toISOString() : null
    if (fmISO !== gitISO) {
      changes.push(`lastModified: ${fm.lastModified || '(none)'} → ${gitISO}`)
      newContent = setFrontmatterDate(newContent, 'lastModified', git.lastModified, !!fm.lastModified)
    }
  }

  if (changes.length > 0) {
    console.log(`  ${doWrite ? '✅' : '🔍'} ${path.relative(repoRoot, file)}`)
    for (const c of changes) console.log(`     ${c}`)
    if (doWrite)
      fs.writeFileSync(file, newContent, 'utf8')
    updated++
  }
  else {
    unchanged++
  }
}

console.log(`\n─── Summary ───`)
console.log(`  Updated:   ${updated}`)
console.log(`  Unchanged: ${unchanged}`)
console.log(`  Skipped:   ${skipped}`)
if (!doWrite && updated > 0)
  console.log(`\n  💡 Run with --write to apply changes`)
console.log()
