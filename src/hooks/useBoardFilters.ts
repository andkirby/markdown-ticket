import type { TicketFilters } from '@mdt/domain-contracts'
import type { Ticket } from '../types'
import type { FacetKey } from '../utils/ticketFilters'
import { useCallback, useEffect, useMemo, useReducer } from 'react'
import { getFilterPreferences, setFilterPreferences } from '../config/filterPreferences'
import { applyTicketFilters, UNASSIGNED_SENTINEL } from '../utils/ticketFilters'

/**
 * Reducer actions for {@link useBoardFilters}.
 *
 * Every filter state transition is a single dispatch — no ad-hoc setState —
 * so the whole surface is testable without React (architecture D4).
 */
export type FilterAction
  = | { type: 'toggle', facet: FacetKey, value: string }
    | { type: 'setQuery', query: string }
    | { type: 'clearFacet', facet: FacetKey }
    | { type: 'clearAll' }
    | { type: 'replace', filters: TicketFilters }
    | { type: 'reconcile', availableAssignees: string[], availablePhaseEpics: string[], availableImpactAreas: string[] }

/**
 * The multi-select string facets on `TicketFilters`. Used to toggle/clear
 * generically. Ordered to match {@link FacetKey}.
 */
const STRING_FACETS: readonly FacetKey[] = ['status', 'priority', 'assignee', 'type', 'phaseEpic', 'impactAreas']

function toggleValue(current: string | string[] | undefined, value: string): string[] {
  const values = current ? (Array.isArray(current) ? current : [current]) : []
  return values.includes(value) ? values.filter(v => v !== value) : [...values, value]
}

/**
 * Pure reducer for {@link useBoardFilters}. Exported for unit testing.
 */
export function filterReducer(state: TicketFilters, action: FilterAction): TicketFilters {
  switch (action.type) {
    case 'toggle': {
      if (!STRING_FACETS.includes(action.facet))
        return state
      return { ...state, [action.facet]: toggleValue(state[action.facet], action.value) }
    }
    case 'setQuery':
      return { ...state, query: action.query }

    case 'clearFacet': {
      if (!(action.facet in state))
        return state
      const next = { ...state }
      delete next[action.facet]
      return next
    }

    case 'clearAll':
      return {}

    case 'replace':
      return { ...action.filters }

    case 'reconcile': {
      // Drop selected derived values that no longer exist in the ticket set.
      // Static facets (status/type/priority) are never reconciled — their menu
      // comes from enums, not the ticket set (architecture "Static facets").
      let changed = false
      const next: TicketFilters = { ...state }

      if (state.assignee) {
        const sel = Array.isArray(state.assignee) ? state.assignee : [state.assignee]
        const kept = sel.filter(v => v === UNASSIGNED_SENTINEL || action.availableAssignees.includes(v))
        if (kept.length === 0) {
          delete next.assignee
          changed = true
        }
        else if (kept.length !== sel.length) {
          next.assignee = kept
          changed = true
        }
      }

      if (state.phaseEpic) {
        const sel = Array.isArray(state.phaseEpic) ? state.phaseEpic : [state.phaseEpic]
        const kept = sel.filter(v => action.availablePhaseEpics.includes(v))
        if (kept.length === 0) {
          delete next.phaseEpic
          changed = true
        }
        else if (kept.length !== sel.length) {
          next.phaseEpic = kept
          changed = true
        }
      }

      if (state.impactAreas) {
        const sel = Array.isArray(state.impactAreas) ? state.impactAreas : [state.impactAreas]
        const kept = sel.filter(v => action.availableImpactAreas.includes(v))
        if (kept.length === 0) {
          delete next.impactAreas
          changed = true
        }
        else if (kept.length !== sel.length) {
          next.impactAreas = kept
          changed = true
        }
      }

      // Returning the same reference lets React bail out of the re-render,
      // preventing a reconcile→dispatch→reconcile loop when nothing dropped.
      return changed ? next : state
    }

    default:
      return state
  }
}

/**
 * Compute unique derived facet values from a ticket set.
 * Assignee includes the `__none__` sentinel when any ticket is unassigned.
 */
export function deriveFacetOptions(tickets: Ticket[]) {
  const assignees = new Set<string>()
  const phaseEpics = new Set<string>()
  const impactAreas = new Set<string>()
  let hasUnassigned = false

  for (const t of tickets) {
    if (t.assignee)
      assignees.add(t.assignee)
    else hasUnassigned = true
    if (t.phaseEpic)
      phaseEpics.add(t.phaseEpic)
    if (t.impactAreas) {
      for (const a of t.impactAreas) impactAreas.add(a)
    }
  }

  return {
    assignee: hasUnassigned ? [UNASSIGNED_SENTINEL, ...Array.from(assignees).sort()] : Array.from(assignees).sort(),
    phaseEpic: Array.from(phaseEpics).sort(),
    impactAreas: Array.from(impactAreas).sort(),
  }
}

export interface UseBoardFiltersResult {
  /** Current filter state — the single source of truth. */
  filters: TicketFilters
  /** Dispatch an action (toggle/clear/setQuery/reconcile). */
  dispatch: (action: FilterAction) => void
  /** Convenience helpers bound to dispatch. */
  toggleFilter: (facet: FacetKey, value: string) => void
  setQuery: (query: string) => void
  clearFacet: (facet: FacetKey) => void
  clearAll: () => void
  /** Tickets after applying the predicate. */
  filteredTickets: Ticket[]
  /** Derived menu values for assignee/phaseEpic/impactAreas. */
  facetOptions: ReturnType<typeof deriveFacetOptions>
}

/**
 * Board filter state hook: the single `TicketFilters` reducer + persistence +
 * derived facet menus + filtered tickets.
 *
 * Sibling lifecycle to `localSortPreferences` in Board.tsx. Reads/writes
 * `markdown-ticket-filter-preferences` (mirrors `sorting.ts`).
 */
export function useBoardFilters(
  tickets: Ticket[],
  initialFilters?: TicketFilters,
): UseBoardFiltersResult {
  // Lazy init: read persisted preferences once. An explicit `initialFilters`
  // argument takes precedence (used by tests / programmatic callers).
  const [filters, dispatch] = useReducer(
    filterReducer,
    initialFilters,
    (init?: TicketFilters) => init ?? getFilterPreferences(),
  )

  const facetOptions = useMemo(() => deriveFacetOptions(tickets), [tickets])

  // Persist filter state to localStorage on every change (best-effort).
  useEffect(() => {
    setFilterPreferences(filters)
  }, [filters])

  // Reconcile derived-facet selections against the current ticket set whenever
  // the ticket set changes (drops stale assignee/phaseEpic/impactAreas values).
  useEffect(() => {
    dispatch({
      type: 'reconcile',
      availableAssignees: facetOptions.assignee,
      availablePhaseEpics: facetOptions.phaseEpic,
      availableImpactAreas: facetOptions.impactAreas,
    })
  }, [facetOptions])

  const filteredTickets = useMemo(
    () => applyTicketFilters(tickets, filters),
    [tickets, filters],
  )

  const toggleFilter = useCallback((facet: FacetKey, value: string) => dispatch({ type: 'toggle', facet, value }), [])
  const setQuery = useCallback((query: string) => dispatch({ type: 'setQuery', query }), [])
  const clearFacet = useCallback((facet: FacetKey) => dispatch({ type: 'clearFacet', facet }), [])
  const clearAll = useCallback(() => dispatch({ type: 'clearAll' }), [])

  return {
    filters,
    dispatch,
    toggleFilter,
    setQuery,
    clearFacet,
    clearAll,
    filteredTickets,
    facetOptions,
  }
}
