import type { TicketFilters } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project'
import type { CRStatus } from '@mdt/shared/models/Types'
import type { BoardLayoutModeValue } from '../config/boardLayoutMode'
import type { SortAttribute, SortPreferences } from '../config/sorting'
// MDT-200 U5: projection feed type for the cloud-projected stub merge.
import type { ProjectionFeed } from '../hooks/useCloudProjections'
import type { Ticket } from '../types'
import type { FacetKey } from '../utils/ticketFilters'
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authFetch } from '../auth/authFetch'
import { SORT_ATTRIBUTES } from '../config/sorting'
import { useCloudProjectionFeed } from '../hooks/useCloudProjectionFeed'
import { cn } from '../lib/utils'
import { sortTickets } from '../utils/sorting'
import { VALID_STATUSES } from '../utils/ticketStatus'
import { StatusBadge } from './Badge/StatusBadge'
import Board from './Board'
import { DocumentsLayout } from './DocumentsView'
import { RelativeTimestamp } from './shared/RelativeTimestamp'
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

/** List-table columns come from the list-scope registry (no local maps); Priority has no column. */
const LIST_TABLE_COLUMNS = SORT_ATTRIBUTES.list.filter(attr => attr.name !== 'priority')

/** Sortable header: button-in-th; aria-sort + data-sort-direction on the th (C3, UX gate). */
function SortableTableHead({
  attr,
  active,
  direction,
  onClick,
  className,
}: {
  attr: SortAttribute
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
  className?: string
}) {
  const Glyph = direction === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow
  return (
    <TableHead
      className={cn('ticket-table__head--sortable', className)}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : undefined}
      data-sort-direction={active ? direction : undefined}
    >
      <button
        type="button"
        className="ticket-table__sort"
        data-testid={`sort-${attr.name}`}
        onClick={onClick}
      >
        {attr.label}
        {active && <Glyph aria-hidden="true" />}
      </button>
    </TableHead>
  )
}

interface ProjectViewProps {
  onTicketClick: (ticket: Ticket) => void
  selectedProject: Project | null
  tickets?: Ticket[]
  /** Pre-filtered tickets from the app-level filter state (MDT-196). */
  filteredTickets?: Ticket[]
  /** Active TicketFilters state, threaded to Board so cloud stubs respect it (MDT-196 UAT r2). */
  filters?: TicketFilters
  /** Active filter state for the mobile chip strip (MDT-196). */
  mobileFilters?: TicketFilters
  /** Remove a filter value from the mobile chip strip (MDT-196). */
  onRemoveMobileFilter?: (facet: FacetKey, value: string) => void
  updateTicketOptimistic?: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>
  viewMode?: ViewMode
  boardLayoutMode?: BoardLayoutModeValue
  /**
   * MDT-246: epic key to focus on the Epics board (the `?epic=` token, parsed
   * by ProjectRouteHandler). Pass-through to SwimlaneBoard; unknown keys are
   * ignored downstream.
   */
  focusEpicKey?: string | null
  loading?: boolean
  sortPreferences?: SortPreferences
  /** MDT-249: list headers write through the same thread as the dropdown; no local sort state. */
  onSortPreferencesChange?: (preferences: SortPreferences) => void
  canWrite?: boolean
}
export default function ProjectView({ onTicketClick, selectedProject, tickets: propTickets, filteredTickets: propFilteredTickets, filters, mobileFilters, onRemoveMobileFilter, updateTicketOptimistic, viewMode: externalViewMode, boardLayoutMode, focusEpicKey, loading: propLoading, sortPreferences, onSortPreferencesChange, canWrite = true }: ProjectViewProps) {
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

  // Memoize sorted tickets to avoid re-sorting on every render.
  // MDT-196 UAT: sort the FILTERED set so the list view honors faceted
  // filters identically to the board (filters are app-level, not board-only).
  const sortedTickets = useMemo(() => {
    return sortTickets(
      propFilteredTickets || propTickets || [],
      sortPreferences?.selectedAttribute || 'title',
      sortPreferences?.selectedDirection || 'asc',
    )
  }, [propFilteredTickets, propTickets, sortPreferences?.selectedAttribute, sortPreferences?.selectedDirection])

  // MDT-249: first click applies the registry defaultDirection; clicking the
  // active header flips (BR-1.3/1.4). Computes next prefs only — state lives upstream.
  const handleHeaderSort = useCallback((attr: SortAttribute) => {
    if (!onSortPreferencesChange)
      return
    const isActive = sortPreferences?.selectedAttribute === attr.name
    const nextDirection = isActive
      ? (sortPreferences!.selectedDirection === 'asc' ? 'desc' : 'asc')
      : attr.defaultDirection
    onSortPreferencesChange({ selectedAttribute: attr.name, selectedDirection: nextDirection })
  }, [onSortPreferencesChange, sortPreferences])

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
    <div className="h-full flex flex-col flex-1 min-w-0">
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
                filters={filters}
                mobileFilters={mobileFilters}
                onRemoveMobileFilter={onRemoveMobileFilter}
                loading={loading}
                boardLayoutMode={boardLayoutMode}
                focusEpicKey={focusEpicKey}
                sortPreferences={sortPreferences}
                canWrite={canWrite}
                projectionFeed={projectionFeed}
              />
            )
          : viewMode === 'list'
            ? (
                <div className="h-full overflow-auto">
                  {/* Desktop: Table View. MDT-249 TASK-7: full-height flex column so
                      .mdt-table__scroll becomes the vertical scrollport (sticky thead
                      binds to it — see list-view.css; naive th sticky is inert otherwise). */}
                  <div className="ticket-table hidden md:flex md:h-full md:flex-col" data-testid="ticket-table">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {LIST_TABLE_COLUMNS.map(attr => (
                            <Fragment key={attr.name}>
                              {/* Attributes stays 4th (before Created/Updated), matching body cells */}
                              {attr.name === 'dateCreated' && (
                                <TableHead>Attributes</TableHead>
                              )}
                              <SortableTableHead
                                attr={attr}
                                active={sortPreferences?.selectedAttribute === attr.name}
                                direction={sortPreferences?.selectedDirection ?? 'asc'}
                                onClick={() => handleHeaderSort(attr)}
                                className={attr.name === 'code' ? 'w-28' : (attr.name === 'dateCreated' || attr.name === 'lastModified') ? 'w-32' : undefined}
                              />
                            </Fragment>
                          ))}
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
                              <TicketCode code={ticket.code} priority={ticket.priority} />
                            </TableCell>
                            <TableCell className="font-medium" data-testid="ticket-title">
                              {ticket.title}
                            </TableCell>
                            {/* MDT-247: the Status column cell IS the badge; the
                                Attributes cell drops the STATUS tag (one badge
                                per row). The key strip above carries no status
                                glyph either — the badge is the encoding here. */}
                            <TableCell data-testid={`ticket-status-cell-${ticket.code}`}>
                              <StatusBadge
                                status={ticket.status}
                                isInvalid={!VALID_STATUSES.includes(ticket.status as CRStatus)}
                              />
                            </TableCell>
                            <TableCell>
                              <TicketAttributeTags ticket={ticket} excludeStatus />
                            </TableCell>
                            {/* Created + Updated: fixed-mode relative cells (BR-4.1/4.2, C5 —
                                non-interactive inside the clickable row). */}
                            <TableCell className="text-muted-foreground">
                              <RelativeTimestamp fixed createdAt={ticket.dateCreated} />
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {ticket.lastModified
                                ? <RelativeTimestamp fixed updatedAt={ticket.lastModified} />
                                : 'Unknown'}
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
                            <TicketCode code={ticket.code} priority={ticket.priority} />
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
