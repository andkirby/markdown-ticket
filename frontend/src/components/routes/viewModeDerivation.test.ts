/**
 * Characterization tests for the pure view-mode routing derivations
 * (controlled refactor stage 0 — extracted verbatim from App.tsx).
 *
 * Pins the exact mapping the project route handler relies on:
 * pathname precedence over ?view=, the /epics → 'board' variant rule,
 * and the ticket-close return-path mapping.
 */
import { describe, expect, it } from 'bun:test'
import { deriveViewMode, ticketCloseTargetPath } from './viewModeDerivation'

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
