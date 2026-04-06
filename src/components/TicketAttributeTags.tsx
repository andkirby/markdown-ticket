import type { Ticket } from '../types'
import { ContextBadge, PriorityBadge, RelationshipBadge, StatusBadge, TypeBadge } from './Badge'

interface TicketAttributeTagsProps {
  ticket: Ticket
  className?: string
  isInvalidStatus?: boolean // Status is invalid - highlight badge
}

const TicketAttributeTags: React.FC<TicketAttributeTagsProps> = ({ ticket, className = '', isInvalidStatus = false }) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <StatusBadge status={ticket.status} isInvalid={isInvalidStatus} />
      <PriorityBadge priority={ticket.priority} />
      <TypeBadge type={ticket.type || 'Unknown'} />
      {ticket.phaseEpic && (
        <ContextBadge variant="phase" value={ticket.phaseEpic} />
      )}
      {ticket.relatedTickets && ticket.relatedTickets.length > 0 && (
        <RelationshipBadge variant="related" links={ticket.relatedTickets} />
      )}
      {ticket.dependsOn && ticket.dependsOn.length > 0 && (
        <RelationshipBadge variant="depends" links={ticket.dependsOn} />
      )}
      {ticket.blocks && ticket.blocks.length > 0 && (
        <RelationshipBadge variant="blocks" links={ticket.blocks} />
      )}
      {/* MDT-095: Worktree Badge */}
      {ticket.inWorktree === true && (
        <ContextBadge variant="worktree" worktreePath={ticket.worktreePath} data-testid="worktree-badge" />
      )}
    </div>
  )
}

export default TicketAttributeTags
