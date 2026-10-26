import type { CounterReconciliationRequest } from '@mdt/domain-contracts'
import { afterEach, describe, expect, test } from 'bun:test'
import { reconcileCounter } from '../src/cloudflare/application/counter-reconciliation'
import { creationId, headerHash, identityD1, identityFixture, owner, projectedHeader } from './helpers/identity-d1'
import { createInitialProjection } from './helpers/projection-d1-adapter'

const databases: ReturnType<typeof identityFixture>[] = []
function fixture(state: 'active' | 'suspended' = 'suspended') {
  const db = identityFixture(state)
  databases.push(db)
  return { db, d1: identityD1(db) }
}
function body(dryRun = true): CounterReconciliationRequest {
  return {
    operationId: 'da6ba5df-d5b4-4741-8d76-ab66926a9661',
    dryRun,
    expectedNextTicketNumber: 258,
    expectedProjectionRevision: 0,
    reason: 'Reviewed incident correction fixture',
    canonicalTickets: [{ ticketNumber: 262, creationId, header: projectedHeader(262), contentHash: headerHash(projectedHeader(262)), expectedReservationId: null, expectedCreationId: null, expectedState: 'unreserved', expectedProjectionVersion: 0 }],
  }
}
afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('MDT-200 operator counter/identity reconciliation', () => {
  test('200 existing mappings preview and apply within D1 Free limits', async () => {
    const { db } = fixture()
    const request = body(true)
    request.canonicalTickets = Array.from({ length: 200 }, (_, index) => {
      const ticketNumber = index + 262
      const identity = `00000000-0000-4000-8000-${String(ticketNumber).padStart(12, '0')}`
      const header = projectedHeader(ticketNumber, identity)
      db.prepare(`INSERT INTO ticket_reservations
        (cloud_project_id,reservation_id,ticket_number,state,created_by_kind,created_by_id,created_at,creation_id)
        VALUES('p',?,?,'acknowledged','human','owner@example.invalid','now',?)`)
        .run(`existing-${ticketNumber}`, ticketNumber, identity)
      return { ticketNumber, creationId: identity, header, contentHash: headerHash(header), expectedReservationId: `existing-${ticketNumber}`, expectedCreationId: identity, expectedState: 'acknowledged' as const, expectedProjectionVersion: 0 }
    })
    const previewBudget = { queries: 0, largestBindingCount: 0 }
    const preview = await reconcileCounter(identityD1(db, 0, previewBudget), owner, 'p', request, 'preview-max')
    expect(preview).toMatchObject({ corrections: 200, nextTicketNumber: 462, projectionRevision: 200 })
    expect(db.query('SELECT COUNT(*) n FROM reconciliation_operations').get()).toEqual({ n: 0 })
    const raced = identityD1(db, 0, { queries: 0, largestBindingCount: 0 })
    const batch = raced.batch.bind(raced)
    raced.batch = async (statements) => {
      db.run('UPDATE ticket_reservations SET state=\'orphaned\' WHERE ticket_number=461')
      return batch(statements)
    }
    await expect(reconcileCounter(raced, owner, 'p', { ...request, dryRun: false }, 'race-max'))
      .rejects
      .toMatchObject({ code: 'reservation_state_conflict' })
    expect(db.query('SELECT COUNT(*) n FROM reconciliation_operations').get()).toEqual({ n: 0 })
    expect(db.query('SELECT COUNT(*) n FROM ticket_projections').get()).toEqual({ n: 0 })
    expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual({ n: 258 })
    db.run('UPDATE ticket_reservations SET state=\'acknowledged\' WHERE ticket_number=461')
    const applyBudget = { queries: 0, largestBindingCount: 0 }
    const applied = await reconcileCounter(identityD1(db, 0, applyBudget), owner, 'p', { ...request, dryRun: false }, 'apply-max')
    expect(applied).toMatchObject({ corrections: 200, nextTicketNumber: 462, projectionRevision: 200 })
    expect(previewBudget.queries).toBeLessThanOrEqual(8)
    expect(applyBudget.queries).toBeLessThanOrEqual(9)
    expect(applyBudget.largestBindingCount).toBeLessThanOrEqual(20)
    expect(db.query('SELECT COUNT(*) n FROM ticket_projections WHERE lifecycle=\'active\'').get()).toEqual({ n: 200 })
    expect(db.query('SELECT MIN(project_revision) first,MAX(project_revision) last FROM ticket_projections').get()).toEqual({ first: 1, last: 200 })
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations WHERE reservation_id LIKE \'existing-%\'').get()).toEqual({ n: 200 })
    expect(db.query('SELECT COUNT(*) n FROM audit_events WHERE action=\'counter.reconcile\'').get()).toEqual({ n: 1 })
  })

  test('dry-run computes the reviewed floor without changing any row', async () => {
    const { db, d1 } = fixture()
    const result = await reconcileCounter(d1, owner, 'p', body(), 'r')
    expect(result).toMatchObject({ dryRun: true, previousNextTicketNumber: 258, nextTicketNumber: 263, corrections: 1 })
    expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual({ n: 258 })
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 0 })
    expect(db.query('SELECT COUNT(*) n FROM audit_events').get()).toEqual({ n: 0 })
  })

  test('explicit apply registers reviewed identity and projection, retains history, and repeats idempotently', async () => {
    const { db, d1 } = fixture()
    db.run('INSERT INTO ticket_reservations(cloud_project_id,reservation_id,ticket_number,state,created_by_kind,created_by_id,created_at) VALUES(\'p\',\'old\',250,\'abandoned\',\'human\',\'owner@example.invalid\',\'now\')')
    const first = await reconcileCounter(d1, owner, 'p', body(false), 'r')
    const second = await reconcileCounter(d1, owner, 'p', body(false), 'r2')
    expect(first).toMatchObject({ nextTicketNumber: 263, corrections: 1, replayed: false })
    expect(second).toMatchObject({ nextTicketNumber: 263, replayed: true })
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 2 })
    expect(db.query('SELECT state FROM ticket_reservations WHERE reservation_id=\'old\'').get()).toEqual({ state: 'abandoned' })
    expect(db.query('SELECT creation_id FROM ticket_reservations WHERE ticket_number=262').get()).toEqual({ creation_id: creationId })
    expect(db.query('SELECT COUNT(*) n FROM ticket_projections').get()).toEqual({ n: 1 })
    expect(db.query('SELECT COUNT(*) n FROM audit_events WHERE action=\'counter.reconcile\'').get()).toEqual({ n: 1 })
  })

  test('an active project and stale reviewed counter both refuse apply without mutations', async () => {
    for (const state of ['active', 'suspended'] as const) {
      const { db, d1 } = fixture(state)
      const request = body(false)
      if (state === 'suspended')
        request.expectedNextTicketNumber = 257
      await expect(reconcileCounter(d1, owner, 'p', request, 'r')).rejects.toMatchObject({ code: 'reservation_state_conflict' })
      expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual({ n: 258 })
      expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 0 })
    }
  })

  test('explicit legacy association correction retains old projection evidence and reservation number', async () => {
    const { db, d1 } = fixture()
    const oldIdentity = 'f087eaf8-ae57-4a16-bd57-df109c9a9891'
    db.prepare(`INSERT INTO ticket_reservations
      (cloud_project_id,reservation_id,ticket_number,state,created_by_kind,created_by_id,created_at,creation_id)
      VALUES('p','old262',262,'acknowledged','human','owner@example.invalid','now',?)`).run(oldIdentity)
    const original = { ...projectedHeader(262, oldIdentity), title: 'Wrong creation before reviewed repair' }
    await createInitialProjection(db, 'p', 'old262', 262, 'previous-operation', headerHash(original), original, owner, new Date().toISOString())
    const request = body(false)
    request.expectedProjectionRevision = 1
    request.canonicalTickets[0].expectedReservationId = 'old262'
    request.canonicalTickets[0].expectedCreationId = oldIdentity
    request.canonicalTickets[0].expectedState = 'acknowledged'
    request.canonicalTickets[0].expectedProjectionVersion = 1
    const result = await reconcileCounter(d1, owner, 'p', request, 'repair')
    expect(result).toMatchObject({ nextTicketNumber: 263, projectionRevision: 2 })
    expect(db.query('SELECT reservation_id,ticket_number,creation_id FROM ticket_reservations').get())
      .toEqual({ reservation_id: 'old262', ticket_number: 262, creation_id: creationId })
    expect(db.query('SELECT title,projection_version FROM ticket_projections').get())
      .toEqual({ title: 'Canonical fixture', projection_version: 2 })
    const history = db.query('SELECT detail_json FROM reconciliation_operations').get() as { detail_json: string }
    expect(history.detail_json).toContain('Wrong creation before reviewed repair')
    expect(history.detail_json).toContain(oldIdentity)
  })

  test('a concurrent change after preview preparation aborts the entire apply batch', async () => {
    const { db, d1 } = fixture()
    const batch = d1.batch.bind(d1)
    let changed = false
    d1.batch = async (statements) => {
      if (!changed) {
        changed = true
        db.run('UPDATE cloud_projects SET next_ticket_number=900 WHERE id=\'p\'')
      }
      return batch(statements)
    }
    await expect(reconcileCounter(d1, owner, 'p', body(false), 'r')).rejects.toMatchObject({ code: 'reservation_state_conflict' })
    expect(db.query('SELECT COUNT(*) n FROM reconciliation_operations').get()).toEqual({ n: 0 })
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 0 })
    expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual({ n: 900 })
  })

  test('an audit failure rolls back the complete identity/projection repair', async () => {
    const { db, d1 } = fixture()
    db.run('CREATE TRIGGER fail_audit BEFORE INSERT ON audit_events BEGIN SELECT RAISE(ABORT, \'fixture audit failure\'); END')
    await expect(reconcileCounter(d1, owner, 'p', body(false), 'r')).rejects.toThrow('fixture audit failure')
    for (const table of ['reconciliation_operations', 'ticket_reservations', 'ticket_projections']) {
      expect(db.query(`SELECT COUNT(*) n FROM ${table}`).get()).toEqual({ n: 0 })
    }
    expect(db.query('SELECT next_ticket_number n FROM cloud_projects').get()).toEqual({ n: 258 })
  })

  test('a mismatched reviewed header hash or creation identity cannot mutate state', async () => {
    const { db, d1 } = fixture()
    const invalid = body(false)
    invalid.canonicalTickets[0].contentHash = 'f'.repeat(64)
    await expect(reconcileCounter(d1, owner, 'p', invalid, 'r')).rejects.toMatchObject({ code: 'invalid_request' })
    invalid.canonicalTickets[0].contentHash = headerHash(projectedHeader(262))
    invalid.canonicalTickets[0].header.creationId = 'f087eaf8-ae57-4a16-bd57-df109c9a9891'
    await expect(reconcileCounter(d1, owner, 'p', invalid, 'r2')).rejects.toMatchObject({ code: 'invalid_request' })
    expect(db.query('SELECT COUNT(*) n FROM ticket_reservations').get()).toEqual({ n: 0 })
  })

  test('reusing operation ID with changed reviewed input is rejected', async () => {
    const { d1 } = fixture()
    await reconcileCounter(d1, owner, 'p', body(false), 'r')
    await expect(reconcileCounter(d1, owner, 'p', { ...body(false), reason: 'Changed review' }, 'r2'))
      .rejects
      .toMatchObject({ code: 'idempotency_key_reused' })
  })
})
