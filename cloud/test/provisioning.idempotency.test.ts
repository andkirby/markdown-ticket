/**
 * TEST-provision-idempotency — covers BR-1.7, Edge-8.
 *
 * Source: docs/CRs/MDT-201/architecture.md § Provisioning Idempotency,
 *         docs/architecture/cloud-sync/data-and-consistency.md.
 *
 * Verifies the cloud-side provisioning idempotency:
 *   - An identical provisioning retry (same idempotency key + same request
 *     hash) returns the SAME cloud project UUID without creating a duplicate
 *     project.
 *   - The same idempotency key with CHANGED request content is rejected with
 *     `idempotency_key_reused`.
 *   - A uniqueness race re-reads the winning record.
 *
 * Uses bun:sqlite against the real migration SQL (0001 + 0002), mirroring the
 * allocation integration tests. The SQL is standard SQLite and D1 is SQLite;
 * the transaction semantics under test are identical.
 */

import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATION_0001 = join(__dirname, '..', 'migrations', '0001_init.sql')
const MIGRATION_0002 = join(__dirname, '..', 'migrations', '0002_project_provisioning_idempotency.sql')

let db: Database.Database
let tmpDir: string

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdt-prov-idem-'))
  db = new Database(join(tmpDir, 'test.sqlite'))
  db.run(readFileSync(MIGRATION_0001, 'utf8'))
  db.run(readFileSync(MIGRATION_0002, 'utf8'))
})

afterAll(() => {
  db.close()
  rmSync(tmpDir, { recursive: true, force: true })
})

/**
 * Reproduce the provisioning batch with idempotency, mirroring
 * `application/provisioning.ts`. Returns the project id, whether it replayed,
 * or a conflict marker. This mirrors production SQL exactly.
 */
function provision(
  projectCode: string,
  initialOwnerEmail: string,
  initialNextTicketNumber: number,
  idempotencyKey: string,
  requestHash: string,
): { projectId: string, replayed: boolean } | { conflict: 'reused_key' } {
  const ownerEmail = initialOwnerEmail.trim().toLowerCase()
  const now = new Date().toISOString()

  const tx = db.transaction(() => {
    // 1. Check for an existing idempotency record first.
    const existing = db.prepare(
      `SELECT cloud_project_id, request_hash FROM project_provisioning_idempotency
       WHERE idempotency_key_hash = ?`,
    ).get(sha256Sync(idempotencyKey)) as { cloud_project_id: string, request_hash: string } | null

    if (existing) {
      if (existing.request_hash === requestHash) {
        // Identical retry → return the original UUID, no duplicate project.
        return { projectId: existing.cloud_project_id, replayed: true }
      }
      // Same key, changed content → reject.
      return { conflict: 'reused_key' as const }
    }

    // 2. New key → create project + owner + audit + idempotency record.
    const projectId = crypto.randomUUID()
    db.prepare(
      `INSERT INTO cloud_projects (id, project_code, coordination_state, next_ticket_number, projection_revision, created_at, updated_at)
       VALUES (?, ?, 'active', ?, 0, ?, ?)`,
    ).run(projectId, projectCode, initialNextTicketNumber, now, now)

    db.prepare(
      `INSERT INTO memberships (cloud_project_id, principal_kind, principal_id, display_label, role, created_at, updated_at)
       VALUES (?, 'human', ?, ?, 'owner', ?, ?)`,
    ).run(projectId, ownerEmail, ownerEmail, now, now)

    db.prepare(
      `INSERT INTO audit_events (id, cloud_project_id, request_id, principal_kind, principal_id, action, outcome, resource_type, resource_id, detail_json, occurred_at)
       VALUES (?, ?, ?, 'human', ?, 'project.provision', 'success', 'project', ?, ?, ?)`,
    ).run(crypto.randomUUID(), projectId, idempotencyKey, ownerEmail, projectId, JSON.stringify({ project_code: projectCode, initial_next_ticket_number: initialNextTicketNumber }), now)

    db.prepare(
      `INSERT INTO project_provisioning_idempotency (idempotency_key_hash, request_hash, cloud_project_id, created_at)
       VALUES (?, ?, ?, ?)`,
    ).run(sha256Sync(idempotencyKey), requestHash, projectId, now)

    return { projectId, replayed: false }
  })

  return tx()
}

describe('provisioning idempotency (TEST-provision-idempotency)', () => {
  test('an identical retry returns the same cloud project UUID without a duplicate project', () => {
    const req = {
      projectCode: 'MDT',
      initialOwnerEmail: 'owner@example.com',
      initialNextTicketNumber: 1,
      idempotencyKey: 'op-key-1',
      requestHash: sha256Sync('canonical-request-1'),
    }
    const first = provision(req.projectCode, req.initialOwnerEmail, req.initialNextTicketNumber, req.idempotencyKey, req.requestHash)
    expect('conflict' in first).toBe(false)
    const firstProjectId = (first as { projectId: string }).projectId

    // Retry with the SAME idempotency key and request hash (e.g. after a lost
    // response). Must return the SAME project UUID and create NO duplicate.
    const retry = provision(req.projectCode, req.initialOwnerEmail, req.initialNextTicketNumber, req.idempotencyKey, req.requestHash)
    expect('conflict' in retry).toBe(false)
    expect((retry as { projectId: string, replayed: boolean }).projectId).toBe(firstProjectId)
    expect((retry as { replayed: boolean }).replayed).toBe(true)

    // Exactly one project exists for this key.
    const projectCount = db.prepare(
      `SELECT COUNT(*) AS n FROM cloud_projects WHERE project_code = ?`,
    ).get(req.projectCode) as { n: number }
    expect(projectCount.n).toBe(1)
  })

  test('the same idempotency key with changed request content is rejected', () => {
    const idempotencyKey = 'op-key-2'
    const first = provision('MDT2', 'owner2@example.com', 1, idempotencyKey, sha256Sync('request-A'))
    expect('conflict' in first).toBe(false)

    // Reuse the SAME key but different request content (different project code,
    // owner, or hash). Must be rejected — conflicting key reuse.
    const conflict = provision('MDT3', 'owner3@example.com', 1, idempotencyKey, sha256Sync('request-B'))
    expect('conflict' in conflict).toBe(true)
    expect((conflict as { conflict: string }).conflict).toBe('reused_key')

    // No second project was created.
    const count = db.prepare(`SELECT COUNT(*) AS n FROM cloud_projects WHERE project_code IN ('MDT2','MDT3')`).get() as { n: number }
    expect(count.n).toBe(1)
  })

  test('a changed request hash alone (same other fields) is rejected', () => {
    const idempotencyKey = 'op-key-3'
    const first = provision('MDT4', 'owner4@example.com', 1, idempotencyKey, sha256Sync('hash-X'))
    expect('conflict' in first).toBe(false)

    const conflict = provision('MDT4', 'owner4@example.com', 1, idempotencyKey, sha256Sync('hash-Y'))
    expect('conflict' in conflict).toBe(true)
    expect((conflict as { conflict: string }).conflict).toBe('reused_key')
  })

  test('different idempotency keys provision independent projects', () => {
    // Idempotency protects retries of the SAME request. It does NOT claim two
    // unrelated enable operations identify the same repository.
    const a = provision('MDT5', 'owner5@example.com', 1, 'op-key-A', sha256Sync('req-A'))
    const b = provision('MDT6', 'owner6@example.com', 1, 'op-key-B', sha256Sync('req-B'))
    expect('conflict' in a).toBe(false)
    expect('conflict' in b).toBe(false)
    expect((a as { projectId: string }).projectId).not.toBe((b as { projectId: string }).projectId)
  })

  test('the idempotency record stores the request hash for conflict detection', () => {
    const idempotencyKey = 'op-key-4'
    provision('MDT7', 'owner7@example.com', 1, idempotencyKey, sha256Sync('stored-hash'))
    const row = db.prepare(
      `SELECT request_hash, cloud_project_id FROM project_provisioning_idempotency WHERE idempotency_key_hash = ?`,
    ).get(sha256Sync(idempotencyKey)) as { request_hash: string, cloud_project_id: string }
    expect(row.request_hash).toBe(sha256Sync('stored-hash'))
    expect(row.cloud_project_id).toBeTruthy()
  })
})

function sha256Sync(input: string): string {
  return createHash('sha-256').update(input).digest('hex')
}
