import type { CRStatus } from '@mdt/shared/models/Types'
import type { Ticket } from '../types'
import * as React from 'react'
import { VALID_STATUSES } from '../utils/ticketStatus'
import { PriorityIcon } from './Badge/PriorityIcon'
import { formatDataAttr } from './Badge/utils'
import { RelativeTimestamp } from './shared/RelativeTimestamp'
import TicketAttributeTags from './TicketAttributeTags'
import { TicketCode } from './TicketCode'

interface TicketCardProps {
  ticket: Ticket
  onMove?: (newStatus: string) => void // Used by DraggableTicketCard wrapper
  onClick?: () => void // Used for testing
  onDragStart?: (e: React.DragEvent) => void // Used for testing
  onEdit: () => void
  canEdit?: boolean
}

/**
 * @testid ticket-card — Ticket card container
 * @testid ticket-{code} — Ticket card by code (e.g., ticket-MDT-001)
 */
const TicketCard: React.FC<TicketCardProps> = ({ ticket, onMove: _onMove, onClick: _onClick, onDragStart: _onDragStart, onEdit }) => {
  const hasInvalidStatus = !VALID_STATUSES.includes(ticket.status as CRStatus)

  return (
    <div
      className={`group ticket-card ${
        hasInvalidStatus ? 'ticket-card--invalid' : ''
      }`}
      onClick={onEdit}
      data-testid={`ticket-card ticket-${ticket.code}`}
      data-ticket-key={ticket.code}
      data-priority={ticket.priority ? formatDataAttr(ticket.priority) : undefined}
      data-invalid={hasInvalidStatus ? 'true' : undefined}
      title={hasInvalidStatus ? `Invalid status: "${ticket.status}"` : undefined}
    >
      {/* Row 1: code (left) + timestamp (right) */}
      <div className="flex items-center justify-between gap-2">
        <span className="ticket-card__code">
          <PriorityIcon priority={ticket.priority} className="priority-icon" />
          <TicketCode code={ticket.code} ticket={ticket} />
        </span>
        <RelativeTimestamp createdAt={ticket.dateCreated} updatedAt={ticket.lastModified} className="ticket-card__time" />
      </div>

      {/* Row 2: title */}
      <h4 className="ticket-card__title">{ticket.title}</h4>

      {/* Row 3: badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <TicketAttributeTags ticket={ticket} isInvalidStatus={hasInvalidStatus} />
        </div>
      </div>

    </div>
  )
}

export default TicketCard
export { TicketCard }
