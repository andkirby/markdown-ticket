import type { Ticket } from '../types/ticket'
import { CRLevel } from '@mdt/domain-contracts'
import { Zap } from 'lucide-react'
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
 *
 * Layout: `{priority}{key}{lightning if epic}` — an epic ticket gets a gold Zap
 * after the key (the same lightning the epic badge uses, `var(--epic-3)`), so
 * an epic key is scannable everywhere it appears.
 */
export const TicketCode: React.FC<TicketCodeProps> = ({ code, className = '', ticket, priority }) => {
  const inWorktree = ticket?.inWorktree === true
  const prio = priority ?? ticket?.priority
  const isEpic = ticket?.level === CRLevel.EPIC
  return (
    <span
      className={`ticket-code ticket-key ${className}`}
      data-testid="ticket-code"
    >
      <PriorityIcon priority={prio} className="priority-icon" />
      {code}
      {isEpic && <Zap className="ticket-code__epic-icon" aria-hidden="true" />}
      {inWorktree && ` ${WORKTREE_ICON}`}
    </span>
  )
}
