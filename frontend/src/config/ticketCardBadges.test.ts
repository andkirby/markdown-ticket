import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  DEFAULT_VISIBLE_TICKET_CARD_BADGES,
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
    expect(getVisibleTicketCardBadges()).toEqual([...DEFAULT_VISIBLE_TICKET_CARD_BADGES])
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
      TicketCardBadge.EXTERNAL_REFS,
    ])
  })

  it('migrates legacy selections once and respects a later external-reference opt-out', () => {
    localStorage.setItem(TICKET_CARD_BADGE_STORAGE_KEY, JSON.stringify([TicketCardBadge.STATUS]))
    expect(getVisibleTicketCardBadges()).toEqual([TicketCardBadge.STATUS, TicketCardBadge.EXTERNAL_REFS])
    setVisibleTicketCardBadges([TicketCardBadge.STATUS])
    expect(getVisibleTicketCardBadges()).toEqual([TicketCardBadge.STATUS])
    expect(localStorage.getItem(TICKET_CARD_BADGE_STORAGE_KEY)).toBe('["status"]')
  })

  it('falls back to defaults when stored JSON is malformed', () => {
    localStorage.setItem(TICKET_CARD_BADGE_STORAGE_KEY, '{')

    expect(getVisibleTicketCardBadges()).toEqual([...DEFAULT_VISIBLE_TICKET_CARD_BADGES])
  })

  it('falls back to defaults when stored value is empty or unsupported', () => {
    localStorage.setItem(TICKET_CARD_BADGE_STORAGE_KEY, JSON.stringify([]))
    expect(getVisibleTicketCardBadges()).toEqual([...DEFAULT_VISIBLE_TICKET_CARD_BADGES])

    localStorage.setItem(TICKET_CARD_BADGE_STORAGE_KEY, JSON.stringify(['unsupported']))
    expect(getVisibleTicketCardBadges()).toEqual([...DEFAULT_VISIBLE_TICKET_CARD_BADGES])
  })
})
