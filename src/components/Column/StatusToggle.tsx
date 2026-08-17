import type { Status, Ticket } from '../../types'
import { CRStatus } from '@mdt/domain-contracts'
import * as React from 'react'
import { useRef, useState } from 'react'
import { useButtonModes } from './useButtonModes'
import { useDropZone } from './useDropZone'

interface StatusToggleProps {
  status: Status
  isActive: boolean
  ticketCount: number
  onToggle: () => void
  onDrop: (status: Status, ticket: Ticket) => void
  allTickets: Ticket[] // All tickets in the board
  // Position tracking methods
  getTicketPosition: (ticketCode: string) => { columnIndex: number, ticketIndex: number, timestamp: number } | undefined
  clearTicketPosition: (ticketCode: string) => void
  // Optional external state management
  mergeMode?: boolean
  setMergeMode?: (enabled: boolean) => void
  canWrite?: boolean
}

const StatusToggle: React.FC<StatusToggleProps> = ({
  status,
  isActive,
  ticketCount,
  onToggle,
  onDrop,
  allTickets,
  getTicketPosition,
  clearTicketPosition,
  mergeMode: externalMergeMode,
  setMergeMode: externalSetMergeMode,
  canWrite = true,
}) => {
  const { mergeMode: internalMergeMode, activeState: _activeState, toggleViewMode: _toggleViewMode, setMergeMode: internalSetMergeMode, isHovering: _isHovering, handleMouseEnter, handleMouseLeave } = useButtonModes()
  const [isHoveringCount, setIsHoveringCount] = useState(false)
  const countContainerRef = useRef<HTMLDivElement>(null)

  // Use external state if provided, otherwise use internal state
  const mergeMode = externalMergeMode !== undefined ? externalMergeMode : internalMergeMode
  const setMergeMode = externalSetMergeMode || internalSetMergeMode

  // Update showCheckbox based on all hover states
  const showCheckbox = canWrite && (isHoveringCount || mergeMode)

  const { drop, isOver } = useDropZone({
    onDrop: (item) => {
      if (!canWrite) {
        return
      }
      // When a ticket is dropped on the StatusToggle, update its status to match the toggle status
      onDrop(status, item.ticket)
    },
    markHandled: true, // Prevent further drop handling by parent
    canDrop: () => canWrite,
  })

  const getIcon = () => {
    if (status === CRStatus.ON_HOLD)
      return '⏸'
    if (status === CRStatus.REJECTED)
      return '✕'
    return ''
  }

  const handleButtonClick = async (e: React.MouseEvent) => {
    // Prevent button click when clicking on checkbox
    const target = e.target as HTMLInputElement
    if (target.type !== 'checkbox') {
      if (mergeMode) {
        // If in merge mode, clicking the button should turn off merge mode
        // but NOT merge tickets - tickets only merge when dropped
        setMergeMode(false)
      }
      else {
        // Switch mode toggles view
        onToggle()
      }
    }
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (!canWrite) {
      return
    }

    const isChecked = e.target.checked

    // Only toggle merge mode, don't execute merge
    setMergeMode(isChecked)
  }

  // Handle merging tickets from toggle status back to parent status
  const _handleMerge = async () => {
    // Get all tickets with the toggle status (e.g., 'On Hold' or 'Rejected')
    const toggleTickets = allTickets.filter(ticket => ticket.status === status)

    // Determine the parent status based on toggle status
    const parentStatus = status === CRStatus.ON_HOLD ? CRStatus.IN_PROGRESS : status === CRStatus.REJECTED ? 'Done' : null

    if (!parentStatus || toggleTickets.length === 0) {
      return
    }

    // Process each ticket
    let mergeSuccess = true
    for (const ticket of toggleTickets) {
      try {
        // Get the stored position for this ticket
        const storedPosition = getTicketPosition(ticket.code)

        // Update the ticket status by calling onDrop
        await onDrop(parentStatus as Status, ticket)

        // Clear the stored position after successful merge
        if (storedPosition) {
          clearTicketPosition(ticket.code)
        }
      }
      catch (error) {
        console.error(`Failed to merge ticket ${ticket.code}:`, error)
        mergeSuccess = false
      }
    }

    if (mergeSuccess) {
      // Note: mergeMode is turned off in handleButtonClick after calling handleMerge
    }
  }

  // Shared .checkbox base; warning accent (column.css) while merge mode is armed
  const getCheckboxClasses = () =>
    mergeMode && canWrite ? 'checkbox column-merge-checkbox' : 'checkbox'

  return (
    <div className="status-toggle">
      <button
        /**
         * @testid status-dropdown — Status toggle button for changing ticket status
         */
        data-testid={canWrite ? 'status-dropdown' : undefined}
        ref={drop}
        onClick={handleButtonClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          status-toggle__btn
          ${isActive && !mergeMode ? 'status-toggle__btn--active' : ''}
          ${mergeMode && canWrite ? 'status-toggle__btn--merge' : ''}
          ${isOver ? 'status-toggle__btn--over' : ''}
        `}
        title={mergeMode && canWrite ? `Click to exit merge mode. Drag tickets here to move them to parent column.` : `${status} tickets${ticketCount > 0 ? ` (${ticketCount})` : ''}`}
      >
        <span className="status-toggle__content">
          <span className="status-toggle__label-group">
            <span className="status-toggle__icon">{getIcon()}</span>
            <span className="status-toggle__name">{status}</span>
          </span>

          {ticketCount > 0 && (
            <div
              ref={countContainerRef}
              className="status-toggle__count-slot"
              onMouseEnter={(e) => {
                e.stopPropagation()
                setIsHoveringCount(true)
              }}
              onMouseLeave={(e) => {
                e.stopPropagation()
                setIsHoveringCount(false)
              }}
            >
              {/* Conditionally render elements based on hover state and merge mode */}
              {showCheckbox
                ? (
                    <input
                      type="checkbox"
                      checked={mergeMode}
                      onChange={handleCheckboxChange}
                      className={getCheckboxClasses()}
                      title={mergeMode ? `Merge mode enabled - drag tickets to move them` : `Enable merge mode to drag tickets to parent column`}
                      onClick={e => e.stopPropagation()}
                    />
                  )
                : (
                    <span
                      className={`count-badge ${
                        mergeMode || (isActive && !mergeMode)
                          ? 'count-badge--active'
                          : 'count-badge--inactive'
                      }`}
                    >
                      {ticketCount}
                    </span>
                  )}
            </div>
          )}
        </span>
      </button>

      {/* Visual indicator for active merge mode */}
      {mergeMode && (
        <div className="status-dot status-dot--sm status-dot--orange" />
      )}
    </div>
  )
}

export default StatusToggle
