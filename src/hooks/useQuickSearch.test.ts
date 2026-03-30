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
import { filterTickets, MAX_RESULTS } from './useQuickSearch'

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
