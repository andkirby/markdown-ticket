/**
 * CloudProjectionStub — a read-only, non-draggable card for a cloud-projected
 * ticket header that has no canonical Markdown file locally (MDT-200 Slice U5).
 *
 * Source: docs/CRs/MDT-200/ux-design.md § Cloud-projected header stub,
 *         BR-3.1 (projection excludes body), BR-3.4 (board distinguishes
 *         projected state).
 *
 * Renders ONLY the approved projected fields (code/title/status/type/priority/
 * assignee/dates). NEVER a body, description, comments, or any field not in the
 * projection (BR-3.1).
 *
 * Visual distinction (reuse existing idioms, no new design system):
 *   - a small muted "cloud" label/badge with CloudIcon (lucide-react);
 *   - reduced opacity / muted border to signal non-canonical;
 *   - NOT draggable — reuse `opacity-50 cursor-not-allowed` from Board.tsx;
 *   - no edit controls.
 *
 * Copy must NOT imply teammate ownership/presence (C8). Tooltip:
 *   "Projected from cloud — no local file yet."
 */

import type { ProjectedStubTicket } from '../types/ticket'
import { Cloud } from 'lucide-react'
import * as React from 'react'
import { PriorityBadge } from './Badge/PriorityBadge'
import { StatusBadge } from './Badge/StatusBadge'
import { TypeBadge } from './Badge/TypeBadge'
import { TicketCode } from './TicketCode'

interface CloudProjectionStubProps {
  /** The projected stub to render (kind === 'projected'). */
  ticket: ProjectedStubTicket
  /** Open the read-only stub viewer (no edit controls). */
  onOpen?: (ticket: ProjectedStubTicket) => void
}

/**
 * Tooltip/copy must not imply teammate ownership or presence (C8). It states
 * only that the header is projected from cloud and no local file exists yet.
 */
export const PROJECTED_TOOLTIP = 'Projected from cloud — no local file yet.'

/**
 * @testid cloud-projection-stub — projected header card (read-only, non-draggable)
 * @testid cloud-projection-stub-{code} — projected card by code (e.g., cloud-projection-stub-MDT-500)
 * @testid cloud-badge — the muted "cloud" label on a projected card
 */
export const CloudProjectionStub: React.FC<CloudProjectionStubProps> = ({ ticket, onOpen }) => {
  const clickable = typeof onOpen === 'function'
  return (
    <div
      className="ticket-card ticket-card--projected opacity-50 cursor-not-allowed border-dashed border-muted"
      data-testid={`cloud-projection-stub cloud-projection-stub-${ticket.code}`}
      data-ticket-key={ticket.code}
      data-projected="true"
      title={PROJECTED_TOOLTIP}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? () => onOpen?.(ticket) : undefined}
      onKeyDown={clickable
        ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onOpen?.(ticket)
            }
          }
        : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h4 className="ticket-card__title">
            <TicketCode code={ticket.code} />
            <span className="mx-1 text-gray-900 dark:text-white">•</span>
            {ticket.title}
          </h4>
        </div>
        {/* Muted "cloud" label/badge — must not imply ownership/presence (C8). */}
        <span
          className="cloud-badge inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground border border-muted rounded px-1.5 py-0.5"
          data-testid="cloud-badge"
        >
          <Cloud className="h-3 w-3" aria-hidden="true" />
          cloud
        </span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={ticket.status} />
          {ticket.type ? <TypeBadge type={ticket.type} /> : null}
          {ticket.priority ? <PriorityBadge priority={ticket.priority} /> : null}
          {ticket.assignee
            ? (
                <span className="text-xs text-muted-foreground truncate max-w-[12rem]" title={ticket.assignee}>
                  {ticket.assignee}
                </span>
              )
            : null}
        </div>
        {/* No edit controls — read-only. */}
      </div>
    </div>
  )
}

export default CloudProjectionStub
