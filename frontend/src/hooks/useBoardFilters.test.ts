import type { Ticket } from '../types'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'bun:test'
import { UNASSIGNED_SENTINEL } from '../utils/ticketFilters'
import { deriveFacetOptions, filterReducer, useBoardFilters } from './useBoardFilters'

function makeTicket(overrides: Partial<Ticket> & { code: string }): Ticket {
  return {
    title: `Ticket ${overrides.code}`,
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    dateCreated: null,
    lastModified: null,
    content: '',
    filePath: `docs/CRs/${overrides.code}.md`,
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
    ...overrides,
  } as Ticket
}

describe('filterReducer', () => {
  describe('toggle', () => {
    it('adds a value to an empty facet', () => {
      const result = filterReducer({}, { type: 'toggle', facet: 'status', value: 'In Progress' })
      expect(result.status).toEqual(['In Progress'])
    })

    it('adds a second value (OR within facet)', () => {
      const state = { status: ['In Progress'] }
      const result = filterReducer(state, { type: 'toggle', facet: 'status', value: 'Approved' })
      expect(result.status).toEqual(['In Progress', 'Approved'])
    })

    it('removes a value already present', () => {
      const state = { status: ['In Progress', 'Approved'] }
      const result = filterReducer(state, { type: 'toggle', facet: 'status', value: 'In Progress' })
      expect(result.status).toEqual(['Approved'])
    })

    it('accepts a facet currently stored as a single string', () => {
      const state = { status: 'In Progress' } as never
      const result = filterReducer(state, { type: 'toggle', facet: 'status', value: 'Approved' })
      expect(result.status).toEqual(['In Progress', 'Approved'])
    })
  })

  describe('setQuery', () => {
    it('sets the query field', () => {
      const result = filterReducer({}, { type: 'setQuery', query: 'login' })
      expect(result.query).toBe('login')
    })

    it('overwrites a previous query', () => {
      const result = filterReducer({ query: 'old' }, { type: 'setQuery', query: 'new' })
      expect(result.query).toBe('new')
    })
  })

  describe('clearFacet', () => {
    it('empties one facet leaving others untouched', () => {
      const state = { status: ['In Progress'], priority: ['High'] }
      const result = filterReducer(state, { type: 'clearFacet', facet: 'status' })
      expect(result.status).toBeUndefined()
      expect(result.priority).toEqual(['High'])
    })

    it('no-op when facet is already absent', () => {
      const state = { priority: ['High'] }
      const result = filterReducer(state, { type: 'clearFacet', facet: 'status' })
      expect(result).toEqual(state)
    })
  })

  describe('clearAll', () => {
    it('empties everything', () => {
      const state = { status: ['In Progress'], priority: ['High'], query: 'x' }
      const result = filterReducer(state, { type: 'clearAll' })
      expect(result).toEqual({})
    })
  })

  describe('replace', () => {
    it('replaces the whole state', () => {
      const result = filterReducer({ status: ['Old'] }, { type: 'replace', filters: { priority: ['High'] } })
      expect(result).toEqual({ priority: ['High'] })
    })
  })

  describe('reconcile (S10 — drop stale derived values)', () => {
    it('drops an assignee no longer in the ticket set', () => {
      const result = filterReducer(
        { assignee: ['bob@example.com', 'alice@example.com'] },
        { type: 'reconcile', availableAssignees: ['alice@example.com'], availablePhaseEpics: [], availableImpactAreas: [] },
      )
      expect(result.assignee).toEqual(['alice@example.com'])
    })

    it('removes the facet entirely when all values are stale', () => {
      const result = filterReducer(
        { assignee: ['bob@example.com'] },
        { type: 'reconcile', availableAssignees: [], availablePhaseEpics: [], availableImpactAreas: [] },
      )
      expect(result.assignee).toBeUndefined()
    })

    it('keeps the unassigned sentinel if any ticket is unassigned', () => {
      const result = filterReducer(
        { assignee: [UNASSIGNED_SENTINEL] },
        { type: 'reconcile', availableAssignees: [UNASSIGNED_SENTINEL], availablePhaseEpics: [], availableImpactAreas: [] },
      )
      expect(result.assignee).toEqual([UNASSIGNED_SENTINEL])
    })

    it('does not touch static facets (status/type/priority)', () => {
      const result = filterReducer(
        { status: ['Rejected'] },
        { type: 'reconcile', availableAssignees: [], availablePhaseEpics: [], availableImpactAreas: [] },
      )
      // status is enum-derived, never reconciled.
      expect(result.status).toEqual(['Rejected'])
    })

    it('drops stale phaseEpic values', () => {
      const result = filterReducer(
        { phaseEpic: ['MDT-100', 'MDT-200'] },
        { type: 'reconcile', availableAssignees: [], availablePhaseEpics: ['MDT-100'], availableImpactAreas: [] },
      )
      expect(result.phaseEpic).toEqual(['MDT-100'])
    })

    it('drops stale impactAreas values', () => {
      const result = filterReducer(
        { impactAreas: ['frontend', 'backend'] },
        { type: 'reconcile', availableAssignees: [], availablePhaseEpics: [], availableImpactAreas: ['frontend'] },
      )
      expect(result.impactAreas).toEqual(['frontend'])
    })
  })
})

describe('deriveFacetOptions', () => {
  it('collects unique assignees sorted', () => {
    const tickets = [
      makeTicket({ code: 'MDT-001', assignee: 'bob@example.com' }),
      makeTicket({ code: 'MDT-002', assignee: 'alice@example.com' }),
      makeTicket({ code: 'MDT-003', assignee: 'alice@example.com' }),
    ]
    expect(deriveFacetOptions(tickets).assignee).toEqual(['alice@example.com', 'bob@example.com'])
  })

  it('includes the unassigned sentinel when any ticket has no assignee', () => {
    const tickets = [
      makeTicket({ code: 'MDT-001', assignee: 'alice@example.com' }),
      makeTicket({ code: 'MDT-002' }),
    ]
    expect(deriveFacetOptions(tickets).assignee).toEqual([UNASSIGNED_SENTINEL, 'alice@example.com'])
  })

  it('does not include the sentinel when every ticket is assigned', () => {
    const tickets = [makeTicket({ code: 'MDT-001', assignee: 'alice@example.com' })]
    expect(deriveFacetOptions(tickets).assignee).toEqual(['alice@example.com'])
  })

  it('collects phaseEpic and impactAreas', () => {
    const tickets = [
      makeTicket({ code: 'MDT-001', phaseEpic: 'MDT-100', impactAreas: ['frontend', 'mobile'] }),
      makeTicket({ code: 'MDT-002', phaseEpic: 'MDT-200', impactAreas: ['frontend'] }),
    ]
    const opts = deriveFacetOptions(tickets)
    expect(opts.phaseEpic).toEqual(['MDT-100', 'MDT-200'])
    expect(opts.impactAreas).toEqual(['frontend', 'mobile'])
  })

  it('returns empty arrays for an empty ticket set', () => {
    const opts = deriveFacetOptions([])
    expect(opts.assignee).toEqual([])
    expect(opts.phaseEpic).toEqual([])
    expect(opts.impactAreas).toEqual([])
  })
})

describe('useBoardFilters (integration via renderHook)', () => {
  it('returns the initial filter state', () => {
    const { result } = renderHook(() => useBoardFiltersHook([], {}))
    expect(result.current.filters).toEqual({})
  })

  it('toggleFilter adds a value', () => {
    const { result } = renderHook(() => useBoardFiltersHook([], {}))
    act(() => {
      result.current.toggleFilter('status', 'In Progress')
    })
    expect(result.current.filters.status).toEqual(['In Progress'])
  })

  it('setQuery updates query', () => {
    const { result } = renderHook(() => useBoardFiltersHook([], {}))
    act(() => {
      result.current.setQuery('login')
    })
    expect(result.current.filters.query).toBe('login')
  })

  it('clearAll empties everything', () => {
    const { result } = renderHook(() => useBoardFiltersHook([], { status: ['In Progress'], query: 'x' }))
    act(() => {
      result.current.clearAll()
    })
    expect(result.current.filters).toEqual({})
  })

  it('filteredTickets applies the predicate', () => {
    const tickets = [
      makeTicket({ code: 'MDT-001', status: 'In Progress' }),
      makeTicket({ code: 'MDT-002', status: 'Proposed' }),
    ]
    const { result } = renderHook(() => useBoardFiltersHook(tickets, { status: ['In Progress'] }))
    expect(result.current.filteredTickets.map(t => t.code)).toEqual(['MDT-001'])
  })

  it('facetOptions derives assignee values from tickets', () => {
    const tickets = [
      makeTicket({ code: 'MDT-001', assignee: 'alice@example.com' }),
      makeTicket({ code: 'MDT-002' }),
    ]
    const { result } = renderHook(() => useBoardFiltersHook(tickets, {}))
    expect(result.current.facetOptions.assignee).toEqual([UNASSIGNED_SENTINEL, 'alice@example.com'])
  })
})

function useBoardFiltersHook(tickets: Ticket[], initial: Parameters<typeof useBoardFilters>[1]) {
  return useBoardFilters(tickets, initial)
}
