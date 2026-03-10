/**
 * QuickSearchResults - Results list for quick search
 * MDT-136: Cmd+K Quick Search for Tickets
 *
 * @testid quick-search-results — results list container
 * @testid quick-search-result-item — individual result item
 * @testid quick-search-no-results — no results message
 * @testid quick-search-selected-result — currently selected result item
 */

import type { Ticket } from '@/types/ticket'

export interface QuickSearchResultsProps {
  tickets: Ticket[]
  selectedIndex: number
  onSelect: (ticket: Ticket) => void
}

export function QuickSearchResults({ tickets, selectedIndex, onSelect }: QuickSearchResultsProps): React.ReactElement {
  if (tickets.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500" data-testid="quick-search-no-results">
        No results found
      </div>
    )
  }

  return (
    <div className="max-h-[50vh] overflow-y-auto" data-testid="quick-search-results">
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {tickets.map((ticket, index) => (
          <li key={ticket.code}>
            <button
              type="button"
              data-testid="quick-search-result-item"
              aria-selected={index === selectedIndex}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                index === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
              onClick={() => onSelect(ticket)}
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
                  {ticket.code}
                </span>
                <span className="text-gray-900 dark:text-gray-100 truncate">
                  {ticket.title}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
