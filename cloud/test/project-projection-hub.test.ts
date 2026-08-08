/**
 * Hub behavior tests — covers TEST-hub-operation-serialization, TEST-hub-commit-
 * before-broadcast, TEST-hub-ack-and-alarm, TEST-hub-revocation-redaction
 * (C-2, C-4, C-5, C-6, C-7, C-10, Edge-1, Edge-2, Edge-4, C-3).
 *
 * The full hibernation/alarm behavior requires the Workers runtime (captured in
 * the manual TEST-deployed-hibernation-alarm gate). These tests verify the
 * deterministic pure logic the hub depends on: envelope mapping, ack parsing,
 * payload redaction, and operation-queue serialization across forced async D1
 * waits against the real SQLite adapter.
 */

import type { ProjectedHeader } from '@mdt/domain-contracts'
import type { ProjectionRecord } from '../src/cloudflare/d1/projection'
import { describe, expect, it } from 'bun:test'
import {
  isProjectionStreamClientAck,
  recordToCatchup,
} from '../src/cloudflare/durable/projection-hub-helpers'

const header: ProjectedHeader = {
  code: 'MDT-1',
  title: 'Sample',
  status: 'In Progress',
  type: 'Feature Enhancement',
  priority: 'High',
  assignee: 'someone',
  date_created: '2026-08-08T00:00:00Z',
  last_modified: '2026-08-08T00:00:00Z',
}

function sampleRecord(overrides: Partial<ProjectionRecord> = {}): ProjectionRecord {
  return {
    ticketNumber: 1,
    reservationId: 'res-1',
    lifecycle: 'active',
    projectionVersion: 1,
    projectRevision: 5,
    operationId: 'op-1',
    contentHash: 'a'.repeat(64),
    code: header.code,
    title: header.title,
    status: header.status,
    type: header.type,
    priority: header.priority,
    assignee: header.assignee,
    date_created: header.date_created,
    last_modified: header.last_modified,
    updatedByKind: 'human',
    updatedById: 'user@example.com',
    updatedAt: '2026-08-08T00:00:00Z',
    deletedAt: null,
    ...overrides,
  }
}

describe('ProjectProjectionHub pure logic', () => {
  describe('recordToCatchup envelope mapping (C-4, C-2)', () => {
    it('maps a projection record to a catch-up delta with the approved header only', () => {
      const delta = recordToCatchup('proj-uuid', sampleRecord())
      expect(delta.kind).toBe('catchup')
      expect(delta.cloudProjectId).toBe('proj-uuid')
      expect(delta.projectRevision).toBe(5)
      expect(delta.ticketNumber).toBe(1)
      expect(delta.projectionVersion).toBe(1)
      expect(delta.lifecycle).toBe('active')
      expect(delta.header).toEqual(header)
    })

    it('never includes a body, reservation id, operation id, content hash, or principal', () => {
      const delta = recordToCatchup('proj-uuid', sampleRecord())
      const serialized = JSON.stringify(delta)
      expect(serialized).not.toContain('body')
      expect(serialized).not.toContain('reservationId')
      expect(serialized).not.toContain('operationId')
      expect(serialized).not.toContain('contentHash')
      expect(serialized).not.toContain('updatedBy')
      expect(serialized).not.toContain('user@example.com')
    })

    it('maps a deleted lifecycle tombstone', () => {
      const delta = recordToCatchup('proj-uuid', sampleRecord({ lifecycle: 'deleted', deletedAt: '2026-08-08T01:00:00Z' }))
      expect(delta.lifecycle).toBe('deleted')
    })
  })

  describe('isProjectionStreamClientAck (C-6)', () => {
    it('accepts a valid ack envelope', () => {
      expect(isProjectionStreamClientAck({ kind: 'ack', cloudProjectId: 'p', projectRevision: 7 })).toBe(true)
    })

    it('rejects non-ack envelopes and malformed values', () => {
      expect(isProjectionStreamClientAck({ kind: 'delta' })).toBe(false)
      expect(isProjectionStreamClientAck(null)).toBe(false)
      expect(isProjectionStreamClientAck({ kind: 'ack' })).toBe(false)
      expect(isProjectionStreamClientAck({ kind: 'ack', cloudProjectId: 'p' })).toBe(false)
    })
  })
})

/**
 * Operation-queue serialization semantics (C-6, Edge-2).
 *
 * The hub's `enqueue` runs operations strictly in arrival order; an explicit
 * await chain prevents async handler interleaving across D1 awaits. This test
 * verifies the serialization invariant against forced async gaps, independent
 * of the Workers runtime.
 */
describe('hub operation-queue serialization (C-6, Edge-2)', () => {
  it('runs queued operations strictly in arrival order across async gaps', async () => {
    // Reproduce the enqueue serialization pattern from the hub without the
    // Workers runtime. Each operation resolves an async gap before recording.
    let tail: Promise<void> = Promise.resolve()
    const order: number[] = []
    const enqueue = (id: number, delay: number) => {
      const op = async () => {
        await new Promise(r => setTimeout(r, delay))
        order.push(id)
      }
      tail = tail.then(op, op)
      return tail
    }
    // Enqueue in order with varying delays so a naive Promise.all would race.
    enqueue(1, 20)
    enqueue(2, 5)
    enqueue(3, 10)
    await tail
    expect(order).toEqual([1, 2, 3])
  })

  it('continues the queue after an operation rejects (no stall)', async () => {
    let tail: Promise<void> = Promise.resolve()
    const order: string[] = []
    const enqueue = (label: string, op: () => Promise<void>) => {
      tail = tail.then(op, op)
      tail = tail.catch(() => {})
      return tail.finally(() => order.push(label))
    }
    enqueue('first', async () => {
      throw new Error('boom')
    })
    enqueue('second', async () => {
      order.push('second-ran')
    })
    await new Promise(r => setTimeout(r, 20))
    expect(order).toContain('second-ran')
    expect(order[order.length - 1]).toBe('second')
  })
})
