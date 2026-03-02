import type { Project } from '@mdt/shared/models/Project'
import type { Ticket } from '../types'
import { useCallback, useRef } from 'react'
import { useEventBus } from '../services/eventBus'

// Simple debounce utility that preserves function parameter types
function debounce<T extends (...args: never[]) => unknown>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function useSSEEvents(
  fetchTicketsForProject: (project: Project) => Promise<void>,
  updateTicketInState: (ticket: Ticket) => void,
  refreshProjects?: () => Promise<void>,
) {
  const currentProjectRef = useRef<Project | null>(null)
  const userInitiatedUpdatesRef = useRef(new Set<string>())

  // Debounce refresh to avoid multiple rapid refreshes
  // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce handles memoization correctly
  const debouncedRefresh = useCallback(
    debounce((project: Project) => {
      fetchTicketsForProject(project).catch((err) => {
        console.error('Failed to refresh tickets after update:', err)
      })
    }, 100), // Reduced from 300ms to 100ms for faster response
    [fetchTicketsForProject],
  )

  // Set up event listeners for real-time updates
  useEventBus('ticket:created', useCallback((event) => {
    const currentProject = currentProjectRef.current
    if (!currentProject)
      return

    const projectCode = currentProject.project?.code
    if (currentProject.id === event.payload.projectId
      || (projectCode && (projectCode === event.payload.projectId || projectCode.toUpperCase() === event.payload.projectId.toUpperCase()))) {
      console.warn('Ticket created in current project, refreshing...')
      debouncedRefresh(currentProject)
    }
  }, [debouncedRefresh]))

  useEventBus('ticket:updated', useCallback((event) => {
    const currentProject = currentProjectRef.current
    if (!currentProject)
      return

    const projectCode = currentProject.project?.code
    const matchesProject = currentProject.id === event.payload.projectId
      || (projectCode && (projectCode === event.payload.projectId || projectCode.toUpperCase() === event.payload.projectId.toUpperCase()))

    if (matchesProject) {
      const ticketPayload = event.payload.ticket
      const hasTicketData = !!ticketPayload
      const ticketStatus = ticketPayload && typeof ticketPayload === 'object' && 'status' in ticketPayload
        ? String(ticketPayload.status ?? 'unknown')
        : 'no-ticket-data'
      const hasCompleteTicketData = !!(ticketPayload
        && typeof ticketPayload === 'object'
        && 'code' in ticketPayload
        && ticketPayload.code)

      // Check if this was a user-initiated update (optimistic)
      const ticketKey = event.payload.ticketCode

      // Log for debugging
      console.warn('[SSE] ticket:updated', { ticketKey, projectId: event.payload.projectId, hasTicketData, trackingSet: Array.from(userInitiatedUpdatesRef.current) })

      if (userInitiatedUpdatesRef.current.has(ticketKey)) {
        userInitiatedUpdatesRef.current.delete(ticketKey)
        console.warn('[SSE] Skipping user-initiated update:', ticketKey)
        return
      }

      // If we have complete ticket data, update directly without full refresh
      if (hasCompleteTicketData) {
        console.warn('[SSE] Updating ticket directly from SSE data:', ticketKey, 'status:', ticketStatus)
        updateTicketInState(ticketPayload as Ticket)
      }
      else {
        console.warn('[SSE] Ticket updated in current project, refreshing...')
        debouncedRefresh(currentProject)
      }
    }
  }, [debouncedRefresh, updateTicketInState]))

  useEventBus('ticket:deleted', useCallback((event) => {
    const currentProject = currentProjectRef.current
    if (!currentProject)
      return

    const projectCode = currentProject.project?.code
    if (currentProject.id === event.payload.projectId
      || (projectCode && (projectCode === event.payload.projectId || projectCode.toUpperCase() === event.payload.projectId.toUpperCase()))) {
      console.warn('Ticket deleted in current project, refreshing...')
      debouncedRefresh(currentProject)
    }
  }, [debouncedRefresh]))

  // Handle project creation events
  useEventBus('project:created', useCallback((event) => {
    if (!import.meta.env.VITE_DISABLE_EVENTBUS_LOGS) {
      console.warn('Project created event received:', event.payload)
    }
    if (refreshProjects) {
      if (!import.meta.env.VITE_DISABLE_EVENTBUS_LOGS) {
        console.warn('Refreshing projects after project creation')
      }
      refreshProjects().catch((err) => {
        console.error('Failed to refresh projects after creation:', err)
      })
    }
  }, [refreshProjects]))

  // Handle project deletion events
  useEventBus('project:deleted', useCallback((event) => {
    if (!import.meta.env.VITE_DISABLE_EVENTBUS_LOGS) {
      console.warn('Project deleted event received:', event.payload)
    }
    if (refreshProjects) {
      if (!import.meta.env.VITE_DISABLE_EVENTBUS_LOGS) {
        console.warn('Refreshing projects after project deletion')
      }
      refreshProjects().catch((err) => {
        console.error('Failed to refresh projects after deletion:', err)
      })
    }
  }, [refreshProjects]))

  useEventBus('error:api', useCallback((event) => {
    console.error('API Error:', event.payload.message)
  }, []))

  const trackUserUpdate = useCallback((trackingKey: string) => {
    userInitiatedUpdatesRef.current.add(trackingKey)

    // Set a timeout to clean up tracking in case SSE event doesn't arrive
    setTimeout(() => {
      if (userInitiatedUpdatesRef.current.has(trackingKey)) {
        userInitiatedUpdatesRef.current.delete(trackingKey)
      }
    }, 5000) // 5 second cleanup
  }, [])

  return {
    selectedProjectRef: currentProjectRef,
    trackUserUpdate,
  }
}
