/**
 * TEST-projection-content, TEST-projection-conflict, TEST-projection-polling —
 * covers BR-3.1, BR-3.2, BR-3.3.
 *
 * Integration tests for the projection repository against real SQLite with the
 * production schema. Verifies: initial projection on acknowledgement, versioned
 * publish with If-Match, stale-write conflict, polling cursor, and that bodies
 * never appear in projections.
 */

import type { ProjectedHeader } from './helpers/projection-d1-adapter'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  createInitialProjection,
  pollProjections,

  publishProjection,
} from './helpers/projection-d1-adapter'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, '..', 'migrations', '0001_init.sql')

let db: Database.Database
let tmpDir: string
const PRINCIPAL = { kind: 'human' as const, id: 'owner@example.com', display: 'owner@example.com' }

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdt-proj-'))
  db = new Database(join(tmpDir, 'proj.sqlite'))
  db.run(readFileSync(SCHEMA_PATH, 'utf8'))
})

afterAll(() => {
  db.close()
  rmSync(tmpDir, { recursive: true, force: true })
})

beforeEach(() => {
  db.run('DELETE FROM ticket_projections')
  db.run('DELETE FROM ticket_reservations')
  db.run('DELETE FROM audit_events')
  db.run('DELETE FROM cloud_projects')
  const now = new Date().toISOString()
  db.run(`INSERT INTO cloud_projects (id, project_code, coordination_state, next_ticket_number, projection_revision, created_at, updated_at) VALUES ('p1', 'MDT', 'active', 501, 0, ?, ?)`, [now, now])
  // A reservation to acknowledge.
  db.run(`INSERT INTO ticket_reservations (cloud_project_id, reservation_id, ticket_number, state, created_by_kind, created_by_id, created_at) VALUES ('p1', 'res-1', 500, 'reserved', 'human', 'owner@example.com', ?)`, [now])
})

const HEADER: ProjectedHeader = {
  code: 'MDT-500',
  title: 'Test',
  status: 'Open',
  type: 'Feature',
  priority: 'High',
  assignee: 'owner@example.com',
  date_created: '2026-07-24',
  last_modified: '2026-07-24',
}

describe('projection (BR-3.1, BR-3.2, BR-3.3)', () => {
  test('acknowledgement creates projection v1 (BR-3.1: never a body)', async () => {
    const result = await createInitialProjection(db, 'p1', 'res-1', 500, 'op-1', 'hash-1', HEADER, PRINCIPAL, new Date().toISOString())
    expect(result.projectionVersion).toBe(1)
    expect(result.projectRevision).toBe(1)
    expect(result.replayed).toBe(false)
    // The projection table has no body column — verify by schema inspection.
    const cols = db.prepare(`PRAGMA table_info(ticket_projections)`).all() as Array<{ name: string }>
    const colNames = cols.map(c => c.name)
    expect(colNames).not.toContain('body')
    expect(colNames).not.toContain('description')
  })

  test('idempotent acknowledgement replay returns existing projection', async () => {
    await createInitialProjection(db, 'p1', 'res-1', 500, 'op-1', 'hash-1', HEADER, PRINCIPAL, new Date().toISOString())
    const replay = await createInitialProjection(db, 'p1', 'res-1', 500, 'op-1', 'hash-1', HEADER, PRINCIPAL, new Date().toISOString())
    expect(replay.replayed).toBe(true)
    expect(replay.projectionVersion).toBe(1)
  })

  test('versioned publish advances version; stale If-Match → conflict (BR-3.2)', async () => {
    await createInitialProjection(db, 'p1', 'res-1', 500, 'op-1', 'hash-1', HEADER, PRINCIPAL, new Date().toISOString())
    // Fresh publish at expected version 1.
    const ok = await publishProjection(db, 'p1', {
      ticketNumber: 500,
      reservationId: 'res-1',
      expectedProjectionVersion: 1,
      operationId: 'op-2',
      contentHash: 'hash-2',
      header: { ...HEADER, title: 'Updated', last_modified: '2026-07-25' },
      lifecycle: 'active',
    }, PRINCIPAL, new Date().toISOString())
    expect(ok.conflict).toBe(false)
    if (!ok.conflict) {
      expect(ok.projectionVersion).toBe(2)
    }
    // Stale publish at the old version 1 → conflict.
    const conflict = await publishProjection(db, 'p1', {
      ticketNumber: 500,
      reservationId: 'res-1',
      expectedProjectionVersion: 1,
      operationId: 'op-3',
      contentHash: 'hash-3',
      header: { ...HEADER, title: 'Stale' },
      lifecycle: 'active',
    }, PRINCIPAL, new Date().toISOString())
    expect(conflict.conflict).toBe(true)
    if (conflict.conflict) {
      expect(conflict.currentVersion).toBe(2) // not overwritten
    }
    expect(db.prepare(
      `SELECT action, outcome FROM audit_events WHERE request_id = 'op-3'`,
    ).get()).toEqual({ action: 'projection.publish', outcome: 'conflict' })
  })

  test('polling returns acknowledged projections ordered by revision (BR-3.3)', async () => {
    await createInitialProjection(db, 'p1', 'res-1', 500, 'op-1', 'hash-1', HEADER, PRINCIPAL, new Date().toISOString())
    const result = await pollProjections(db, 'p1', 0, 100)
    expect(result.items.length).toBe(1)
    expect(result.items[0].ticketNumber).toBe(500)
    expect(result.items[0].title).toBe('Test')
    expect(result.hasMore).toBe(false)
    // Cursor-based: after the first revision, nothing new.
    const next = await pollProjections(db, 'p1', 1, 100)
    expect(next.items.length).toBe(0)
  })

  test('reserved (unacknowledged) tickets never appear in the feed (BR-3.1)', async () => {
    // No acknowledgement → no projection row → empty feed.
    const result = await pollProjections(db, 'p1', 0, 100)
    expect(result.items.length).toBe(0)
  })
})
