/**
 * Tests for the deps command's relationship-inventory composition (MDT-189
 * TASK-relations-wire / S18).
 *
 * The full deps action requires project/key resolution + filesystem access;
 * that path is covered by the manual smoke test in tasks.md (TASK-smoke).
 * This file unit-tests `buildRelations` directly — the pure function that
 * composes the `relations` block for both --json and --yaml structured
 * output (BR-6.4) and for the default-mode human inventory (BR-6.1/6.2).
 *
 * Framework: @jest/globals (cross-runner safe; matches depsFormatter.test.ts).
 */

import type { Ticket } from '@mdt/shared/models/Ticket.js'
import type { DepGraph } from '@mdt/shared/services/ticket/DependencyGraph.js'
import { describe, expect, it } from '@jest/globals'
import { buildGraph } from '@mdt/shared/services/ticket/DependencyGraph.js'
import { buildRelations } from '../../../src/commands/deps.js'

/**
 * Minimal ticket factory. Only the fields `buildGraph` and `buildRelations`
 * touch are populated; the rest default to whatever the type requires.
 */
function ticket(over: Partial<Ticket> & Pick<Ticket, 'code' | 'status'>): Ticket {
  return {
    title: over.code,
    type: 'Feature Enhancement',
    priority: 'Medium',
    dateCreated: null,
    lastModified: null,
    content: '',
    filePath: '',
    relatedTickets: [],
    dependsOn: [],
    blocks: [],
    ...over,
  } as Ticket
}

describe('buildRelations (MDT-189 BR-6.4 / S18)', () => {
  it('returns dependsOn entries resolved with current status', () => {
    const tickets: Ticket[] = [
      ticket({ code: 'MDT-100', status: 'Implemented' }),
      ticket({ code: 'MDT-101', status: 'Approved' }),
      ticket({
        code: 'MDT-102',
        status: 'Proposed',
        dependsOn: ['MDT-100', 'MDT-101'],
      }),
      // 102 is blocked by nothing; 103 depends on 102 (so 102 blocks 103).
      ticket({ code: 'MDT-103', status: 'Proposed', dependsOn: ['MDT-102'] }),
    ]
    const graph: DepGraph = buildGraph(tickets, 'MDT')
    const target = tickets.find(t => t.code === 'MDT-102')!

    const relations = buildRelations(target, graph, 'MDT', tickets)

    expect(relations.dependsOn).toEqual([
      { key: 'MDT-100', status: 'Implemented' },
      { key: 'MDT-101', status: 'Approved' },
    ])
    // 102 blocks 103 because 103 dependsOn 102.
    expect(relations.blocks).toEqual([{ key: 'MDT-103', status: 'Proposed' }])
  })

  it('S16 case — empty dependsOn, non-empty blocks (the MDT-189 self-case)', () => {
    const tickets: Ticket[] = [
      ticket({ code: 'MDT-189', status: 'In Progress' }),
      ticket({ code: 'MDT-191', status: 'Approved', dependsOn: ['MDT-189'] }),
    ]
    const graph = buildGraph(tickets, 'MDT')
    const target = tickets.find(t => t.code === 'MDT-189')!

    const relations = buildRelations(target, graph, 'MDT', tickets)

    expect(relations.dependsOn).toEqual([])
    // 189 blocks 191 because 191 dependsOn 189. This is the load-bearing
    // assertion for BR-6.2 — the case the original bug rendered as a bare
    // "Ready: YES" with no relationship visibility.
    expect(relations.blocks).toEqual([{ key: 'MDT-191', status: 'Approved' }])
  })

  it('marks unresolved dependsOn targets as "missing"', () => {
    const tickets: Ticket[] = [
      ticket({
        code: 'MDT-100',
        status: 'Proposed',
        dependsOn: ['MDT-999'], // not in tickets
      }),
    ]
    const graph = buildGraph(tickets, 'MDT')
    const target = tickets[0]!

    const relations = buildRelations(target, graph, 'MDT', tickets)

    expect(relations.dependsOn).toEqual([{ key: 'MDT-999', status: 'missing' }])
    expect(relations.blocks).toEqual([])
  })

  it('resolves bare-number dependsOn entries via resolveDepKey', () => {
    const tickets: Ticket[] = [
      ticket({ code: 'MDT-100', status: 'Implemented' }),
      ticket({
        code: 'MDT-101',
        status: 'Proposed',
        dependsOn: ['100'], // bare number — should resolve to MDT-100
      }),
    ]
    const graph = buildGraph(tickets, 'MDT')
    const target = tickets.find(t => t.code === 'MDT-101')!

    const relations = buildRelations(target, graph, 'MDT', tickets)

    expect(relations.dependsOn).toEqual([{ key: 'MDT-100', status: 'Implemented' }])
  })

  it('S18 contract — output shape matches the JSON relations block', () => {
    // Smoke check that the function returns exactly the shape the structured
    // output path serializes: { dependsOn: RelationEntry[], blocks: RelationEntry[] }
    // where each entry is { key, status }. Guards against accidental field
    // renames that would silently break --json consumers.
    const tickets: Ticket[] = [
      ticket({ code: 'MDT-100', status: 'Implemented' }),
      ticket({
        code: 'MDT-101',
        status: 'Proposed',
        dependsOn: ['MDT-100'],
      }),
    ]
    const graph = buildGraph(tickets, 'MDT')
    const target = tickets.find(t => t.code === 'MDT-101')!

    const relations = buildRelations(target, graph, 'MDT', tickets)

    expect(relations).toEqual({
      dependsOn: [{ key: 'MDT-100', status: 'Implemented' }],
      blocks: [],
    })
    // Field names are the public contract.
    expect(relations.dependsOn[0]).toHaveProperty('key')
    expect(relations.dependsOn[0]).toHaveProperty('status')
  })
})
