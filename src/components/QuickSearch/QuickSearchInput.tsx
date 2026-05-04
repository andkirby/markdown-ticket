/**
 * QuickSearchInput - Search input component for quick search
 * MDT-136: Cmd+K Quick Search for Tickets
 * MDT-152: Mode indicator display (In: {CODE}, Searching: {KEY})
 *
 * @testid quick-search-input — search input field
 */

import type { QueryMode, QueryParts } from '@/hooks/useQuickSearch'
import { useEffect, useRef } from 'react'

export interface QuickSearchInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  queryMode: QueryMode
  queryParts: QueryParts
  /** Current project code for mode indicator */
  currentProjectCode?: string
}

function getModeLabel(queryMode: QueryMode, queryParts: QueryParts, currentProjectCode?: string): string | null {
  if (queryMode === 'ticket_key' && queryParts.ticketCode) {
    return `Searching: ${queryParts.ticketCode}`
  }
  if (queryMode === 'project_scope' && queryParts.projectCode) {
    return `In: ${queryParts.projectCode}`
  }
  if (queryMode === 'current_project' && currentProjectCode && queryParts.mode === 'current_project') {
    return `In: ${currentProjectCode}`
  }
  return null
}

export function QuickSearchInput({ value, onChange, onKeyDown, queryMode, queryParts, currentProjectCode }: QuickSearchInputProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const modeLabel = getModeLabel(queryMode, queryParts, currentProjectCode)

  return (
    <div className="relative flex items-center">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        ref={inputRef}
        type="text"
        data-testid="quick-search-input"
        className="w-full pl-10 pr-4 py-3 text-lg border-0 bg-transparent focus:outline-none focus:ring-0 placeholder-gray-400"
        placeholder="Search tickets by key or title..."
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {modeLabel && (
        <span
          data-testid="quick-search-mode-indicator"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 whitespace-nowrap"
        >
          {modeLabel}
        </span>
      )}
    </div>
  )
}
