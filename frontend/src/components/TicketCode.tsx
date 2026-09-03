import type { Ticket } from '../types/ticket'
import { CRLevel } from '@mdt/domain-contracts'
import { Zap } from 'lucide-react'
import * as React from 'react'
import { WORKTREE_ICON } from '../config'
import { useTicketKeyOptions } from '../config/ticketKeyConfig'
import { PriorityIcon } from './Badge/PriorityIcon'
import { TypeIcon } from './Badge/TypeIcon'

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
 * Layout: `{priority}{key}{type icon if opted in}{lightning if epic}` — an epic
 * ticket gets a gold Zap after the key (the same lightning the epic badge uses,
 * `var(--epic-3)`), so an epic key is scannable everywhere it appears. The type
 * glyph (MDT-244) slots between key and Zap when `ui.ticketKey.typeIconNearKey`
 * is on and the ticket carries a type.
 */
export const TicketCode: React.FC<TicketCodeProps> = ({ code, className = '', ticket, priority }) => {
  const inWorktree = ticket?.inWorktree === true
  const prio = priority ?? ticket?.priority
  const isEpic = ticket?.level === CRLevel.EPIC
  const { typeIconNearKey } = useTicketKeyOptions()
  const showTypeIcon = typeIconNearKey && ticket?.type != null
  return (
    <span
      className={`ticket-code ticket-key ${className}`}
      data-testid="ticket-code"
    >
      <PriorityIcon priority={prio} className="priority-icon" />
      {code}
      {showTypeIcon && <TypeIcon type={ticket.type} className="ticket-code__type-icon" title={ticket.type} />}
      {isEpic && <Zap className="ticket-code__epic-icon" aria-hidden="true" />}
      {inWorktree && ` ${WORKTREE_ICON}`}
    </span>
  )
}
