import type { Project } from '@mdt/shared/models/Project'
import type { SortPreferences } from '../config/sorting'
import type { Ticket } from '../types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sortTickets } from '../utils/sorting'
import { StatusBadge } from './Badge'
import Board from './Board'
import { DocumentsLayout } from './DocumentsView'
import { TicketCode } from './TicketCode'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

type ViewMode = 'board' | 'list' | 'documents'

const VIEW_MODE_KEY = 'single-project-view-mode'

interface ProjectViewProps {
  onTicketClick: (ticket: Ticket) => void
  selectedProject: Project | null
  tickets?: Ticket[]
  updateTicketOptimistic?: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>
  viewMode?: ViewMode
  loading?: boolean
  sortPreferences?: SortPreferences
}

export default function ProjectView({ onTicketClick, selectedProject, tickets: propTickets, updateTicketOptimistic, viewMode: externalViewMode, loading: propLoading, sortPreferences }: ProjectViewProps) {
  // Use external viewMode if provided, otherwise fall back to internal state
  const [internalViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY)
    const validModes: ViewMode[] = ['board', 'list', 'documents']
    return (saved && validModes.includes(saved as ViewMode))
      ? (saved as ViewMode)
      : 'board'
  })

  const viewMode = externalViewMode || internalViewMode

  const loading = propLoading || false

  // Memoize sorted tickets to avoid re-sorting on every render
  const sortedTickets = useMemo(() => {
    return sortTickets(
      propTickets || [],
      sortPreferences?.selectedAttribute || 'title',
      sortPreferences?.selectedDirection || 'asc',
    )
  }, [propTickets, sortPreferences?.selectedAttribute, sortPreferences?.selectedDirection])

  // Use ref to prevent stale closure bug when switching projects
  const selectedProjectRef = useRef<Project | null>(selectedProject)

  useEffect(() => {
    selectedProjectRef.current = selectedProject
  }, [selectedProject])

  const handleTicketUpdate = useCallback(async (ticketCode: string, updates: Partial<Ticket>) => {
    const currentProject = selectedProjectRef.current
    if (!currentProject) {
      throw new Error('No project selected')
    }

    try {
      const response = await fetch(`/api/projects/${currentProject.id}/crs/${ticketCode}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        // Try to parse the error response from backend
        let errorMessage = `Failed to update ticket: ${response.statusText}`
        let errorData = null

        try {
          errorData = await response.json()
          if (errorData.error) {
            errorMessage = errorData.error
          }
        }
        catch (e) {
          // If we can't parse JSON, use the status text
          console.warn('Failed to parse error response JSON:', e)
        }

        // Create an error object with response data for proper error handling
        const error = new Error(errorMessage);
        (error as Error & { response?: { status: number, data: unknown } }).response = {
          status: response.status,
          data: errorData,
        }
        throw error
      }

      const updatedTicket = await response.json()

      // Ticket updates are now handled by SSE events automatically

      return updatedTicket
    }
    catch (error) {
      console.error('Failed to update ticket:', error)
      throw error
    }
  }, []) // Removed selectedProject from deps - using ref instead

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-hidden">
        {viewMode === 'board'
          ? (
              <Board
                onTicketClick={onTicketClick}
                onTicketUpdate={updateTicketOptimistic || handleTicketUpdate}
                showHeader={false}
                enableProjectSwitching={false}
                selectedProject={selectedProject}
                tickets={propTickets || []}
                loading={loading}
                sortPreferences={sortPreferences}
              />
            )
          : viewMode === 'list'
            ? (
                <div className="h-full overflow-auto">
                  {/* Desktop: Table View */}
                  <div className="hidden md:block" data-testid="ticket-table">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-28">Code</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead className="w-32">Status</TableHead>
                          <TableHead className="w-32">Modified</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedTickets.map(ticket => (
                          <TableRow
                            key={ticket.code}
                            onClick={() => onTicketClick(ticket)}
                            className="cursor-pointer"
                            data-testid={`ticket-row-${ticket.code}`}
                          >
                            <TableCell className="font-mono">
                              <TicketCode code={ticket.code} />
                            </TableCell>
                            <TableCell className="font-medium" data-testid="ticket-title">
                              {ticket.title}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={ticket.status} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ticket.lastModified ? new Date(ticket.lastModified).toLocaleDateString() : 'Unknown'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile: Card View */}
                  <div className="md:hidden p-4 space-y-2" data-testid="ticket-list">
                    {sortedTickets.map(ticket => (
                      <div
                        key={ticket.code}
                        onClick={() => onTicketClick(ticket)}
                        className="p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        data-testid={`ticket-card-${ticket.code}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <TicketCode code={ticket.code} />
                          <StatusBadge status={ticket.status} />
                        </div>
                        <p className="font-medium text-sm truncate" data-testid="ticket-title">{ticket.title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            : viewMode === 'documents'
              ? (
                  selectedProject
                    ? (
                        <DocumentsLayout projectId={selectedProject.id} />
                      )
                    : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          No project selected
                        </div>
                      )
                )
              : null}
      </div>
    </div>
  )
}
