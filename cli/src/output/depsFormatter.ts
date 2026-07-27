/**
 * deps output formatter (MDT-189 TASK-formatter + TASK-relations-formatter)
 *
 * Pure functions: take a ticket code + violations[] + proseGaps[] + optional
 * relations inventory and return the human-readable string form. The deps
 * command action delegates here for everything that is "presentation"; the
 * structured (--json/--yaml) shape is built inline in the action and passes
 * the raw shapes through.
 *
 * Default output (no `--check`) renders the relationship inventory above the
 * violation table. `--check` strict mode omits the inventory (the caller
 * signals this by passing no `relations` field — see DepsReport below).
 *
 * The violation table mirrors the VOC format in MDT-189-dep-graph-foundation.md:
 *
 *   Dependency check: MDT-188
 *
 *   Depends on:
 *     MDT-189    Implemented
 *   Blocks:
 *     MDT-191    In Progress
 *
 *   Precondition                | Status   | Evidence
 *   dependsOn: VOC-053          | waiting  | VOC-053 is "Approved" (waiting)
 *   dependsOn: MDT-999          | broken   | Target missing (broken-plan)
 *
 *   Ready: NO (2 unresolved)
 *
 * Prose gaps (informational, separate section):
 *
 *   Unverifiable prose:
 *     VOC-049, VOC-050, VOC-051, VOC-052
 *
 * Respects `NO_COLOR` indirectly via `shouldUseColor()`; no graph logic, no
 * I/O. AGENTS.md "CLI Business Logic Boundary": this file is presentation only.
 */

import type { Violation } from '@mdt/shared/services/ticket/DependencyGraph.js'
import { shouldUseColor, visiblePadEnd } from './colors.js'

/** Column widths chosen so the longest realistic precondition key fits. */
const PRECONDITION_COL_WIDTH = 32
const STATUS_COL_WIDTH = 12
/** Width for the key column in the relationship inventory. */
const RELATION_KEY_COL_WIDTH = 12

/**
 * One entry in the relationship inventory: the related ticket's key plus its
 * current status. Both fields are passed in pre-resolved by the caller; this
 * module never reads tickets or computes status.
 */
export interface RelationEntry {
  key: string
  status: string
}

/**
 * The relationship inventory. `dependsOn` lists the ticket's upstream
 * dependencies; `blocks` lists tickets that depend on this one (downstream).
 * Both are computed in the caller from `target.dependsOn` and
 * `inverse(graph)` respectively (C-11) — never re-derived here.
 */
export interface Relations {
  dependsOn: RelationEntry[]
  blocks: RelationEntry[]
}

/**
 * The shape the deps command passes to the formatter. Mirrors the structured
 * `data` block so the human and JSON outputs always agree.
 *
 * `relations` is optional. When omitted, the inventory section is suppressed
 * (`--check` strict mode). When present (default mode), the inventory renders
 * above the violations table — even when both lists are empty, so a ticket
 * whose only role is blocking others still renders that role (BR-6.2).
 */
interface DepsReport {
  ticketCode: string
  violations: Violation[]
  proseGaps: string[]
  relations?: Relations
}

/**
 * Render the human-readable deps report.
 *
 * Order is fixed: header, relationship inventory (only when `relations` is
 * present — i.e., default mode, not `--check`), violation table (or
 * "no unresolved deps" line), prose-gap section (only when non-empty),
 * summary line.
 */
export function formatDepsReport(report: DepsReport): string {
  const lines: string[] = []
  lines.push(`Dependency check: ${report.ticketCode}`)
  lines.push('')

  if (report.relations) {
    lines.push(...formatRelationshipInventory(report.relations))
    lines.push('')
  }

  if (report.violations.length === 0) {
    lines.push('All dependencies satisfied.')
  } else {
    lines.push(...formatViolationTable(report.violations))
  }

  if (report.proseGaps.length > 0) {
    lines.push('')
    lines.push('Unverifiable prose:')
    lines.push(`  ${report.proseGaps.join(', ')}`)
  }

  lines.push('')
  lines.push(formatReadyLine(report.violations.length))
  return lines.join('\n')
}

/**
 * Render the relationship inventory section (BR-6.1, BR-6.2).
 *
 * Both subsections always render when `relations` is passed — even when
 * empty — so the structural role of the ticket is visible. The "Blocks"
 * section is the load-bearing piece for BR-6.2: a ticket with empty
 * `dependsOn` and non-empty `blocks` must render its blocking role rather
 * than collapsing to a bare readiness verdict.
 *
 * Each line: `  <key padded><status>`. Keys are padded for alignment; status
 * is the related ticket's current status string verbatim.
 */
export function formatRelationshipInventory(relations: Relations): string[] {
  const lines: string[] = []
  lines.push('Depends on:')
  if (relations.dependsOn.length === 0) {
    lines.push('  (none)')
  } else {
    for (const entry of relations.dependsOn) {
      lines.push(`  ${visiblePadEnd(entry.key, RELATION_KEY_COL_WIDTH)}${entry.status}`)
    }
  }
  lines.push('Blocks:')
  if (relations.blocks.length === 0) {
    lines.push('  (none)')
  } else {
    for (const entry of relations.blocks) {
      lines.push(`  ${visiblePadEnd(entry.key, RELATION_KEY_COL_WIDTH)}${entry.status}`)
    }
  }
  return lines
}

/**
 * Render the violation table: header row, separator, then one row per
 * violation. Columns are: Precondition | Status | Evidence.
 */
export function formatViolationTable(violations: Violation[]): string[] {
  const useColor = shouldUseColor()
  const lines: string[] = []

  const header
    = `${visiblePadEnd('Precondition', PRECONDITION_COL_WIDTH)}| `
    + `${visiblePadEnd('Status', STATUS_COL_WIDTH)}| `
    + 'Evidence'
  const separator
    = `${'-'.repeat(PRECONDITION_COL_WIDTH)}|${'-'.repeat(STATUS_COL_WIDTH + 1)}|${'-'.repeat(40)}`

  lines.push(header)
  lines.push(separator)

  for (const v of violations) {
    lines.push(formatViolationRow(v, useColor))
  }
  return lines
}

/**
 * Render a single violation row. The precondition column shows
 * `dependsOn: <KEY>`; the status column shows the satisfaction kind (with
 * broken-plan rendered as `broken` for column fit, but the kind is preserved
 * in the evidence); the evidence column explains the status.
 */
export function formatViolationRow(v: Violation, useColor: boolean = shouldUseColor()): string {
  const precondition = `dependsOn: ${v.dep}`
  const statusLabel = v.kind === 'broken-plan' ? 'broken' : v.kind
  const evidence = formatEvidence(v)
  return `${visiblePadEnd(precondition, PRECONDITION_COL_WIDTH)}| ${visiblePadEnd(statusLabel, STATUS_COL_WIDTH)}| ${evidence}`
}

/**
 * Compose the human-readable evidence string for a violation row.
 *
 * - missing target         → 'Target missing (broken-plan)'
 * - rejected               → '<KEY> is "Rejected" (broken-plan); reject-<KEY> | unlink-<KEY>'
 * - waiting (known status) → '<KEY> is "<STATUS>" (waiting)'
 *
 * The action hint is appended in parentheses for broken-plan so a human
 * reading just the evidence column knows what to do.
 */
export function formatEvidence(v: Violation): string {
  if (v.status === 'missing') {
    return `Target missing (broken-plan); ${v.action}`
  }
  if (v.kind === 'broken-plan') {
    return `${v.dep} is "${v.status}" (broken-plan); ${v.action}`
  }
  return `${v.dep} is "${v.status}" (waiting)`
}

/**
 * Render the final summary line.
 *
 * - zero violations → 'Ready: YES'
 * - one             → 'Ready: NO (1 unresolved)'
 * - many            → 'Ready: NO (N unresolved)'
 */
export function formatReadyLine(unresolvedCount: number): string {
  if (unresolvedCount === 0) return 'Ready: YES'
  return `Ready: NO (${unresolvedCount} unresolved)`
}
