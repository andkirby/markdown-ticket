import type { Project } from '@mdt/shared/models/Project'
import type { NavigateFunction } from 'react-router-dom'
import type { Ticket } from '../../../types'
import type { AppViewMode } from '../viewModeDerivation'
import { useEffect, useRef, useState } from 'react'
import { buildProjectPath, buildTicketPath } from '../../../routes'
import { normalizeTicketKey } from '../../../utils/routing'
import { ticketCloseTargetPath } from '../viewModeDerivation'

export interface UseTicketModalRouteParams {
  pathname: string
  tickets: Ticket[]
  projectsLoading: boolean
  selectedProject: Project | null
  projectCode?: string
  /** Current ?view= param (null when absent) — read via searchParams.get('view'). */
  viewParam: string | null
  /** Render-time derived view mode (see useViewModeRouting contract note). */
  viewMode: AppViewMode
  navigate: NavigateFunction
}

/**
 * Ticket modal-from-URL state and open/close navigation (controlled
 * refactor 3c).
 *
 * Owns the selected ticket, the inline ticket error, and the
 * selectedTicketRef/setSelectedTicketRef pattern. The effect body, dependency
 * array, and both handlers moved verbatim from ProjectRouteHandler; this hook
 * must be called after useViewModeRouting (effect order, plan INV-6).
 */
export function useTicketModalRoute({
  pathname,
  tickets,
  projectsLoading,
  selectedProject,
  projectCode,
  viewParam,
  viewMode,
  navigate,
}: UseTicketModalRouteParams) {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [ticketError, setTicketError] = useState<string | null>(null)

  const selectedTicketRef = useRef(selectedTicket)
  selectedTicketRef.current = selectedTicket
  const setSelectedTicketRef = useRef(setSelectedTicket)
  setSelectedTicketRef.current = setSelectedTicket

  // Handle ticket modal from URL
  useEffect(() => {
    const ticketMatch = pathname.match(/\/ticket\/([^/]+)/)
    if (ticketMatch) {
      const ticketKey = normalizeTicketKey(ticketMatch[1])
      const ticket = tickets.find(t => t.code === ticketKey)
      if (ticket) {
        setSelectedTicketRef.current(ticket)
        setTicketError(null)
      }
      else if (!projectsLoading && selectedProject) {
        // Ticket not found — set inline error, don't block the entire page
        setSelectedTicketRef.current(null)
        setTicketError(`Ticket '${ticketMatch[1]}' not found`)
      }
    }
    else {
      setSelectedTicketRef.current(null)
      setTicketError(null)
    }
  }, [pathname, tickets, projectsLoading, selectedProject])

  const handleTicketClick = (ticket: Ticket, targetProjectCode?: string) => {
    const ticketProject = targetProjectCode || projectCode!
    // Carry the originating view in ?view= so closing the ticket returns to it.
    // /epics reports viewMode 'board' but needs its own param to round-trip.
    const onEpicsRoute = pathname.includes('/epics')
    const viewContext = onEpicsRoute ? 'epics' : viewMode
    const viewParam = viewContext !== 'board' ? `?view=${viewContext}` : ''
    navigate(`${buildTicketPath(ticketProject, ticket.code)}${viewParam}`)
  }

  const handleTicketClose = () => {
    const viewContext = viewParam || 'board'
    const basePath = buildProjectPath(projectCode!)
    // viewContext 'epics' maps to the /epics route; others map directly.
    const targetPath = ticketCloseTargetPath(viewContext, basePath)
    navigate(targetPath)
  }

  return { selectedTicket, ticketError, handleTicketClick, handleTicketClose }
}
