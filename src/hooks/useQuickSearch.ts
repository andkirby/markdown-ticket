/**
 * useQuickSearch - Client-side ticket filtering hook
 * MDT-136: Cmd+K Quick Search for Tickets
 */

import type { Ticket } from '@/types/ticket'

import { TICKET_KEY_INPUT_PATTERN, PROJECT_SCOPE_INPUT_PATTERN } from '@mdt/domain-contracts'
import { useCallback, useMemo, useState } from 'react'

// ---------------------------------------------------------------------------
// MDT-152: Query Mode Detection — pure functions
// ---------------------------------------------------------------------------

export type QueryMode = 'current_project' | 'ticket_key' | 'project_scope'

export interface QueryParts {
  mode: QueryMode
  projectCode?: string
  searchText?: string
  ticketCode?: string
}

/**
 * Classify a raw search query into one of three modes:
 *   'ticket_key'      — CODE-NUMBER (2-5 uppercase letters, 1-5 digits)
 *   'project_scope'   — @CODE followed by space and search text
 *   'current_project' — plain text, anything else
 */
export function parseQueryMode(query: string): QueryMode {
  const trimmed = query.trim()

  if (!trimmed)
    return 'current_project'

  // @CODE space text → project_scope
  const projectMatch = trimmed.match(PROJECT_SCOPE_INPUT_PATTERN)
  if (projectMatch)
    return 'project_scope'

  // CODE-NUMBER → ticket_key
  const ticketMatch = trimmed.match(TICKET_KEY_INPUT_PATTERN)
  if (ticketMatch)
    return 'ticket_key'

  return 'current_project'
}

/**
 * Extract structured fields from a parsed query.
 * Returns projectCode + searchText for project_scope,
 * ticketCode + projectCode for ticket_key,
 * or just the mode for current_project.
 */
export function parseQueryParts(query: string): QueryParts {
  const mode = parseQueryMode(query)
  const trimmed = query.trim()

  if (mode === 'project_scope') {
    const match = trimmed.match(PROJECT_SCOPE_INPUT_PATTERN)
    return { mode, projectCode: match?.[1]?.toUpperCase() ?? '', searchText: match?.[2] ?? '' }
  }

  if (mode === 'ticket_key') {
    const match = trimmed.match(TICKET_KEY_INPUT_PATTERN)!
    return { mode, ticketCode: match[0].toUpperCase(), projectCode: match[1].toUpperCase() }
  }

  return { mode }
}

// ---------------------------------------------------------------------------
// MDT-136: Quick Search — filtering and hook
// ---------------------------------------------------------------------------

export const MAX_RESULTS = 10

export interface FilterTicketsOptions {
  query: string
  tickets: Ticket[]
  maxResults?: number
}

/**
 * Normalize a ticket key's number part to zero-padded format.
 * E.g. "MDT-42" → "mdt-042", "42" → "042"
 * Used so that simplified keys (MDT-42) match stored keys (MDT-042).
 */
function normalizeTicketKeyTerm(term: string): string {
  const match = term.match(/^([a-z]+)-0*(\d+)$/i)
  if (match) {
    const prefix = match[1]!.toUpperCase()
    const padded = match[2]!.padStart(3, '0')
    return `${prefix}-${padded}`.toLowerCase()
  }
  return term
}

/**
 * Pure filtering function for tickets - exported for unit testing
 */
export function filterTickets(options: FilterTicketsOptions): Ticket[] {
  const { query, tickets, maxResults = MAX_RESULTS } = options

  if (!query.trim()) {
    return tickets.slice(0, maxResults)
  }

  const searchTerms = query.toLowerCase().trim().split(/\s+/)

  const matches = tickets.filter((ticket) => {
    const keyNum = ticket.code.split('-')[1] || ''
    const code = ticket.code.toLowerCase()
    const title = ticket.title.toLowerCase()

    // All search terms must match (AND logic)
    return searchTerms.every((term) => {
      // Normalize simplified ticket keys (e.g., "mdt-42" → "mdt-042")
      // so they match zero-padded stored keys
      const normalizedTerm = normalizeTicketKeyTerm(term)

      // Match by key number (e.g., "136" matches "MDT-136")
      if (keyNum.includes(term)) {
        return true
      }
      // Match by full code (e.g., "mdt-136" matches "MDT-136")
      if (code.includes(normalizedTerm)) {
        return true
      }
      // Also try original term for non-key searches
      if (code.includes(term)) {
        return true
      }
      // Match by title substring
      if (title.includes(term)) {
        return true
      }
      return false
    })
  })

  return matches.slice(0, maxResults)
}

export interface UseQuickSearchOptions {
  tickets: Ticket[]
  query: string
}

export interface UseQuickSearchResult {
  filteredTickets: Ticket[]
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
}

export function useQuickSearch(options: UseQuickSearchOptions): UseQuickSearchResult {
  const { tickets, query } = options
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Filter tickets by query
  const filteredTickets = useMemo(() => {
    return filterTickets({ query, tickets })
  }, [tickets, query])

  // Reset selection when filtered results change
  useMemo(() => {
    if (selectedIndex >= filteredTickets.length) {
      setSelectedIndex(Math.max(0, filteredTickets.length - 1))
    }
  }, [filteredTickets.length, selectedIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredTickets.length - 1))
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    }
  }, [filteredTickets.length])

  return {
    filteredTickets,
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
  }
}
