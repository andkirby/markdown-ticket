import type { Project, ProjectConfig } from '@mdt/shared/models/Project'
import type { Ticket } from '../types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { dataLayer } from '../services/dataLayer'
import { useEventBus } from '../services/eventBus'
import { useSSEEvents } from './useSSEEvents'
import { useTicketOperations } from './useTicketOperations'

interface UseProjectManagerOptions {
  autoSelectFirst?: boolean
  handleSSEEvents?: boolean
}

interface UseProjectManagerReturn {
  // Project management
  projects: Project[]
  selectedProject: Project | null
  setSelectedProject: (project: Project | null) => void
  refreshProjects: () => Promise<void>

  // Ticket management
  tickets: Ticket[]
  refreshTickets: () => Promise<void>

  // Ticket operations
  createTicket: (title: string, type: string) => Promise<Ticket>
  updateTicket: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>
  updateTicketOptimistic: (ticketCode: string, updates: Partial<Ticket>, trackingKey?: string, currentColumnIndex?: number, currentTicketIndex?: number) => Promise<Ticket>
  deleteTicket: (ticketCode: string) => Promise<void>

  // Position tracking for ticket restoration
  storeTicketPosition: (ticketCode: string, columnIndex: number, ticketIndex: number) => void
  getTicketPosition: (ticketCode: string) => { columnIndex: number, ticketIndex: number, timestamp: number } | undefined
  clearTicketPosition: (ticketCode: string) => void

  // State
  loading: boolean
  error: Error | null
  clearError: () => void
  isBackendDown: boolean

  // Project configuration
  projectConfig: ProjectConfig | null
}

export function useProjectManager(options: UseProjectManagerOptions = {}): UseProjectManagerReturn {
  const { autoSelectFirst = true, handleSSEEvents = false } = options

  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProjectState] = useState<Project | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [isBackendDown, setIsBackendDown] = useState<boolean>(false)

  const selectedProjectRef = useRef<Project | null>(null)

  // Fetch tickets for a specific project
  const fetchTicketsForProject = useCallback(async (project: Project): Promise<void> => {
    if (!project)
      return

    try {
      const projectTickets = await dataLayer.fetchTickets(project.id)
      setTickets(projectTickets)
    }
    catch (error) {
      console.error('Failed to fetch tickets for project:', project.project.name, error)
      throw error
    }
  }, [])

  // Set up SSE events if this instance should handle them
  const updateTicketInState = useCallback(async (ticketData: Ticket) => {
    // SSE only sends metadata, fetch complete ticket including content
    // Use ref to avoid stale closure issues
    const currentProject = selectedProjectRef.current
    if (currentProject) {
      try {
        console.warn(`[ProjectManager] Fetching complete ticket: ${ticketData.code}`)
        const fullTicket = await dataLayer.fetchTicket(currentProject.id, ticketData.code)
        if (fullTicket) {
          console.warn(`[ProjectManager] ✅ Updated ticket in main array: ${ticketData.code}`)
          setTickets(prev => prev.map(ticket =>
            ticket.code === ticketData.code ? fullTicket : ticket,
          ))
        }
      }
      catch (error) {
        console.error('Failed to fetch complete ticket:', error)
        // Fallback to partial update
        setTickets(prev => prev.map(ticket =>
          ticket.code === ticketData.code ? { ...ticket, ...ticketData } : ticket,
        ))
      }
    }
  }, []) // No dependencies - uses ref instead

  // Fetch all projects
  const fetchProjects = useCallback(async (): Promise<void> => {
    try {
      setIsBackendDown(false)
      const response = await fetch('/api/projects')

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const allProjects = await response.json()
      setProjects(allProjects)

      // Auto-select first project if none selected and autoSelectFirst is enabled
      if (autoSelectFirst && allProjects.length > 0 && !selectedProjectRef.current) {
        setSelectedProjectState(allProjects[0])
      }
    }
    catch (error) {
      console.error('Failed to fetch projects:', error)
      // Check if it's a network error (backend down) or HTTP 500 from proxy
      if (error instanceof TypeError && (
        error.message.includes('fetch')
        || error.message.includes('Failed to fetch')
        || error.message.includes('NetworkError')
      )) {
        setIsBackendDown(true)
        throw new Error('Backend server is not responding. Please check that the server is running.')
      }

      // Check if it's an HTTP 500 error from the proxy (indicating backend is down)
      if (error instanceof Error && error.message.includes('HTTP 500')) {
        setIsBackendDown(true)
        throw new Error('Backend server is not responding. Please check that the server is running.')
      }

      throw error
    }
  }, [autoSelectFirst]) // Removed selectedProject and ticketOps dependencies

  const refreshProjects = useCallback(async () => {
    await fetchProjects()
  }, [fetchProjects])

  // Always call the hook (React hooks must be called unconditionally)
  const sseEvents = useSSEEvents(fetchTicketsForProject, updateTicketInState, refreshProjects)

  // Set up ticket operations
  const ticketOps = useTicketOperations(
    selectedProject,
    tickets,
    setTickets,
    fetchTicketsForProject,
    sseEvents.trackUserUpdate,
  )

  // Update refs when selectedProject changes
  useEffect(() => {
    selectedProjectRef.current = selectedProject
    sseEvents.selectedProjectRef.current = selectedProject
  }, [selectedProject, sseEvents])

  // Fetch project configuration
  const fetchProjectConfig = useCallback(async (project: Project): Promise<void> => {
    if (!project)
      return

    try {
      const response = await fetch(`/api/projects/${project.id}/config`)
      if (!response.ok) {
        if (response.status === 404) {
          setProjectConfig(null)
          return
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const config = await response.json()
      setProjectConfig(config)
    }
    catch (error) {
      console.error('Failed to fetch project config:', error)
      setProjectConfig(null)
    }
  }, [])

  // Initialize projects on mount
  useEffect(() => {
    fetchProjects().finally(() => setLoading(false))
  }, [fetchProjects])

  // Reconcile projects on SSE reconnection (only if this instance handles SSE events)
  useEventBus('sse:reconnected', useCallback(() => {
    if (!handleSSEEvents)
      return

    console.warn('[useProjectManager] SSE reconnected, syncing projects')
    refreshProjects().catch((err) => {
      console.error('Failed to sync projects after SSE reconnection:', err)
    })
  }, [handleSSEEvents, refreshProjects]))

  // Handle project selection changes - extracted to avoid direct setState in useEffect
  // Store in ref to avoid dependency issues in useEffect
  const handleProjectChangeRef = useRef<(project: Project | null, currentProjects: Project[]) => void>()

  // Initialize ref immediately if empty
  if (!handleProjectChangeRef.current) {
    handleProjectChangeRef.current = () => {
      // Initial implementation - will be replaced immediately
    }
  }

  // Update ref callback whenever dependencies change
  handleProjectChangeRef.current = useCallback((project: Project | null, currentProjects: Project[]) => {
    if (project) {
      // Check if selected project still exists in the current project list
      const projectStillExists = currentProjects.some(p => p.id === project.id)

      if (!projectStillExists) {
        console.warn(`Selected project ${project.id} no longer exists, clearing selection`)
        setSelectedProjectState(null)
        setTickets([])
        setProjectConfig(null)
        return
      }

      // Clear tickets immediately to prevent showing wrong project's tickets
      setTickets([])

      // Load tickets immediately for fast UI response
      fetchTicketsForProject(project).catch((err) => {
        console.error('Failed to load tickets:', project.project.name, err)
      })

      // Load config in parallel (non-blocking)
      fetchProjectConfig(project).catch((err) => {
        console.error('Failed to load project config:', project.project.name, err)
      })
    }
    else {
      // No project selected - clear tickets
      setTickets([])
      setProjectConfig(null)
    }
  }, [fetchProjectConfig, fetchTicketsForProject])

  // Call the ref function in useEffect (refs are stable, no dependency issues)
  useEffect(() => {
    handleProjectChangeRef.current?.(selectedProject, projects)
  }, [selectedProject, projects])

  const setSelectedProject = useCallback((project: Project | null) => {
    setSelectedProjectState(project)
  }, [])

  const refreshTickets = useCallback(async () => {
    if (selectedProject) {
      await fetchTicketsForProject(selectedProject)
    }
  }, [selectedProject, fetchTicketsForProject])

  return {
    projects,
    selectedProject,
    setSelectedProject,
    refreshProjects,
    tickets,
    refreshTickets,
    createTicket: ticketOps.createTicket,
    updateTicket: ticketOps.updateTicket,
    updateTicketOptimistic: ticketOps.updateTicketOptimistic,
    deleteTicket: ticketOps.deleteTicket,
    // Position tracking methods
    storeTicketPosition: ticketOps.storeTicketPosition,
    getTicketPosition: ticketOps.getTicketPosition,
    clearTicketPosition: ticketOps.clearTicketPosition,
    loading,
    error: ticketOps.error,
    clearError: ticketOps.clearError,
    isBackendDown,
    projectConfig,
  }
}
