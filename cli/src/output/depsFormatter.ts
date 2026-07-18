/**
 * deps --check output formatter (MDT-189 TASK-formatter)
 *
 * Pure functions: take a ticket code + violations[] + proseGaps[] and return
 * the human-readable string form. The deps command action delegates here for
 * everything that is "presentation"; the structured (--json/--yaml) shape is
 * built inline in the action and passes the raw shapes through.
 *
 * The violation table mirrors the VOC format in MDT-189-dep-graph-foundation.md:
 *
 *   Dependency check: MDT-188
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

/**
 * The shape the deps command passes to the formatter. Mirrors the structured
 * `data` block so the human and JSON outputs always agree.
 */
export interface DepsReport {
  ticketCode: string
  violations: Violation[]
  proseGaps: string[]
}

/**
 * Render the human-readable deps check report.
 *
 * Order is fixed: header, violation table (or "no unresolved deps" line),
 * prose-gap section (only when non-empty), summary line.
 */
export function formatDepsReport(report: DepsReport): string {
  const lines: string[] = []
  lines.push(`Dependency check: ${report.ticketCode}`)
  lines.push('')

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
