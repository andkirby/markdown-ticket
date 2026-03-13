import type { Status, Ticket } from '../../types'
import { CRStatus } from '@mdt/domain-contracts'
import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useDrag } from 'react-dnd'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { getVisibleColumns } from '../../config'
import { getColumnGradient } from '../../utils/colorUtils'
import { sortTickets } from '../../utils/sorting'
import { ResolutionDialog } from '../ResolutionDialog'
import TicketCard from '../TicketCard'
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
  tickets: Ticket[]
  allTickets: Ticket[] // All tickets to access deferred ones
  onDrop: (status: Status, ticket: Ticket, currentColumnIndex?: number, currentTicketIndex?: number) => void
  onTicketEdit: (ticket: Ticket) => void
  sortAttribute?: string
  sortDirection?: 'asc' | 'desc'
  isFirstColumn?: boolean
  // Position tracking methods for StatusToggle
  getTicketPosition: (ticketCode: string) => { columnIndex: number, ticketIndex: number, timestamp: number } | undefined
  clearTicketPosition: (ticketCode: string) => void
  /** Primary status for this column (for testid) */
  status?: Status
  // Mobile column switcher props
  allColumns?: Array<{ label: string, statuses: Status[], color: string }>
  currentColumnIndex?: number
  onColumnSwitch?: (index: number) => void
  isMobileView?: boolean
}

interface DraggableTicketCardProps {
  ticket: Ticket
  onMove: (newStatus: string) => void
  onEdit: () => void
}

/**
 * @testid drag-handle — Drag handle for ticket card
 */
const DraggableTicketCard: React.FC<DraggableTicketCardProps> = ({ ticket, onMove, onEdit }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ticket',
    item: { ticket },
    collect: monitor => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  // Monitor drag state changes for debugging
  useEffect(() => {
    if (isDragging) {
      // Ticket being dragged
    }
  }, [isDragging, ticket.code])

  return (
    <div
      ref={drag}
      className={`draggable-ticket transition-all duration-300 ease-out ${
        isDragging
          ? 'opacity-40 scale-95 rotate-2 shadow-2xl'
          : 'hover:scale-[1.02] hover:-translate-y-1'
      }`}
      style={{
        cursor: 'move',
        boxShadow: isDragging ? '0 25px 50px -12px rgba(0, 0, 0, 0.25)' : undefined,
      }}
      data-testid="drag-handle"
    >
      <TicketCard ticket={ticket} onMove={onMove} onEdit={onEdit} />
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
  allColumns,
  currentColumnIndex = 0,
  onColumnSwitch,
  isMobileView = true,
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

  // Filter tickets based on toggle and merge states
  const getVisibleTickets = () => {
    if (!toggleStatus) {
      // No toggle status for this column, return all tickets as-is
      return sortTickets(tickets, sortAttribute, sortDirection)
    }

    if (mergeMode) {
      // Merge mode is active: Show ALL tickets from both main and toggle statuses
      const mainStatus = column.statuses[0] // Get the primary status for this column
      const allRelatedTickets = allTickets.filter(ticket =>
        ticket.status === mainStatus || ticket.status === toggleStatus,
      )
      return sortTickets(allRelatedTickets, sortAttribute, sortDirection)
    }
    else if (viewMode) {
      // Toggle mode is active (but merge mode is off): Show ONLY tickets with the toggle status
      const toggleTickets = allTickets.filter(ticket => ticket.status === toggleStatus)
      return sortTickets(toggleTickets, sortAttribute, sortDirection)
    }
    else {
      // Both modes are inactive: Show only main tickets (excluding toggle status tickets)
      const mainTickets = tickets.filter(ticket => ticket.status !== toggleStatus)
      return sortTickets(mainTickets, sortAttribute, sortDirection)
    }
  }

  const visibleTickets = getVisibleTickets()
  const toggleTicketCount = allTickets.filter(ticket => ticket.status === toggleStatus).length

  const handleToggleDrop = (status: Status, ticket: Ticket) => {
    // Find ticket index in all tickets array
    const ticketIndex = allTickets.findIndex(t => t.code === ticket.code)
    onDrop(status, ticket, columnIndex, ticketIndex)
  }

  const handleDrop = (ticket: Ticket) => {
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
    if (resolutionDialog.ticket) {
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
  })

  return (
    <div
      ref={drop}
      data-testid={status ? `column-${status}` : undefined}
      className={`column flex flex-col transition-all duration-200 ease-out h-full min-h-0 relative ${
        isOver
          ? 'bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-blue-400/30'
          : ''
      }`}
    >
      {/* Column Header */}
      <div className={`px-3 py-2 border border-black/5 dark:border-white/10 bg-gradient-to-br rounded-t-lg shadow-md z-10 ${getColumnGradient(column.color)}`}>
        <div className="flex items-center justify-between">
          {/* Mobile: Column dropdown menu */}
          {isMobileView && allColumns && onColumnSwitch ? (
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
          ) : (
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
              />
            )}
            <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-mono min-w-[2rem] text-center tabular-nums">
              {visibleTickets.length}
            </span>
          </div>
        </div>
      </div>

      {/* Column Content */}
      <ScrollArea
        type="hover"
        scrollHideDelay={600}
        className={`flex-1 min-h-0 border-r border-border ${isFirstColumn ? 'border-l border-border' : ''}`}
      >
        {/* @testid drop-zone — Column drop area for drag-and-drop */}
        <div data-testid="drop-zone" className="column-drop-zone px-3 py-2 space-y-2">
          {visibleTickets.map(ticket => (
            <DraggableTicketCard
              key={ticket.code}
              ticket={ticket}
              onMove={() => {}} // Not needed since drop is handled by column
              onEdit={() => onTicketEdit(ticket)}
            />
          ))}

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
