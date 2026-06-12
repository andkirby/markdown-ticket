/**
 * QuickSearchModal - Modal overlay for quick ticket search
 * MDT-136: Cmd+K Quick Search for Tickets
 * MDT-152: Cross-project search modes (ticket-key, project-scope)
 *
 * @testid quick-search-modal — modal overlay container
 */

import type { SearchScopeValue } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project'
import type { QueryMode } from '@/hooks/useQuickSearch'

import type { Ticket } from '@/types/ticket'

import { SearchScope, SearchScopes } from '@mdt/domain-contracts'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Modal, ModalBody } from '@/components/ui/Modal'
import { useCrossProjectSearch } from '@/hooks/useCrossProjectSearch'
import { useProjectSearch } from '@/hooks/useProjectSearch'
import { parseQueryMode, parseQueryParts, useQuickSearch } from '@/hooks/useQuickSearch'
import { useSearchScope } from '@/hooks/useSearchScope'

import { QuickSearchInput } from './QuickSearchInput'
import { QuickSearchResults } from './QuickSearchResults'
import { SearchScopeBar } from './SearchScopeBar'

export interface QuickSearchModalProps {
  isOpen: boolean
  onClose: () => void
  tickets: Ticket[]
  onSelectTicket: (ticket: Ticket, targetProjectCode?: string) => void
  /** MDT-179: Navigate to a project. If not provided, project clicks do nothing. */
  onSelectProject?: (project: Project) => void
  /** Current project code for mode indicator and cross-project filtering */
  currentProjectCode?: string
  /** All known projects — used to validate @CODE project-scoped queries and project search */
  projects?: Project[]
}

export function QuickSearchModal({ isOpen, onClose, tickets, onSelectTicket, onSelectProject, currentProjectCode, projects }: QuickSearchModalProps): React.ReactElement | null {
  const [query, setQuery] = useState('')
  const { scope, setScope, cycleScope: _cycleScope, resetScope } = useSearchScope()

  const { filteredTickets, selectedIndex, setSelectedIndex } = useQuickSearch({ tickets, query })
  const crossProject = useCrossProjectSearch()

  // MDT-179: Client-side project matching
  const { matches: projectMatches } = useProjectSearch({
    projects: projects ?? [],
    query,
  })

  // Parse query mode (scope-aware for MDT-179)
  const queryMode: QueryMode = useMemo(() => parseQueryMode(query, scope), [query, scope])
  const queryParts = useMemo(() => parseQueryParts(query), [query])

  // Validate project code for project_scope mode (client-side check)
  const invalidProjectCode = queryMode === 'project_scope' && queryParts.projectCode
    ? (() => {
        const code = queryParts.projectCode!
        if (!projects || projects.length === 0)
          return false // can't validate yet, let backend decide
        const known = projects.some(p => p.project?.code === code)
        return !known
      })()
    : false

  // Trigger cross-project search when mode changes to ticket_key or project_scope
  useEffect(() => {
    if (queryMode === 'ticket_key' && queryParts.ticketCode) {
      crossProject.search({
        mode: 'ticket_key',
        query: queryParts.ticketCode,
        limitPerProject: 5,
        limitTotal: 15,
      })
    }
    else if (queryMode === 'project_scope' && queryParts.projectCode && queryParts.searchText && !invalidProjectCode) {
      crossProject.search({
        mode: 'project_scope',
        query: queryParts.searchText,
        projectCode: queryParts.projectCode,
        limitPerProject: 5,
        limitTotal: 15,
      })
    }
    else {
      crossProject.cancel()
    }
  }, [queryMode, queryParts.ticketCode, queryParts.projectCode, queryParts.searchText, invalidProjectCode, crossProject])

  // Cleanup cross-project search on close
  useEffect(() => {
    if (!isOpen) {
      crossProject.cancel()
    }
  }, [isOpen, crossProject])

  // Reset query and scope when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      resetScope()
    }
  }, [isOpen, setSelectedIndex, resetScope])

  // Exclude current project from cross-project results — the current project
  // section already shows those tickets via filteredTickets
  const filteredCrossProjectResults = useMemo(
    () => crossProject.results.filter(r => r.project.code !== currentProjectCode),
    [crossProject.results, currentProjectCode],
  )

  // Compute total selectable results across all sections (MDT-179: includes project matches, respects scope)
  const _projectCount = (scope === SearchScope.GLOBAL || scope === SearchScope.PROJECTS) && projectMatches.length
  const scopedProjectResults = useMemo(() => (scope === SearchScope.GLOBAL || scope === SearchScope.PROJECTS)
    ? projectMatches
    : [], [scope, projectMatches])
  // Scope filtering: hide tickets when scope is projects/documents
  const scopeShowsTickets = scope === SearchScope.GLOBAL || scope === SearchScope.TICKETS
  const visibleTickets = useMemo(() => scopeShowsTickets ? filteredTickets : [], [scopeShowsTickets, filteredTickets])
  const totalSelectableResults = (queryMode === 'ticket_key' || queryMode === 'project_scope')
    ? filteredCrossProjectResults.length + (queryMode === 'project_scope' ? 0 : visibleTickets.length) + scopedProjectResults.length
    : visibleTickets.length + scopedProjectResults.length

  // Clamp selectedIndex when results change
  useMemo(() => {
    if (totalSelectableResults > 0 && selectedIndex >= totalSelectableResults) {
      setSelectedIndex(Math.max(0, totalSelectableResults - 1))
    }
    else if (totalSelectableResults === 0 && selectedIndex !== 0) {
      setSelectedIndex(0)
    }
  }, [totalSelectableResults, selectedIndex, setSelectedIndex])

  // Compute section counts for Enter handler dispatch (MDT-179)
  const crossProjectCount = (queryMode === 'ticket_key' || queryMode === 'project_scope') ? filteredCrossProjectResults.length : 0
  const currentProjectCount = queryMode === 'project_scope' ? 0 : visibleTickets.length
  const _scopedProjectCount = scopedProjectResults.length

  /** Scopes available for Tab cycling (Documents hidden until doc search is implemented). */
  const cycleableScopes = useMemo(() => SearchScopes.filter((s): s is SearchScopeValue => s !== SearchScope.DOCUMENTS), [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // MDT-179: Tab cycles scope (All → Tickets → Projects)
    if (e.key === 'Tab') {
      e.preventDefault()
      const currentIdx = cycleableScopes.indexOf(scope)
      if (e.shiftKey) {
        const prevIndex = currentIdx - 1
        setScope(cycleableScopes[prevIndex < 0 ? cycleableScopes.length - 1 : prevIndex] as SearchScopeValue)
      }
      else {
        const nextIndex = (currentIdx + 1) % cycleableScopes.length
        setScope(cycleableScopes[nextIndex] as SearchScopeValue)
      }
      return
    }

    if (e.key === 'Enter') {
      // Check project results first (MDT-179)
      const projectStartIndex = crossProjectCount + currentProjectCount
      if (selectedIndex >= projectStartIndex && scopedProjectResults.length > 0) {
        const projectIndex = selectedIndex - projectStartIndex
        const scoredProject = scopedProjectResults[projectIndex]
        if (scoredProject && onSelectProject) {
          onSelectProject(scoredProject.project)
          onClose()
          return
        }
      }

      // In cross-project modes, check cross-project results
      if (queryMode === 'ticket_key' || queryMode === 'project_scope') {
        if (selectedIndex < filteredCrossProjectResults.length) {
          const result = filteredCrossProjectResults[selectedIndex]
          if (result) {
            onSelectTicket({ code: result.ticket.code, title: result.ticket.title } as Ticket, result.project.code)
            onClose()
            return
          }
        }
      }
      // Fall back to current project results
      const effectiveIndex = queryMode === 'ticket_key'
        ? selectedIndex - filteredCrossProjectResults.length
        : selectedIndex
      if (effectiveIndex >= 0 && effectiveIndex < visibleTickets.length) {
        const selectedTicket = visibleTickets[effectiveIndex]
        if (selectedTicket) {
          onSelectTicket(selectedTicket)
          onClose()
        }
      }
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(Math.min(selectedIndex + 1, Math.max(0, totalSelectableResults - 1)))
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(Math.max(selectedIndex - 1, 0))
    }
  }, [queryMode, visibleTickets, filteredCrossProjectResults, scopedProjectResults, selectedIndex, totalSelectableResults, onSelectTicket, onSelectProject, onClose, setScope, scope, cycleableScopes, crossProjectCount, currentProjectCount, setSelectedIndex])

  const handleSelectTicket = useCallback((ticket: Ticket, targetProjectCode?: string) => {
    onSelectTicket(ticket, targetProjectCode)
    onClose()
  }, [onSelectTicket, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" overlayClassName="backdrop-blur-sm" data-testid="quick-search-modal">
      <ModalBody className="modal__body--constrained">
        {/* Search input */}
        <div className="modal__section">
          <QuickSearchInput
            value={query}
            onChange={setQuery}
            onKeyDown={handleKeyDown}
            queryMode={queryMode}
            queryParts={queryParts}
            currentProjectCode={currentProjectCode}
          />
        </div>

        {/* MDT-179: Scope bar */}
        <SearchScopeBar
          activeScope={scope}
          onScopeChange={setScope}
        />

        {/* Results */}
        <QuickSearchResults
          tickets={visibleTickets}
          selectedIndex={selectedIndex}
          onSelect={handleSelectTicket}
          queryMode={queryMode}
          crossProjectResults={filteredCrossProjectResults}
          crossProjectLoading={crossProject.loading}
          crossProjectError={crossProject.error}
          onRetry={crossProject.retry}
          invalidProjectCode={invalidProjectCode ? queryParts.projectCode ?? null : null}
          projectResults={scopedProjectResults}
          activeScope={scope}
          onSelectProject={(project) => {
            if (onSelectProject) {
              onSelectProject(project as Project)
              onClose()
            }
          }}
        />
      </ModalBody>
    </Modal>
  )
}
