import type { Ticket } from '../../types'
import { ContextBadge, PriorityBadge, StatusBadge, TypeBadge } from '../Badge'
import { TicketCode } from '../TicketCode'

interface CompactTicketHeaderProps {
  ticket: Ticket
  className?: string
}

export function CompactTicketHeader({ ticket, className = '' }: CompactTicketHeaderProps) {
  return (
    <div className={className}>
      <div className="border-b border-gray-200 px-4 py-3 pr-14 dark:border-gray-700">
        <h1 className="min-w-0 text-base font-semibold leading-6 text-gray-900 dark:text-white">
          <TicketCode code={ticket.code} ticket={ticket} />
          <span className="mx-1 text-gray-900 dark:text-white">•</span>
          <span className="break-words text-gray-900 dark:text-white">{ticket.title}</span>
        </h1>
      </div>

      <div className="border-b border-gray-200 px-4 py-2.5 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={ticket.status} data-testid="ticket-status" />
          <PriorityBadge priority={ticket.priority} data-testid="ticket-priority" />
          <TypeBadge type={ticket.type} data-testid="ticket-type" />
          {ticket.phaseEpic && (
            <ContextBadge variant="phase" value={ticket.phaseEpic} />
          )}
          {ticket.assignee && (
            <ContextBadge variant="assignee" value={ticket.assignee} data-testid="ticket-assignee" />
          )}
          {ticket.inWorktree === true && (
            <ContextBadge variant="worktree" worktreePath={ticket.worktreePath} data-testid="worktree-badge" />
          )}
        </div>
      </div>
    </div>
  )
}
