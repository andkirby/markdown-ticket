/**
 * useCloudProjections merge-then-filter pipeline tests (MDT-196 UAT r2).
 *
 * These tests verify the ARCHITECTURAL INVARIANT that the faceted filter is
 * applied to the MERGED set (local + cloud stubs), not to the local set alone.
 * This is the contract Board.tsx relies on: `mergeProjections(fullLocals)`
 * then `applyTicketFilters(merged)`.
 *
 * Two bugs this guards against:
 *   A. Cloud stubs bypassing the filter (merged after the filter).
 *   B. A stub reappearing when its local counterpart is filtered out
 *      (merge receiving pre-filtered locals → suppression check misses it).
 */
import type { TicketFilters } from '@mdt/domain-contracts'
import type { Ticket } from '../types'
import type { FeedProjection } from './useCloudProjections'
import { describe, expect, it } from 'bun:test'
import { applyTicketFilters } from '../utils/ticketFilters'
import { mergeProjections } from './useCloudProjections'

function makeTicket(code: string, status: string, priority = 'Medium'): Ticket {
  return {
    code,
    title: `Ticket ${code}`,
    status,
    type: 'Feature',
    priority,
    dateCreated: null,
    lastModified: null,
    content: '',
    filePath: `${code}.md`,
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
  }
}

function makeProjection(code: string, status: string, ticketNumber: number): FeedProjection {
  return {
    code,
    title: `Cloud ${code}`,
    status,
    type: 'Feature',
    priority: 'Medium',
    assignee: null,
    date_created: null,
    last_modified: '2026-01-01T00:00:00Z',
    ticketNumber,
    lifecycle: 'active',
  }
}

/** The Board pipeline: merge with full locals, then filter the merged set. */
function pipeline(locals: Ticket[], items: FeedProjection[], filters: TicketFilters | undefined): string[] {
  const stubs = mergeProjections(locals, items, 'MDT')
  const merged = [...locals, ...stubs]
  return applyTicketFilters(merged, filters).map(t => t.code)
}

describe('merge-then-filter pipeline (MDT-196 UAT r2)', () => {
  const locals = [
    makeTicket('MDT-001', 'Proposed'),
    makeTicket('MDT-002', 'Implemented'),
  ]
  // MDT-001 has a local file → its stub must be suppressed.
  // MDT-003, MDT-004 are cloud-only stubs.
  const projections = [
    makeProjection('MDT-001', 'Proposed', 1),
    makeProjection('MDT-003', 'Proposed', 3),
    makeProjection('MDT-004', 'Implemented', 4),
  ]

  it('empty filter shows locals + non-suppressed stubs', () => {
    const codes = pipeline(locals, projections, undefined)
    expect(codes.sort()).toEqual(['MDT-001', 'MDT-002', 'MDT-003', 'MDT-004'])
  })

  it('suppresses a stub whose local counterpart exists (merge uses full locals)', () => {
    const stubs = mergeProjections(locals, projections, 'MDT')
    expect(stubs.map(s => s.code)).not.toContain('MDT-001')
  })

  it('Bug A: cloud stubs respect the status filter', () => {
    // Filter to Implemented only. MDT-003 (Proposed stub) must be excluded.
    const codes = pipeline(locals, projections, { status: 'Implemented' })
    expect(codes.sort()).toEqual(['MDT-002', 'MDT-004'])
    expect(codes).not.toContain('MDT-003')
  })

  it('Bug B: filtering a local out does NOT make its stub reappear', () => {
    // Filter to Implemented. MDT-001 (Proposed local) is filtered out.
    // Its cloud stub (also Proposed) must NOT reappear — the merge used the
    // FULL local set, so MDT-001's stub was suppressed before filtering.
    const codes = pipeline(locals, projections, { status: 'Implemented' })
    expect(codes).not.toContain('MDT-001')
  })

  it('Bug B regression: the OLD pipeline (merge filtered locals) would leak', () => {
    // Simulate the BROKEN pipeline: filter locals FIRST, then merge.
    // This is what we must NOT do — it lets MDT-001's stub back in.
    const filteredLocals = applyTicketFilters(locals, { status: 'Implemented' })
    const stubs = mergeProjections(filteredLocals, projections, 'MDT')
    const brokenCodes = [...filteredLocals, ...stubs].map(t => t.code)
    // The broken pipeline leaks MDT-001 back as a stub:
    expect(brokenCodes).toContain('MDT-001')
  })

  it('priority filter applies to both locals and stubs', () => {
    const highLocals = [makeTicket('MDT-005', 'Approved', 'High')]
    const highProjections = [makeProjection('MDT-006', 'Approved', 6)]
    // Override priority on the projection
    highProjections[0].priority = 'High'
    const codes = pipeline(highLocals, highProjections, { priority: 'High' })
    expect(codes.sort()).toEqual(['MDT-005', 'MDT-006'])
  })
})
