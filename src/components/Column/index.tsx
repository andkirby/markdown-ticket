import type { TicketFilters } from '@mdt/domain-contracts'
import type { BoardTicket, ProjectedStubTicket, Status, Ticket } from '../../types'
import { CRStatus } from '@mdt/domain-contracts'
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useDrag } from 'react-dnd'
import { getVisibleColumns } from '../../config'
import { isProjectedStub } from '../../types'
import { getColumnGradient } from '../../utils/colorUtils'
import { sortTickets } from '../../utils/sorting'
import { MobileChipStrip } from '../BoardFilterBar/MobileChipStrip'
import { CloudProjectionStub } from '../CloudProjectionStub'
import { ResolutionDialog } from '../ResolutionDialog'
import TicketCard from '../TicketCard'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { ScrollArea } from '../ui/scroll-area'
import StatusToggle from './StatusToggle'
import { useButtonModes } from './useButtonModes'
import { useDropZone } from './useDropZone'

interface ColumnProps {
  column: {
    label: string
    statuses: Status[]
    color: string
  }
  /** MDT-200 U5: board tickets may be local (draggable) or projected stubs. */
  tickets: BoardTicket[]
  allTickets: BoardTicket[] // All tickets to access deferred ones
  onDrop: (status: Status, ticket: Ticket, currentColumnIndex?: number, currentTicketIndex?: number) => void
  onTicketEdit: (ticket: Ticket) => void
  /** MDT-200 U5: open a projected stub read-only (no edit controls). */
  onOpenProjection?: (stub: ProjectedStubTicket) => void
  sortAttribute?: string
  sortDirection?: 'asc' | 'desc'
  isFirstColumn?: boolean
  // Position tracking methods for StatusToggle
  getTicketPosition: (ticketCode: string) => { columnIndex: number, ticketIndex: number, timestamp: number } | undefined
  clearTicketPosition: (ticketCode: string) => void
  /** Primary status for this column (for testid) */
  status?: Status
  canWrite?: boolean
  // Mobile column switcher props
  allColumns?: Array<{ label: string, statuses: Status[], color: string }>
  currentColumnIndex?: number
  onColumnSwitch?: (index: number) => void
  isMobileView?: boolean
  /** MDT-196: active board filters for the mobile chip strip. */
  mobileFilters?: TicketFilters
  /** MDT-196: remove a filter value from a mobile chip. */
  onRemoveMobileFilter?: (facet: import('../../utils/ticketFilters').FacetKey, value: string) => void
}

interface DraggableTicketCardProps {
  ticket: Ticket
  onMove: (newStatus: string) => void
  onEdit: () => void
  canWrite: boolean
}

/**
 * @testid drag-handle — Drag handle for ticket card
 */
const DraggableTicketCard: React.FC<DraggableTicketCardProps> = ({ ticket, onMove, onEdit, canWrite }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ticket',
    item: { ticket },
    canDrag: () => canWrite,
    collect: monitor => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [canWrite, ticket])

  // Monitor drag state changes for debugging
  useEffect(() => {
    if (isDragging) {
      // Ticket being dragged
    }
  }, [isDragging, ticket.code])

  return (
    <div
      ref={drag}
      className={`draggable-ticket ${
        isDragging
          ? 'draggable-ticket--dragging'
          : canWrite ? 'draggable-ticket--draggable' : ''
      }`}
      style={{
        cursor: canWrite ? 'move' : 'default',
        boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : undefined,
      }}
      data-testid={canWrite ? 'drag-handle' : undefined}
    >
      <TicketCard ticket={ticket} onMove={onMove} onEdit={onEdit} canEdit={canWrite} />
    </div>
  )
}

/**
 * @testid column-{status} — Board column with tickets
 */
const Column: React.FC<ColumnProps> = ({
  column,
  tickets,
  allTickets,
  onDrop,
  onTicketEdit,
  sortAttribute = 'code',
  sortDirection = 'desc',
  isFirstColumn = false,
  getTicketPosition,
  clearTicketPosition,
  status,
  canWrite = true,
  allColumns,
  currentColumnIndex = 0,
  onColumnSwitch,
  isMobileView = true,
  mobileFilters,
  onRemoveMobileFilter,
  onOpenProjection,
}) => {
  const [resolutionDialog, setResolutionDialog] = useState<{
    isOpen: boolean
    ticket: Ticket | null
  }>({
    isOpen: false,
    ticket: null,
  })

  // Use button modes hook for toggle state management
  const { viewMode, toggleViewMode, mergeMode, setMergeMode } = useButtonModes()

  // Calculate column index
  const columnIndex = useMemo(() => {
    const visibleColumns = getVisibleColumns()
    return visibleColumns.findIndex(col => col.label === column.label)
  }, [column.label])

  // Get toggle status for this column
  const getToggleStatus = (): Status | null => {
    if (column.label === 'In Progress')
      return CRStatus.ON_HOLD
    if (column.label === 'Done')
      return CRStatus.REJECTED
    return null
  }

  const toggleStatus = getToggleStatus()

  // Filter tickets based on toggle and merge states.
  // MDT-200 U5: tickets may be projected stubs; sorting is structurally
  // compatible so we cast at the sortTickets boundary and preserve the
  // projected discriminator through to rendering.
  const getVisibleTickets = (): BoardTicket[] => {
    if (!toggleStatus) {
      // No toggle status for this column, return all tickets as-is
      return sortTickets(tickets as Ticket[], sortAttribute, sortDirection) as unknown as BoardTicket[]
    }

    if (mergeMode) {
      // Merge mode is active: Show ALL tickets from both main and toggle statuses
      const mainStatus = column.statuses[0] // Get the primary status for this column
      const allRelatedTickets = allTickets.filter(ticket =>
        ticket.status === mainStatus || ticket.status === toggleStatus,
      )
      return sortTickets(allRelatedTickets as Ticket[], sortAttribute, sortDirection) as unknown as BoardTicket[]
    }
    else if (viewMode) {
      // Toggle mode is active (but merge mode is off): Show ONLY tickets with the toggle status
      const toggleTickets = allTickets.filter(ticket => ticket.status === toggleStatus)
      return sortTickets(toggleTickets as Ticket[], sortAttribute, sortDirection) as unknown as BoardTicket[]
    }
    else {
      // Both modes are inactive: Show only main tickets (excluding toggle status tickets)
      const mainTickets = tickets.filter(ticket => ticket.status !== toggleStatus)
      return sortTickets(mainTickets as Ticket[], sortAttribute, sortDirection) as unknown as BoardTicket[]
    }
  }

  const visibleTickets = getVisibleTickets()
  const toggleTicketCount = allTickets.filter(ticket => ticket.status === toggleStatus).length

  const handleToggleDrop = (status: Status, ticket: Ticket) => {
    if (!canWrite) {
      return
    }

    // Find ticket index in all tickets array
    const ticketIndex = allTickets.findIndex(t => t.code === ticket.code)
    onDrop(status, ticket, columnIndex, ticketIndex)
  }

  const handleDrop = (ticket: Ticket) => {
    if (!canWrite) {
      return
    }

    // Find ticket index in all tickets array
    if (column.label === 'Done' && column.statuses.length > 1) {
      setResolutionDialog({
        isOpen: true,
        ticket,
      })
      return
    }

    const ticketIndex = allTickets.findIndex(t => t.code === ticket.code)
    onDrop(column.statuses[0], ticket, columnIndex, ticketIndex)
  }

  const handleResolutionChoice = (status: Status) => {
    if (canWrite && resolutionDialog.ticket) {
      const ticketIndex = allTickets.findIndex(t => t.code === resolutionDialog.ticket?.code)
      onDrop(status, resolutionDialog.ticket, columnIndex, ticketIndex)
    }
    setResolutionDialog({ isOpen: false, ticket: null })
  }

  const handleResolutionCancel = () => {
    setResolutionDialog({ isOpen: false, ticket: null })
  }

  const { drop, isOver } = useDropZone({
    onDrop: (item: { ticket: Ticket }) => {
      handleDrop(item.ticket)
      return { handled: false }
    },
    canDrop: () => canWrite,
  })

  return (
    <div
      ref={drop}
      data-testid={status ? `column-${status}` : undefined}
      className={`column ${
        isOver ? 'column--over' : ''
      }`}
    >
      {/* Column Header */}
      <div className={`column__header bg-gradient-to-br ${getColumnGradient(column.color)}`}>
        <div className="flex items-center justify-between">
          {/* Mobile: Column dropdown menu */}
          {isMobileView && allColumns && onColumnSwitch
            ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      data-testid="mobile-column-switcher-trigger"
                      className="font-semibold text-foreground text-left flex items-center gap-1 hover:bg-black/5 dark:hover:bg-white/5 px-2 py-1 rounded transition-colors border border-transparent hover:border-black/10 dark:hover:border-white/10"
                    >
                      <h3 className="font-semibold text-foreground">{column.label}</h3>
                      <svg className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {allColumns.map((col, idx) => (
                      <DropdownMenuItem
                        key={col.label}
                        data-testid={`mobile-column-option-${col.label.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => onColumnSwitch(idx)}
                        className={idx === currentColumnIndex ? 'bg-accent' : ''}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{col.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {allTickets.filter(t => col.statuses.includes(t.status as Status)).length}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            : (
                <h3 className="font-semibold text-foreground">{column.label}</h3>
              )}
          <div className="flex items-center gap-2">
            {/* Status Toggle */}
            {toggleStatus && (
              <StatusToggle
                status={toggleStatus}
                isActive={viewMode}
                ticketCount={toggleTicketCount}
                onToggle={toggleViewMode}
                onDrop={handleToggleDrop}
                allTickets={allTickets}
                getTicketPosition={getTicketPosition}
                clearTicketPosition={clearTicketPosition}
                mergeMode={mergeMode}
                setMergeMode={setMergeMode}
                canWrite={canWrite}
              />
            )}
            <span className="column__count">
              {visibleTickets.length}
            </span>
          </div>
        </div>
        {/* MDT-196: mobile chip strip under the column header when filters active */}
        {isMobileView && mobileFilters && onRemoveMobileFilter && (
          <MobileChipStrip filters={mobileFilters} onRemove={onRemoveMobileFilter} />
        )}
      </div>

      {/* Column Content */}
      <ScrollArea
        type="hover"
        scrollHideDelay={600}
        className={`flex-1 min-h-0 border-r border-border ${isFirstColumn ? 'border-l border-border' : ''}`}
      >
        {/* @testid drop-zone — Column drop area for drag-and-drop */}
        <div data-testid="drop-zone" className="column-drop-zone">
          {visibleTickets.map((ticket) => {
            // MDT-200 U5: projected stubs are read-only and non-draggable.
            // They render as a CloudProjectionStub (no drag handle, no edit).
            if (isProjectedStub(ticket)) {
              return (
                <CloudProjectionStub
                  key={ticket.code}
                  ticket={ticket}
                  onOpen={onOpenProjection}
                />
              )
            }
            return (
              <DraggableTicketCard
                key={ticket.code}
                ticket={ticket}
                onMove={() => {}} // Not needed since drop is handled by column
                onEdit={() => onTicketEdit(ticket)}
                canWrite={canWrite}
              />
            )
          })}

          {visibleTickets.length === 0 && (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <p className="text-sm">No tickets</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {resolutionDialog.ticket && (
        <ResolutionDialog
          isOpen={resolutionDialog.isOpen}
          ticketCode={resolutionDialog.ticket.code}
          ticketTitle={resolutionDialog.ticket.title}
          availableStatuses={column.statuses}
          onResolve={handleResolutionChoice}
          onCancel={handleResolutionCancel}
        />
      )}
    </div>
  )
}

export default Column
