/**
 * useQuickSearch - Client-side ticket filtering hook
 * MDT-136: Cmd+K Quick Search for Tickets
 */

import type { Ticket } from '@/types/ticket'

import { useCallback, useMemo, useState } from 'react'

export const MAX_RESULTS = 10

export interface FilterTicketsOptions {
  query: string
  tickets: Ticket[]
  maxResults?: number
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
      // Match by key number (e.g., "136" matches "MDT-136")
      if (keyNum.includes(term)) {
        return true
      }
      // Match by full code (e.g., "mdt-136" matches "MDT-136")
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
