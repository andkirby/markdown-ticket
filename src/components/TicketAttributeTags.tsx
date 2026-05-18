import type { TicketCardBadgeId } from '../config/ticketCardBadges'
import type { Ticket } from '../types'
import { useEffect, useState } from 'react'
import {
  getVisibleTicketCardBadges,
  isTicketCardBadgeVisible,
  TICKET_CARD_BADGES_CHANGED_EVENT,
  TicketCardBadge,
} from '../config/ticketCardBadges'
import { ContextBadge, PriorityBadge, RelationshipBadge, StatusBadge, TypeBadge } from './Badge'

interface TicketAttributeTagsProps {
  ticket: Ticket
  className?: string
  isInvalidStatus?: boolean // Status is invalid - highlight badge
}

const TicketAttributeTags: React.FC<TicketAttributeTagsProps> = ({ ticket, className = '', isInvalidStatus = false }) => {
  const [visibleBadgeIds, setVisibleBadgeIds] = useState(getVisibleTicketCardBadges)

  useEffect(() => {
    const handleBadgePreferenceChange = (event: Event) => {
      const badgeIds = (event as CustomEvent<{ badgeIds?: TicketCardBadgeId[] }>).detail?.badgeIds
      setVisibleBadgeIds(badgeIds ?? getVisibleTicketCardBadges())
    }

    window.addEventListener(TICKET_CARD_BADGES_CHANGED_EVENT, handleBadgePreferenceChange)
    return () => window.removeEventListener(TICKET_CARD_BADGES_CHANGED_EVENT, handleBadgePreferenceChange)
  }, [])

  const isVisible = (badgeId: TicketCardBadgeId) => isTicketCardBadgeVisible(visibleBadgeIds, badgeId)

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {isVisible(TicketCardBadge.STATUS) && (
        <StatusBadge status={ticket.status} isInvalid={isInvalidStatus} />
      )}
      {isVisible(TicketCardBadge.PRIORITY) && (
        <PriorityBadge priority={ticket.priority} />
      )}
      {isVisible(TicketCardBadge.TYPE) && (
        <TypeBadge type={ticket.type || 'Unknown'} />
      )}
      {isVisible(TicketCardBadge.PHASE) && ticket.phaseEpic && (
        <ContextBadge variant="phase" value={ticket.phaseEpic} />
      )}
      {isVisible(TicketCardBadge.RELATED) && ticket.relatedTickets && ticket.relatedTickets.length > 0 && (
        <RelationshipBadge variant="related" links={ticket.relatedTickets} />
      )}
      {isVisible(TicketCardBadge.DEPENDS) && ticket.dependsOn && ticket.dependsOn.length > 0 && (
        <RelationshipBadge variant="depends" links={ticket.dependsOn} />
      )}
      {isVisible(TicketCardBadge.BLOCKS) && ticket.blocks && ticket.blocks.length > 0 && (
        <RelationshipBadge variant="blocks" links={ticket.blocks} />
      )}
      {/* MDT-095: Worktree Badge */}
      {isVisible(TicketCardBadge.WORKTREE) && ticket.inWorktree === true && (
        <ContextBadge variant="worktree" worktreePath={ticket.worktreePath} data-testid="worktree-badge" />
      )}
    </div>
  )
}

export default TicketAttributeTags
