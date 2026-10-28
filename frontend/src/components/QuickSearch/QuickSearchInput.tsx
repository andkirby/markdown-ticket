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
  describedBy?: string
  value: string
  onChange: (_value: string) => void
  onKeyDown?: (_event: React.KeyboardEvent) => void
  queryMode: QueryMode
  queryParts: QueryParts
  /** Current project code for mode indicator */
  currentProjectCode?: string
}

function getModeLabel(queryMode: QueryMode, queryParts: QueryParts, currentProjectCode?: string): string | null {
  if (queryMode === 'ticket_key' && queryParts.searchText !== undefined)
    return 'All projects'
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

export function QuickSearchInput({ describedBy, value, onChange, onKeyDown, queryMode, queryParts, currentProjectCode }: QuickSearchInputProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const modeLabel = getModeLabel(queryMode, queryParts, currentProjectCode)

  return (
    <div className="search-input">
      <svg
        className="search-input__icon"
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
        aria-label="Search query"
        data-testid="quick-search-input"
        className="search-input__field"
        aria-describedby={describedBy}
        placeholder="Search tickets by key, title or reference..."
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {modeLabel && (
        <span
          data-testid="quick-search-mode-indicator"
          className="search-mode-badge"
        >
          {modeLabel}
        </span>
      )}
    </div>
  )
}
