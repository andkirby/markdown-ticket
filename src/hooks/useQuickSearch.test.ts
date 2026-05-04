/**
 * useQuickSearch Hook Unit Tests (MDT-136)
 *
 * Tests for quick search filtering logic:
 * - Filter by ticket key number
 * - Filter by title substring (case-insensitive)
 * - AND logic for multi-word queries
 * - Result limit (max 10)
 */

import type { Ticket } from '../types'
import { describe, expect, it } from 'bun:test'
import { filterTickets, MAX_RESULTS, parseQueryMode, parseQueryParts } from './useQuickSearch'

// Helper to create mock tickets
function createMockTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    code: 'MDT-001',
    title: 'Test Ticket',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    dateCreated: null,
    lastModified: null,
    content: '',
    filePath: '',
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
    ...overrides,
  }
}

describe('useQuickSearch - Filter by key number (BR-3)', () => {
  it('matches tickets by key number substring', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-136', title: 'Quick Search' }),
      createMockTicket({ code: 'MDT-135', title: 'Badge Styling' }),
      createMockTicket({ code: 'MDT-136-1', title: 'Subtask' }),
    ]

    const result = filterTickets({ query: '136', tickets })

    // Should match MDT-136 and MDT-136-1
    expect(result.length).toBeGreaterThan(0)
    expect(result.some(t => t.code === 'MDT-136')).toBe(true)
  })

  it('matches tickets by full code (case-insensitive)', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-136', title: 'Quick Search' }),
      createMockTicket({ code: 'MDT-135', title: 'Badge Styling' }),
    ]

    const result = filterTickets({ query: 'mdt-136', tickets })

    expect(result.length).toBe(1)
    expect(result[0].code).toBe('MDT-136')
  })

  it('matches partial key numbers', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-100', title: 'First' }),
      createMockTicket({ code: 'MDT-101', title: 'Second' }),
      createMockTicket({ code: 'MDT-200', title: 'Third' }),
    ]

    const result = filterTickets({ query: '10', tickets })

    // Should match MDT-100 and MDT-101
    expect(result.length).toBe(2)
  })

  it('matches simplified ticket key to zero-padded ticket (MDT-42 finds MDT-042)', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-042', title: 'Some Feature' }),
      createMockTicket({ code: 'MDT-001', title: 'Other Ticket' }),
    ]

    // User types "MDT-42" — should find MDT-042
    const result = filterTickets({ query: 'MDT-42', tickets })

    expect(result.length).toBe(1)
    expect(result[0].code).toBe('MDT-042')
  })

  it('matches lowercase simplified key (mdt-42 finds MDT-042)', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-042', title: 'Some Feature' }),
    ]

    const result = filterTickets({ query: 'mdt-42', tickets })

    expect(result.length).toBe(1)
    expect(result[0].code).toBe('MDT-042')
  })

  it('still matches exact zero-padded key (MDT-042 finds MDT-042)', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-042', title: 'Some Feature' }),
      createMockTicket({ code: 'MDT-001', title: 'Other' }),
    ]

    const result = filterTickets({ query: 'MDT-042', tickets })

    expect(result.length).toBe(1)
    expect(result[0].code).toBe('MDT-042')
  })
})

describe('useQuickSearch - Filter by title substring (BR-3, C3)', () => {
  it('matches tickets by title substring (case-insensitive)', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-001', title: 'Badge Color Fix' }),
      createMockTicket({ code: 'MDT-002', title: 'Header Styling' }),
      createMockTicket({ code: 'MDT-003', title: 'COLOR scheme update' }),
    ]

    const result = filterTickets({ query: 'color', tickets })

    // Should match both "Badge Color Fix" and "COLOR scheme update"
    expect(result.length).toBe(2)
    expect(result.some(t => t.code === 'MDT-001')).toBe(true)
    expect(result.some(t => t.code === 'MDT-003')).toBe(true)
  })

  it('handles mixed case queries', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-001', title: 'Badge Color Fix' }),
      createMockTicket({ code: 'MDT-002', title: 'Header Badge' }),
    ]

    const result = filterTickets({ query: 'BADGE', tickets })

    expect(result.length).toBe(2)
  })
})

describe('useQuickSearch - AND logic for multi-word queries (C4)', () => {
  it('requires all words to match (AND logic)', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-001', title: 'Badge Color Fix' }),
      createMockTicket({ code: 'MDT-002', title: 'Badge Styling' }),
      createMockTicket({ code: 'MDT-003', title: 'Color Theme Update' }),
    ]

    const result = filterTickets({ query: 'badge color', tickets })

    // Only "Badge Color Fix" contains both words
    expect(result.length).toBe(1)
    expect(result[0].code).toBe('MDT-001')
  })

  it('matches words in any order', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-001', title: 'Fix Badge Color' }),
      createMockTicket({ code: 'MDT-002', title: 'Color Badge Update' }),
    ]

    const result = filterTickets({ query: 'badge color', tickets })

    // Both should match - order doesn't matter
    expect(result.length).toBe(2)
  })

  it('handles three or more words', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-001', title: 'Fix Badge Color Issue' }),
      createMockTicket({ code: 'MDT-002', title: 'Badge Color' }),
    ]

    const result = filterTickets({ query: 'fix badge color issue', tickets })

    expect(result.length).toBe(1)
    expect(result[0].code).toBe('MDT-001')
  })
})

describe('useQuickSearch - Result limit (C2)', () => {
  it('limits results to max 10 items', () => {
    // Create 15 tickets that all match
    const tickets: Ticket[] = Array.from({ length: 15 }, (_, i) =>
      createMockTicket({ code: `MDT-${100 + i}`, title: `Ticket ${i}` }))

    const result = filterTickets({ query: 'Ticket', tickets })

    expect(result.length).toBeLessThanOrEqual(MAX_RESULTS)
  })

  it('returns all matching tickets when under limit', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-001', title: 'First Ticket' }),
      createMockTicket({ code: 'MDT-002', title: 'Second Ticket' }),
      createMockTicket({ code: 'MDT-003', title: 'Third Ticket' }),
    ]

    const result = filterTickets({ query: 'Ticket', tickets })

    expect(result.length).toBe(3)
  })

  it('returns empty array when no matches', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-001', title: 'First Ticket' }),
    ]

    const result = filterTickets({ query: 'nonexistent', tickets })

    expect(result.length).toBe(0)
  })
})

describe('useQuickSearch - Edge cases', () => {
  it('shows all tickets (up to limit) when query is empty', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-001', title: 'First Ticket' }),
      createMockTicket({ code: 'MDT-002', title: 'Second Ticket' }),
    ]

    const result = filterTickets({ query: '', tickets })

    // Empty query returns all tickets up to limit
    expect(result.length).toBe(2)
  })

  it('handles whitespace in query', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-001', title: 'Badge Color' }),
    ]

    const result = filterTickets({ query: '  badge   color  ', tickets })

    // Should normalize whitespace
    expect(result.length).toBe(1)
  })

  it('handles special regex characters safely', () => {
    const tickets: Ticket[] = [
      createMockTicket({ code: 'MDT-001', title: 'Fix [urgent] bug' }),
    ]

    // Should not throw on special characters
    expect(() => filterTickets({ query: '[urgent]', tickets })).not.toThrow()
  })
})

// ============================================================================
// MDT-152: Cross-Project Search — Query Mode Detection
// ============================================================================
//
// RED tests — these will fail until parseQueryMode and parseQueryParts are
// implemented in useQuickSearch.ts as part of MDT-152.
//
// The functions classify raw search input into:
//   'current_project' — plain text, no special syntax
//   'ticket_key'      — exact CODE-NUMBER pattern (2-5 uppercase letters, 1-5 digits)
//   'project_scope'   — @CODE followed by space and search text
//
// See architecture.md Flow 2-4 and requirements.trace.md BR-2.1, BR-3.1, BR-4.1.
// ============================================================================

describe('MDT-152: parseQueryMode — ticket key detection (BR-2.1)', () => {
  it('detects ticket_key for valid CODE-NUMBER patterns', () => {
    expect(parseQueryMode('ABC-42')).toBe('ticket_key')
    expect(parseQueryMode('MDT-1')).toBe('ticket_key')
    expect(parseQueryMode('XY-99999')).toBe('ticket_key')
    expect(parseQueryMode('ABCDE-12345')).toBe('ticket_key')
  })

  it('accepts lowercase codes as ticket_key (case-insensitive)', () => {
    expect(parseQueryMode('abc-42')).toBe('ticket_key')
    expect(parseQueryMode('mdt-1')).toBe('ticket_key')
  })

  it('rejects codes shorter than 2 letters', () => {
    expect(parseQueryMode('A-42')).toBe('current_project')
  })

  it('rejects codes longer than 5 letters', () => {
    expect(parseQueryMode('ABCDEF-42')).toBe('current_project')
  })

  it('rejects numbers with more than 5 digits', () => {
    expect(parseQueryMode('ABC-123456')).toBe('current_project')
  })
})

describe('MDT-152: parseQueryMode — @syntax detection (BR-3.1)', () => {
  it('detects project_scope for @CODE space text', () => {
    expect(parseQueryMode('@ABC login')).toBe('project_scope')
    expect(parseQueryMode('@MDT fix bug')).toBe('project_scope')
    expect(parseQueryMode('@XY search terms here')).toBe('project_scope')
    expect(parseQueryMode('@mdt docker')).toBe('project_scope')
    expect(parseQueryMode('@abc login')).toBe('project_scope')
  })

  it('returns current_project for @CODE without space or text', () => {
    // No space = not yet committed to project scope
    expect(parseQueryMode('@ABC')).toBe('current_project')
    // Space but no search text = not yet committed
    expect(parseQueryMode('@ABC ')).toBe('current_project')
  })
})

describe('MDT-152: parseQueryMode — default current_project (BR-4.1)', () => {
  it('returns current_project for plain text', () => {
    expect(parseQueryMode('badge fix')).toBe('current_project')
    expect(parseQueryMode('user management')).toBe('current_project')
  })

  it('returns current_project for empty or whitespace-only input', () => {
    expect(parseQueryMode('')).toBe('current_project')
    expect(parseQueryMode('  ')).toBe('current_project')
  })
})

describe('MDT-152: parseQueryMode — Edge-5 and Edge-6 exclusivity', () => {
  it('Edge-5: own-project ticket key is still ticket_key (not excluded)', () => {
    // Typing own project ticket key should be ticket_key mode
    // Current-project exclusion only applies to ProjectBrowserPanel
    expect(parseQueryMode('MDT-136')).toBe('ticket_key')
  })

  it('Edge-6: @current-project is project_scope (not excluded)', () => {
    // Explicit @MDT should be project_scope even if MDT is current project
    expect(parseQueryMode('@MDT login')).toBe('project_scope')
    expect(parseQueryMode('@mdt login')).toBe('project_scope')
  })
})

describe('MDT-152: parseQueryParts — extract structured query parts', () => {
  it('extracts project code and search text from @syntax', () => {
    const parts = parseQueryParts('@ABC login page')
    expect(parts.projectCode).toBe('ABC')
    expect(parts.searchText).toBe('login page')
  })

  it('extracts multi-word search text after @CODE', () => {
    const parts = parseQueryParts('@MDT fix the badge rendering')
    expect(parts.projectCode).toBe('MDT')
    expect(parts.searchText).toBe('fix the badge rendering')
  })

  it('extracts ticket code and project code from ticket key', () => {
    const parts = parseQueryParts('ABC-42')
    expect(parts.ticketCode).toBe('ABC-42')
    expect(parts.projectCode).toBe('ABC')
  })

  it('normalizes lowercase @syntax to uppercase project code', () => {
    const parts = parseQueryParts('@mdt docker')
    expect(parts.projectCode).toBe('MDT')
    expect(parts.searchText).toBe('docker')
  })

  it('normalizes lowercase ticket key to uppercase', () => {
    const parts = parseQueryParts('abc-42')
    expect(parts.ticketCode).toBe('ABC-42')
    expect(parts.projectCode).toBe('ABC')
  })
})
