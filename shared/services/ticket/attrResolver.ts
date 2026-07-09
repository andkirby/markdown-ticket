/**
 * Ticket attribute input resolver (MDT-143 / MDT-149).
 *
 * Pure input-boundary logic: maps human/agent tokens (column names,
 * shorthand, synonyms) to canonical enum values and REJECTS unknowns.
 *
 * Lives in shared so every input interface (CLI, MCP, …) applies the same
 * rules. It is deliberately NOT wired into the persistence path:
 * TicketService.updateCRStatus / updateTicketAttributes stay permissive per
 * MDT-148 (legacy/unknown statuses already in files must round-trip, and
 * frontend drag-drop must never 400). Input interfaces call this BEFORE the
 * service; internal re-saves of existing data do not.
 *
 * Alias values mirror the board column labels + their primary status, plus
 * common alternatives. ponytail: self-contained map — not imported from
 * frontend statusConfig (that would invert the dep and is a data-interface
 * change). Re-align here if columns are ever reconfigured.
 */

import { CRPriorities, CRPriority, CRStatus, CRStatuses } from '@mdt/domain-contracts'
import { ServiceError } from '../ServiceError.js'

// --- Status ---------------------------------------------------------------

/** Column-label + synonym aliases → canonical CRStatus (lowercased keys). */
const STATUS_ALIASES: Record<string, string> = {
  // column labels → primary status (column.statuses[0] convention)
  'backlog': CRStatus.PROPOSED,
  'open': CRStatus.APPROVED,
  'done': CRStatus.IMPLEMENTED,
  'deferred': CRStatus.ON_HOLD,

  // alternatives / shorthand
  'complete': CRStatus.IMPLEMENTED,
  'completed': CRStatus.IMPLEMENTED,
  'd': CRStatus.IMPLEMENTED,
  'partial': CRStatus.PARTIALLY_IMPLEMENTED,

  // spaced forms
  'in_progress': CRStatus.IN_PROGRESS,
  'in-progress': CRStatus.IN_PROGRESS,
  'inprogress': CRStatus.IN_PROGRESS,
  'on_hold': CRStatus.ON_HOLD,
  'on-hold': CRStatus.ON_HOLD,
  'onhold': CRStatus.ON_HOLD,
}

// canonical values self-map (case/space-insensitive)
for (const canonical of CRStatuses) {
  STATUS_ALIASES[canonical.toLowerCase().replace(/\s+/g, '_')] = canonical
}

/**
 * Resolve a status token to its canonical CRStatus, or throw.
 * Throws INVALID_OPERATION with the valid set when the token is unknown.
 */
/**
 * Lenient lookup: canonical CRStatus for a token, or undefined when unknown.
 * Non-throwing variant for filters/read-paths that prefer silent pass-through
 * over hard rejection.
 */
export function lookupStatusToken(token: string): string | undefined {
  const key = token.trim().toLowerCase().replace(/\s+/g, '_')
  return STATUS_ALIASES[key]
}

export function resolveStatusToken(token: string): string {
  const key = token.trim().toLowerCase().replace(/\s+/g, '_')
  const resolved = STATUS_ALIASES[key]
  if (!resolved) {
    throw ServiceError.invalidOperation(
      `Invalid status '${token}'. Valid: ${CRStatuses.join(', ')}. `
      + `Aliases: backlog→Proposed, open→Approved, in-progress→In Progress, done/complete/d→Implemented, partial→Partially Implemented, deferred/on-hold→On Hold.`,
    )
  }
  return resolved
}

// --- Priority -------------------------------------------------------------

const PRIORITY_ALIASES: Record<string, string> = {
  p1: CRPriority.CRITICAL,
  p2: CRPriority.HIGH,
  p3: CRPriority.MEDIUM,
  p4: CRPriority.LOW,
}
for (const canonical of CRPriorities) {
  PRIORITY_ALIASES[canonical.toLowerCase()] = canonical
}

export function resolvePriorityToken(token: string): string {
  const key = token.trim().toLowerCase()
  const resolved = PRIORITY_ALIASES[key]
  if (!resolved) {
    throw ServiceError.invalidOperation(
      `Invalid priority '${token}'. Valid: ${CRPriorities.join(', ')} (aliases: p1-p4).`,
    )
  }
  return resolved
}

// --- Generic dispatch -----------------------------------------------------

/**
 * Resolve a scalar attr value for enum-typed fields. Non-enum fields pass
 * through untouched (free-text: assignee, impl-notes, phase, dates).
 * Returns the canonical string value. Throws on unknown enum tokens.
 */
export function resolveAttrValue(field: string, value: string): string {
  if (field === 'status')
    return resolveStatusToken(value)
  if (field === 'priority')
    return resolvePriorityToken(value)
  return value
}
