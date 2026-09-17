import type { BoardTicket, Status, Ticket } from '../../types'
import { CRStatus } from '@mdt/domain-contracts'
import { Check, ChevronDown, ChevronLeft, FileText, Search, X } from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDrag } from 'react-dnd'
import {
  COLLAPSED_COLUMNS_CHANGE_EVENT,
  getCollapsedColumns,
  setCollapsedColumns as persistCollapsedColumns,
} from '../../config/settingsPreferences'
import { sortTickets } from '../../utils/sorting'
import { StatusBadge } from '../Badge/StatusBadge'
import { useDropZone } from '../Column/useDropZone'
import TicketCard from '../TicketCard'
import { TicketCode } from '../TicketCode'
import { Button } from '../ui/index'
import {
  buildSwimlaneModel,
  canDropTicketInLane,
  filterLanesBySearch,
  filterLanesByVisibility,
} from './helpers'

const EXPANDED_LANES_KEY = 'mdt-settings-swimlane-expanded-lanes'

function readExpandedLanes(): Set<string> {
  try {
    const raw = localStorage.getItem(EXPANDED_LANES_KEY)
    if (!raw)
      return new Set()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((v: unknown): v is string => typeof v === 'string')) : new Set()
  }
  catch {
    return new Set()
  }
}

function writeExpandedLanes(keys: Set<string>): void {
  try {
    localStorage.setItem(EXPANDED_LANES_KEY, JSON.stringify([...keys]))
  }
  catch {
    // Non-browser callers only need in-memory state.
  }
}

interface SwimlaneBoardProps {
  tickets: BoardTicket[]
  laneSourceTickets: BoardTicket[]
  columns: Array<{ label: string, statuses: Status[], color: string }>
  sortAttribute: string
  sortDirection: 'asc' | 'desc'
  canWrite: boolean
  /**
   * MDT-246: epic key focused on arrival (the `?epic=` token, parsed by
   * ProjectRouteHandler). Unknown or missing keys are ignored — the board
   * renders normally (BR-1.6).
   */
  focusEpicKey?: string | null
  onTicketEdit: (ticket: Ticket) => void
  onTicketDrop: (status: Status, ticket: Ticket) => void | Promise<void>
  onEpicStatusChange: (epic: Ticket, status: Status) => void | Promise<void>
}

interface DraggableLaneTicketProps {
  ticket: Ticket
  canWrite: boolean
  showBadges: boolean
  onTicketEdit: (ticket: Ticket) => void
}

interface LaneColumnProps {
  laneKey: string
  status: Status
  tickets: Ticket[]
  canWrite: boolean
  showBadges: boolean
  epicKeys: Set<string>
  onTicketEdit: (ticket: Ticket) => void
  onTicketDrop: (status: Status, ticket: Ticket) => void | Promise<void>
}

function isLocalTicket(ticket: BoardTicket): ticket is Ticket {
  return !('kind' in ticket && ticket.kind === 'projected')
}

function DraggableLaneTicket({ ticket, canWrite, showBadges, onTicketEdit }: DraggableLaneTicketProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ticket',
    item: { ticket },
    canDrag: () => canWrite,
    collect: monitor => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [canWrite, ticket])

  return (
    <div
      ref={drag}
      className={`draggable-ticket ${isDragging ? 'draggable-ticket--dragging' : canWrite ? 'draggable-ticket--draggable' : ''}`}
      data-testid={canWrite ? 'drag-handle' : undefined}
    >
      <TicketCard ticket={ticket} onEdit={() => onTicketEdit(ticket)} canEdit={canWrite} showBadges={showBadges} />
    </div>
  )
}

function LaneColumn({
  laneKey,
  status,
  tickets,
  canWrite,
  showBadges,
  epicKeys,
  onTicketEdit,
  onTicketDrop,
}: LaneColumnProps) {
  const { drop, isOver, canDrop } = useDropZone({
    onDrop: (item: { ticket: Ticket }) => {
      if (!canDropTicketInLane(item.ticket, laneKey, epicKeys))
        return { handled: true }

      void onTicketDrop(status, item.ticket)
      return { handled: true }
    },
    canDrop: (item: { ticket: Ticket }) => canWrite && canDropTicketInLane(item.ticket, laneKey, epicKeys),
    markHandled: true,
  })

  return (
    <div
      ref={drop}
      className={`swimlane-board__lane-col ${isOver && canDrop ? 'drag-over' : ''}`}
      data-testid="swimlane-lane-col"
      data-lane-key={laneKey}
      data-status={status}
      aria-label={`${laneKey} ${status}`}
    >
      {tickets.map(ticket => (
        <DraggableLaneTicket
          key={ticket.code}
          ticket={ticket}
          canWrite={canWrite}
          showBadges={showBadges}
          onTicketEdit={onTicketEdit}
        />
      ))}

      {tickets.length === 0 && (
        <div className="swimlane-board__lane-empty">No tickets</div>
      )}
    </div>
  )
}

function getBlockers(tickets: BoardTicket[]): Ticket[] {
  const terminalStatuses = new Set<string>([
    CRStatus.IMPLEMENTED,
    CRStatus.REJECTED,
    CRStatus.PARTIALLY_IMPLEMENTED,
  ])
  return tickets
    .filter(isLocalTicket)
    .filter(ticket => !terminalStatuses.has(ticket.status))
}

function getLifecycleLabel(epic: Ticket): { text: string, targetStatus: Status | null, disabled: boolean } {
  if (epic.status === CRStatus.PROPOSED)
    return { text: 'Activate', targetStatus: CRStatus.APPROVED, disabled: false }
  if (epic.status === CRStatus.APPROVED)
    return { text: 'Close', targetStatus: CRStatus.IMPLEMENTED, disabled: false }
  if (epic.status === CRStatus.IMPLEMENTED)
    return { text: 'Closed', targetStatus: null, disabled: true }
  return { text: 'Activate', targetStatus: CRStatus.APPROVED, disabled: false }
}

/**
 * Stop an event bubbling to the lane-label collapse toggle, then run the child
 * action (open epic ticket, advance lifecycle). The whole lane label is the
 * collapse trigger (design3 §8); interactive children opt out via this helper.
 */
function stopAndRun(event: React.MouseEvent, action: () => void): void {
  event.stopPropagation()
  action()
}

export function SwimlaneBoard({
  tickets,
  laneSourceTickets,
  columns,
  sortAttribute,
  sortDirection,
  canWrite,
  focusEpicKey,
  onTicketEdit,
  onTicketDrop,
  onEpicStatusChange,
}: SwimlaneBoardProps) {
  const [hideEmpty, setHideEmpty] = useState(false)
  const [showBadges, setShowBadges] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  // BR-6.1: toolbar ticket search (title / ticket key only, presentation-only).
  const [searchQuery, setSearchQuery] = useState('')
  // Default is collapsed-by-default: the set tracks EXPANDED lanes (the ones the
  // user explicitly opened), persisted to localStorage. An empty set = all collapsed.
  const [expandedLaneKeys, setExpandedLaneKeys] = useState<Set<string>>(() => readExpandedLanes())
  // Column collapse shares the flat Board's mdt-settings-collapsed-columns key
  // (keyed by primary status), so a status collapsed in one view collapses in
  // the other. The change event keeps multiple Board instances/tabs in sync.
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>(() => getCollapsedColumns())
  useEffect(() => {
    const sync = (): void => setCollapsedColumns(getCollapsedColumns())
    window.addEventListener(COLLAPSED_COLUMNS_CHANGE_EVENT, sync)
    return () => window.removeEventListener(COLLAPSED_COLUMNS_CHANGE_EVENT, sync)
  }, [])
  const toggleColumnCollapse = useCallback((columnId: string) => {
    setCollapsedColumns((prev) => {
      const next = prev.includes(columnId) ? prev.filter(id => id !== columnId) : [...prev, columnId]
      persistCollapsedColumns(next)
      return next
    })
  }, [])
  const { lanes } = useMemo(() => buildSwimlaneModel(tickets, laneSourceTickets), [laneSourceTickets, tickets])
  const epicKeys = useMemo(() => new Set(lanes.filter(lane => lane.epic).map(lane => lane.key)), [lanes])

  // ── Focused arrival (?epic= token, MDT-246) ─────────────────────────────
  // The token resolves against the lane model: unknown keys are ignored before
  // any focus effect runs (BR-1.6). focusActive gates the visibility override
  // and ends on user board interaction; highlightedLaneKey is the transient
  // ~2s accent that auto-clears while the expansion persists (INV-3).
  const knownFocusKey = useMemo(
    () => (focusEpicKey && lanes.some(lane => lane.key === focusEpicKey) ? focusEpicKey : null),
    [focusEpicKey, lanes],
  )
  const [focusActive, setFocusActive] = useState(false)
  const [highlightedLaneKey, setHighlightedLaneKey] = useState<string | null>(null)
  const [arrivalAnnouncement, setArrivalAnnouncement] = useState('')
  const [arrivalSeq, setArrivalSeq] = useState(0)
  const lanesRef = useRef(lanes)
  lanesRef.current = lanes

  // Arrival lifecycle (ordered per epic-navigation.interactions.md):
  // expand+persist → search clear → highlight+announce. The scroll runs in a
  // follow-up effect keyed on the same commit so the override has rendered.
  useEffect(() => {
    if (!knownFocusKey)
      return
    setExpandedLaneKeys((prev) => {
      if (prev.has(knownFocusKey))
        return prev
      const next = new Set(prev)
      next.add(knownFocusKey)
      writeExpandedLanes(next)
      return next
    })
    setSearchQuery((prev) => {
      if (!prev.trim())
        return prev
      const lane = lanesRef.current.find(l => l.key === knownFocusKey)
      const kept = lane ? filterLanesBySearch([lane], prev) : []
      return kept.length > 0 ? prev : ''
    })
    setFocusActive(true)
    setHighlightedLaneKey(knownFocusKey)
    const lane = lanesRef.current.find(l => l.key === knownFocusKey)
    setArrivalAnnouncement(`Epic lane ${knownFocusKey}${lane ? ` ${lane.title}` : ''} expanded`)
    setArrivalSeq(seq => seq + 1)
    const timer = setTimeout(() => setHighlightedLaneKey(null), 2000)
    return () => clearTimeout(timer)
  }, [knownFocusKey])

  // Scroll the focused lane into view (label plus leading columns). The lane
  // may only exist in the DOM one commit after the arrival (the visibility
  // override and expansion render then), so the effect also keys on the
  // expansion set — but scrolls AT MOST ONCE per arrival: a later, unrelated
  // lane expansion must not snap the board back to the focused lane.
  const scrolledArrivalRef = useRef(0)
  useEffect(() => {
    if (!knownFocusKey || scrolledArrivalRef.current === arrivalSeq)
      return
    const laneEl = document.querySelector(
      `[data-testid="swimlane-lane"][data-lane-key="${CSS.escape(knownFocusKey)}"]`,
    )
    if (!laneEl)
      return
    scrolledArrivalRef.current = arrivalSeq
    laneEl.scrollIntoView({ block: 'nearest', inline: 'start' })
  }, [knownFocusKey, arrivalSeq, focusActive, expandedLaneKeys])

  // Focus ends on user board interaction (search, filter toggle, collapsing
  // the focused lane); never re-collapses the lane — the persisted expanded
  // set stays as the user left it.
  const endFocus = useCallback(() => {
    setFocusActive(false)
    setHighlightedLaneKey(null)
  }, [])

  // Search narrows lane tickets first; visibility filters (Hide empty /
  // Show closed) then apply on the searched lanes. While focus is active the
  // focused lane is exempt from both filters (BR-1.5).
  const visibleLanes = useMemo(
    () => filterLanesByVisibility(filterLanesBySearch(lanes, searchQuery), {
      hideEmpty,
      showClosed,
      focusedKey: focusActive ? knownFocusKey : null,
    }),
    [lanes, hideEmpty, showClosed, searchQuery, focusActive, knownFocusKey],
  )

  const toggleLane = (laneKey: string): void => {
    // Collapsing the focused lane ends focus (MDT-246); expansion itself
    // persists — ending focus never re-collapses anything (INV-3).
    if (laneKey === knownFocusKey && expandedLaneKeys.has(laneKey))
      endFocus()
    setExpandedLaneKeys((prev) => {
      const next = new Set(prev)
      if (next.has(laneKey))
        next.delete(laneKey)
      else
        next.add(laneKey)
      writeExpandedLanes(next)
      return next
    })
  }

  const collapseAll = (): void => {
    // Collapsing every lane collapses the focused lane too — that is a
    // collapse of the focused lane, so focus ends (interactions contract).
    endFocus()
    const next = new Set<string>()
    writeExpandedLanes(next)
    setExpandedLaneKeys(next)
  }
  const expandAll = (): void => {
    const next = new Set(lanes.map(lane => lane.key))
    writeExpandedLanes(next)
    setExpandedLaneKeys(next)
  }

  return (
    <div className="swimlane-board" data-testid="swimlane-board">
      {/* MDT-246: screen-reader parity for the focused-arrival highlight. */}
      <span
        className="swimlane-board__announcement"
        role="status"
        aria-live="polite"
        data-testid="swimlane-arrival-announcement"
      >
        {arrivalAnnouncement}
      </span>
      <div className="swimlane-board__toolbar" data-testid="swimlane-toolbar">
        <div className="swimlane-board__search">
          <Search className="swimlane-board__search-icon" aria-hidden="true" size={14} />
          <input
            type="text"
            className="swimlane-board__search-input"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.currentTarget.value)
              endFocus()
            }}
            placeholder="Search title or key (ABC-012, 12, ABC-12)"
            aria-label="Search swimlane tickets by title or key"
            data-testid="swimlane-search"
          />
          {searchQuery && (
            <button
              type="button"
              className="swimlane-board__search-clear"
              aria-label="Clear search"
              onClick={() => {
                setSearchQuery('')
                endFocus()
              }}
              data-testid="swimlane-search-clear"
            >
              <X aria-hidden="true" size={14} />
            </button>
          )}
        </div>
        <label className="swimlane-board__toggle">
          <input
            type="checkbox"
            className="checkbox"
            checked={hideEmpty}
            onChange={(event) => {
              setHideEmpty(event.currentTarget.checked)
              endFocus()
            }}
            data-testid="swimlane-hide-empty"
          />
          <span>Hide empty</span>
        </label>
        <label className="swimlane-board__toggle">
          <input
            type="checkbox"
            className="checkbox"
            checked={showBadges}
            onChange={event => setShowBadges(event.currentTarget.checked)}
            data-testid="swimlane-show-badges"
          />
          <span>Show badges</span>
        </label>
        <label className="swimlane-board__toggle">
          <input
            type="checkbox"
            className="checkbox"
            checked={showClosed}
            onChange={(event) => {
              setShowClosed(event.currentTarget.checked)
              endFocus()
            }}
            data-testid="swimlane-show-closed"
          />
          <span>Show closed</span>
        </label>
        <button type="button" className="swimlane-board__toggle" onClick={collapseAll} data-testid="swimlane-collapse-all">Collapse all</button>
        <button type="button" className="swimlane-board__toggle" onClick={expandAll} data-testid="swimlane-expand-all">Expand all</button>
        <span className="swimlane-board__lane-count" data-testid="swimlane-lane-count">
          {visibleLanes.length}
          {' '}
          lanes
        </span>
      </div>

      <div className="swimlane-board__scroll">
        <div className="swimlane-board__head">
          <div className="swimlane-board__corner">Epics</div>
          {columns.map((column) => {
            const primaryStatus = column.statuses[0]
            const isColCollapsed = collapsedColumns.includes(primaryStatus)
            return (
              <div
                key={column.label}
                className={`swimlane-board__col-head ${isColCollapsed ? 'swimlane-board__col-head--collapsed' : ''}`}
                data-column-color={column.color}
                data-status={primaryStatus}
              >
                {isColCollapsed
                  ? (
                      <button
                        type="button"
                        className="swimlane-board__col-expand"
                        aria-label={`Expand column ${column.label}`}
                        title={`Expand ${column.label}`}
                        onClick={() => toggleColumnCollapse(primaryStatus)}
                        data-testid="swimlane-col-expand"
                        data-status={primaryStatus}
                      >
                        <span className="swimlane-board__status-dot" aria-hidden="true" />
                      </button>
                    )
                  : (
                      <>
                        <span className="swimlane-board__status-dot" aria-hidden="true" />
                        <span className="swimlane-board__col-label">{column.label}</span>
                        <button
                          type="button"
                          className="swimlane-board__col-collapse"
                          aria-label={`Collapse column ${column.label}`}
                          title="Collapse column"
                          onClick={() => toggleColumnCollapse(primaryStatus)}
                          data-testid="swimlane-col-collapse"
                          data-status={primaryStatus}
                        >
                          <ChevronLeft aria-hidden="true" size={14} />
                        </button>
                      </>
                    )}
              </div>
            )
          })}
        </div>

        {visibleLanes.map((lane) => {
          const isCollapsed = !expandedLaneKeys.has(lane.key)
          const blockers = lane.epic ? getBlockers(lane.tickets) : []
          const lifecycle = lane.epic ? getLifecycleLabel(lane.epic) : null
          const closeBlocked = lane.epic?.status === CRStatus.APPROVED && blockers.length > 0
          const blockedTitle = blockers.map(ticket => `${ticket.code} ${ticket.title}`).join(', ')

          return (
            <section
              key={lane.key}
              className={`swimlane-board__lane ${isCollapsed ? 'swimlane-board__lane--collapsed' : ''}`}
              style={{ '--epic-color': lane.isNone ? 'var(--border-strong)' : `var(--epic-${lane.colorIndex})` } as React.CSSProperties}
              data-testid="swimlane-lane"
              data-lane-key={lane.key}
              data-focused={highlightedLaneKey === lane.key || undefined}
            >
              <div
                role="button"
                tabIndex={0}
                className={`swimlane-board__lane-label ${lane.isNone ? 'swimlane-board__lane-label--none' : ''}`}
                aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} lane ${lane.title}`}
                aria-expanded={!isCollapsed}
                onClick={() => toggleLane(lane.key)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleLane(lane.key)
                  }
                }}
                data-testid="swimlane-lane-label"
                data-lane-key={lane.key}
              >
                {!lane.isNone && lane.epic && (
                  <button
                    type="button"
                    className="swimlane-board__lane-key"
                    aria-label={`Open epic ticket ${lane.key} ${lane.title}`}
                    title={`Open ${lane.key}`}
                    onClick={event => stopAndRun(event, () => onTicketEdit(lane.epic as Ticket))}
                    data-testid="swimlane-lane-key"
                    data-lane-key={lane.key}
                  >
                    <TicketCode code={lane.key} ticket={lane.epic} />
                  </button>
                )}
                <div className="swimlane-board__lane-title">
                  <strong className="swimlane-board__lane-title-text">{lane.title}</strong>
                </div>

                <div className="swimlane-board__lane-meta">
                  {lane.epic && <StatusBadge status={lane.epic.status} />}
                  <span className="swimlane-board__count-pill">{lane.tickets.length}</span>
                  <span className="swimlane-board__collapse" aria-hidden="true">
                    <ChevronDown size={14} />
                  </span>
                </div>

                {!lane.isNone && (
                  <div className="swimlane-board__progress-row">
                    <div
                      className="swimlane-board__progress"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={lane.progress.percent}
                      aria-label={`${lane.title} progress`}
                      data-testid="swimlane-progress"
                      data-lane-key={lane.key}
                    >
                      <span style={{ width: `${lane.progress.percent}%` }} />
                    </div>
                    <span className="swimlane-board__progress-text">
                      {lane.progress.done}
                      /
                      {lane.progress.total}
                    </span>
                  </div>
                )}

                {lane.epic && lifecycle && (
                  <div className="swimlane-board__lane-actions">
                    <span className="swimlane-board__lifecycle">
                      {lifecycle.targetStatus
                        ? (
                            <Button
                              type="button"
                              size="sm"
                              variant={lifecycle.text === 'Activate' ? 'default' : 'outline'}
                              disabled={!canWrite || closeBlocked}
                              title={closeBlocked ? blockedTitle : undefined}
                              aria-label={`${lifecycle.text} ${lane.title}`}
                              onClick={event => stopAndRun(event, () => {
                                if (lifecycle.targetStatus)
                                  void onEpicStatusChange(lane.epic as Ticket, lifecycle.targetStatus)
                              })}
                              data-testid="swimlane-lifecycle-action"
                              data-lane-key={lane.key}
                            >
                              {lifecycle.text}
                            </Button>
                          )
                        : (
                            <span
                              className="swimlane-board__closed"
                              data-testid="swimlane-lifecycle-action"
                              data-lane-key={lane.key}
                            >
                              <Check aria-hidden="true" size={14} />
                              Closed
                            </span>
                          )}
                    </span>
                    <button
                      type="button"
                      className="swimlane-board__open-epic"
                      aria-label={`Open epic ticket ${lane.title}`}
                      title={`Open ${lane.key}`}
                      onClick={event => stopAndRun(event, () => onTicketEdit(lane.epic as Ticket))}
                      data-testid="swimlane-open-epic"
                      data-lane-key={lane.key}
                    >
                      <FileText aria-hidden="true" size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div
                className="swimlane-board__lane-body"
                hidden={isCollapsed}
                data-testid="swimlane-lane-body"
                data-lane-key={lane.key}
              >
                {columns.map((column) => {
                  const primaryStatus = column.statuses[0]
                  // Collapsed column → narrow strip rail (no drop zone), mirroring
                  // the flat Board's 44px collapsed column. The whole strip is a
                  // click target to re-expand the column (Board parity: the entire
                  // collapsed column is one big expand button).
                  if (collapsedColumns.includes(primaryStatus)) {
                    return (
                      <button
                        type="button"
                        key={column.label}
                        className="swimlane-board__lane-col-rail"
                        data-column-color={column.color}
                        data-testid="swimlane-lane-col-rail"
                        data-lane-key={lane.key}
                        data-status={primaryStatus}
                        aria-label={`Expand column ${column.label}`}
                        title={`Expand ${column.label}`}
                        onClick={() => toggleColumnCollapse(primaryStatus)}
                      />
                    )
                  }
                  const columnTickets = sortTickets(
                    lane.tickets
                      .filter(isLocalTicket)
                      .filter(ticket => column.statuses.includes(ticket.status as Status)),
                    sortAttribute,
                    sortDirection,
                  )
                  return (
                    <LaneColumn
                      key={column.label}
                      laneKey={lane.key}
                      status={primaryStatus}
                      tickets={columnTickets}
                      canWrite={canWrite}
                      showBadges={showBadges}
                      epicKeys={epicKeys}
                      onTicketEdit={onTicketEdit}
                      onTicketDrop={onTicketDrop}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default SwimlaneBoard
