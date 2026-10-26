import * as contracts from '@mdt/domain-contracts'
import { afterEach, describe, expect, test } from 'bun:test'
import * as reservations from '../src/cloudflare/application/reservation'
import { allocateReservation } from '../src/cloudflare/d1/statements'
import { creationId, identityD1, identityFixture, otherCreationId, owner, projectedHeader } from './helpers/identity-d1'

const databases: ReturnType<typeof identityFixture>[] = []
function fixture() {
  const db = identityFixture()
  databases.push(db)
  return { db, d1: identityD1(db) }
}
function body(key = 'intent', floor = 263, identity = creationId) {
  return {
    idempotencyKey: key,
    requestHash: 'a'.repeat(64),
    protocolVersion: 2,
    creationId: identity,
    minimumTicketNumber: floor,
  }
}
afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('MDT-200 identity-aware cloud allocation', () => {
  test('shared canonical project-code contract passes strict ACK while mismatched keys remain rejected', async () => {
    const normalizer = contracts as typeof contracts & { CanonicalProjectCodeSchema?: { parse: (value: unknown) => string } }
    expect(normalizer.CanonicalProjectCodeSchema).toBeDefined()
    const code = normalizer.CanonicalProjectCodeSchema!.parse(' mDt ')
    expect(code).toBe('MDT')
    const { db, d1 } = fixture()
    const held = await reservations.createReservation(d1, owner, 'p', body(), 'canonical-reserve')
    for (const wrongCode of ['mdt-263', 'OTHER-263', 'MDT-264']) {
      await expect(reservations.acknowledge(d1, owner, 'p', held.reservationId, { operationId: `wrong-${wrongCode}`, contentHash: 'c'.repeat(64), header: { ...projectedHeader(held.ticketNumber), code: wrongCode } }, 'wrong-ack'))
        .rejects
        .toMatchObject({ code: 'reservation_state_conflict' })
    }
    const result = await reservations.acknowledge(d1, owner, 'p', held.reservationId, { operationId: 'canonical-ack', contentHash: 'c'.repeat(64), header: { ...projectedHeader(held.ticketNumber), code: `${code}-263` } }, 'canonical-ack')
    expect(result).toMatchObject({ acknowledged: true })
    expect(db.query('SELECT code FROM ticket_projections').get()).toEqual({ code: 'MDT-263' })
    expect(db.query('SELECT state FROM ticket_reservations').get()).toEqual({ state: 'acknowledged' })
  })
  test('stale counter reserves at the local minimum and echoes immutable protocol fields', async () => {
    const { db, d1 } = fixture()
    const result = await reservations.createReservation(d1, owner, 'p', body(), 'r')
    expect(result).toMatchObject({ ticketNumber: 263, protocolVersion: 2, creationId, minimumTicketNumber: 263 })
    expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual({ n: 264 })
  })

  test('old HTTP clients fail closed instead of silently omitting identity and floor', async () => {
    const { d1 } = fixture()
    await expect(reservations.createReservation(d1, owner, 'p', { idempotencyKey: 'old', requestHash: 'a'.repeat(64) }, 'r'))
      .rejects
      .toMatchObject({ code: 'invalid_request' })
  })

  test('same intent replays unchanged after another request raises the floor', async () => {
    const { db, d1 } = fixture()
    const first = await reservations.createReservation(d1, owner, 'p', body(), 'r')
    await reservations.createReservation(d1, owner, 'p', body('another', 600, otherCreationId), 'r2')
    const before = db.query('SELECT next_ticket_number n FROM cloud_projects').get()
    const replay = await reservations.createReservation(d1, owner, 'p', body(), 'r3')
    expect(replay).toMatchObject({ ticketNumber: 263, reservationId: first.reservationId, replayed: true })
    expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual(before)
  })

  test('changed minimum or creation identity is rejected even when client digest is unchanged', async () => {
    const { db, d1 } = fixture()
    await reservations.createReservation(d1, owner, 'p', body(), 'r')
    for (const changed of [body('intent', 300), body('intent', 263, otherCreationId)]) {
      await expect(reservations.createReservation(d1, owner, 'p', changed, 'r2')).rejects.toMatchObject({ code: 'idempotency_key_reused' })
    }
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 1 })
    expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual({ n: 264 })
  })

  test('differing minimum requests racing at one counter return unique numbers above their own minimum', async () => {
    const { db } = fixture()
    const d1 = identityD1(db, 3)
    const floors = [263, 600, 400]
    const ids = [creationId, otherCreationId, 'cb99beef-36bf-4d83-884c-5fae9e74f48d']
    const results = await Promise.all(floors.map((floor, i) => allocateReservation(d1, { cloudProjectId: 'p', ...body(`race-${i}`, floor, ids[i]), principal: owner }, crypto.randomUUID(), new Date().toISOString(), `r${i}`)))
    const numbers = results.map(result => result.ok ? result.result.ticketNumber : 0)
    expect(new Set(numbers).size).toBe(3)
    numbers.forEach((number, i) => expect(number).toBeGreaterThanOrEqual(floors[i]))
    expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual({ n: Math.max(...numbers) + 1 })
  })

  test('reserved claim is visible without a projection and never becomes free on lookup', async () => {
    const { db, d1 } = fixture()
    const held = await reservations.createReservation(d1, owner, 'p', body(), 'r')
    const api = reservations as typeof reservations & { getTicketClaim: (...args: unknown[]) => Promise<unknown> }
    const claim = await api.getTicketClaim(d1, owner, 'p', held.ticketNumber, 'claim')
    expect(claim).toMatchObject({ protocolVersion: 2, ticketNumber: 263, creationId, state: 'reserved', reservationId: held.reservationId })
    expect(db.query('SELECT COUNT(*) n FROM ticket_projections').get()).toEqual({ n: 0 })
  })

  test('acknowledgement cannot use a different creation identity', async () => {
    const { d1 } = fixture()
    const held = await reservations.createReservation(d1, owner, 'p', body(), 'r')
    await expect(reservations.acknowledge(d1, owner, 'p', held.reservationId, { operationId: 'operation', contentHash: 'c'.repeat(64), header: projectedHeader(held.ticketNumber, otherCreationId) }, 'ack'))
      .rejects
      .toMatchObject({ code: 'reservation_state_conflict' })
  })

  test('an operator advance after pre-read suppresses a stale insert before retrying', async () => {
    const { db } = fixture()
    const d1 = identityD1(db)
    const batch = d1.batch.bind(d1)
    let advanced = false
    d1.batch = async (statements) => {
      if (!advanced) {
        advanced = true
        db.run('UPDATE cloud_projects SET next_ticket_number=900 WHERE id=\'p\'')
      }
      return batch(statements)
    }
    const result = await reservations.createReservation(d1, owner, 'p', body(), 'race')
    expect(result.ticketNumber).toBe(900)
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 1 })
    expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual({ n: 901 })
  })

  test('an allocation audit failure rolls back reservation and counter together', async () => {
    const { db, d1 } = fixture()
    db.run('CREATE TRIGGER fail_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT, \'fixture audit failure\'); END')
    await expect(reservations.createReservation(d1, owner, 'p', body(), 'rollback')).rejects.toThrow('fixture audit failure')
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 0 })
    expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual({ n: 258 })
  })

  test('a new intent cannot reuse an existing creation identity', async () => {
    const { db, d1 } = fixture()
    await reservations.createReservation(d1, owner, 'p', body(), 'r')
    await expect(reservations.createReservation(d1, owner, 'p', body('new-intent'), 'r2'))
      .rejects
      .toMatchObject({ code: 'reservation_state_conflict' })
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 1 })
  })

  test('claim lookup is scoped by membership and reports an unreserved number without mutations', async () => {
    const { db, d1 } = fixture()
    const api = reservations as typeof reservations & { getTicketClaim: (...args: unknown[]) => Promise<unknown> }
    await expect(api.getTicketClaim(d1, { kind: 'human', id: 'stranger@example.invalid' }, 'p', 263, 'hidden'))
      .rejects
      .toMatchObject({ code: 'project_not_found' })
    const claim = await api.getTicketClaim(d1, owner, 'p', 263, 'empty')
    expect(claim).toMatchObject({ state: 'unreserved', creationId: null, reservationId: null })
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 0 })
  })

  test('a minimum without room for advancing the counter is rejected', async () => {
    const { db, d1 } = fixture()
    await expect(reservations.createReservation(d1, owner, 'p', body('overflow', Number.MAX_SAFE_INTEGER), 'r'))
      .rejects
      .toMatchObject({ code: 'invalid_request' })
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 0 })
  })
})
