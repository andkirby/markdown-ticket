/**
 * Dependency Satisfaction Classifier (MDT-189)
 *
 * Pure functions over status strings. Lives in domain-contracts so HTTP, MCP,
 * CLI, and UI packages can import it without pulling the graph module or
 * shared/. The graph module (`shared/services/ticket/DependencyGraph.ts`) is
 * the sole consumer of `classifyViolation` for its violation reporter.
 *
 * Design decision D1 (architecture.md): the satisfaction question is split
 * into two functions rather than one tri-state return.
 *   - `isDependencySatisfied(status)` → boolean (UI badge use case: ✅/❌)
 *   - `classifyViolation(depStatus)`  → SatisfactionKind (CLI formatter +
 *     future MDT-191 guardrail need the kind)
 *
 * Safe-default discipline (Edge-1): any status not in CRStatusSchema is
 * treated as *unsatisfied* and classified as `waiting`. The prior validator
 * was killed by legacy data with non-schema statuses; this is the defense.
 */

import { CRStatus } from '../types/schema.js'

/**
 * The three satisfaction outcomes a dependency edge can have.
 *
 * - `satisfied`    — dep is `Implemented` (terminal success).
 * - `waiting`      — dep exists with a known but non-terminal status, or has
 *                    an unrecognized status (safe default per Edge-1).
 * - `broken-plan`  — dep is `Rejected` (terminal failure), or the target is
 *                    missing from the graph (the plan is internally broken).
 */
export type SatisfactionKind = 'satisfied' | 'waiting' | 'broken-plan'

/**
 * Sentinel status used by `classifyViolation` when a dependsOn target does
 * not resolve to any ticket in the graph. Kept as a constant so callers and
 * tests reference one symbol rather than a magic string.
 */
export const MISSING_DEP_STATUS = 'missing'

/**
 * Predicate form of the satisfaction question.
 *
 * Returns true only when the dependency has reached the terminal success
 * state (`Implemented`). Every other status — including unrecognized legacy
 * values — returns false. Partially Implemented is intentionally false in v1
 * (deferred to v2 per architecture.md satisfaction table).
 *
 * @param status - The dependency ticket's status string (raw frontmatter value).
 */
export function isDependencySatisfied(status: string): boolean {
  return status === CRStatus.IMPLEMENTED
}

/**
 * Classify a dependency edge into a satisfaction kind for violation reporting.
 *
 * Caller passes either a real status string read from the dependency ticket,
 * or the `MISSING_DEP_STATUS` sentinel when the dependsOn target does not
 * resolve to any ticket in the graph.
 *
 * Classification rules (architecture.md §Component API):
 *   - `Implemented`                          → `satisfied`
 *   - `Rejected`                             → `broken-plan` (terminal failure)
 *   - `MISSING_DEP_STATUS` (target absent)   → `broken-plan` (plan is broken)
 *   - any other status (including unknown)   → `waiting` (Edge-1 safe default)
 *
 * @param depStatus - The dependency's status, or `MISSING_DEP_STATUS`.
 */
export function classifyViolation(depStatus: string): SatisfactionKind {
  if (depStatus === CRStatus.IMPLEMENTED) {
    return 'satisfied'
  }
  if (depStatus === CRStatus.REJECTED || depStatus === MISSING_DEP_STATUS) {
    return 'broken-plan'
  }
  // Anything else (Proposed, Approved, In Progress, On Hold, Partially
  // Implemented, or an unrecognized legacy value) is "waiting" on reality
  // to catch up. Unknown statuses do not throw — see Edge-1.
  return 'waiting'
}
