import type { Project } from '@mdt/shared/models/Project'
import type { SortPreferences } from '../config/sorting'
import type { Status, Ticket } from '../types'
import { CRStatus } from '@mdt/domain-contracts'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { getColumnForStatus, getVisibleColumns } from '../config'
import { getSortPreferences, setSortPreferences } from '../config/sorting'
import { useProjectManager } from '../hooks/useProjectManager'
import { useToast } from '../hooks/useToast'
import { sortTickets } from '../utils/sorting'
import Column from './Column'
import { FilterControls } from './FilterControls'
import { HamburgerMenu } from './HamburgerMenu'
import { SortControls } from './SortControls'
import { Alert, AlertDescription, AlertTitle } from './UI/alert'
import { Button } from './UI/index'
import { ScrollArea } from './UI/scroll-area'

interface BoardProps {
  onTicketClick: (ticket: Ticket) => void
  onTicketUpdate?: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>
  enableProjectSwitching?: boolean
  showHeader?: boolean
  selectedProject?: Project | null
  tickets?: Ticket[]
  loading?: boolean
  sortPreferences?: SortPreferences
}

// Note: TicketItem removed - drag functionality handled in Column.tsx

const BoardContent: React.FC<BoardProps> = ({
  onTicketClick,
  onTicketUpdate,
  enableProjectSwitching = true,
  showHeader = true,
  selectedProject: propSelectedProject,
  tickets: propTickets,
  loading: propLoading,
  sortPreferences: propSortPreferences,
}) => {
  const [sortPreferences, setSortPreferencesState] = useState<SortPreferences>(
    propSortPreferences || getSortPreferences,
  )
  const [filterQuery, setFilterQuery] = useState('')
  const { error: showError } = useToast()

  // Only use the hook when no selectedProject prop is provided (multi-project mode)
  const hookData = useProjectManager({
    autoSelectFirst: enableProjectSwitching && !propSelectedProject,
    handleSSEEvents: true, // Enable SSE events to refresh project list when new projects are created
  })

  // IMPORTANT: Always use hook data for multi-project mode to ensure fresh state
  // Prop data should only be used in single-project mode (when props are explicitly passed)
  const selectedProject = propSelectedProject !== undefined ? propSelectedProject : hookData.selectedProject
  const baseTickets = propTickets !== undefined ? propTickets : hookData.tickets
  const loading = propLoading !== undefined ? propLoading : hookData.loading

  // Local state for immediate UI updates during drag-and-drop
  const [localTicketUpdates, setLocalTicketUpdates] = useState<Record<string, Partial<Ticket>>>({})

  // Clear optimistic updates when server state matches
  useEffect(() => {
    setLocalTicketUpdates((prev) => {
      const updated = { ...prev }
      let hasChanges = false

      for (const [ticketCode, localUpdate] of Object.entries(prev)) {
        const serverTicket = baseTickets.find(t => t.code === ticketCode)
        if (serverTicket) {
          // Check if server state matches our optimistic update
          const isMatching = Object.entries(localUpdate).every(([key, value]) =>
            serverTicket[key as keyof Ticket] === value,
          )

          if (isMatching) {
            delete updated[ticketCode]
            hasChanges = true
          }
        }
      }

      return hasChanges ? updated : prev
    })
  }, [baseTickets])

  // Merge base tickets with local updates for immediate UI feedback
  const tickets = useMemo(() => {
    return baseTickets.map(ticket => ({
      ...ticket,
      ...localTicketUpdates[ticket.code],
    }))
  }, [baseTickets, localTicketUpdates])

  // IMPORTANT: Always use hookData functions for state management operations
  // This ensures drag-and-drop operations work correctly even when using prop data

  // Update sortPreferences when prop changes
  React.useEffect(() => {
    if (propSortPreferences) {
      setSortPreferencesState(propSortPreferences)
    }
  }, [propSortPreferences])

  // Use hook data for project switching functionality
  const projects = hookData.projects
  const setSelectedProject = hookData.setSelectedProject
  const error = hookData.error
  const createTicket = hookData.createTicket
  const refreshProjectTickets = hookData.refreshTickets
  const _updateTicket = hookData.updateTicket
  const updateTicketOptimistic = hookData.updateTicketOptimistic
  const _storeTicketPosition = hookData.storeTicketPosition
  const getTicketPosition = hookData.getTicketPosition
  const clearTicketPosition = hookData.clearTicketPosition
  const clearError = hookData.clearError
  const isBackendDown = hookData.isBackendDown

  // Save preferences when they change
  const handleSortPreferencesChange = (newPreferences: SortPreferences) => {
    setSortPreferencesState(newPreferences)
    setSortPreferences(newPreferences)
  }

  const handleDrop = useCallback(async (status: Status, ticket: Ticket, currentColumnIndex?: number, currentTicketIndex?: number) => {
    // Skip if ticket is already in the correct status
    if (ticket.status === status) {
      return
    }

    // Store original status for rollback on error (not currently used but kept for reference)
    // const originalStatus = ticket.status;

    // Extract filename for tracking (matches SSE event format)
    const trackingKey = ticket.filePath
      ? ticket.filePath.split('/').pop()?.replace('.md', '') || ticket.code
      : ticket.code

    // Update local state immediately for optimistic UI
    setLocalTicketUpdates(prev => ({
      ...prev,
      [ticket.code]: { status },
    }))

    // Send update to backend with tracking key
    const updateData: Partial<Ticket> = { status }
    const updateFunction = onTicketUpdate || updateTicketOptimistic

    try {
      // Check if ticket is being moved from 'On Hold' or 'Rejected' back to a regular status
      const isFromHoldStatus = ticket.status === CRStatus.ON_HOLD || ticket.status === CRStatus.REJECTED
      const isToRegularStatus = status !== CRStatus.ON_HOLD && status !== CRStatus.REJECTED

      if (isFromHoldStatus && isToRegularStatus) {
        // Get the stored position for this ticket
        const storedPosition = getTicketPosition(ticket.code)
        if (storedPosition) {
          console.warn(`Restoring ticket ${ticket.code} to position`, storedPosition)
          // Pass the stored position to the update function
          if (updateFunction === updateTicketOptimistic) {
            await updateFunction(ticket.code, updateData, trackingKey, storedPosition.columnIndex, storedPosition.ticketIndex)
            // Clear the stored position after successful restoration
            clearTicketPosition(ticket.code)
          }
          else {
            await updateFunction(ticket.code, updateData)
          }
        }
        else {
          // No stored position, use default behavior
          if (updateFunction === updateTicketOptimistic) {
            await updateFunction(ticket.code, updateData, trackingKey, currentColumnIndex, currentTicketIndex)
          }
          else {
            await updateFunction(ticket.code, updateData)
          }
        }
      }
      else {
        // Regular move or moving to hold status
        // Pass tracking key for optimistic updates
        if (updateFunction === updateTicketOptimistic) {
          await updateFunction(ticket.code, updateData, trackingKey, currentColumnIndex, currentTicketIndex)
        }
        else {
          await updateFunction(ticket.code, updateData)
        }
      }
    }
    catch (error) {
      // Revert the optimistic update by removing from localTicketUpdates
      setLocalTicketUpdates((prev) => {
        const newState = { ...prev }
        delete newState[ticket.code]
        return newState
      })

      // Extract user-friendly error message from backend response
      let errorMessage = 'Failed to update ticket'
      let errorDescription = ''

      if (error && typeof error === 'object' && 'response' in error) {
        const errorWithResponse = error as {
          response?: {
            data?: {
              error?: string
              details?: string
            }
          }
        }

        if (errorWithResponse.response?.data) {
          errorMessage = errorWithResponse.response.data.error || errorMessage
          errorDescription = errorWithResponse.response.data.details || ''
        }
      }
      else if (error instanceof Error) {
        errorMessage = error.message
      }

      // Show error toast to user
      showError(errorMessage, { description: errorDescription })

      // Log full error for debugging with more context
      console.error('🚫 Ticket Update Failed')
      console.error('Ticket Code:', ticket.code)
      console.error('Attempted Status Change:', `${ticket.status} → ${status}`)
      console.error('Error Message:', errorMessage)
      if (errorDescription)
        console.error('Error Details:', errorDescription)
      console.error('Full Error Object:', error)
    }
  }, [onTicketUpdate, updateTicketOptimistic, getTicketPosition, clearTicketPosition, showError])

  const handleTicketCreate = useCallback(async () => {
    if (!selectedProject) {
      console.error('No project selected')
      return
    }

    try {
      // Ticket code will be auto-generated based on project configuration
      await createTicket('New Change Request', 'Feature Enhancement')
    }
    catch (error) {
      console.error('Failed to create ticket:', error)
    }
  }, [selectedProject, createTicket])

  const handleTicketEdit = useCallback((ticket: Ticket) => {
    onTicketClick(ticket)
  }, [onTicketClick])

  const handleRefresh = useCallback(async () => {
    try {
      await refreshProjectTickets()
    }
    catch (error) {
      console.error('Failed to refresh tickets:', error)
    }
  }, [refreshProjectTickets])

  // Filter tickets based on search query
  const filteredTickets = React.useMemo(() => {
    if (!filterQuery.trim()) {
      return tickets
    }

    const searchTerms = filterQuery.toLowerCase().trim().split(/\s+/)
    return tickets.filter((ticket) => {
      const title = ticket.title?.toLowerCase() || ''
      const code = ticket.code?.toLowerCase() || ''
      const description = ticket.description?.toLowerCase() || ''

      // Check if all search terms match at least one of: title, code, or description
      return searchTerms.every(term =>
        title.includes(term)
        || code.includes(term)
        || description.includes(term),
      )
    })
  }, [tickets, filterQuery])

  // Group filtered tickets by column with sorting
  const ticketsByColumn: Record<string, Ticket[]> = {}
  const visibleColumns = getVisibleColumns()

  // Initialize with empty arrays
  visibleColumns.forEach((column) => {
    ticketsByColumn[column.label] = []
  })

  // Group filtered tickets by their column
  filteredTickets.forEach((ticket) => {
    const column = getColumnForStatus(ticket.status as Status)
    if (ticketsByColumn[column.label]) {
      ticketsByColumn[column.label].push(ticket)
    }
    else {
      // Handle unknown status - put in backlog
      ticketsByColumn.Backlog.push(ticket)
    }
  })

  // Sort tickets in each column
  Object.keys(ticketsByColumn).forEach((columnLabel) => {
    ticketsByColumn[columnLabel] = sortTickets(
      ticketsByColumn[columnLabel],
      sortPreferences.selectedAttribute,
      sortPreferences.selectedDirection,
    )
  })

  // Check for duplicate tickets by key and log warnings
  const ticketCodes = new Set<string>()
  let hasDuplicates = false
  tickets.forEach((ticket) => {
    // Validate ticket placement
    if (ticketCodes.has(ticket.code)) {
      console.error(`WARNING: Duplicate ticket found: ${ticket.code} with status ${ticket.status}`)
      hasDuplicates = true
    }
    else {
      ticketCodes.add(ticket.code)
    }
  })

  if (hasDuplicates) {
    console.error('DUPLICATE TICKETS DETECTED: This may cause React key conflicts')
  }

  // Show loading state with skeleton loader
  if (loading) {
    return (
      <div className="board-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-8">
        {[1, 2, 3, 4].map(col => (
          <div key={col} className="space-y-4">
            <div className="h-12 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-lg animate-pulse" />
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  // Show no project selected state
  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center max-w-lg mx-auto p-6">
          <div className="text-6xl text-gray-300 mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-sm text-gray-600 mb-4">Choose a project from the header to view its change requests.</p>

          {/* Backend down warning */}
          {projects.length === 0 && isBackendDown && (
            <div className="mt-6">
              <Alert variant="warning" className="text-left">
                <AlertTitle className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Backend Server Not Responding
                </AlertTitle>
                <AlertDescription className="mt-3">
                  <div className="space-y-2">
                    <p className="font-medium">
                      Current URL:
                      {window.location.origin}
                      /api
                    </p>
                    <p>The backend server is not responding. To fix this issue:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                      <li>
                        Run
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">npm run server</code>
                        {' '}
                        in your terminal
                      </li>
                      <li>
                        Or use Docker:
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">bin/dc up backend -d</code>
                      </li>
                      <li>
                        Check logs with:
                        <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">bin/dc logs -f backend</code>
                      </li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {projects.length === 0 && !isBackendDown && (
            <p className="text-sm text-red-600">No projects found. Make sure projects are properly configured.</p>
          )}
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 text-md font-medium mb-2">Error loading tickets</div>
          <div className="text-red-600 mb-4">{error.message}</div>
          <Button
            onClick={handleRefresh}
            variant="secondary"
          >
            Refresh
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={showHeader ? 'px-2 py-1 h-full min-h-0 flex flex-col gap-1' : 'p-0 h-full min-h-0 flex flex-col'}>
      {showHeader && (
        <div className="flex justify-between items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground whitespace-nowrap">Change Request Board</h1>
              {enableProjectSwitching && (
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Project:</label>
                  <ScrollArea className="max-w-[200px]">
                    <div className="flex gap-1">
                      {projects.map(project => (
                        <button
                          key={project.id}
                          onClick={() => {
                            setSelectedProject(project)
                            clearError()
                          }}
                          disabled={loading}
                          className={`h-9 px-2 py-1 border rounded text-center transition-colors flex-shrink-0 ${
                            selectedProject?.id === project.id
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:bg-muted'
                          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <div className="text-xs font-medium leading-tight whitespace-nowrap">{project.id}</div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FilterControls
              searchQuery={filterQuery}
              onSearchChange={setFilterQuery}
              placeholder="Filter tickets..."
            />
            <SortControls
              preferences={sortPreferences}
              onPreferencesChange={handleSortPreferencesChange}
            />
            <Button
              onClick={handleRefresh}
              variant="secondary"
              className="h-9 px-3"
            >
              Refresh
            </Button>
            <Button
              onClick={handleTicketCreate}
              className="btn btn-primary h-9 px-3"
              disabled={!selectedProject}
            >
              Create
            </Button>
            <HamburgerMenu
              onAddProject={() => console.warn('Add Project clicked from Board')}
              onEditProject={() => console.warn('Edit Project clicked from Board')}
              onCounterAPI={() => console.warn('Counter API clicked from Board')}
              hasActiveProject={true}
            />
          </div>
        </div>
      )}

      {/* Board Grid - render regardless of showHeader */}
      <div className="board-container flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full items-stretch p-1 overflow-hidden">
        {visibleColumns.map((column, index) => (
          <Column
            key={column.label}
            column={column}
            isFirstColumn={index === 0}
            tickets={ticketsByColumn[column.label]}
            allTickets={tickets}
            sortAttribute={sortPreferences.selectedAttribute}
            sortDirection={sortPreferences.selectedDirection}
            onDrop={async (status: Status, ticket: Ticket, currentColumnIndex?: number, currentTicketIndex?: number) => {
              console.warn('Board: Column onDrop called with:', { status, ticketKey: ticket.code, currentColumnIndex, currentTicketIndex })
              await handleDrop(status, ticket, currentColumnIndex, currentTicketIndex)
            }}
            onTicketEdit={handleTicketEdit}
            getTicketPosition={getTicketPosition}
            clearTicketPosition={clearTicketPosition}
          />
        ))}
      </div>
    </div>
  )
}

const Board: React.FC<BoardProps> = (props) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <BoardContent {...props} />
    </DndProvider>
  )
}

export default Board
