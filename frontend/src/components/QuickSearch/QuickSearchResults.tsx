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
import type { ReactNode } from 'react'
import type { DocumentResultItem } from './DocumentResultRow'
import type { ScoredProject } from '@/hooks/useProjectSearch'
import type { QueryMode } from '@/hooks/useQuickSearch'

import type { Ticket } from '@/types/ticket'
import { ExternalReferenceBadges } from '@/components/Badge/ExternalReferenceBadges'
import { TicketCode } from '@/components/TicketCode'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DocumentResultRow } from './DocumentResultRow'
import { ProjectResultRow } from './ProjectResultRow'

// ---------------------------------------------------------------------------
// Skeleton card — renders during loading (C4: within 50ms)
// ---------------------------------------------------------------------------

function SkeletonCard(): React.ReactElement {
  return (
    <li className="search-skeleton-card" data-testid="quick-search-skeleton">
      <div className="search-result__row">
        <div className="search-skeleton-bar search-skeleton-bar--short" />
        <div className="search-skeleton-bar search-skeleton-bar--long" />
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
    <div className="search-error-state" data-testid="quick-search-error">
      <p className="search-error-state__message search-error-text">
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
  query?: string
  renderMatch?: (text: string) => ReactNode
  result: SearchResponse['results'][number]
  isSelected: boolean
  onSelect: () => void
}

function CrossProjectResultItem({ result, isSelected, onSelect, query, renderMatch }: CrossProjectResultItemProps): React.ReactElement {
  return (
    <li>
      <div
        data-testid="quick-search-cross-project-result-item"
        data-selected={isSelected ? 'true' : undefined}
        data-type="cross-project"
        className="search-result"
      >
        <button type="button" className="search-result__select" onClick={onSelect} aria-current={isSelected ? 'true' : undefined}>
          <div className="search-result__row">
            <TicketCode code={result.ticket.code} priority={result.ticket.priority ?? undefined} status={result.ticket.status ?? undefined} className="search-result__code" renderCode={renderMatch} />
            <span className="search-result__title">
              {renderMatch ? renderMatch(result.ticket.title) : result.ticket.title}
            </span>
          </div>
        </button>
        <div className="search-result__metadata">
          <span className="search-result__project">
            <span
              className="search-result__project-label"
              data-testid="quick-search-project-label"
            >
              {renderMatch ? renderMatch(result.project.code) : result.project.code}
            </span>
            <span className="search-result__project-title">{renderMatch ? renderMatch(result.project.name) : result.project.name}</span>
          </span>
          <div className="search-result__references"><ExternalReferenceBadges refs={result.ticket.refs} externalRefs={result.ticket.externalRefs} query={query} renderLabel={renderMatch} /></div>
        </div>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Main results component
// ---------------------------------------------------------------------------

export interface QuickSearchResultsProps {
  query?: string
  renderMatch?: (text: string) => ReactNode
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
  query,
  renderMatch,
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
  const _projectOffset = crossProjectCount + currentProjectCount

  // Invalid project code — show error immediately, no fetch
  if (invalidProjectCode) {
    return (
      <div className="search-empty-state" data-testid="quick-search-no-results">
        <p className="search-error-text">
          Project
          {' '}
          <span className="search-empty-state__code">{invalidProjectCode}</span>
          {' '}
          not found
        </p>
      </div>
    )
  }

  // Nothing at all yet — default empty state
  const hasProjectResults = projectResults.length > 0 && scopeShowsProjects
  const hasDocumentResults = documentResults.length > 0 && scopeShowsDocuments
  const _visibleTicketResults = scopeShowsTickets && !isProjectScopeMode && hasCurrentProjectResults
  if (!hasCurrentProjectResults && !hasCrossProjectResults && !hasProjectResults && !hasDocumentResults && !crossProjectLoading && !crossProjectError && !isCrossProjectMode) {
    return (
      <div className="search-empty-state" data-testid="quick-search-no-results">
        {activeScope && activeScope !== 'global'
          ? `No results found in ${activeScope}`
          : 'No results found'}
      </div>
    )
  }

  // Cross-project modes (ticket_key / project_scope): no results anywhere, not loading, no error
  if (isCrossProjectMode && !hasCurrentProjectResults && !hasCrossProjectResults && !hasProjectResults && !hasDocumentResults && !crossProjectLoading && !crossProjectError) {
    return (
      <div className="search-empty-state" data-testid="quick-search-no-results">
        {isTicketKeyMode && query !== undefined && !query.trim() ? 'Type to search all projects' : isProjectScopeMode ? 'No matching tickets found in this project' : 'No matching tickets found'}
      </div>
    )
  }

  return (
    <ScrollArea type="hover" scrollHideDelay={600} className="search-results-scroll" role="region" aria-label="Search results" data-testid="quick-search-results">
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
                  key={`${result.project.code}:${result.ticket.code}`}
                  result={result}
                  query={query}
                  renderMatch={renderMatch}
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
            <div className="search-empty-state search-empty-state--compact" data-testid="quick-search-ticket-not-found">
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
                  <div
                    data-testid="quick-search-result-item"
                    data-selected={isSelected ? 'true' : undefined}
                    className="search-result"
                  >
                    <button type="button" className="search-result__select" onClick={() => onSelect(ticket)} aria-current={isSelected ? 'true' : undefined}>
                      <div className="search-result__row">
                        <TicketCode code={ticket.code} priority={ticket.priority} status={ticket.status} className="search-result__code" renderCode={renderMatch} />
                        <span className="search-result__title">
                          {renderMatch ? renderMatch(ticket.title) : ticket.title}
                        </span>
                      </div>
                    </button>
                    <div className="search-result__references"><ExternalReferenceBadges refs={ticket.refs} externalRefs={ticket.externalRefs} query={query} renderLabel={renderMatch} /></div>
                  </div>
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
                  renderMatch={renderMatch}
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
    </ScrollArea>
  )
}
