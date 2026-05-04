/**
 * QuickSearchResults - Results list for quick search
 * MDT-136: Cmd+K Quick Search for Tickets
 * MDT-152: Cross-project results, loading skeletons, error/retry states
 *
 * @testid quick-search-results — results list container
 * @testid quick-search-result-item — individual result item
 * @testid quick-search-no-results — no results message
 * @testid quick-search-selected-result — currently selected result item
 */

import type { SearchResponse } from '@mdt/domain-contracts'
import type { QueryMode } from '@/hooks/useQuickSearch'
import type { Ticket } from '@/types/ticket'

// ---------------------------------------------------------------------------
// Skeleton card — renders during loading (C4: within 50ms)
// ---------------------------------------------------------------------------

function SkeletonCard(): React.ReactElement {
  return (
    <li className="px-4 py-3" data-testid="quick-search-skeleton">
      <div className="flex items-center gap-3 animate-pulse">
        <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Error state with retry (Edge-4)
// ---------------------------------------------------------------------------

interface ErrorStateProps {
  error: Error
  onRetry: () => void
}

function ErrorState({ error, onRetry }: ErrorStateProps): React.ReactElement {
  return (
    <div className="p-4 text-center" data-testid="quick-search-error">
      <p className="text-sm text-red-600 dark:text-red-400 mb-2">
        {'Search failed: '}
        {error.message}
      </p>
      <button
        type="button"
        data-testid="quick-search-retry"
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cross-project result item
// ---------------------------------------------------------------------------

interface CrossProjectResultItemProps {
  result: SearchResponse['results'][number]
  isSelected: boolean
  onSelect: () => void
}

function CrossProjectResultItem({ result, isSelected, onSelect }: CrossProjectResultItemProps): React.ReactElement {
  return (
    <li>
      <button
        type="button"
        role="option"
        aria-selected={isSelected}
        data-testid="quick-search-cross-project-result-item"
        className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ring-inset ${
          isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : ''
        }`}
        onClick={onSelect}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400 whitespace-nowrap shrink-0">
            {result.ticket.code}
          </span>
          <span className="text-gray-900 dark:text-gray-100 truncate">
            {result.ticket.title}
          </span>
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
            data-testid="quick-search-project-label"
          >
            {result.project.code}
          </span>
          <span className="ml-1.5">{result.project.name}</span>
        </div>
      </button>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Main results component
// ---------------------------------------------------------------------------

export interface QuickSearchResultsProps {
  tickets: Ticket[]
  selectedIndex: number
  onSelect: (ticket: Ticket, targetProjectCode?: string) => void
  queryMode: QueryMode
  crossProjectResults: SearchResponse['results']
  crossProjectLoading: boolean
  crossProjectError: Error | null
  onRetry: () => void
  /** Invalid project code from client-side validation (null when valid) */
  invalidProjectCode: string | null
  /** Total results for keyboard nav — reserved for future cross-section navigation */
  _totalResults?: number
}

export function QuickSearchResults({
  tickets,
  selectedIndex,
  onSelect,
  queryMode,
  crossProjectResults,
  crossProjectLoading,
  crossProjectError,
  onRetry,
  invalidProjectCode,
}: QuickSearchResultsProps): React.ReactElement {
  const isTicketKeyMode = queryMode === 'ticket_key'
  const isProjectScopeMode = queryMode === 'project_scope'
  const isCrossProjectMode = isTicketKeyMode || isProjectScopeMode
  const hasCurrentProjectResults = tickets.length > 0
  const hasCrossProjectResults = crossProjectResults.length > 0

  // Invalid project code — show error immediately, no fetch
  if (invalidProjectCode) {
    return (
      <div className="p-8 text-center text-gray-500" data-testid="quick-search-no-results">
        <p className="text-sm text-red-600 dark:text-red-400">
          Project
          {' '}
          <span className="font-mono font-medium">{invalidProjectCode}</span>
          {' '}
          not found
        </p>
      </div>
    )
  }

  // Nothing at all yet — default empty state
  if (!hasCurrentProjectResults && !hasCrossProjectResults && !crossProjectLoading && !crossProjectError && !isCrossProjectMode) {
    return (
      <div className="p-8 text-center text-gray-500" data-testid="quick-search-no-results">
        No results found
      </div>
    )
  }

  // Cross-project modes (ticket_key / project_scope): no results anywhere, not loading, no error
  if (isCrossProjectMode && !hasCurrentProjectResults && !hasCrossProjectResults && !crossProjectLoading && !crossProjectError) {
    return (
      <div className="p-8 text-center text-gray-500" data-testid="quick-search-no-results">
        {isProjectScopeMode ? 'No matching tickets found in this project' : 'No matching tickets found'}
      </div>
    )
  }

  return (
    <div className="max-h-[50vh] overflow-y-auto" role="listbox" aria-label="Search results" data-testid="quick-search-results">
      {/* Cross-project section (ticket-key or project-scope mode) */}
      {isCrossProjectMode && (
        <div role="group" aria-label={isProjectScopeMode ? 'Project Results' : 'Cross-Project Results'} data-testid="quick-search-cross-project-section">
          {/* Section header */}
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
            {isProjectScopeMode ? 'Project Results' : 'Cross-Project Results'}
          </div>

          {/* Error state */}
          {crossProjectError && (
            <ErrorState error={crossProjectError} onRetry={onRetry} />
          )}

          {/* Loading skeletons (C4: renders within 50ms) */}
          {crossProjectLoading && !crossProjectError && (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </ul>
          )}

          {/* Cross-project results */}
          {!crossProjectLoading && !crossProjectError && hasCrossProjectResults && (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {crossProjectResults.map((result, index) => (
                <CrossProjectResultItem
                  key={result.ticket.code}
                  result={result}
                  isSelected={index === selectedIndex}
                  onSelect={() => {
                    // Map cross-project result to a minimal Ticket for navigation
                    onSelect({ code: result.ticket.code, title: result.ticket.title } as Ticket, result.project.code)
                  }}
                />
              ))}
            </ul>
          )}

          {/* Empty cross-project results after loading */}
          {!crossProjectLoading && !crossProjectError && !hasCrossProjectResults && !hasCurrentProjectResults && (
            <div className="p-6 text-center text-sm text-gray-500" data-testid="quick-search-ticket-not-found">
              {isProjectScopeMode ? 'No tickets found in this project' : 'Ticket not found'}
            </div>
          )}
        </div>
      )}

      {/* Current project section — hidden in project_scope mode (results come from cross-project) */}
      {hasCurrentProjectResults && !isProjectScopeMode && (
        <div role="group" aria-label="Current Project" data-testid="quick-search-current-project-section">
          {isTicketKeyMode && (
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-800">
              Current Project
            </div>
          )}
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {tickets.map((ticket, index) => {
              // Offset index by cross-project results count for selection
              const effectiveIndex = isTicketKeyMode ? crossProjectResults.length + index : index
              const isSelected = effectiveIndex === selectedIndex
              return (
                <li key={ticket.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-testid="quick-search-result-item"
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ring-inset ${
                      isSelected ? 'ring-2 ring-blue-400 dark:ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : ''
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
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
