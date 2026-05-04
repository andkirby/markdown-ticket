import type { CRStatus } from '@mdt/shared/models/Types'
import type { Ticket } from '../types'
import * as React from 'react'
import TicketAttributeTags from './TicketAttributeTags'
import { TicketCode } from './TicketCode'

interface TicketCardProps {
  ticket: Ticket
  onMove?: (newStatus: string) => void // Used by DraggableTicketCard wrapper
  onClick?: () => void // Used for testing
  onDragStart?: (e: React.DragEvent) => void // Used for testing
  onEdit: () => void
}

/**
 * Check if a status is a valid CR status.
 * Compares against known status labels from statusConfig.
 */
function isValidStatus(status: string): boolean {
  const validStatuses: CRStatus[] = [
    'Proposed',
    'Approved',
    'In Progress',
    'Implemented',
    'Partially Implemented',
    'On Hold',
    'Rejected',
  ]
  return validStatuses.includes(status as CRStatus)
}

/**
 * @testid ticket-card — Ticket card container
 * @testid ticket-{code} — Ticket card by code (e.g., ticket-MDT-001)
 */
const TicketCard: React.FC<TicketCardProps> = ({ ticket, onMove: _onMove, onClick: _onClick, onDragStart: _onDragStart, onEdit }) => {
  const hasInvalidStatus = !isValidStatus(ticket.status)

  return (
    <div
      className={`group ticket-card bg-gradient-to-br from-white to-gray-50/80 dark:from-slate-800 dark:to-slate-900/80 border rounded-xl px-3 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 hover:scale-[1.005] transition-all duration-300 ease-out cursor-pointer backdrop-blur-sm ${
        hasInvalidStatus ? 'ticket-card--invalid' : ''
      }`}
      onClick={onEdit}
      data-testid={`ticket-card ticket-${ticket.code}`}
      data-ticket-key={ticket.code}
      data-invalid={hasInvalidStatus ? 'true' : undefined}
      title={hasInvalidStatus ? `Invalid status: "${ticket.status}"` : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h4 className="ticket-title font-semibold text-gray-900 dark:text-white text-sm truncate">
            <TicketCode code={ticket.code} ticket={ticket} />
            <span className="mx-1 text-gray-900 dark:text-white">•</span>
            {ticket.title}
          </h4>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <TicketAttributeTags ticket={ticket} isInvalidStatus={hasInvalidStatus} />
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="opacity-0 group-hover:opacity-100 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-all duration-200 ease-out"
            title="Edit ticket"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

    </div>
  )
}

export default TicketCard
export { TicketCard }
