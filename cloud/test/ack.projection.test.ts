/**
 * TEST-ack-projection-wiring — covers the acknowledgement → projection v1 wiring.
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md § Acknowledgement.
 *
 * The `acknowledge()` use case must: transition the reservation to
 * `acknowledged`, create projection_version = 1, advance the project revision
 * once, and be idempotent on (reservation, contentHash). This test exercises the
 * wired use case (application/reservation.ts) against real SQLite via the D1
 * adapter, separate from the repository unit tests in projection.test.ts.
 */

import type { CloudPrincipal, ProjectedHeader } from './helpers/projection-d1-adapter'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { acknowledge } from '../src/cloudflare/application/reservation'
import { asD1 } from './helpers/projection-d1-adapter'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, '..', 'migrations', '0001_init.sql')

let db: Database.Database
let tmpDir: string
const PRINCIPAL: CloudPrincipal = { kind: 'human', id: 'owner@example.com', display: 'owner@example.com' }

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdt-ack-'))
  db = new Database(join(tmpDir, 'ack.sqlite'))
  db.run(readFileSync(SCHEMA_PATH, 'utf8'))
})

afterAll(() => {
  db.close()
  rmSync(tmpDir, { recursive: true, force: true })
})

beforeEach(() => {
  db.run('DELETE FROM ticket_projections')
  db.run('DELETE FROM ticket_reservations')
  db.run('DELETE FROM idempotency_keys')
  db.run('DELETE FROM audit_events')
  db.run('DELETE FROM memberships')
  db.run('DELETE FROM cloud_projects')
  const now = new Date().toISOString()
  db.run(
    `INSERT INTO cloud_projects (id, project_code, coordination_state, next_ticket_number, projection_revision, created_at, updated_at)
     VALUES ('p1', 'MDT', 'active', 501, 0, ?, ?)`,
    [now, now],
  )
  // Owner membership so authorize() passes for the contributor role.
  db.run(
    `INSERT INTO memberships (cloud_project_id, principal_kind, principal_id, display_label, role, created_at, updated_at)
     VALUES ('p1', 'human', 'owner@example.com', 'owner@example.com', 'owner', ?, ?)`,
    [now, now],
  )
  // A reservation to acknowledge.
  db.run(
    `INSERT INTO ticket_reservations (cloud_project_id, reservation_id, ticket_number, state, created_by_kind, created_by_id, created_at)
     VALUES ('p1', 'res-1', 500, 'reserved', 'human', 'owner@example.com', ?)`,
    [now],
  )
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

describe('acknowledge wiring (U3: creates projection v1)', () => {
  test('acknowledgement creates projection v1 and advances project revision once', async () => {
    const result = await acknowledge(
      asD1(db),
      PRINCIPAL,
      'p1',
      'res-1',
      { operationId: 'op-1', contentHash: 'a'.repeat(64), header: HEADER },
      'req-1',
    )
    expect(result.acknowledged).toBe(true)
    expect(result.projectionVersion).toBe(1)
    expect(result.projectRevision).toBe(1)
    expect(result.replayed).toBe(false)

    // The reservation transitioned to acknowledged.
    const res = db.prepare(
      `SELECT state FROM ticket_reservations WHERE cloud_project_id = ? AND reservation_id = ?`,
    ).get('p1', 'res-1') as { state: string }
    expect(res.state).toBe('acknowledged')

    // The project revision advanced once.
    const proj = db.prepare('SELECT projection_revision FROM cloud_projects WHERE id = ?').get('p1') as { projection_revision: number }
    expect(proj.projection_revision).toBe(1)
  })

  test('acknowledge replay with same reservation + contentHash is idempotent', async () => {
    await acknowledge(
      asD1(db),
      PRINCIPAL,
      'p1',
      'res-1',
      { operationId: 'op-1', contentHash: 'a'.repeat(64), header: HEADER },
      'req-1',
    )
    const replay = await acknowledge(
      asD1(db),
      PRINCIPAL,
      'p1',
      'res-1',
      { operationId: 'op-1', contentHash: 'a'.repeat(64), header: HEADER },
      'req-2',
    )
    expect(replay.replayed).toBe(true)
    expect(replay.projectionVersion).toBe(1)
    // Revision did not advance twice.
    const proj = db.prepare('SELECT projection_revision FROM cloud_projects WHERE id = ?').get('p1') as { projection_revision: number }
    expect(proj.projection_revision).toBe(1)
    expect(db.prepare(
      `SELECT action, outcome FROM audit_events WHERE request_id = 'req-2'`,
    ).get()).toEqual({ action: 'reservation.acknowledge', outcome: 'replayed' })
  })

  test('acknowledge missing reservation → reservation_not_found', async () => {
    await expect(
      acknowledge(
        asD1(db),
        PRINCIPAL,
        'p1',
        'missing-res',
        { operationId: 'op-x', contentHash: 'a'.repeat(64), header: HEADER },
        'req-3',
      ),
    ).rejects.toThrow('reservation_not_found')
  })

  test('acknowledge missing fields → invalid_request', async () => {
    await expect(
      acknowledge(
        asD1(db),
        PRINCIPAL,
        'p1',
        'res-1',
        { operationId: '', contentHash: '', header: HEADER },
        'req-4',
      ),
    ).rejects.toMatchObject({ code: 'invalid_request' })
  })

  test('rolls back reservation acknowledgement when projection creation fails', async () => {
    db.run(`
      CREATE TRIGGER fail_projection_insert
      BEFORE INSERT ON ticket_projections
      BEGIN
        SELECT RAISE(ABORT, 'forced projection failure');
      END
    `)
    try {
      await expect(acknowledge(
        asD1(db),
        PRINCIPAL,
        'p1',
        'res-1',
        { operationId: 'op-fail', contentHash: 'b'.repeat(64), header: HEADER },
        'req-fail',
      )).rejects.toThrow('forced projection failure')

      const reservation = db.prepare(
        `SELECT state FROM ticket_reservations WHERE cloud_project_id = 'p1' AND reservation_id = 'res-1'`,
      ).get() as { state: string }
      const project = db.prepare(
        `SELECT projection_revision FROM cloud_projects WHERE id = 'p1'`,
      ).get() as { projection_revision: number }
      expect(reservation.state).toBe('reserved')
      expect(project.projection_revision).toBe(0)
      expect(db.prepare(`SELECT COUNT(*) AS n FROM audit_events`).get()).toEqual({ n: 0 })
    }
    finally {
      db.run('DROP TRIGGER fail_projection_insert')
    }
  })
})
