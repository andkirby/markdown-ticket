import type { Ticket } from '../types'
import { ContextBadge, PriorityBadge, RelationshipBadge, StatusBadge, TypeBadge } from './Badge'

interface TicketAttributesProps {
  ticket: Ticket
  className?: string
}

const TicketAttributes: React.FC<TicketAttributesProps> = ({ ticket, className = '' }) => {
  const formatDate = (date: Date | string | null) => {
    if (!date)
      return 'N/A'
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (Number.isNaN(dateObj.getTime()))
      return 'Invalid Date'
    return `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Key Attributes as Badges */}
      <div className="flex flex-wrap gap-2">
        <StatusBadge status={ticket.status} data-testid="ticket-status" />
        <PriorityBadge priority={ticket.priority} data-testid="ticket-priority" />
        <TypeBadge type={ticket.type} data-testid="ticket-type" />
        {ticket.phaseEpic && (
          <ContextBadge variant="phase" value={ticket.phaseEpic} />
        )}
        {ticket.assignee && (
          <ContextBadge variant="assignee" value={ticket.assignee} data-testid="ticket-assignee" />
        )}
        {/* MDT-095: Worktree Badge */}
        {ticket.inWorktree === true && (
          <ContextBadge variant="worktree" worktreePath={ticket.worktreePath} data-testid="worktree-badge" />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
          <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.dateCreated)}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Modified</dt>
          <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.lastModified)}</dd>
        </div>
        {ticket.implementationDate && (
          <>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Implementation Date</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.implementationDate)}</dd>
            </div>
            <div></div>
          </>
        )}
      </div>

      {((ticket.relatedTickets?.length || 0) > 0 || (ticket.dependsOn?.length || 0) > 0 || (ticket.blocks?.length || 0) > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationships</h4>
          <div className="flex flex-wrap gap-2">
            {(ticket.relatedTickets?.length || 0) > 0 && (
              <RelationshipBadge variant="related" links={ticket.relatedTickets} />
            )}
            {(ticket.dependsOn?.length || 0) > 0 && (
              <RelationshipBadge variant="depends" links={ticket.dependsOn} />
            )}
            {(ticket.blocks?.length || 0) > 0 && (
              <RelationshipBadge variant="blocks" links={ticket.blocks} />
            )}
          </div>
        </div>
      )}

      {(ticket.description || ticket.rationale || ticket.implementationNotes) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Details</h4>
          <div className="space-y-2">
            {ticket.description && (
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.description}</dd>
              </div>
            )}
            {ticket.rationale && (
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Rationale</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.rationale}</dd>
              </div>
            )}
            {ticket.implementationNotes && (
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Implementation Notes</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.implementationNotes}</dd>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default TicketAttributes
