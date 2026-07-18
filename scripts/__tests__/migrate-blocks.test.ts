/**
 * Tests for the blocks migration pure logic (MDT-189 TASK-migration).
 *
 * Exercises the testable core of the migration: plan computation
 * (added/removed/contradiction classification), default contradiction
 * resolution, and the post-write invariant check. The script's I/O
 * (file reads/writes, interactive prompts, report writing) is thin glue
 * over these functions and is not unit-tested here — it's verified by
 * the dry-run smoke against the real repo (TASK-dryrun).
 *
 * Fixture: hand-built minimal Ticket objects in memory. No file system.
 *
 * Framework: @jest/globals (cross-runner safe — works under jest and bun test).
 */

import { describe, expect, it } from '@jest/globals'
import type { Ticket } from '@mdt/shared/models/Ticket.js'
import {
  applyChangeToBlocks,
  computeMigrationPlan,
  detectContradictions,
  verifyInvariant,
} from '../lib/migrate-blocks.js'

function ticket(
  code: string,
  opts: { dependsOn?: string[], blocks?: string[] } = {},
): Ticket {
  return {
    code,
    title: code,
    status: 'Approved',
    type: 'Task',
    priority: 'Medium',
    dateCreated: null,
    lastModified: null,
    content: '',
    filePath: '',
    relatedTickets: [],
    dependsOn: opts.dependsOn ?? [],
    blocks: opts.blocks ?? [],
  }
}

describe('detectContradictions', () => {
  it('returns empty when dependsOn and blocks are disjoint', () => {
    const t = ticket('MDT-A', { dependsOn: ['MDT-B'], blocks: ['MDT-C'] })
    expect(detectContradictions(t, 'MDT')).toEqual([])
  })

  it('detects the MDT-082 ↔ MDT-071 shape (same target in both)', () => {
    const t = ticket('MDT-082', { dependsOn: ['MDT-071'], blocks: ['MDT-071'] })
    expect(detectContradictions(t, 'MDT')).toEqual(['MDT-071'])
  })

  it('canonicalizes bare numbers before comparing', () => {
    // dependsOn as bare "071", blocks as full "MDT-071" → still a contradiction
    const t = ticket('MDT-082', { dependsOn: ['071'], blocks: ['MDT-071'] })
    expect(detectContradictions(t, 'MDT')).toEqual(['MDT-071'])
  })

  it('returns multiple contradictions when several targets collide', () => {
    const t = ticket('MDT-X', {
      dependsOn: ['MDT-A', 'MDT-B'],
      blocks: ['MDT-A', 'MDT-B', 'MDT-C'],
    })
    expect(detectContradictions(t, 'MDT').sort()).toEqual(['MDT-A', 'MDT-B'])
  })
})

describe('computeMigrationPlan', () => {
  it('classifies a missing reciprocal as an add', () => {
    // MDT-101 dependsOn MDT-100. Derived: MDT-100 blocks MDT-101.
    // MDT-100 has no blocks entry → add MDT-101.
    const tickets = [
      ticket('MDT-100'),
      ticket('MDT-101', { dependsOn: ['MDT-100'] }),
    ]
    const plan = computeMigrationPlan(tickets, 'MDT')
    expect(plan.counts.changed).toBe(1)
    expect(plan.counts.contradictions).toBe(0)
    const change = plan.changes.find(c => c.ticketCode === 'MDT-100')
    expect(change?.added).toEqual(['MDT-101'])
    expect(change?.removed).toEqual([])
    expect(change?.isContradiction).toBe(false)
  })

  it('classifies a stale reciprocal as a remove', () => {
    // MDT-100 has a blocks entry for MDT-101, but MDT-101 does NOT depend on it.
    const tickets = [
      ticket('MDT-100', { blocks: ['MDT-101'] }),
      ticket('MDT-101'),
    ]
    const plan = computeMigrationPlan(tickets, 'MDT')
    const change = plan.changes.find(c => c.ticketCode === 'MDT-100')
    expect(change?.added).toEqual([])
    expect(change?.removed).toEqual(['MDT-101'])
  })

  it('flags a contradiction (MDT-082 shape)', () => {
    const tickets = [
      ticket('MDT-082', { dependsOn: ['MDT-071'], blocks: ['MDT-071'] }),
      ticket('MDT-071'),
    ]
    const plan = computeMigrationPlan(tickets, 'MDT')
    expect(plan.counts.contradictions).toBe(1)
    const change = plan.changes.find(c => c.ticketCode === 'MDT-082')
    expect(change?.isContradiction).toBe(true)
    expect(change?.contradictionTargets).toEqual(['MDT-071'])
  })

  it('reports unchanged tickets when blocks already equals derived', () => {
    // MDT-101 dependsOn MDT-100; MDT-100 already has the right blocks entry.
    const tickets = [
      ticket('MDT-100', { blocks: ['MDT-101'] }),
      ticket('MDT-101', { dependsOn: ['MDT-100'] }),
    ]
    const plan = computeMigrationPlan(tickets, 'MDT')
    expect(plan.counts.changed).toBe(0)
    expect(plan.counts.unchanged).toBe(2)
    expect(plan.changes).toEqual([])
  })

  it('computes derived blocks across multi-edge fan-in', () => {
    // Three tickets all depend on MDT-100 → MDT-100 blocks all three.
    const tickets = [
      ticket('MDT-100'),
      ticket('MDT-101', { dependsOn: ['MDT-100'] }),
      ticket('MDT-102', { dependsOn: ['MDT-100'] }),
      ticket('MDT-103', { dependsOn: ['MDT-100'] }),
    ]
    const plan = computeMigrationPlan(tickets, 'MDT')
    const change = plan.changes.find(c => c.ticketCode === 'MDT-100')
    expect(change?.added.sort()).toEqual(['MDT-101', 'MDT-102', 'MDT-103'])
  })

  it('handles a small multi-relationship graph end-to-end', () => {
    // Build the MDT-082/071 + 028/006 + 090/091 shape together.
    const tickets = [
      ticket('MDT-082', { dependsOn: ['MDT-071'], blocks: ['MDT-071'] }),
      ticket('MDT-071'),
      ticket('MDT-028', { dependsOn: ['MDT-006'] }),
      ticket('MDT-006'),
      ticket('MDT-090', { dependsOn: ['MDT-091'] }),
      ticket('MDT-091', { blocks: ['MDT-090'] }), // reciprocal present
    ]
    const plan = computeMigrationPlan(tickets, 'MDT')
    // Expect: MDT-082 contradiction, MDT-006 add MDT-028, MDT-091 unchanged.
    expect(plan.counts.contradictions).toBe(1)
    expect(plan.changes.find(c => c.ticketCode === 'MDT-006')?.added).toEqual(['MDT-028'])
    expect(plan.unchanged).toContain('MDT-091')
    expect(plan.unchanged).toContain('MDT-090')
  })
})

describe('applyChangeToBlocks', () => {
  it('returns the derived blocks for a plain add (no contradiction)', () => {
    const change: never = {
      ticketCode: 'MDT-100',
      filePath: '',
      storedBlocks: [],
      derivedBlocks: ['MDT-101', 'MDT-102'],
      added: ['MDT-101', 'MDT-102'],
      removed: [],
      isContradiction: false,
      contradictionTargets: [],
    }
    expect(applyChangeToBlocks(change, true)).toEqual(['MDT-101', 'MDT-102'])
  })

  it('drops the contradicted entry by default (keep dependsOn)', () => {
    // MDT-082 derived blocks = inverse(dependsOn=MDT-071) = []. The stored
    // blocks=[MDT-071] is the contradiction; default resolution drops it.
    const change: never = {
      ticketCode: 'MDT-082',
      filePath: '',
      storedBlocks: ['MDT-071'],
      derivedBlocks: [], // MDT-082 has no inbound dependsOn → no blocks
      added: [],
      removed: ['MDT-071'],
      isContradiction: true,
      contradictionTargets: ['MDT-071'],
    }
    expect(applyChangeToBlocks(change, true)).toEqual([])
  })

  it('keeps the contradicted entry when keepDependsOnForContradictions=false', () => {
    // Human override: keep blocks, drop dependsOn (rare but supported).
    const change: never = {
      ticketCode: 'MDT-082',
      filePath: '',
      storedBlocks: ['MDT-071'],
      derivedBlocks: [],
      added: [],
      removed: ['MDT-071'],
      isContradiction: true,
      contradictionTargets: ['MDT-071'],
    }
    expect(applyChangeToBlocks(change, false)).toEqual(['MDT-071'])
  })
})

describe('verifyInvariant', () => {
  it('reports 100% when blocks already equals derived', () => {
    const tickets = [
      ticket('MDT-100', { blocks: ['MDT-101'] }),
      ticket('MDT-101', { dependsOn: ['MDT-100'] }),
    ]
    const result = verifyInvariant(tickets, 'MDT')
    // Wait — MDT-101 dependsOn MDT-100 means MDT-100 should block MDT-101.
    // That's what's stored. And MDT-101's derived blocks = inverse = [] (nothing
    // depends on MDT-101). Stored is also []. So invariant holds.
    expect(result.satisfied).toBe(result.total)
    expect(result.violating).toEqual([])
  })

  it('reports violations when stored blocks is stale', () => {
    const tickets = [
      ticket('MDT-100', { blocks: ['MDT-999'] }), // MDT-999 doesn't depend on MDT-100
      ticket('MDT-101', { dependsOn: ['MDT-100'] }), // MDT-100 should block MDT-101
    ]
    const result = verifyInvariant(tickets, 'MDT')
    expect(result.violating).toContain('MDT-100')
    expect(result.satisfied).toBeLessThan(result.total)
  })

  it('is total over all tickets (every ticket gets a verdict)', () => {
    const tickets = [
      ticket('MDT-A'),
      ticket('MDT-B', { dependsOn: ['MDT-A'] }),
      ticket('MDT-C'),
    ]
    const result = verifyInvariant(tickets, 'MDT')
    expect(result.total).toBe(3)
    // MDT-A should block MDT-B; nothing else has inbound edges.
    // If MDT-A has no blocks entry, that's a violation.
    expect(result.violating).toContain('MDT-A')
  })
})
