import { readLocalStoragePreference, writeLocalStoragePreference } from './localStoragePreferences'

// v2: priority is now a glyph beside the ticket key (see TicketCard), so the
// badge-row priority is off by default. Versioning the key resets any saved
// preference from when priority was on by default.
export const TICKET_CARD_BADGE_STORAGE_KEY = 'markdown-ticket:board:ticket-card-badges:v2'
export const TICKET_CARD_BADGES_CHANGED_EVENT = 'markdown-ticket:ticket-card-badges-changed'

export const TicketCardBadge = {
  STATUS: 'status',
  PRIORITY: 'priority',
  TYPE: 'type',
  PHASE: 'phase',
  RELATED: 'related',
  DEPENDS: 'depends',
  BLOCKS: 'blocks',
  WORKTREE: 'worktree',
} as const

export type TicketCardBadgeId = typeof TicketCardBadge[keyof typeof TicketCardBadge]

export const TicketCardBadgeIds = [
  TicketCardBadge.STATUS,
  TicketCardBadge.PRIORITY,
  TicketCardBadge.TYPE,
  TicketCardBadge.PHASE,
  TicketCardBadge.RELATED,
  TicketCardBadge.DEPENDS,
  TicketCardBadge.BLOCKS,
  TicketCardBadge.WORKTREE,
] as const

/**
 * Badges shown on a ticket card when the user has no saved preference.
 *  Priority is omitted by default — it is surfaced as a colored glyph beside
 *  the ticket key (see TicketCard) instead, to avoid duplication.
 */
export const DEFAULT_VISIBLE_TICKET_CARD_BADGES: readonly TicketCardBadgeId[]
  = TicketCardBadgeIds.filter(id => id !== TicketCardBadge.PRIORITY)

export interface TicketCardBadgeOption {
  id: TicketCardBadgeId
  label: string
}

export const TicketCardBadgeOptions: readonly TicketCardBadgeOption[] = [
  { id: TicketCardBadge.STATUS, label: 'Status' },
  { id: TicketCardBadge.PRIORITY, label: 'Priority' },
  { id: TicketCardBadge.TYPE, label: 'Type' },
  { id: TicketCardBadge.PHASE, label: 'Phase' },
  { id: TicketCardBadge.RELATED, label: 'Related' },
  { id: TicketCardBadge.DEPENDS, label: 'Depends' },
  { id: TicketCardBadge.BLOCKS, label: 'Blocks' },
  { id: TicketCardBadge.WORKTREE, label: 'Worktree' },
] as const

function isTicketCardBadgeId(value: unknown): value is TicketCardBadgeId {
  return typeof value === 'string' && (TicketCardBadgeIds as readonly string[]).includes(value)
}

export function normalizeTicketCardBadgeIds(value: unknown): TicketCardBadgeId[] {
  if (!Array.isArray(value))
    return [...DEFAULT_VISIBLE_TICKET_CARD_BADGES]

  const selected = TicketCardBadgeIds.filter(id => value.includes(id))
  return selected.length > 0 ? selected : [...DEFAULT_VISIBLE_TICKET_CARD_BADGES]
}

export function getVisibleTicketCardBadges(): TicketCardBadgeId[] {
  return readLocalStoragePreference(
    TICKET_CARD_BADGE_STORAGE_KEY,
    [...DEFAULT_VISIBLE_TICKET_CARD_BADGES],
    {
      merge: storedValue => normalizeTicketCardBadgeIds(storedValue),
    },
  )
}

export function setVisibleTicketCardBadges(badgeIds: readonly TicketCardBadgeId[]): TicketCardBadgeId[] {
  const normalized = normalizeTicketCardBadgeIds(badgeIds.filter(isTicketCardBadgeId))
  writeLocalStoragePreference(TICKET_CARD_BADGE_STORAGE_KEY, normalized)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TICKET_CARD_BADGES_CHANGED_EVENT, {
      detail: { badgeIds: normalized },
    }))
  }

  return normalized
}
