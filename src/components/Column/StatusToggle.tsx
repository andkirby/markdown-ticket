import type { Status, Ticket } from '../../types'
import * as React from 'react'
import { useRef, useState } from 'react'
import { getButtonModeClasses } from './buttonModeStyles'
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
}) => {
  const { mergeMode: internalMergeMode, activeState: _activeState, toggleViewMode: _toggleViewMode, setMergeMode: internalSetMergeMode, isHovering: _isHovering, handleMouseEnter, handleMouseLeave } = useButtonModes()
  const [isHoveringCount, setIsHoveringCount] = useState(false)
  const countContainerRef = useRef<HTMLDivElement>(null)

  // Use external state if provided, otherwise use internal state
  const mergeMode = externalMergeMode !== undefined ? externalMergeMode : internalMergeMode
  const setMergeMode = externalSetMergeMode || internalSetMergeMode

  // Update showCheckbox based on all hover states
  const showCheckbox = isHoveringCount || mergeMode

  const { drop, isOver } = useDropZone({
    onDrop: (item) => {
      // When a ticket is dropped on the StatusToggle, update its status to match the toggle status
      onDrop(status, item.ticket)
    },
    markHandled: true, // Prevent further drop handling by parent
  })

  const getIcon = () => {
    if (status === 'On Hold')
      return '⏸'
    if (status === 'Rejected')
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
    const isChecked = e.target.checked

    // Only toggle merge mode, don't execute merge
    setMergeMode(isChecked)
  }

  // Handle merging tickets from toggle status back to parent status
  const _handleMerge = async () => {
    // Get all tickets with the toggle status (e.g., 'On Hold' or 'Rejected')
    const toggleTickets = allTickets.filter(ticket => ticket.status === status)

    // Determine the parent status based on toggle status
    const parentStatus = status === 'On Hold' ? 'In Progress' : status === 'Rejected' ? 'Done' : null

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

  // Get checkbox styling - orange only when checked (merge mode active)
  const getCheckboxClasses = () => {
    const baseClasses = 'w-4 h-4 rounded transition-all duration-150 ease-out cursor-pointer'

    if (mergeMode) {
      // Orange theme when checked (merge mode active)
      return `${baseClasses} text-orange-600 bg-orange-100 border-orange-400 focus:ring-orange-500 focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-800`
    }

    // Gray theme when not checked
    return `${baseClasses} text-gray-600 bg-gray-50 border-gray-300 focus:ring-gray-500 focus:ring-2 focus:ring-offset-1 dark:focus:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300`
  }

  // Determine button styling based on active state
  const getButtonStyles = () => {
    // Compact styling that doesn't affect header height
    const baseClasses = 'flex items-center justify-between px-2 py-1 text-xs rounded-md border transition-all whitespace-nowrap h-8'

    if (isActive && !mergeMode) {
      // Switch mode is active - use orange theme with orange background
      return `${baseClasses} bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300`
    }

    if (mergeMode) {
      // Merge mode - gray button with orange border
      return `${baseClasses} bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300 ring-2 ring-orange-300 dark:ring-orange-600`
    }

    // Normal mode - gray button
    return `${baseClasses} ${getButtonModeClasses('status')}`
  }

  return (
    <div className="relative inline-block">
      <button
        ref={drop}
        onClick={handleButtonClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          ${getButtonStyles()}
          ${isOver ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950/20' : ''}
        `}
        title={mergeMode ? `Click to exit merge mode. Drag tickets here to move them to parent column.` : `${status} tickets${ticketCount > 0 ? ` (${ticketCount})` : ''}`}
      >
        <span className="flex items-center justify-between w-full gap-2">
          <span className="flex items-center gap-1">
            <span className="text-lg">{getIcon()}</span>
            <span className="font-medium">{status}</span>
          </span>

          {ticketCount > 0 && (
            <div
              ref={countContainerRef}
              className="relative flex items-center justify-center w-6 h-6"
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
                      className={`flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full transition-colors duration-200 ${
                        mergeMode || (isActive && !mergeMode)
                          ? 'bg-orange-500 text-white' // Orange in merge mode or switch mode
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' // Gray in normal mode
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
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
      )}
    </div>
  )
}

export default StatusToggle
