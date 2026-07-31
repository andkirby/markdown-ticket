import type { TicketFilters } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project'
import type { SortPreferences } from '../config/sorting'
// MDT-200 U5: projection feed type for the cloud-projected stub merge.
import type { ProjectionFeed } from '../hooks/useCloudProjections'
import type { Ticket } from '../types'
import type { FacetKey } from '../utils/ticketFilters'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authFetch } from '../auth/authFetch'
import { useCloudProjectionFeed } from '../hooks/useCloudProjectionFeed'
import { sortTickets } from '../utils/sorting'
import { PriorityIcon } from './Badge/PriorityIcon'
import Board from './Board'
import { DocumentsLayout } from './DocumentsView'
import TicketAttributeTags from './TicketAttributeTags'
import { TicketCode } from './TicketCode'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'

type ViewMode = 'board' | 'list' | 'documents'

/**
 * MDT-200 U5: optional testability seam. When `window.__MDT_PROJECTION_FEED__`
 * is set (E2E/tests only), the board merges the injected cloud-projected stubs.
 * is set (E2E/tests only), it overrides the production server-backed poller.
 */
interface WindowWithProjectionFeed {
  __MDT_PROJECTION_FEED__?: ProjectionFeed | null
}

function readProjectionFeed(): ProjectionFeed | null {
  if (typeof window === 'undefined')
    return null
  const w = window as unknown as WindowWithProjectionFeed
  return w.__MDT_PROJECTION_FEED__ ?? null
}

const VIEW_MODE_KEY = 'single-project-view-mode'

interface ProjectViewProps {
  onTicketClick: (ticket: Ticket) => void
  selectedProject: Project | null
  tickets?: Ticket[]
  /** Pre-filtered tickets from the app-level filter state (MDT-196). */
  filteredTickets?: Ticket[]
  /** Active filter state for the mobile chip strip (MDT-196). */
  mobileFilters?: TicketFilters
  /** Remove a filter value from the mobile chip strip (MDT-196). */
  onRemoveMobileFilter?: (facet: FacetKey, value: string) => void
  updateTicketOptimistic?: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>
  viewMode?: ViewMode
  loading?: boolean
  sortPreferences?: SortPreferences
  canWrite?: boolean
}

export default function ProjectView({ onTicketClick, selectedProject, tickets: propTickets, filteredTickets: propFilteredTickets, mobileFilters, onRemoveMobileFilter, updateTicketOptimistic, viewMode: externalViewMode, loading: propLoading, sortPreferences, canWrite = true }: ProjectViewProps) {
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

  // MDT-200 U5: tests can inject a deterministic feed; production polls the
  // owner-only local server endpoint so Cloudflare credentials stay server-side.
  const [injectedProjectionFeed, setInjectedProjectionFeed] = useState<ProjectionFeed | null | undefined>(
    () => readProjectionFeed() ?? undefined,
  )
  useEffect(() => {
    const sync = () => setInjectedProjectionFeed(readProjectionFeed() ?? undefined)
    sync()
    window.addEventListener('mdt:projection-feed', sync as EventListener)
    return () => window.removeEventListener('mdt:projection-feed', sync as EventListener)
  }, [])
  const projectionFeed = useCloudProjectionFeed({
    projectId: selectedProject?.id,
    enabled: canWrite,
    injectedFeed: injectedProjectionFeed,
  })

  const handleTicketUpdate = useCallback(async (ticketCode: string, updates: Partial<Ticket>) => {
    if (!canWrite) {
      throw new Error('Read-only session cannot update tickets')
    }

    const currentProject = selectedProjectRef.current
    if (!currentProject) {
      throw new Error('No project selected')
    }

    try {
      const response = await authFetch(`/api/projects/${currentProject.id}/crs/${ticketCode}`, {
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
  }, [canWrite]) // Removed selectedProject from deps - using ref instead

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
                filteredTickets={propFilteredTickets || propTickets || []}
                mobileFilters={mobileFilters}
                onRemoveMobileFilter={onRemoveMobileFilter}
                loading={loading}
                sortPreferences={sortPreferences}
                canWrite={canWrite}
                projectionFeed={projectionFeed}
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
                          <TableHead>Attributes</TableHead>
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
                              <PriorityIcon priority={ticket.priority} className="priority-icon mr-1" />
                              <TicketCode code={ticket.code} />
                            </TableCell>
                            <TableCell className="font-medium" data-testid="ticket-title">
                              {ticket.title}
                            </TableCell>
                            <TableCell>
                              <TicketAttributeTags ticket={ticket} />
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
                  <div className="md:hidden p-4 space-y-2" data-testid="ticket-list-mobile">
                    {sortedTickets.map(ticket => (
                      <div
                        key={ticket.code}
                        onClick={() => onTicketClick(ticket)}
                        className="ticket-card"
                        data-testid={`ticket-card-${ticket.code}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="ticket-card__code">
                            <PriorityIcon priority={ticket.priority} className="priority-icon" />
                            <TicketCode code={ticket.code} />
                          </span>
                        </div>
                        <h4 className="ticket-card__title" data-testid="ticket-title">{ticket.title}</h4>
                        <TicketAttributeTags ticket={ticket} />
                      </div>
                    ))}
                  </div>
                </div>
              )
            : viewMode === 'documents'
              ? (
                  selectedProject
                    ? (
                        <DocumentsLayout projectId={selectedProject.id} canWrite={canWrite} />
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
