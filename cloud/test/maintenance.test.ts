/**
 * TEST-scheduled-expiry (Edge-3) — integration test for expireStaleReservations.
 *
 * Verifies the scheduled handler marks `reserved` rows older than 24h as
 * `abandoned` in bounded batches, emits audit, never decrements the counter,
 * and never deletes the reservation (numbers never reused — C3).
 *
 * Runs the real SQL against bun:sqlite with the production schema.
 */

import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import {
  AUDIT_RETENTION_BATCH_LIMIT,
  expireStaleReservations,
  EXPIRY_BATCH_LIMIT,
} from '../src/cloudflare/scheduled/maintenance'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, '..', 'migrations', '0001_init.sql')

let db: Database.Database
let tmpDir: string

/**
 * bun:sqlite is not a D1Database. expireStaleReservations expects a D1-shaped
 * binding (prepare().bind().{first,all,run} + db.batch([bound, bound])). We
 * adapt bun:sqlite to that surface: a bound statement captures sql+params and
 * exposes an execute() that batch() calls.
 */
interface BoundStatement {
  __sql: string
  __params: unknown[]
  first: <T>() => T | null
  all: <T>() => { results: T[] }
  run: () => { meta: { changes: number } }
}

function asD1(db: Database.Database) {
  const prepare = (sql: string) => ({
    bind(...params: unknown[]): BoundStatement {
      const execute = () => db.prepare(sql)
      return {
        __sql: sql,
        __params: params,
        first<T>(): T | null {
          const row = execute().get(...params) as T | null
          return row ?? null
        },
        all<T>(): { results: T[] } {
          const rows = execute().all(...params) as T[]
          return { results: rows ?? [] }
        },
        run() {
          execute().run(...params)
          return { meta: { changes: 1 } }
        },
      }
    },
  })
  return {
    prepare,
    async batch(statements: BoundStatement[]) {
      for (const s of statements) {
        s.run()
      }
    },
  } as unknown as import('@cloudflare/workers-types').D1Database
}

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdt-maint-'))
  db = new Database(join(tmpDir, 'maint.sqlite'))
  db.run(readFileSync(SCHEMA_PATH, 'utf8'))
})

afterAll(() => {
  db.close()
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('scheduled maintenance (Edge-3, C3)', () => {
  test('expires reserved rows older than 24h to abandoned with audit; counter and reservation untouched', async () => {
    const now = Date.now()
    const staleIso = new Date(now - 25 * 60 * 60 * 1000).toISOString() // 25h old
    const freshIso = new Date(now - 1 * 60 * 60 * 1000).toISOString() // 1h old
    db.run(`INSERT INTO cloud_projects (id, project_code, coordination_state, next_ticket_number, projection_revision, created_at, updated_at) VALUES ('p-maint', 'MDT', 'active', 401, 0, ?, ?)`, [staleIso, staleIso])
    // Stale reservation (#400 — seeded counter starts at 401 for clarity)
    db.run(`INSERT INTO ticket_reservations (cloud_project_id, reservation_id, ticket_number, state, created_by_kind, created_by_id, created_at) VALUES ('p-maint', 'stale-1', 400, 'reserved', 'human', 'x@y.com', ?)`, [staleIso])
    // Fresh reservation — must NOT be expired
    db.run(`INSERT INTO ticket_reservations (cloud_project_id, reservation_id, ticket_number, state, created_by_kind, created_by_id, created_at) VALUES ('p-maint', 'fresh-1', 401, 'reserved', 'human', 'x@y.com', ?)`, [freshIso])

    const result = await expireStaleReservations(asD1(db), now, EXPIRY_BATCH_LIMIT)

    expect(result.expired).toBe(1)
    const stale = db.prepare(`SELECT state, abandoned_at FROM ticket_reservations WHERE reservation_id = 'stale-1'`).get() as Record<string, string | null>
    expect(stale.state).toBe('abandoned')
    expect(stale.abandoned_at).not.toBeNull()
    const fresh = db.prepare(`SELECT state FROM ticket_reservations WHERE reservation_id = 'fresh-1'`).get() as Record<string, string>
    expect(fresh.state).toBe('reserved') // untouched
    // Counter unchanged — never decremented.
    const counter = db.prepare(`SELECT next_ticket_number FROM cloud_projects WHERE id = 'p-maint'`).get() as Record<string, number>
    expect(counter.next_ticket_number).toBe(401)
    // Reservation row NOT deleted (number never reused).
    const count = db.prepare(`SELECT COUNT(*) AS n FROM ticket_reservations WHERE cloud_project_id = 'p-maint'`).get() as Record<string, number>
    expect(count.n).toBe(2)
    // Audit emitted for the expiry.
    const audit = db.prepare(`SELECT action, outcome FROM audit_events WHERE resource_id = 'stale-1'`).get() as Record<string, string>
    expect(audit.action).toBe('reservation.expire')
    expect(audit.outcome).toBe('abandoned')
  })

  test('deletes only audit events older than 180 days in a bounded batch', async () => {
    const now = Date.now()
    const old = new Date(now - 181 * 24 * 60 * 60 * 1000).toISOString()
    const recent = new Date(now - 179 * 24 * 60 * 60 * 1000).toISOString()
    for (let index = 0; index < AUDIT_RETENTION_BATCH_LIMIT + 5; index += 1) {
      db.run(
        `INSERT INTO audit_events
          (id, cloud_project_id, request_id, principal_kind, principal_id,
           action, outcome, resource_type, resource_id, detail_json, occurred_at)
         VALUES (?, 'p-maint', ?, 'system', 'test', 'test.old', 'ok', 'test', ?, '{}', ?)`,
        [`old-${index}`, `request-old-${index}`, `resource-old-${index}`, old],
      )
    }
    db.run(
      `INSERT INTO audit_events
        (id, cloud_project_id, request_id, principal_kind, principal_id,
         action, outcome, resource_type, resource_id, detail_json, occurred_at)
       VALUES ('recent', 'p-maint', 'request-recent', 'system', 'test',
               'test.recent', 'ok', 'test', 'recent', '{}', ?)`,
      [recent],
    )

    const result = await expireStaleReservations(asD1(db), now, EXPIRY_BATCH_LIMIT)

    expect(result.auditDeleted).toBe(AUDIT_RETENTION_BATCH_LIMIT)
    const oldRemaining = db.prepare(`SELECT COUNT(*) AS n FROM audit_events WHERE action = 'test.old'`).get() as { n: number }
    expect(oldRemaining.n).toBe(5)
    const recentRemaining = db.prepare(`SELECT COUNT(*) AS n FROM audit_events WHERE id = 'recent'`).get() as { n: number }
    expect(recentRemaining.n).toBe(1)
  })
})

/** Apply every schema migration in wrangler order to a fresh in-memory DB. */
function applyAllMigrations(): Database.Database {
  const migrationsDir = join(__dirname, '..', 'migrations')
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
  const migrated = new Database(':memory:')
  for (const file of files) {
    migrated.run(readFileSync(join(migrationsDir, file), 'utf8'))
  }
  return migrated
}

describe('TEST-audit-retention-index (C-16)', () => {
  let migrated: Database.Database

  beforeAll(() => {
    migrated = applyAllMigrations()
  })

  afterAll(() => {
    migrated.close()
  })

  test('every schema migration applies in order and creates audit_by_time', () => {
    const indexes = migrated.prepare(`PRAGMA index_list('audit_events')`).all() as Array<{ name: string }>
    expect(indexes.map(index => index.name)).toContain('audit_by_time')
  })

  test('retention scan uses the audit_by_time index and never full-scans audit_events', () => {
    const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
    const plan = migrated.prepare(
      `EXPLAIN QUERY PLAN
       SELECT id FROM audit_events WHERE occurred_at < ? ORDER BY occurred_at LIMIT ?`,
    ).all(cutoff, 100) as Array<{ detail: string }>
    const details = plan.map(row => row.detail).join(' | ')
    expect(details).toMatch(/USING (COVERING )?INDEX audit_by_time/)
    expect(details).not.toMatch(/SCAN audit_events/)
  })
})

describe('TEST-reservations-expiry-index (C-16)', () => {
  let migrated: Database.Database

  beforeAll(() => {
    migrated = applyAllMigrations()
  })

  afterAll(() => {
    migrated.close()
  })

  test('expiry scan uses the reservations_by_expiry index and never full-scans ticket_reservations', () => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const plan = migrated.prepare(
      `EXPLAIN QUERY PLAN
       SELECT cloud_project_id, reservation_id, ticket_number
       FROM ticket_reservations
       WHERE state = 'reserved' AND created_at < ?
       LIMIT ?`,
    ).all(cutoff, 100) as Array<{ detail: string }>
    const details = plan.map(row => row.detail).join(' | ')
    expect(details).toMatch(/USING (COVERING )?INDEX reservations_by_expiry/)
    expect(details).not.toMatch(/SCAN ticket_reservations/)
  })
})
