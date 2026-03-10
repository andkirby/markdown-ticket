/**
 * QuickSearchInput - Search input component for quick search
 * MDT-136: Cmd+K Quick Search for Tickets
 *
 * @testid quick-search-input — search input field
 */

import { useEffect, useRef } from 'react'

export interface QuickSearchInputProps {
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export function QuickSearchInput({ value, onChange, onKeyDown }: QuickSearchInputProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className="relative">
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
    </div>
  )
}
