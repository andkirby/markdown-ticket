import type { ReactNode } from 'react'
import type { Ticket } from '../../types'
import { useTicketKeyOptions } from '../../config/ticketKeyConfig'
import { ContextBadge, PriorityBadge, RelationshipBadge, StatusBadge, TypeBadge } from '../Badge'
import { TicketCode } from '../TicketCode'

interface CompactTicketHeaderProps {
  ticket: Ticket
  className?: string
  action?: ReactNode
}

export function CompactTicketHeader({ ticket, className = '', action }: CompactTicketHeaderProps) {
  // MDT-244 suppression precedence: when the key line already carries the type
  // glyph, the header omits the type badge (no duplicate type encoding).
  const { typeIconNearKey } = useTicketKeyOptions()
  return (
    <div className={className} data-testid="ticket-detail-header">
      <div className="modal__section compact-ticket-header__title-section">
        <h1 className="modal__headline compact-ticket-header__headline" data-testid="ticket-title">
          <TicketCode code={ticket.code} ticket={ticket} />
          <span className="compact-ticket-header__divider">•</span>
          <span className="compact-ticket-header__title">{ticket.title}</span>
        </h1>
      </div>

      <div className="modal__section--sm">
        <div className="compact-ticket-header__badges">
          <StatusBadge status={ticket.status} data-testid="ticket-status" />
          <PriorityBadge priority={ticket.priority} data-testid="ticket-priority" />
          {!typeIconNearKey && <TypeBadge type={ticket.type} data-testid="ticket-type" />}
          {ticket.phaseEpic && (
            <ContextBadge variant="phase" value={ticket.phaseEpic} detail />
          )}
          {ticket.assignee && (
            <ContextBadge variant="assignee" value={ticket.assignee} data-testid="ticket-assignee" />
          )}
          {ticket.inWorktree === true && (
            <ContextBadge variant="worktree" worktreePath={ticket.worktreePath} data-testid="worktree-badge" />
          )}
          {(ticket.relatedTickets?.length || 0) > 0 && (
            <RelationshipBadge variant="related" links={ticket.relatedTickets} />
          )}
          {(ticket.dependsOn?.length || 0) > 0 && (
            <RelationshipBadge variant="depends" links={ticket.dependsOn} />
          )}
          {(ticket.blocks?.length || 0) > 0 && (
            <RelationshipBadge variant="blocks" links={ticket.blocks} />
          )}
          {action && (
            <>
              <span className="compact-ticket-header__spacer" />
              {action}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
