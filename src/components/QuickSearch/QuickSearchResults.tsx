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
import type { ScoredProject } from '@/hooks/useProjectSearch'
import type { Ticket } from '@/types/ticket'

import { cn } from '@/lib/utils'
import { DocumentResultRow } from './DocumentResultRow'
import type { DocumentResultItem } from './DocumentResultRow'
import { ProjectResultRow } from './ProjectResultRow'

// ---------------------------------------------------------------------------
// Skeleton card — renders during loading (C4: within 50ms)
// ---------------------------------------------------------------------------

function SkeletonCard(): React.ReactElement {
  return (
    <li className="px-4 py-3" data-testid="quick-search-skeleton">
      <div className="flex items-center gap-3">
        <div className="search-skeleton-bar w-16" />
        <div className="search-skeleton-bar w-48" />
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
      <p className="text-sm search-error-text mb-2">
        {'Search failed: '}
        {error.message}
      </p>
      <button
        type="button"
        data-testid="quick-search-retry"
        className="search-retry-link"
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
        data-selected={isSelected ? 'true' : undefined}
        data-type="cross-project"
        className="search-result"
        onClick={onSelect}
      >
        <div className="flex items-center gap-3">
          <span className="search-result__code">
            {result.ticket.code}
          </span>
          <span className="search-result__title truncate">
            {result.ticket.title}
          </span>
        </div>
        <div className="mt-1 text-xs search-result__project-name">
          <span
            className="search-result__project-label"
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
  /** Project search results (MDT-179) */
  projectResults?: ScoredProject[]
  /** Document search results (MDT-179) */
  documentResults?: DocumentResultItem[]
  /** Active search scope for empty state messaging (MDT-179) */
  activeScope?: string
  /** Callback when a project result is clicked (MDT-179) */
  onSelectProject?: (project: ScoredProject['project']) => void
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
  projectResults = [],
  documentResults = [],
  activeScope,
  onSelectProject,
}: QuickSearchResultsProps): React.ReactElement {
  const isTicketKeyMode = queryMode === 'ticket_key'
  const isProjectScopeMode = queryMode === 'project_scope'
  const isCrossProjectMode = isTicketKeyMode || isProjectScopeMode
  const hasCurrentProjectResults = tickets.length > 0
  const hasCrossProjectResults = crossProjectResults.length > 0

  // Scope filtering (MDT-179): hide ticket results when scope is projects/documents
  const scopeShowsTickets = !activeScope || activeScope === 'global' || activeScope === 'tickets'
  const scopeShowsProjects = !activeScope || activeScope === 'global' || activeScope === 'projects'
  const scopeShowsDocuments = !activeScope || activeScope === 'global' || activeScope === 'documents'

  // Offset computation for selection highlight across sections
  const crossProjectCount = isCrossProjectMode ? crossProjectResults.length : 0
  const currentProjectCount = (isProjectScopeMode ? 0 : tickets.length) * (scopeShowsTickets ? 1 : 0)
  const projectOffset = crossProjectCount + currentProjectCount

  // Invalid project code — show error immediately, no fetch
  if (invalidProjectCode) {
    return (
      <div className="p-8 text-center text-gray-500" data-testid="quick-search-no-results">
        <p className="text-sm search-error-text">
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
  const hasProjectResults = projectResults.length > 0 && scopeShowsProjects
  const hasDocumentResults = documentResults.length > 0 && scopeShowsDocuments
  const visibleTicketResults = scopeShowsTickets && !isProjectScopeMode && hasCurrentProjectResults
  if (!hasCurrentProjectResults && !hasCrossProjectResults && !hasProjectResults && !hasDocumentResults && !crossProjectLoading && !crossProjectError && !isCrossProjectMode) {
    return (
      <div className="p-8 text-center text-gray-500" data-testid="quick-search-no-results">
        {activeScope && activeScope !== 'global'
          ? `No results found in ${activeScope}`
          : 'No results found'}
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
    <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Search results" data-testid="quick-search-results">
      {/* Cross-project section (ticket-key or project-scope mode) */}
      {isCrossProjectMode && scopeShowsTickets && (
        <div role="group" aria-label={isProjectScopeMode ? 'Project Results' : 'Cross-Project Results'} data-testid="quick-search-cross-project-section">
          {/* Section header */}
          <div className="search-section-header">
            {isProjectScopeMode ? 'Project Results' : 'Cross-Project Results'}
          </div>

          {/* Error state */}
          {crossProjectError && (
            <ErrorState error={crossProjectError} onRetry={onRetry} />
          )}

          {/* Loading skeletons (C4: renders within 50ms) */}
          {crossProjectLoading && !crossProjectError && (
            <ul className="search-results-list">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </ul>
          )}

          {/* Cross-project results */}
          {!crossProjectLoading && !crossProjectError && hasCrossProjectResults && (
            <ul className="search-results-list">
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
      {hasCurrentProjectResults && !isProjectScopeMode && scopeShowsTickets && (
        <div role="group" aria-label="Current Project" data-testid="quick-search-current-project-section">
          {isTicketKeyMode && (
            <div className="search-section-header">
              Current Project
            </div>
          )}
          <ul className="search-results-list">
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
                    data-selected={isSelected ? 'true' : undefined}
                    className="search-result"
                    onClick={() => onSelect(ticket)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="search-result__code">
                        {ticket.code}
                      </span>
                      <span className="search-result__title truncate">
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

      {/* MDT-179: Projects section */}
      {projectResults.length > 0 && scopeShowsProjects && (() => {
        const offset = crossProjectCount + currentProjectCount
        return (
          <div role="group" aria-label="Projects" data-testid="quick-search-projects-section">
            <div className="search-section-header">
              Projects
            </div>
            <ul className="search-results-list">
              {projectResults.map((scoredProject, index) => (
                <ProjectResultRow
                  key={scoredProject.project.project?.code ?? scoredProject.project.id}
                  scoredProject={scoredProject}
                  isSelected={selectedIndex === offset + index}
                  onSelect={() => onSelectProject?.(scoredProject.project)}
                />
              ))}
            </ul>
          </div>
        )
      })()}

      {/* MDT-179: Documents section */}
      {documentResults.length > 0 && scopeShowsDocuments && (() => {
        const offset = crossProjectCount + currentProjectCount + projectResults.length
        return (
          <div role="group" aria-label="Documents" data-testid="quick-search-documents-section">
            <div className="search-section-header">
              Documents
            </div>
            <ul className="search-results-list">
              {documentResults.map((doc, index) => (
                <DocumentResultRow
                  key={`${doc.project.code}-${doc.path}`}
                  document={doc}
                  isSelected={selectedIndex === offset + index}
                  onSelect={() => {
                    // Document navigation handled by parent modal
                  }}
                />
              ))}
            </ul>
          </div>
        )
      })()}
    </div>
  )
}
