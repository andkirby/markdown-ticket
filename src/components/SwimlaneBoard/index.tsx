import type { BoardTicket, Status, Ticket } from '../../types'
import { CRStatus } from '@mdt/domain-contracts'
import { Check, ChevronDown, FileText } from 'lucide-react'
import * as React from 'react'
import { useMemo, useState } from 'react'
import { useDrag } from 'react-dnd'
import { sortTickets } from '../../utils/sorting'
import { StatusBadge } from '../Badge/StatusBadge'
import { useDropZone } from '../Column/useDropZone'
import TicketCard from '../TicketCard'
import { TicketCode } from '../TicketCode'
import { Button } from '../ui/index'
import {
  buildSwimlaneModel,
  canDropTicketInLane,
} from './helpers'

interface SwimlaneBoardProps {
  tickets: BoardTicket[]
  laneSourceTickets: BoardTicket[]
  columns: Array<{ label: string, statuses: Status[], color: string }>
  sortAttribute: string
  sortDirection: 'asc' | 'desc'
  canWrite: boolean
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

export function SwimlaneBoard({
  tickets,
  laneSourceTickets,
  columns,
  sortAttribute,
  sortDirection,
  canWrite,
  onTicketEdit,
  onTicketDrop,
  onEpicStatusChange,
}: SwimlaneBoardProps) {
  const [hideEmpty, setHideEmpty] = useState(false)
  const [showBadges, setShowBadges] = useState(false)
  const [collapsedLaneKeys, setCollapsedLaneKeys] = useState<Set<string>>(() => new Set())
  const { lanes } = useMemo(() => buildSwimlaneModel(tickets, laneSourceTickets), [laneSourceTickets, tickets])
  const epicKeys = useMemo(() => new Set(lanes.filter(lane => lane.epic).map(lane => lane.key)), [lanes])
  const visibleLanes = hideEmpty
    ? lanes.filter(lane => lane.isNone || lane.tickets.length > 0)
    : lanes

  const toggleLane = (laneKey: string): void => {
    setCollapsedLaneKeys((prev) => {
      const next = new Set(prev)
      if (next.has(laneKey))
        next.delete(laneKey)
      else
        next.add(laneKey)
      return next
    })
  }

  const collapseAll = (): void => setCollapsedLaneKeys(new Set(lanes.map(lane => lane.key)))
  const expandAll = (): void => setCollapsedLaneKeys(new Set())

  return (
    <div className="swimlane-board" data-testid="swimlane-board">
      <div className="swimlane-board__toolbar" data-testid="swimlane-toolbar">
        <label className="swimlane-board__toggle">
          <input
            type="checkbox"
            checked={hideEmpty}
            onChange={event => setHideEmpty(event.currentTarget.checked)}
            data-testid="swimlane-hide-empty"
          />
          <span>Hide empty</span>
        </label>
        <label className="swimlane-board__toggle">
          <input
            type="checkbox"
            checked={showBadges}
            onChange={event => setShowBadges(event.currentTarget.checked)}
            data-testid="swimlane-show-badges"
          />
          <span>Show badges</span>
        </label>
        <Button type="button" variant="ghost" size="sm" onClick={collapseAll} data-testid="swimlane-collapse-all">Collapse all</Button>
        <Button type="button" variant="ghost" size="sm" onClick={expandAll} data-testid="swimlane-expand-all">Expand all</Button>
        <span className="swimlane-board__lane-count" data-testid="swimlane-lane-count">
          {visibleLanes.length}
          {' '}
          lanes
        </span>
      </div>

      <div className="swimlane-board__scroll">
        <div className="swimlane-board__head">
          <div className="swimlane-board__corner">Epics</div>
          {columns.map(column => (
            <div key={column.label} className="swimlane-board__col-head" data-column-color={column.color}>
              <span className="swimlane-board__status-dot" />
              <span>{column.label}</span>
            </div>
          ))}
        </div>

        {visibleLanes.map((lane) => {
          const isCollapsed = collapsedLaneKeys.has(lane.key)
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
            >
              <div className={`swimlane-board__lane-label ${lane.isNone ? 'swimlane-board__lane-label--none' : ''}`}>
                <div className="swimlane-board__lane-title">
                  <strong className="swimlane-board__lane-title-text">{lane.title}</strong>
                  {!lane.isNone && lane.epic && (
                    <button
                      type="button"
                      className="swimlane-board__lane-key"
                      aria-label={`Open epic ticket ${lane.key} ${lane.title}`}
                      title={`Open ${lane.key}`}
                      onClick={() => onTicketEdit(lane.epic as Ticket)}
                      data-testid="swimlane-lane-key"
                      data-lane-key={lane.key}
                    >
                      <TicketCode code={lane.key} ticket={lane.epic} />
                    </button>
                  )}
                </div>

                <div className="swimlane-board__lane-meta">
                  {lane.epic && <StatusBadge status={lane.epic.status} />}
                  <span className="swimlane-board__count-pill">{lane.tickets.length}</span>
                  <button
                    type="button"
                    className="swimlane-board__collapse"
                    aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} lane ${lane.title}`}
                    aria-expanded={!isCollapsed}
                    onClick={() => toggleLane(lane.key)}
                    data-testid="swimlane-collapse"
                    data-lane-key={lane.key}
                  >
                    <ChevronDown aria-hidden="true" size={14} />
                  </button>
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
                    <div className="swimlane-board__lifecycle">
                      {lifecycle.targetStatus
                        ? (
                            <Button
                              type="button"
                              size="sm"
                              variant={lifecycle.text === 'Activate' ? 'default' : 'outline'}
                              disabled={!canWrite || closeBlocked}
                              title={closeBlocked ? blockedTitle : undefined}
                              aria-label={`${lifecycle.text} ${lane.title}`}
                              onClick={() => {
                                if (lifecycle.targetStatus)
                                  void onEpicStatusChange(lane.epic as Ticket, lifecycle.targetStatus)
                              }}
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
                    </div>
                    <button
                      type="button"
                      className="swimlane-board__open-epic"
                      aria-label={`Open epic ticket ${lane.title}`}
                      title={`Open ${lane.key}`}
                      onClick={() => onTicketEdit(lane.epic as Ticket)}
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
                  const columnTickets = sortTickets(
                    lane.tickets
                      .filter(isLocalTicket)
                      .filter(ticket => column.statuses.includes(ticket.status as Status)),
                    sortAttribute,
                    sortDirection,
                  )
                  const primaryStatus = column.statuses[0]
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
