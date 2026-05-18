import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  DEFAULT_TICKET_CARD_BADGES,
  getVisibleTicketCardBadges,
  setVisibleTicketCardBadges,
  TICKET_CARD_BADGE_STORAGE_KEY,
  TicketCardBadge,
} from './ticketCardBadges'

describe('ticketCardBadges preference', () => {
  const originalConsoleWarn = console.warn

  beforeEach(() => {
    localStorage.clear()
    console.warn = () => {}
  })

  afterEach(() => {
    localStorage.clear()
    console.warn = originalConsoleWarn
  })

  it('returns defaults when storage is missing', () => {
    expect(getVisibleTicketCardBadges()).toEqual([...DEFAULT_TICKET_CARD_BADGES])
  })

  it('persists supported badge ids to the board localStorage key', () => {
    setVisibleTicketCardBadges([
      TicketCardBadge.STATUS,
      TicketCardBadge.TYPE,
      TicketCardBadge.WORKTREE,
    ])

    expect(localStorage.getItem(TICKET_CARD_BADGE_STORAGE_KEY)).toBe('["status","type","worktree"]')
    expect(getVisibleTicketCardBadges()).toEqual([
      TicketCardBadge.STATUS,
      TicketCardBadge.TYPE,
      TicketCardBadge.WORKTREE,
    ])
  })

  it('filters unsupported stored badge ids', () => {
    localStorage.setItem(TICKET_CARD_BADGE_STORAGE_KEY, JSON.stringify([
      TicketCardBadge.STATUS,
      'unsupported',
      TicketCardBadge.BLOCKS,
    ]))

    expect(getVisibleTicketCardBadges()).toEqual([
      TicketCardBadge.STATUS,
      TicketCardBadge.BLOCKS,
    ])
  })

  it('falls back to defaults when stored JSON is malformed', () => {
    localStorage.setItem(TICKET_CARD_BADGE_STORAGE_KEY, '{')

    expect(getVisibleTicketCardBadges()).toEqual([...DEFAULT_TICKET_CARD_BADGES])
  })

  it('falls back to defaults when stored value is empty or unsupported', () => {
    localStorage.setItem(TICKET_CARD_BADGE_STORAGE_KEY, JSON.stringify([]))
    expect(getVisibleTicketCardBadges()).toEqual([...DEFAULT_TICKET_CARD_BADGES])

    localStorage.setItem(TICKET_CARD_BADGE_STORAGE_KEY, JSON.stringify(['unsupported']))
    expect(getVisibleTicketCardBadges()).toEqual([...DEFAULT_TICKET_CARD_BADGES])
  })
})
