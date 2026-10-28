/**
 * MDT-136: Quick Search with independent entity and project-location controls.
 * @testid quick-search-modal — modal overlay container
 * @testid quick-search-all-projects — opt-in project-location toggle
 */
import type { Project } from '@mdt/shared/models/Project'
import type { Ticket } from '@/types/ticket'
import { SearchScope } from '@mdt/domain-contracts'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Modal, ModalBody } from '@/components/ui/Modal'
import { useCrossProjectSearch } from '@/hooks/useCrossProjectSearch'
import { useProjectSearch } from '@/hooks/useProjectSearch'
import { useQuickSearch } from '@/hooks/useQuickSearch'
import { useSearchScope } from '@/hooks/useSearchScope'
import { resolveQuickSearchQuery } from './queryPolicy'
import { QuickSearchFooter } from './QuickSearchFooter'
import { QuickSearchInput } from './QuickSearchInput'
import { QuickSearchResults } from './QuickSearchResults'
import { SearchHighlight } from './SearchHighlight'
import { SearchScopeBar } from './SearchScopeBar'
import { useQuickSearchKeyboard } from './useQuickSearchKeyboard'

export interface QuickSearchModalProps {
  isOpen: boolean
  onClose: () => void
  tickets: Ticket[]
  onSelectTicket: (ticket: Ticket, targetProjectCode?: string) => void
  onSelectProject?: (project: Project) => void
  currentProjectCode?: string
  projects?: Project[]
}

export function QuickSearchModal({ isOpen, onClose, tickets, onSelectTicket, onSelectProject, currentProjectCode, projects }: QuickSearchModalProps): React.ReactElement | null {
  const [query, setQuery] = useState('')
  const [allProjects, setAllProjects] = useState(!currentProjectCode)
  const searchRef = useRef<HTMLDivElement>(null)
  const hintId = useId()
  const { scope, setScope, resetScope } = useSearchScope()
  const parts = useMemo(() => resolveQuickSearchQuery(query, scope, currentProjectCode, allProjects), [query, scope, currentProjectCode, allProjects])
  const remote = parts.mode === 'ticket_key' || parts.mode === 'project_scope'
  const searchText = parts.searchText ?? parts.ticketCode ?? query.trim()
  const { filteredTickets, selectedIndex, setSelectedIndex } = useQuickSearch({ tickets, query: searchText })
  const { results, loading, error, search, cancel, retry } = useCrossProjectSearch()
  const invalidProjectCode = parts.mode === 'project_scope' && parts.projectCode && projects?.length
    && !projects.some(project => project.project.code === parts.projectCode)
    ? parts.projectCode
    : null
  const showsTickets = scope === SearchScope.GLOBAL || scope === SearchScope.TICKETS
  const { matches: projectMatches } = useProjectSearch({
    projects: (projects ?? []).filter(project => scope === SearchScope.PROJECTS || allProjects || project.project.code === currentProjectCode),
    query: searchText,
  })
  const projectResults = parts.mode !== 'project_scope' && (scope === SearchScope.GLOBAL || scope === SearchScope.PROJECTS) ? projectMatches : []
  const visibleTickets = showsTickets && !remote ? filteredTickets : []
  const remoteResults = remote && showsTickets && (searchText || parts.mode === 'project_scope') && !loading && !error && !invalidProjectCode ? results : []
  const total = visibleTickets.length + remoteResults.length + projectResults.length

  useEffect(() => {
    if (!isOpen || !showsTickets || invalidProjectCode) {
      cancel()
      return
    }
    if (parts.mode === 'project_scope' && parts.projectCode) {
      search({ mode: 'project_scope', query: searchText, projectCode: parts.projectCode, limitPerProject: 5, limitTotal: 15 })
    }
    else if (parts.mode === 'ticket_key' && searchText) {
      search({ mode: 'ticket_key', query: searchText, limitPerProject: 5, limitTotal: 15 })
    }
    else {
      cancel()
    }
  }, [isOpen, showsTickets, invalidProjectCode, parts.mode, parts.projectCode, searchText, search, cancel])

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setAllProjects(!currentProjectCode)
      setSelectedIndex(0)
      resetScope()
    }
  }, [isOpen, currentProjectCode, setSelectedIndex, resetScope])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, scope, allProjects, setSelectedIndex])

  useEffect(() => {
    if (selectedIndex >= total)
      setSelectedIndex(Math.max(0, total - 1))
  }, [selectedIndex, total, setSelectedIndex])

  const selectTicket = useCallback((ticket: Ticket, projectCode?: string) => {
    onSelectTicket(ticket, projectCode)
    onClose()
  }, [onSelectTicket, onClose])
  const selectProject = useCallback((project: Project) => {
    if (onSelectProject) {
      onSelectProject(project)
      onClose()
    }
  }, [onSelectProject, onClose])
  const openSelected = () => {
    const remoteResult = remoteResults[selectedIndex]
    if (remoteResult) {
      selectTicket(remoteResult.ticket as Ticket, remoteResult.project.code)
      return
    }
    const local = visibleTickets[selectedIndex - remoteResults.length]
    if (local) {
      selectTicket(local)
      return
    }
    const project = projectResults[selectedIndex - remoteResults.length - visibleTickets.length]
    if (project)
      selectProject(project.project)
  }
  const resultIdentity = [...remoteResults.map(result => `${result.project.code}:${result.ticket.code}`), ...visibleTickets.map(ticket => ticket.code), ...projectResults.map(result => result.project.id)].join('|')
  const keyboard = useQuickSearchKeyboard({ isOpen, container: searchRef, selectedIndex, setSelectedIndex, total, resultIdentity, onOpen: openSelected })
  const renderMatch = (text: string) => <SearchHighlight text={text} query={searchText} />

  if (!isOpen)
    return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" role="dialog" aria-modal="true" aria-label="Quick search" data-testid="quick-search-modal">
      <ModalBody ref={searchRef} onKeyDown={keyboard.onActionKeyDown} className="modal__body--constrained">
        <div className="modal__section">
          <QuickSearchInput value={query} onChange={setQuery} onKeyDown={keyboard.onInputKeyDown} queryMode={parts.mode} queryParts={parts} currentProjectCode={currentProjectCode} describedBy={hintId} />
        </div>
        <div className="search-toolbar">
          <SearchScopeBar activeScope={scope} onScopeChange={setScope} />
          {showsTickets && (
            <button type="button" className="search-location-toggle" data-testid="quick-search-all-projects" title="Search keys, titles and references across all projects" aria-pressed={allProjects || !currentProjectCode} disabled={!currentProjectCode} onClick={() => setAllProjects(value => !value)}>All projects</button>
          )}
        </div>
        <div className="search-results-body">
          <QuickSearchResults
            query={searchText}
            renderMatch={renderMatch}
            tickets={visibleTickets}
            selectedIndex={selectedIndex}
            onSelect={selectTicket}
            queryMode={parts.mode}
            crossProjectResults={remoteResults}
            crossProjectLoading={remote && showsTickets && loading}
            crossProjectError={remote && showsTickets ? error : null}
            onRetry={retry}
            invalidProjectCode={invalidProjectCode}
            projectResults={projectResults}
            activeScope={scope}
            onSelectProject={selectProject}
          />
        </div>
        <QuickSearchFooter hintId={hintId} />
      </ModalBody>
    </Modal>
  )
}
