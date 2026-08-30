import type { TicketFilters } from '@mdt/domain-contracts'
import type { Ticket } from '../types'

/**
 * Facet keys backed by a multi-select array of string values on `TicketFilters`.
 * `query` is handled separately (free-text, not a multi-select facet).
 *
 * Order here is the canonical desktop trigger order (surface spec "Layout").
 */
export const FACET_KEYS = [
  'status',
  'priority',
  'assignee',
  'type',
  'phaseEpic',
  'impactAreas',
] as const

export type FacetKey = typeof FACET_KEYS[number]

/** Sentinel value for the "Unassigned" assignee facet option (architecture D5). */
export const UNASSIGNED_SENTINEL = '__none__'

/** Human label for the unassigned sentinel, shown at the UI boundary only. */
export const UNASSIGNED_LABEL = 'Unassigned'

/**
 * Normalize a filter field that may be a single value or an array into
 * an array. `undefined` / empty → `[]` (which means "no constraint").
 */
function toValues(field: string | string[] | undefined): string[] {
  if (field === undefined)
    return []
  return Array.isArray(field) ? field : [field]
}

/**
 * Exact-match a multi-select facet: ticket passes if its value is one of the
 * selected values (OR within facet). Empty selection = no constraint (pass).
 *
 * `assignee` uses {@link UNASSIGNED_SENTINEL} to match tickets with no assignee.
 */
function matchesFacet(
  ticketValue: string | undefined,
  selected: string[],
): boolean {
  if (selected.length === 0)
    return true
  // Unassigned sentinel: matches when the ticket has no assignee/value.
  if (selected.includes(UNASSIGNED_SENTINEL)) {
    if (!ticketValue)
      return true
  }
  return selected.includes(ticketValue ?? '')
}

/**
 * Match `impactAreas` (a string[] on the ticket) against selected values.
 * OR within facet: ticket passes if any of its impactAreas is selected.
 */
function matchesImpactAreas(
  ticketAreas: string[] | undefined,
  selected: string[],
): boolean {
  if (selected.length === 0)
    return true
  if (!ticketAreas || ticketAreas.length === 0)
    return false
  return ticketAreas.some(area => selected.includes(area))
}

/**
 * Multi-term AND query over title, code, and description — the exact behavior
 * of the board's pre-MDT-196 free-text filter (Board.tsx:298-309).
 *
 * Empty/whitespace query = no constraint (pass).
 */
function matchesQuery(ticket: Ticket, query: string | undefined): boolean {
  if (!query || !query.trim())
    return true
  const terms = query.toLowerCase().trim().split(/\s+/)
  const title = ticket.title?.toLowerCase() ?? ''
  const code = ticket.code?.toLowerCase() ?? ''
  const description = ticket.description?.toLowerCase() ?? ''
  return terms.every(term =>
    title.includes(term)
    || code.includes(term)
    || description.includes(term),
  )
}

/**
 * Apply {@link TicketFilters} to a ticket array.
 *
 * - **Across facets: AND.** Every active facet must pass.
 * - **Within a facet: OR.** A ticket passes a facet if it matches any selected value.
 * - **`query`** AND-combines with every facet and is multi-term AND internally.
 * - **Empty `TicketFilters`** (no active fields) returns every ticket — no special-case branches.
 *
 * Facet matching is **exact** (not substring), matching the faceted-UI intent.
 * This diverges intentionally from the server-side fuzzy `matchesFilters`
 * (TicketService.ts:640), which serves MCP search. See architecture.md §D1.
 *
 * Pure function — safe to unit-test and memoize without React.
 */
export function applyTicketFilters<T extends Ticket>(
  tickets: T[],
  filters: TicketFilters | undefined,
): T[] {
  if (!filters)
    return tickets

  const status = toValues(filters.status)
  const priority = toValues(filters.priority)
  const assignee = toValues(filters.assignee)
  const type = toValues(filters.type)
  const phaseEpic = toValues(filters.phaseEpic)
  const impactAreas = toValues(filters.impactAreas)
  const hasNoFacetActive = status.length === 0
    && priority.length === 0
    && assignee.length === 0
    && type.length === 0
    && phaseEpic.length === 0
    && impactAreas.length === 0
    && filters.inWorktree === undefined
    && !filters.query

  // Empty filter = show everything (surface spec "Filter State Contract").
  if (hasNoFacetActive)
    return tickets

  return tickets.filter((ticket) => {
    if (!matchesQuery(ticket, filters.query))
      return false
    if (!matchesFacet(ticket.status, status))
      return false
    if (!matchesFacet(ticket.priority, priority))
      return false
    if (!matchesFacet(ticket.assignee, assignee))
      return false
    if (!matchesFacet(ticket.type, type))
      return false
    if (!matchesFacet(ticket.phaseEpic, phaseEpic))
      return false
    if (!matchesImpactAreas(ticket.impactAreas, impactAreas))
      return false
    // inWorktree: exact boolean facet (v1.1 contract-ready).
    if (filters.inWorktree !== undefined && Boolean(ticket.inWorktree) !== filters.inWorktree) {
      return false
    }
    return true
  })
}

/**
 * Count of active filter values across all multi-select facets, plus 1 for a
 * non-empty query. Used for the "Filter · N" badge and to gate chip/clear UI.
 */
export function countActiveFilters(filters: TicketFilters | undefined): number {
  if (!filters)
    return 0
  const values = [
    ...toValues(filters.status),
    ...toValues(filters.priority),
    ...toValues(filters.assignee),
    ...toValues(filters.type),
    ...toValues(filters.phaseEpic),
    ...toValues(filters.impactAreas),
  ]
  let count = values.length
  if (filters.inWorktree !== undefined)
    count += 1
  if (filters.query && filters.query.trim())
    count += 1
  return count
}

/**
 * Whether the filter state is effectively empty (shows every ticket).
 * Mirrors the `hasNoFacetActive` short-circuit in {@link applyTicketFilters}.
 */
export function isEmptyFilter(filters: TicketFilters | undefined): boolean {
  return countActiveFilters(filters) === 0
}

/** Render an assignee value for display, mapping the sentinel to "Unassigned". */
export function displayAssigneeValue(value: string): string {
  return value === UNASSIGNED_SENTINEL ? UNASSIGNED_LABEL : value
}
