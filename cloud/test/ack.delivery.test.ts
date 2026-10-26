import type { DurableObjectState } from '@cloudflare/workers-types'
import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { AccessValidator } from '../src/cloudflare/access/jwt'
import { createReservation } from '../src/cloudflare/application/reservation'
import { creationId, headerHash, identityD1, identityFixture, owner, projectedHeader } from './helpers/identity-d1'

// Run the real hub methods and real production SQL. Only the platform base
// constructor/storage/socket handles are supplied by this Bun harness; deployed
// WebSocket acceptance is recorded separately in operations evidence.
mock.module('cloudflare:workers', () => ({
  DurableObject: class {
    constructor(protected ctx: unknown, protected env: unknown) {}
  },
}))
const { ProjectProjectionHub } = await import('../src/cloudflare/durable/ProjectProjectionHub')
const { default: worker } = await import('../src/cloudflare/worker')
const databases: ReturnType<typeof identityFixture>[] = []
afterEach(() => {
  mock.restore()
  for (const db of databases.splice(0)) db.close()
})

async function fixture() {
  const db = identityFixture()
  databases.push(db)
  const d1 = identityD1(db)
  const held = await createReservation(d1, owner, 'p', {
    protocolVersion: 2,
    creationId,
    minimumTicketNumber: 263,
    idempotencyKey: 'delivery',
    requestHash: 'a'.repeat(64),
  }, 'reserve')
  const header = projectedHeader(held.ticketNumber)
  const body = { operationId: 'ack', contentHash: headerHash(header), header }
  const frames: unknown[] = []
  const order: string[] = []
  let alarm: number | null = null
  let acknowledgedRevision = 0
  const socket = {
    deserializeAttachment: () => ({ cloudProjectId: 'p', authorized: true, acknowledgedRevision, tokenExpiry: Date.now() + 60_000 }),
    send(raw: string) {
      expect(db.query('SELECT state FROM ticket_reservations').get()).toEqual({ state: 'acknowledged' })
      order.push('delivered')
      frames.push(JSON.parse(raw))
    },
    close() {},
  }
  const ctx = {
    storage: {
      getAlarm: async () => alarm,
      setAlarm: async (timestamp: number) => {
        order.push('armed')
        alarm = timestamp
      },
    },
    getWebSockets: () => [socket],
  }
  const hub = new ProjectProjectionHub(ctx as unknown as DurableObjectState, { DB: d1 })
  const input = { principal: owner, reservationId: held.reservationId, body, requestId: 'ack-delivery' }
  return { db, d1, held, body, frames, order, ctx, hub, input, acknowledge: () => {
    acknowledgedRevision = 1
  } }
}

describe('MDT-200 acknowledged creation delivery', () => {
  test('arms before commit and sends the committed initial projection to connected clients', async () => {
    const f = await fixture()
    const result = await f.hub.acknowledgeAndDeliver('p', f.input)
    expect(result).toMatchObject({ ok: true, acknowledged: true, projectionVersion: 1, projectRevision: 1, replayed: false })
    expect(f.order).toEqual(['armed', 'delivered'])
    // Stream headers mirror persisted projection fields; creation identity is
    // independently proved through the claim API, not the delivery cache.
    const { creationId: _creationId, ...header } = f.body.header
    expect(f.frames).toEqual([expect.objectContaining({ kind: 'delta', ticketNumber: 263, projectRevision: 1, header })])
  })

  test('same-intent replay retains one projection/revision and skips already acknowledged delivery', async () => {
    const f = await fixture()
    await f.hub.acknowledgeAndDeliver('p', f.input)
    f.acknowledge()
    expect(await f.hub.acknowledgeAndDeliver('p', f.input)).toMatchObject({ ok: true, replayed: true, projectRevision: 1 })
    expect(f.frames).toHaveLength(1)
    expect(f.db.query('SELECT projection_revision n FROM cloud_projects').get()).toEqual({ n: 1 })
  })

  test('wrong creation identity returns a typed conflict with no projection or delivery', async () => {
    const f = await fixture()
    const input = { ...f.input, body: { ...f.body, header: { ...f.body.header, creationId: crypto.randomUUID() } } }
    expect(await f.hub.acknowledgeAndDeliver('p', input)).toEqual({ ok: false, code: 'reservation_state_conflict' })
    expect(f.frames).toHaveLength(0)
    expect(f.db.query('SELECT COUNT(*) n FROM ticket_projections').get()).toEqual({ n: 0 })
  })

  test('suspended coordination is still enforced inside the hub', async () => {
    const f = await fixture()
    f.db.run('UPDATE cloud_projects SET coordination_state = \'suspended\'')
    expect(await f.hub.acknowledgeAndDeliver('p', f.input)).toEqual({ ok: false, code: 'coordination_suspended' })
    expect(f.frames).toHaveLength(0)
  })

  test('alarm failure prevents acknowledgement from committing', async () => {
    const f = await fixture()
    f.ctx.storage.setAlarm = async () => {
      throw new Error('alarm unavailable')
    }
    await expect(f.hub.acknowledgeAndDeliver('p', f.input)).rejects.toThrow('alarm unavailable')
    expect(f.db.query('SELECT state FROM ticket_reservations').get()).toEqual({ state: 'reserved' })
    expect(f.frames).toHaveLength(0)
  })

  test('D1 failure broadcasts nothing and preserves the prearmed recovery alarm', async () => {
    const f = await fixture()
    f.db.run('CREATE TRIGGER reject_projection BEFORE INSERT ON ticket_projections BEGIN SELECT RAISE(ABORT, \'fixture commit failure\'); END')
    await expect(f.hub.acknowledgeAndDeliver('p', f.input)).rejects.toThrow('fixture commit failure')
    expect(f.db.query('SELECT state FROM ticket_reservations').get()).toEqual({ state: 'reserved' })
    expect(f.order).toEqual(['armed'])
    expect(f.frames).toHaveLength(0)
  })

  test('the deployed acknowledgement route uses the hub while preserving its public response shape', async () => {
    const f = await fixture()
    spyOn(AccessValidator.prototype, 'validate').mockResolvedValue(owner)
    const delegate = mock((projectId: string, input: typeof f.input) => f.hub.acknowledgeAndDeliver(projectId, input))
    const env = {
      DB: f.d1,
      TEAM_DOMAIN: 'team.example.invalid',
      COORDINATION_AUD: 'coord',
      OPERATOR_AUD: 'operator',
      VERSION_METADATA: { id: 'fixture' },
      RATE_LIMIT_READ: { limit: async () => ({ success: true }) },
      RATE_LIMIT_MUTATE: { limit: async () => ({ success: true }) },
      PROJECT_HUB: { idFromName: (name: string) => name, get: () => ({ acknowledgeAndDeliver: delegate }) },
    }
    const response = await worker.fetch(new Request(`https://coord.example.invalid/v1/projects/p/reservations/${f.held.reservationId}/acknowledgement`, {
      method: 'PUT',
      headers: { 'Cf-Access-Jwt-Assertion': 'fixture', 'Content-Type': 'application/json' },
      body: JSON.stringify(f.body),
    }), env as unknown as Parameters<typeof worker.fetch>[1], {} as Parameters<typeof worker.fetch>[2])
    expect(response.status).toBe(200)
    expect(delegate).toHaveBeenCalledTimes(1)
    expect(await response.json()).toMatchObject({ data: { acknowledged: true, projectionVersion: 1, projectRevision: 1, replayed: false } })
    expect(f.frames).toHaveLength(1)
  })
})
