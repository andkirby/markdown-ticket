/**
 * CloudProjectionStub — a read-only, non-draggable card for a cloud-projected
 * ticket header that has no canonical Markdown file locally (MDT-200 Slice U5).
 *
 * Mirrors the base TicketCard design (priority glyph + code + cloud glyph +
 * elapsed time, title, attribute badges via TicketAttributeTags) so it honours
 * the same board Settings (badge visibility) and design tokens. Cloud
 * distinctions:
 *   - .ticket-card--projected: dashed border + opacity 0.85 (non-canonical);
 *   - a Cloud lucide glyph beside the ticket key (no ownership/presence copy);
 *   - read-only, non-draggable.
 *
 * Source: docs/CRs/MDT-200/ux-design.md § Cloud-projected header stub,
 *         BR-3.1 (projection excludes body), BR-3.4 (board distinguishes
 *         projected state).
 *
 * Copy must NOT imply teammate ownership/presence (C8). Tooltip:
 *   "Projected from cloud — no local file yet."
 */

import type { CRStatus } from '@mdt/shared/models/Types'
import type { ProjectedStubTicket, Ticket } from '../types/ticket'
import { Cloud } from 'lucide-react'
import * as React from 'react'
import { VALID_STATUSES } from '../utils/ticketStatus'
import { RelativeTimestamp } from './shared/RelativeTimestamp'
import TicketAttributeTags from './TicketAttributeTags'
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
 */
export const CloudProjectionStub: React.FC<CloudProjectionStubProps> = ({ ticket, onOpen }) => {
  const clickable = typeof onOpen === 'function'
  const hasInvalidStatus = !VALID_STATUSES.includes(ticket.status as CRStatus)

  return (
    <div
      className={`ticket-card ticket-card--projected ${clickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
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
      {/* Row 1: priority glyph + code + cloud glyph (left) | elapsed time (right) */}
      <div className="flex items-center justify-between gap-2">
        <span className="ticket-card__code">
          <TicketCode code={ticket.code} priority={ticket.priority} />
          <Cloud className="ticket-card__cloud-icon" aria-hidden="true" />
        </span>
        <RelativeTimestamp createdAt={ticket.dateCreated} updatedAt={ticket.lastModified} className="ticket-card__time" />
      </div>

      {/* Row 2: title */}
      <h4 className="ticket-card__title">{ticket.title}</h4>

      {/* Row 3: badges — respects board Settings (badge visibility), same as base card */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <TicketAttributeTags ticket={ticket as unknown as Ticket} isInvalidStatus={hasInvalidStatus} />
        </div>
      </div>
      {/* No edit controls — read-only. */}
    </div>
  )
}

export default CloudProjectionStub
