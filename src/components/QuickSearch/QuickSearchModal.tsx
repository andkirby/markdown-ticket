/**
 * QuickSearchModal - Modal overlay for quick ticket search
 * MDT-136: Cmd+K Quick Search for Tickets
 * MDT-152: Cross-project search modes (ticket-key, project-scope)
 *
 * @testid quick-search-modal — modal overlay container
 */

import type { Project } from '@mdt/shared/models/Project'
import type { QueryMode } from '@/hooks/useQuickSearch'
import type { Ticket } from '@/types/ticket'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { createPortal } from 'react-dom'
import { useCrossProjectSearch } from '@/hooks/useCrossProjectSearch'
import { parseQueryMode, parseQueryParts, useQuickSearch } from '@/hooks/useQuickSearch'

import { QuickSearchInput } from './QuickSearchInput'
import { QuickSearchResults } from './QuickSearchResults'

export interface QuickSearchModalProps {
  isOpen: boolean
  onClose: () => void
  tickets: Ticket[]
  onSelectTicket: (ticket: Ticket, targetProjectCode?: string) => void
  /** Current project code for mode indicator and cross-project filtering */
  currentProjectCode?: string
  /** All known projects — used to validate @CODE project-scoped queries */
  projects?: Project[]
}

export function QuickSearchModal({ isOpen, onClose, tickets, onSelectTicket, currentProjectCode, projects }: QuickSearchModalProps): React.ReactElement | null {
  const [query, setQuery] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)

  const { filteredTickets, selectedIndex, setSelectedIndex } = useQuickSearch({ tickets, query })
  const crossProject = useCrossProjectSearch()

  // Parse query mode
  const queryMode: QueryMode = useMemo(() => parseQueryMode(query), [query])
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
    // crossProject is a stable hook return — re-create only on query changes
  }, [queryMode, queryParts.ticketCode, queryParts.projectCode, queryParts.searchText, invalidProjectCode, crossProject.search, crossProject.cancel])

  // Cleanup cross-project search on close
  useEffect(() => {
    if (!isOpen) {
      crossProject.cancel()
    }
  }, [isOpen, crossProject.cancel])

  // Reset query when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [isOpen, setSelectedIndex])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Exclude current project from cross-project results — the current project
  // section already shows those tickets via filteredTickets
  const filteredCrossProjectResults = useMemo(
    () => crossProject.results.filter(r => r.project.code !== currentProjectCode),
    [crossProject.results, currentProjectCode],
  )

  // Compute total selectable results across all sections
  const totalSelectableResults = (queryMode === 'ticket_key' || queryMode === 'project_scope')
    ? filteredCrossProjectResults.length + (queryMode === 'project_scope' ? 0 : filteredTickets.length)
    : filteredTickets.length

  // Clamp selectedIndex when results change
  useMemo(() => {
    if (totalSelectableResults > 0 && selectedIndex >= totalSelectableResults) {
      setSelectedIndex(Math.max(0, totalSelectableResults - 1))
    }
    else if (totalSelectableResults === 0 && selectedIndex !== 0) {
      setSelectedIndex(0)
    }
  }, [totalSelectableResults, selectedIndex])

  // Compute section boundaries for Tab navigation
  const crossProjectCount = (queryMode === 'ticket_key' || queryMode === 'project_scope') ? filteredCrossProjectResults.length : 0
  const currentProjectCount = queryMode === 'project_scope' ? 0 : filteredTickets.length
  const sectionBoundaries = useMemo(() => {
    const boundaries: { start: number, end: number, label: string }[] = []
    if (crossProjectCount > 0) {
      boundaries.push({ start: 0, end: crossProjectCount - 1, label: 'Cross-Project Results' })
    }
    if (currentProjectCount > 0) {
      boundaries.push({ start: crossProjectCount, end: crossProjectCount + currentProjectCount - 1, label: 'Current Project' })
    }
    return boundaries
  }, [crossProjectCount, currentProjectCount])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      // In cross-project modes, check cross-project results first
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
      if (effectiveIndex >= 0 && effectiveIndex < filteredTickets.length) {
        const selectedTicket = filteredTickets[effectiveIndex]
        if (selectedTicket) {
          onSelectTicket(selectedTicket)
          onClose()
        }
      }
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(Math.min(selectedIndex + 1, totalSelectableResults - 1))
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(Math.max(selectedIndex - 1, 0))
    }
    else if (e.key === 'Tab') {
      e.preventDefault()
      if (sectionBoundaries.length <= 1)
        return
      // Find which section we're currently in, then jump to start of next section
      const currentSection = sectionBoundaries.findIndex(
        s => selectedIndex >= s.start && selectedIndex <= s.end,
      )
      if (currentSection === -1)
        return
      const nextSection = e.shiftKey
        ? (currentSection - 1 + sectionBoundaries.length) % sectionBoundaries.length
        : (currentSection + 1) % sectionBoundaries.length
      setSelectedIndex(sectionBoundaries[nextSection]!.start)
    }
  }, [queryMode, filteredTickets, filteredCrossProjectResults, selectedIndex, totalSelectableResults, sectionBoundaries, onSelectTicket, onClose])

  const handleSelectTicket = useCallback((ticket: Ticket, targetProjectCode?: string) => {
    onSelectTicket(ticket, targetProjectCode)
    onClose()
  }, [onSelectTicket, onClose])

  if (!isOpen) {
    return null
  }

  const modalContent = (
    <div className="fixed inset-0 z-50" data-testid="quick-search-modal">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal container */}
      <div className="flex min-h-screen items-start justify-center pt-[15vh] pointer-events-none">
        <div
          ref={modalRef}
          className="pointer-events-auto relative w-full max-w-[900px] mx-4 bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search input */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <QuickSearchInput
              value={query}
              onChange={setQuery}
              onKeyDown={handleKeyDown}
              queryMode={queryMode}
              queryParts={queryParts}
              currentProjectCode={currentProjectCode}
            />
          </div>

          {/* Results */}
          <QuickSearchResults
            tickets={filteredTickets}
            selectedIndex={selectedIndex}
            onSelect={handleSelectTicket}
            queryMode={queryMode}
            crossProjectResults={filteredCrossProjectResults}
            crossProjectLoading={crossProject.loading}
            crossProjectError={crossProject.error}
            onRetry={crossProject.retry}
            invalidProjectCode={invalidProjectCode ? queryParts.projectCode ?? null : null}
          />
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
