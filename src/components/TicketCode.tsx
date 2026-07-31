import type { Ticket } from '../types/ticket'
import * as React from 'react'
import { WORKTREE_ICON } from '../config'
import { PriorityIcon } from './Badge/PriorityIcon'

interface TicketCodeProps {
  code: string
  className?: string
  ticket?: Ticket // priority + worktree status
  /** Priority override when a full ticket isn't available (search hits, stubs). */
  priority?: string
}

/**
 * TicketCode — the SINGLE place the "priority glyph before the ticket key"
 * invariant is established (STYLING.md § Stable Scanning Patterns). Every
 * surface that shows a ticket key renders this component; never hand-compose
 * `<PriorityIcon> + code` — that is how surfaces drift out of sync (see the
 * QuickSearch regression: bare `{ticket.code}` had no glyph until routed here).
 */
export const TicketCode: React.FC<TicketCodeProps> = ({ code, className = '', ticket, priority }) => {
  const inWorktree = ticket?.inWorktree === true
  const prio = priority ?? ticket?.priority
  return (
    <span
      className={`ticket-code inline-flex items-center gap-1 font-medium text-primary dark:text-blue-400 ${className}`}
      data-testid="ticket-code"
    >
      <PriorityIcon priority={prio} className="priority-icon" />
      {code}
      {inWorktree && ` ${WORKTREE_ICON}`}
    </span>
  )
}
