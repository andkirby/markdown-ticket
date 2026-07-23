import type { Ticket } from '../types'
import { describe, expect, it } from 'bun:test'
import {
  applyTicketFilters,
  countActiveFilters,
  displayAssigneeValue,
  isEmptyFilter,
  UNASSIGNED_SENTINEL,
} from './ticketFilters'

/** Minimal ticket factory; only the fields the predicate reads need values. */
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

const fixtures: Ticket[] = [
  makeTicket({ code: 'MDT-001', title: 'Fix login bug', status: 'In Progress', type: 'Bug Fix', priority: 'High', assignee: 'alice@example.com', description: 'login flow broken' }),
  makeTicket({ code: 'MDT-002', title: 'Login redesign', status: 'In Progress', type: 'Feature Enhancement', priority: 'Medium', assignee: 'alice@example.com' }),
  makeTicket({ code: 'MDT-003', title: 'Setup API', status: 'Approved', type: 'Feature Enhancement', priority: 'Low' }),
  makeTicket({ code: 'MDT-004', title: 'Crash on save', status: 'In Progress', type: 'Bug Fix', priority: 'Critical', assignee: 'bob@example.com', impactAreas: ['frontend', 'mobile'] }),
  makeTicket({ code: 'MDT-005', title: 'Docs refresh', status: 'Proposed', type: 'Documentation', priority: 'Low', impactAreas: ['docs'] }),
  makeTicket({ code: 'MDT-006', title: 'Migrate enums', status: 'Implemented', type: 'Architecture', priority: 'Medium', phaseEpic: 'MDT-100', inWorktree: true }),
]

describe('applyTicketFilters', () => {
  describe('S1 — empty filter shows everything', () => {
    it('returns all tickets for an empty object', () => {
      expect(applyTicketFilters(fixtures, {})).toHaveLength(fixtures.length)
    })

    it('returns all tickets for undefined filters', () => {
      expect(applyTicketFilters(fixtures, undefined)).toHaveLength(fixtures.length)
    })
  })

  describe('S2 — single facet value narrows', () => {
    it('status with one value returns only matching tickets', () => {
      const result = applyTicketFilters(fixtures, { status: 'Approved' })
      expect(result.map(t => t.code)).toEqual(['MDT-003'])
    })
  })

  describe('S3 — multiple values within one facet OR-combine', () => {
    it('status with two values returns tickets matching either', () => {
      const result = applyTicketFilters(fixtures, { status: ['In Progress', 'Approved'] })
      expect(result.map(t => t.code).sort()).toEqual(['MDT-001', 'MDT-002', 'MDT-003', 'MDT-004'])
    })

    it('excludes tickets matching neither value', () => {
      const result = applyTicketFilters(fixtures, { status: ['In Progress', 'Approved'] })
      expect(result.find(t => t.code === 'MDT-005')).toBeUndefined()
    })

    it('accepts a single value as a string (not just array)', () => {
      const result = applyTicketFilters(fixtures, { type: 'Bug Fix' })
      expect(result.map(t => t.code).sort()).toEqual(['MDT-001', 'MDT-004'])
    })
  })

  describe('S4 — multiple facets AND-combine', () => {
    it('status and priority intersect', () => {
      const result = applyTicketFilters(fixtures, { status: 'In Progress', priority: 'High' })
      expect(result.map(t => t.code)).toEqual(['MDT-001'])
    })

    it('excludes a ticket matching status but not priority', () => {
      const result = applyTicketFilters(fixtures, { status: 'In Progress', priority: 'Medium' })
      expect(result.map(t => t.code)).toEqual(['MDT-002'])
    })
  })

  describe('S5 — query AND-combines with facets', () => {
    it('query "login" plus status facet narrows to the intersection', () => {
      const result = applyTicketFilters(fixtures, { query: 'login', status: 'In Progress' })
      // Both MDT-001 and MDT-002 match "login" AND status In Progress.
      expect(result.map(t => t.code).sort()).toEqual(['MDT-001', 'MDT-002'])
    })

    it('query alone narrows across title/code/description', () => {
      const result = applyTicketFilters(fixtures, { query: 'setup' })
      expect(result.map(t => t.code)).toEqual(['MDT-003'])
    })
  })

  describe('S6 — multi-term query is multi-term AND', () => {
    it('two terms both must match', () => {
      const result = applyTicketFilters(fixtures, { query: 'fix login' })
      expect(result.map(t => t.code)).toEqual(['MDT-001'])
    })

    it('excludes a ticket matching only one term', () => {
      const result = applyTicketFilters(fixtures, { query: 'login redesign' })
      // "Login redesign" matches title of MDT-002 but neither "login redesign"
      // as a phrase; split terms: "login" matches MDT-001, "redesign" matches MDT-002.
      expect(result.map(t => t.code).sort()).toEqual(['MDT-002'])
    })
  })

  describe('S7 — assignee facet includes Unassigned sentinel', () => {
    it('sentinel matches tickets with no assignee', () => {
      const result = applyTicketFilters(fixtures, { assignee: UNASSIGNED_SENTINEL })
      expect(result.map(t => t.code).sort()).toEqual(['MDT-003', 'MDT-005', 'MDT-006'])
    })

    it('a real assignee value matches only their tickets', () => {
      const result = applyTicketFilters(fixtures, { assignee: 'bob@example.com' })
      expect(result.map(t => t.code)).toEqual(['MDT-004'])
    })

    it('sentinel and a real value OR-combine', () => {
      const result = applyTicketFilters(fixtures, { assignee: [UNASSIGNED_SENTINEL, 'alice@example.com'] })
      expect(result).toHaveLength(5)
    })
  })

  describe('S8 — priority and type combine independently', () => {
    it('priority Critical AND type Bug Fix intersect', () => {
      const result = applyTicketFilters(fixtures, { priority: 'Critical', type: 'Bug Fix' })
      expect(result.map(t => t.code)).toEqual(['MDT-004'])
    })
  })

  describe('S9 — no match returns empty', () => {
    it('a status no ticket has returns zero tickets', () => {
      const result = applyTicketFilters(fixtures, { status: 'Rejected' })
      expect(result).toEqual([])
    })

    it('does not throw on an impossible combination', () => {
      expect(() => applyTicketFilters(fixtures, { status: 'Rejected', priority: 'Low', type: 'Research' })).not.toThrow()
    })
  })

  describe('S10 — stale derived value dropped via reconcile', () => {
    it('reconcile is a hook concern; predicate simply stops matching when value absent', () => {
      // After the ticket set loses assignee "bob", filtering for bob returns empty.
      const withoutBob = fixtures.filter(t => t.assignee !== 'bob@example.com')
      const result = applyTicketFilters(withoutBob, { assignee: 'bob@example.com' })
      expect(result).toEqual([])
    })
  })

  describe('v1.1 contract — impactAreas', () => {
    it('matches tickets having any of the selected impact areas', () => {
      const result = applyTicketFilters(fixtures, { impactAreas: 'frontend' })
      expect(result.map(t => t.code)).toEqual(['MDT-004'])
    })

    it('multiple areas OR-combine', () => {
      const result = applyTicketFilters(fixtures, { impactAreas: ['docs', 'mobile'] })
      expect(result.map(t => t.code).sort()).toEqual(['MDT-004', 'MDT-005'])
    })
  })

  describe('v1.1 contract — inWorktree', () => {
    it('true matches only tickets in a worktree', () => {
      const result = applyTicketFilters(fixtures, { inWorktree: true })
      expect(result.map(t => t.code)).toEqual(['MDT-006'])
    })

    it('false matches only tickets NOT in a worktree', () => {
      const result = applyTicketFilters(fixtures, { inWorktree: false })
      expect(result.map(t => t.code)).toHaveLength(fixtures.length - 1)
    })

    it('undefined (omitted) imposes no constraint', () => {
      const result = applyTicketFilters(fixtures, { inWorktree: undefined })
      expect(result).toHaveLength(fixtures.length)
    })
  })

  describe('query edge cases', () => {
    it('case-insensitive query', () => {
      const result = applyTicketFilters(fixtures, { query: 'LOGIN' })
      expect(result.map(t => t.code).sort()).toEqual(['MDT-001', 'MDT-002'])
    })

    it('query matches code', () => {
      const result = applyTicketFilters(fixtures, { query: 'MDT-003' })
      expect(result.map(t => t.code)).toEqual(['MDT-003'])
    })

    it('query matches description', () => {
      const result = applyTicketFilters(fixtures, { query: 'broken' })
      expect(result.map(t => t.code)).toEqual(['MDT-001'])
    })
  })
})

describe('countActiveFilters', () => {
  it('zero for empty/undefined filter', () => {
    expect(countActiveFilters(undefined)).toBe(0)
    expect(countActiveFilters({})).toBe(0)
  })

  it('counts each selected value across facets', () => {
    expect(countActiveFilters({ status: ['In Progress', 'Approved'], priority: 'High' })).toBe(3)
  })

  it('counts a non-empty query as one', () => {
    expect(countActiveFilters({ query: 'login' })).toBe(1)
  })

  it('counts inWorktree when set', () => {
    expect(countActiveFilters({ inWorktree: true })).toBe(1)
  })

  it('ignores whitespace-only query', () => {
    expect(countActiveFilters({ query: '   ' })).toBe(0)
  })
})

describe('isEmptyFilter', () => {
  it('true when nothing active', () => {
    expect(isEmptyFilter(undefined)).toBe(true)
    expect(isEmptyFilter({})).toBe(true)
  })

  it('false as soon as anything is active', () => {
    expect(isEmptyFilter({ status: 'Proposed' })).toBe(false)
    expect(isEmptyFilter({ query: 'x' })).toBe(false)
  })
})

describe('displayAssigneeValue', () => {
  it('maps the sentinel to "Unassigned"', () => {
    expect(displayAssigneeValue(UNASSIGNED_SENTINEL)).toBe('Unassigned')
  })

  it('passes through real values unchanged', () => {
    expect(displayAssigneeValue('alice@example.com')).toBe('alice@example.com')
  })
})
