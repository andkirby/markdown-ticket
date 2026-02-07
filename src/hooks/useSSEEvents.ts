import type { Project } from '@mdt/shared/models/Project'
import type { Ticket } from '../types'
import { useCallback, useRef } from 'react'
import { useEventBus } from '../services/eventBus'

// Simple debounce utility
function debounce<T extends (...args: unknown[]) => unknown>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return ((...args: unknown[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }) as T
}

export function useSSEEvents(
  fetchTicketsForProject: (project: Project) => Promise<void>,
  updateTicketInState: (ticket: Ticket) => void,
  refreshProjects?: () => Promise<void>,
) {
  const selectedProjectRef = useRef<Project | null>(null)
  const userInitiatedUpdates = useRef(new Set<string>())

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
    const currentProject = selectedProjectRef.current
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
    const currentProject = selectedProjectRef.current
    if (!currentProject)
      return

    const projectCode = currentProject.project?.code
    if (currentProject.id === event.payload.projectId
      || (projectCode && (projectCode === event.payload.projectId || projectCode.toUpperCase() === event.payload.projectId.toUpperCase()))) {
      // Check if this was a user-initiated update (optimistic)
      const ticketKey = event.payload.ticketCode
      if (userInitiatedUpdates.current.has(ticketKey)) {
        userInitiatedUpdates.current.delete(ticketKey)
        return
      }

      // If we have ticket data, update directly without full refresh
      if (event.payload.ticket) {
        console.warn('Updating ticket directly from SSE data:', ticketKey)
        updateTicketInState(event.payload.ticket)
      }
      else {
        console.warn('Ticket updated in current project, refreshing...')
        debouncedRefresh(currentProject)
      }
    }
  }, [debouncedRefresh, updateTicketInState]))

  useEventBus('ticket:deleted', useCallback((event) => {
    const currentProject = selectedProjectRef.current
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
    userInitiatedUpdates.current.add(trackingKey)

    // Set a timeout to clean up tracking in case SSE event doesn't arrive
    setTimeout(() => {
      if (userInitiatedUpdates.current.has(trackingKey)) {
        userInitiatedUpdates.current.delete(trackingKey)
      }
    }, 5000) // 5 second cleanup
  }, [])

  return {
    selectedProjectRef,
    trackUserUpdate,
  }
}
