import type { Ticket } from '../types/ticket'
import { CRLevel } from '@mdt/domain-contracts'
import { Zap } from 'lucide-react'
import * as React from 'react'
import { WORKTREE_ICON } from '../config'
import { useTicketKeyOptions } from '../config/ticketKeyConfig'
import { PriorityIcon } from './Badge/PriorityIcon'
import { StatusIcon } from './Badge/StatusIcon'
import { TypeIcon } from './Badge/TypeIcon'

interface TicketCodeProps {
  code: string
  className?: string
  ticket?: Ticket // priority + worktree status
  /** Priority override when a full ticket isn't available (search hits, stubs). */
  priority?: string
  /**
   * MDT-247: status override driving the key-strip status glyph. Opt-in by
   * presence — deliberately NOT fallen back from `ticket.status`: surfaces
   * that co-render a StatusBadge (cards, viewer, lane header, list rows)
   * simply don't pass it, so no surface can ever show status twice
   * (suppression by construction, mirroring MDT-244's precedence inverted).
   */
  status?: string
}

/**
 * TicketCode — the SINGLE place the "priority glyph before the ticket key"
 * invariant is established (STYLING.md § Stable Scanning Patterns). Every
 * surface that shows a ticket key renders this component; never hand-compose
 * `<PriorityIcon> + code` — that is how surfaces drift out of sync (see the
 * QuickSearch regression: bare `{ticket.code}` had no glyph until routed here).
 *
 * Layout: `{priority}{status if passed}{key}{type icon if opted in}{lightning
 * if epic}` — an epic ticket gets a gold Zap after the key (the same lightning
 * the epic badge uses, `var(--epic-3)`), so an epic key is scannable
 * everywhere it appears. The type glyph (MDT-244) slots between key and Zap
 * when `ui.ticketKey.typeIconNearKey` is on and the ticket carries a type.
 * The status glyph (MDT-247) sits between the priority glyph and the key on
 * the only surfaces without a co-rendered status badge (QuickSearch hits, the
 * pin tooltip) — those pass `status`; everywhere else the badge is the single
 * status encoding.
 */
export const TicketCode: React.FC<TicketCodeProps> = ({ code, className = '', ticket, priority, status }) => {
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
      <StatusIcon status={status} className="ticket-code__status-icon" title={status} />
      {code}
      {showTypeIcon && <TypeIcon type={ticket.type} className="ticket-code__type-icon" title={ticket.type} />}
      {isEpic && <Zap className="ticket-code__epic-icon" aria-hidden="true" />}
      {inWorktree && ` ${WORKTREE_ICON}`}
    </span>
  )
}
