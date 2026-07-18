/**
 * Tests for the DependencyGraph module (MDT-189 TASK-graph).
 *
 * Covers every exported function: buildGraph (key resolution + dedup),
 * violations (waiting/broken-rejected/missing/clean), detectCycle
 * (two/three/large/DAG), topoSort (deterministic, diamond), inverse
 * (round-trip).
 *
 * Fixture builder: hand-rolled minimal Ticket objects. The full Ticket
 * interface has many optional fields; only `code`, `status`, and `dependsOn`
 * matter for graph logic, so we provide exactly those plus the stubs the
 * type requires.
 *
 * Framework: @jest/globals (cross-runner safe — works under jest and bun test).
 */

import { describe, expect, it } from '@jest/globals'
import type { Ticket } from '../../../models/Ticket.js'
import {
  buildGraph,
  detectCycle,
  inverse,
  resolveDepKey,
  topoSort,
  violations,
} from '../DependencyGraph.js'

/**
 * Build a minimal valid Ticket for graph tests.
 * Only the fields the graph module reads are meaningful; the rest are stubs.
 */
function ticket(
  code: string,
  status: string,
  dependsOn: string[] = [],
): Ticket {
  return {
    code,
    title: code,
    status,
    type: 'Task',
    priority: 'Medium',
    dateCreated: null,
    lastModified: null,
    content: '',
    filePath: '',
    relatedTickets: [],
    dependsOn,
    blocks: [],
  }
}

describe('resolveDepKey', () => {
  it('uses fully-qualified keys as-is (cross-project)', () => {
    expect(resolveDepKey('VOC-053', 'MDT')).toBe('VOC-053')
  })

  it('prefixes bare numbers with the active project code (3-digit pad)', () => {
    expect(resolveDepKey('053', 'MDT')).toBe('MDT-053')
    expect(resolveDepKey('53', 'MDT')).toBe('MDT-053')
  })

  it('normalizes already-prefixed lowercase keys', () => {
    expect(resolveDepKey('mdt-053', 'MDT')).toBe('MDT-053')
  })

  it('returns empty string for empty input', () => {
    expect(resolveDepKey('', 'MDT')).toBe('')
    expect(resolveDepKey('   ', 'MDT')).toBe('')
  })
})

describe('buildGraph', () => {
  it('resolves bare-number dependsOn against the active project', () => {
    const g = buildGraph(
      [ticket('MDT-100', 'Implemented'), ticket('MDT-101', 'Approved', ['100'])],
      'MDT',
    )
    expect(g.edges.get('MDT-101')).toEqual(['MDT-100'])
  })

  it('keeps fully-qualified cross-project dependsOn as-is', () => {
    const g = buildGraph(
      [ticket('MDT-188', 'Approved', ['VOC-053']), ticket('VOC-053', 'Approved')],
      'MDT',
    )
    expect(g.edges.get('MDT-188')).toEqual(['VOC-053'])
    expect(g.nodes.has('VOC-053')).toBe(true)
  })

  it('collapses duplicate dependsOn entries to one edge (Edge-6)', () => {
    const g = buildGraph(
      [
        ticket('MDT-100', 'Implemented'),
        ticket('MDT-101', 'Approved', ['MDT-100', 'MDT-100', '100']),
      ],
      'MDT',
    )
    expect(g.edges.get('MDT-101')).toEqual(['MDT-100'])
  })
})

describe('violations', () => {
  it('classifies an Approved dep as waiting with an informational action', () => {
    const g = buildGraph(
      [
        ticket('MDT-100', 'Implemented'),
        ticket('MDT-101', 'Approved'),
        ticket('MDT-102', 'Approved', ['MDT-100', 'MDT-101']),
      ],
      'MDT',
    )
    const v = violations(g.nodes.get('MDT-102')!, g)
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({
      dep: 'MDT-101',
      status: 'Approved',
      kind: 'waiting',
      action: 'none (informational)',
    })
  })

  it('classifies a Rejected dep as broken-plan with reject/unlink action', () => {
    const g = buildGraph(
      [
        ticket('MDT-101', 'Rejected'),
        ticket('MDT-102', 'Approved', ['MDT-101']),
      ],
      'MDT',
    )
    const v = violations(g.nodes.get('MDT-102')!, g)
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({
      dep: 'MDT-101',
      status: 'Rejected',
      kind: 'broken-plan',
      action: 'reject-MDT-101 | unlink-MDT-101',
    })
  })

  it('classifies a non-existent target as status=missing, kind=broken-plan', () => {
    const g = buildGraph(
      [ticket('MDT-102', 'Approved', ['MDT-999'])],
      'MDT',
    )
    const v = violations(g.nodes.get('MDT-102')!, g)
    expect(v).toHaveLength(1)
    expect(v[0]).toMatchObject({
      dep: 'MDT-999',
      status: 'missing',
      kind: 'broken-plan',
    })
  })

  it('returns an empty array when every dep is Implemented', () => {
    const g = buildGraph(
      [
        ticket('MDT-100', 'Implemented'),
        ticket('MDT-101', 'Implemented'),
        ticket('MDT-102', 'Approved', ['MDT-100', 'MDT-101']),
      ],
      'MDT',
    )
    expect(violations(g.nodes.get('MDT-102')!, g)).toEqual([])
  })

  it('classifies a legacy/unknown dep status as waiting (Edge-1 safe default)', () => {
    const g = buildGraph(
      [
        ticket('MDT-101', 'Deferred' as unknown as string),
        ticket('MDT-102', 'Approved', ['MDT-101']),
      ],
      'MDT',
    )
    const v = violations(g.nodes.get('MDT-102')!, g)
    expect(v).toHaveLength(1)
    expect(v[0]?.kind).toBe('waiting')
    expect(v[0]?.status).toBe('Deferred')
  })

  it('preserves dependsOn declaration order in the output', () => {
    const g = buildGraph(
      [
        ticket('MDT-A', 'Implemented'),
        ticket('MDT-B', 'Approved'),
        ticket('MDT-C', 'Rejected'),
        ticket('MDT-X', 'Approved', ['MDT-A', 'MDT-B', 'MDT-C']),
      ],
      'MDT',
    )
    const v = violations(g.nodes.get('MDT-X')!, g)
    // MDT-A is satisfied (omitted); MDT-B then MDT-C remain, in declaration order.
    expect(v.map(row => row.dep)).toEqual(['MDT-B', 'MDT-C'])
  })
})

describe('detectCycle', () => {
  it('returns null for a DAG', () => {
    const g = buildGraph(
      [
        ticket('MDT-A', 'Implemented'),
        ticket('MDT-B', 'Approved', ['MDT-A']),
        ticket('MDT-C', 'Approved', ['MDT-B']),
      ],
      'MDT',
    )
    expect(detectCycle(g)).toBeNull()
  })

  it('detects a two-node cycle A -> B -> A', () => {
    const g = buildGraph(
      [
        ticket('MDT-A', 'Approved', ['MDT-B']),
        ticket('MDT-B', 'Approved', ['MDT-A']),
      ],
      'MDT',
    )
    const cycle = detectCycle(g)
    expect(cycle).not.toBeNull()
    expect(cycle![0]).toBe(cycle![cycle!.length - 1]) // closed loop
    expect(new Set(cycle)).toEqual(new Set(['MDT-A', 'MDT-B', 'MDT-A']))
  })

  it('detects a three-node cycle A -> B -> C -> A', () => {
    const g = buildGraph(
      [
        ticket('MDT-A', 'Approved', ['MDT-B']),
        ticket('MDT-B', 'Approved', ['MDT-C']),
        ticket('MDT-C', 'Approved', ['MDT-A']),
      ],
      'MDT',
    )
    const cycle = detectCycle(g)
    expect(cycle).not.toBeNull()
    expect(cycle![0]).toBe(cycle![cycle!.length - 1])
    expect(cycle).toHaveLength(4) // three distinct nodes + closing
  })

  it('detects a self-edge as a cycle [A, A]', () => {
    const g = buildGraph(
      [ticket('MDT-A', 'Approved', ['MDT-A'])],
      'MDT',
    )
    const cycle = detectCycle(g)
    expect(cycle).toEqual(['MDT-A', 'MDT-A'])
  })

  it('detects a 5-node synthetic cycle', () => {
    // A -> B -> C -> D -> E -> A
    const g = buildGraph(
      [
        ticket('MDT-A', 'Approved', ['MDT-B']),
        ticket('MDT-B', 'Approved', ['MDT-C']),
        ticket('MDT-C', 'Approved', ['MDT-D']),
        ticket('MDT-D', 'Approved', ['MDT-E']),
        ticket('MDT-E', 'Approved', ['MDT-A']),
      ],
      'MDT',
    )
    const cycle = detectCycle(g)
    expect(cycle).not.toBeNull()
    expect(cycle![0]).toBe(cycle![cycle!.length - 1])
    expect(new Set(cycle)).toEqual(
      new Set(['MDT-A', 'MDT-B', 'MDT-C', 'MDT-D', 'MDT-E', 'MDT-A']),
    )
  })
})

describe('topoSort', () => {
  it('emits dependencies before dependents in a simple chain', () => {
    const g = buildGraph(
      [
        ticket('MDT-C', 'Approved', ['MDT-B']),
        ticket('MDT-B', 'Approved', ['MDT-A']),
        ticket('MDT-A', 'Implemented'),
      ],
      'MDT',
    )
    const order = topoSort(g).map(t => t.code)
    const aIdx = order.indexOf('MDT-A')
    const bIdx = order.indexOf('MDT-B')
    const cIdx = order.indexOf('MDT-C')
    expect(aIdx).toBeLessThan(bIdx)
    expect(bIdx).toBeLessThan(cIdx)
  })

  it('resolves a diamond dependency into a valid topological order', () => {
    //     A
    //    / \
    //   B   C
    //    \ /
    //     D
    const g = buildGraph(
      [
        ticket('MDT-A', 'Implemented'),
        ticket('MDT-B', 'Approved', ['MDT-A']),
        ticket('MDT-C', 'Approved', ['MDT-A']),
        ticket('MDT-D', 'Approved', ['MDT-B', 'MDT-C']),
      ],
      'MDT',
    )
    const order = topoSort(g).map(t => t.code)
    expect(order.indexOf('MDT-A')).toBeLessThan(order.indexOf('MDT-B'))
    expect(order.indexOf('MDT-A')).toBeLessThan(order.indexOf('MDT-C'))
    expect(order.indexOf('MDT-B')).toBeLessThan(order.indexOf('MDT-D'))
    expect(order.indexOf('MDT-C')).toBeLessThan(order.indexOf('MDT-D'))
  })

  it('is deterministic: the same graph yields the same order twice', () => {
    const tickets = [
      ticket('MDT-A', 'Implemented'),
      ticket('MDT-B', 'Approved', ['MDT-A']),
      ticket('MDT-C', 'Approved', ['MDT-A']),
      ticket('MDT-D', 'Approved', ['MDT-B', 'MDT-C']),
    ]
    const order1 = topoSort(buildGraph(tickets, 'MDT')).map(t => t.code)
    const order2 = topoSort(buildGraph(tickets, 'MDT')).map(t => t.code)
    expect(order1).toEqual(order2)
  })
})

describe('inverse', () => {
  it('produces the blocked-by map: every B with inbound A dependsOn B', () => {
    const g = buildGraph(
      [
        ticket('MDT-100', 'Implemented'),
        ticket('MDT-101', 'Approved', ['MDT-100']),
        ticket('MDT-102', 'Approved', ['MDT-100', 'MDT-101']),
      ],
      'MDT',
    )
    const blocks = inverse(g)
    expect(blocks.get('MDT-100')).toEqual(['MDT-101', 'MDT-102'])
    expect(blocks.get('MDT-101')).toEqual(['MDT-102'])
    expect(blocks.get('MDT-102')).toEqual([])
  })

  it('round-trips: applying inverse to a graph reproduces dependsOn edges', () => {
    // If A dependsOn B, then inverse(graph).get(B) contains A.
    const g = buildGraph(
      [
        ticket('MDT-A', 'Implemented'),
        ticket('MDT-B', 'Approved', ['MDT-A']),
        ticket('MDT-C', 'Approved', ['MDT-A', 'MDT-B']),
      ],
      'MDT',
    )
    const blocks = inverse(g)
    // Every dependsOn edge should appear as an inverse blocks entry.
    for (const [source, deps] of g.edges) {
      for (const dep of deps) {
        expect(blocks.get(dep)).toContain(source)
      }
    }
  })

  it('returns an entry (possibly empty) for every node, sorted', () => {
    const g = buildGraph(
      [
        ticket('MDT-A', 'Implemented'),
        ticket('MDT-Z', 'Approved', ['MDT-A']),
        ticket('MDT-M', 'Approved', ['MDT-A']),
      ],
      'MDT',
    )
    const blocks = inverse(g)
    expect(blocks.get('MDT-A')).toEqual(['MDT-M', 'MDT-Z']) // sorted lexicographically
    expect(blocks.get('MDT-M')).toEqual([])
    expect(blocks.get('MDT-Z')).toEqual([])
  })
})
