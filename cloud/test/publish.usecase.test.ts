/**
 * TEST-projection-publish-usecase — covers the publish use case error contract.
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md
 *   § Local Projection Write Journal, § Projection.
 *
 * The `publish()` use case sits between the Worker route and the projection
 * repository. Two contract guarantees the local write journal (MDT-226) relies
 * on, and that no other test exercises at the use-case layer:
 *
 * - A versioned PUT with an empty `reservationId` succeeds. The reservation FK
 *   is load-bearing only on the INSERT/acknowledge path; the UPDATE in
 *   publishProjection never binds it, so the use case must not reject empty.
 * - A PUT against a ticket that has no projection row throws
 *   `projection_not_found` (not `projection_version_conflict`), so the journal
 *   can classify it as terminal `unmanaged` rather than retry. The repository
 *   signals a missing row as `{ conflict: true, currentVersion: 0 }` —
 *   projection_version starts at 1 on INSERT, so 0 unambiguously means absent.
 *
 * Exercised against real SQLite via the D1 adapter, mirroring ack.projection.test.
 */

import type { CloudPrincipal, ProjectedHeader } from './helpers/projection-d1-adapter'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import { publish } from '../src/cloudflare/application/projection-usecase'
import { asD1, createInitialProjection } from './helpers/projection-d1-adapter'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, '..', 'migrations', '0001_init.sql')

let db: Database.Database
let tmpDir: string
const PRINCIPAL: CloudPrincipal = { kind: 'human', id: 'owner@example.com', display: 'owner@example.com' }

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdt-publish-usecase-'))
  db = new Database(join(tmpDir, 'publish-usecase.sqlite'))
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
  // Owner membership so requireProjectRole passes for the contributor role.
  db.run(
    `INSERT INTO memberships (cloud_project_id, principal_kind, principal_id, display_label, role, created_at, updated_at)
     VALUES ('p1', 'human', 'owner@example.com', 'owner@example.com', 'owner', ?, ?)`,
    [now, now],
  )
  // A reservation backing the acknowledged projection.
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

describe('publish use case error contract (MDT-226 write journal)', () => {
  test('a versioned PUT with empty reservationId succeeds (no read-before-write)', async () => {
    // Acknowledge to create projection v1.
    await createInitialProjection(db, 'p1', 'res-1', 500, 'op-1', 'a'.repeat(64), HEADER, PRINCIPAL, new Date().toISOString())

    // The local write journal sends reservationId: '' because it does no GET.
    const result = await publish(
      asD1(db),
      PRINCIPAL,
      'p1',
      {
        ticketNumber: 500,
        reservationId: '',
        expectedProjectionVersion: 1,
        operationId: 'op-2',
        contentHash: 'b'.repeat(64),
        header: { ...HEADER, title: 'Updated', last_modified: '2026-07-25' },
        lifecycle: 'active',
      },
      'req-1',
    )
    expect(result.projectionVersion).toBe(2)
  })

  test('a PUT against a ticket with no projection row → projection_not_found', async () => {
    // No acknowledgement — ticket 500 has no projection row.
    await expect(
      publish(
        asD1(db),
        PRINCIPAL,
        'p1',
        {
          ticketNumber: 500,
          reservationId: '',
          expectedProjectionVersion: 0,
          operationId: 'op-missing',
          contentHash: 'a'.repeat(64),
          header: HEADER,
          lifecycle: 'active',
        },
        'req-missing',
      ),
    ).rejects.toMatchObject({ code: 'projection_not_found' })
  })

  test('a genuine stale-version conflict still → projection_version_conflict', async () => {
    await createInitialProjection(db, 'p1', 'res-1', 500, 'op-1', 'a'.repeat(64), HEADER, PRINCIPAL, new Date().toISOString())
    // Advance to v2.
    await publish(
      asD1(db),
      PRINCIPAL,
      'p1',
      {
        ticketNumber: 500,
        reservationId: 'res-1',
        expectedProjectionVersion: 1,
        operationId: 'op-2',
        contentHash: 'b'.repeat(64),
        header: { ...HEADER, title: 'v2', last_modified: '2026-07-25' },
        lifecycle: 'active',
      },
      'req-2',
    )
    // Stale publish at the old v1 → conflict carrying the current version 2.
    await expect(
      publish(
        asD1(db),
        PRINCIPAL,
        'p1',
        {
          ticketNumber: 500,
          reservationId: 'res-1',
          expectedProjectionVersion: 1,
          operationId: 'op-3',
          contentHash: 'c'.repeat(64),
          header: { ...HEADER, title: 'stale' },
          lifecycle: 'active',
        },
        'req-3',
      ),
    ).rejects.toMatchObject({ code: 'projection_version_conflict', currentVersion: 2 })
  })
})
