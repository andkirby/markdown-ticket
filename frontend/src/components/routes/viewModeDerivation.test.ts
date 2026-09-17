/**
 * Characterization tests for the pure view-mode routing derivations
 * (controlled refactor stage 0 — extracted verbatim from App.tsx).
 *
 * Pins the exact mapping the project route handler relies on:
 * pathname precedence over ?view=, the /epics → 'board' variant rule,
 * the ticket-close return-path mapping, and the ?view= carry rule for
 * ticket links opened inside a ticket modal (MDT-246 BR-1.7).
 */
import { describe, expect, it } from 'bun:test'
import { carryViewParam, deriveViewMode, ticketCloseTargetPath } from './viewModeDerivation'

describe('deriveViewMode', () => {
  // ─── Pathname takes precedence ────────────────────────────────────────────

  it('reports list for /list paths', () => {
    expect(deriveViewMode('/prj/MDT/list', null)).toBe('list')
  })

  it('reports documents for /documents paths', () => {
    expect(deriveViewMode('/prj/MDT/documents', null)).toBe('documents')
  })

  it('reports board for /epics paths (swimlane variant reports board)', () => {
    expect(deriveViewMode('/prj/MDT/epics', null)).toBe('board')
  })

  it('pathname beats a conflicting ?view= param', () => {
    expect(deriveViewMode('/prj/MDT/list', 'documents')).toBe('list')
    expect(deriveViewMode('/prj/MDT/documents', 'list')).toBe('documents')
  })

  it('documents wildcard paths still report documents', () => {
    expect(deriveViewMode('/prj/MDT/documents/docs/README.md', null)).toBe('documents')
  })

  // ─── Query param fallback (ticket routes) ─────────────────────────────────

  it('uses ?view= on ticket routes', () => {
    expect(deriveViewMode('/prj/MDT/ticket/MDT-130', 'list')).toBe('list')
    expect(deriveViewMode('/prj/MDT/ticket/MDT-130', 'documents')).toBe('documents')
  })

  it('?view=epics reports board (layout variant, not a view)', () => {
    expect(deriveViewMode('/prj/MDT/ticket/MDT-130', 'epics')).toBe('board')
  })

  // ─── Defaults ─────────────────────────────────────────────────────────────

  it('falls back to board with no param on the bare board path', () => {
    expect(deriveViewMode('/prj/MDT', null)).toBe('board')
    expect(deriveViewMode('/prj/MDT', 'bogus')).toBe('board')
  })

  it('falls back to board on ticket routes without a recognized param', () => {
    expect(deriveViewMode('/prj/MDT/ticket/MDT-130', null)).toBe('board')
    expect(deriveViewMode('/prj/MDT/ticket/MDT-130', 'board')).toBe('board')
  })
})

describe('ticketCloseTargetPath', () => {
  it('board context returns the bare project path', () => {
    expect(ticketCloseTargetPath('board', '/prj/MDT')).toBe('/prj/MDT')
  })

  it('epics context maps to the /epics route', () => {
    expect(ticketCloseTargetPath('epics', '/prj/MDT')).toBe('/prj/MDT/epics')
  })

  it('list and documents contexts map directly', () => {
    expect(ticketCloseTargetPath('list', '/prj/MDT')).toBe('/prj/MDT/list')
    expect(ticketCloseTargetPath('documents', '/prj/MDT')).toBe('/prj/MDT/documents')
  })
})

describe('carryViewParam (MDT-246 BR-1.7)', () => {
  it('carries ?view= onto ticket links while on a ticket route', () => {
    expect(carryViewParam('/prj/MDT/ticket/MDT-231', '/prj/MDT/ticket/MDT-100', '?view=epics'))
      .toBe('/prj/MDT/ticket/MDT-231?view=epics')
    expect(carryViewParam('/prj/MDT/ticket/MDT-231', '/prj/MDT/ticket/MDT-100', '?view=list'))
      .toBe('/prj/MDT/ticket/MDT-231?view=list')
  })

  it('does not carry outside a ticket route (board/list/documents/epics)', () => {
    expect(carryViewParam('/prj/MDT/ticket/MDT-231', '/prj/MDT', '?view=epics')).toBe('/prj/MDT/ticket/MDT-231')
    expect(carryViewParam('/prj/MDT/ticket/MDT-231', '/prj/MDT/epics', '?view=epics')).toBe('/prj/MDT/ticket/MDT-231')
    expect(carryViewParam('/prj/MDT/ticket/MDT-231', '/prj/MDT/list', '?view=list')).toBe('/prj/MDT/ticket/MDT-231')
  })

  it('does not carry when the current location has no ?view=', () => {
    expect(carryViewParam('/prj/MDT/ticket/MDT-231', '/prj/MDT/ticket/MDT-100', '')).toBe('/prj/MDT/ticket/MDT-231')
    expect(carryViewParam('/prj/MDT/ticket/MDT-231', '/prj/MDT/ticket/MDT-100', '?other=1')).toBe('/prj/MDT/ticket/MDT-231')
  })

  it('never rewrites a href that already carries a query', () => {
    expect(carryViewParam('/prj/MDT/ticket/MDT-231?view=list', '/prj/MDT/ticket/MDT-100', '?view=epics'))
      .toBe('/prj/MDT/ticket/MDT-231?view=list')
  })

  it('inserts the param before a #fragment, not inside the hash', () => {
    expect(carryViewParam('/prj/MDT/ticket/MDT-231#section', '/prj/MDT/ticket/MDT-100', '?view=epics'))
      .toBe('/prj/MDT/ticket/MDT-231?view=epics#section')
  })

  it('leaves a href untouched when both a query and a fragment are present', () => {
    expect(carryViewParam('/prj/MDT/ticket/MDT-231?view=list#section', '/prj/MDT/ticket/MDT-100', '?view=epics'))
      .toBe('/prj/MDT/ticket/MDT-231?view=list#section')
  })

  it('encodes the carried value', () => {
    expect(carryViewParam('/prj/MDT/ticket/MDT-231', '/prj/MDT/ticket/MDT-100', '?view=epics%20mode'))
      .toBe('/prj/MDT/ticket/MDT-231?view=epics%20mode')
  })
})
