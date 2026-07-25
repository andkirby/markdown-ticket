/**
 * TEST-alloc-real-concurrency — proves the lost-update recovery in
 * `allocateReservation` (BR-1.1, C3).
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md § Allocation Transaction
 * and the "Allocation never returns a duplicate number under concurrency"
 * invariant.
 *
 * The older `alloc.integration.test.ts` exercised a synchronous `for` loop and
 * its own hand-mirrored SQL; it did not drive the production `allocateReservation`
 * function, and a synchronous loop cannot observe a counter pre-read race. This
 * file drives the real production function through a D1-shaped adapter and forces
 * the genuine pre-read race: many allocations read the same `next_ticket_number`
 * before any of them commits.
 *
 * Why a rendezvous adapter: in pure JS, `Promise.all` microtask scheduling can
 * accidentally serialize async call chains so each pre-read observes an already-
 * advanced counter — hiding the very race we must prove. The adapter below
 * deterministically reproduces the production race (confirmed against D1's
 * model: the counter pre-read is outside the transaction). It holds each
 * `batch()` for a "turn" until N concurrent allocations are all in flight, then
 * releases them together so every batch that read the same counter value
 * commits against the same starting state. Under the static batch, only ONE
 * such batch can win the UNIQUE(ticket_number) constraint / the statement-3
 * WHERE guard; the losers must retry or fail. With the production retry loop
 * every allocation eventually wins a unique number.
 *
 * bun:sqlite serializes writes, so the batches themselves do not physically
 * overlap — but they commit against the shared committed state, which is the
 * condition that triggers the lost update. This mirrors D1's "batch as one
 * transaction" semantics.
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { Database as BunDatabase } from 'bun:sqlite'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { allocateReservation } from '../src/cloudflare/d1/statements'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SCHEMA_PATH = join(__dirname, '..', 'migrations', '0001_init.sql')

let db: Database.Database
let tmpDir: string

beforeAll(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'mdt-alloc-conc-'))
  db = new Database(join(tmpDir, 'conc.sqlite'))
  db.run(readFileSync(SCHEMA_PATH, 'utf8'))
  // bun:sqlite default journal mode is fine for serial transactions; bump the
  // busy timeout so contended writes never surface SQLITE_BUSY during retries.
  db.run('PRAGMA busy_timeout = 5000')
})

afterAll(() => {
  db.close()
  rmSync(tmpDir, { recursive: true, force: true })
})

interface BoundStatement {
  __sql: string
  __params: unknown[]
  first: <T>() => T | null
  all: <T>() => { results: T[] }
  run: () => { meta: { changes: number }, results?: unknown[] }
}

/**
 * D1-shaped adapter that runs each `batch()` as ONE bun:sqlite transaction
 * (matching D1's batch-as-transaction semantics, including rollback on error)
 * and serializes batches through a shared lock (matching D1's per-database
 * write serialization). Batches see all previously committed state, which is
 * exactly what surfaces a lost update when two batches read the same counter.
 */
function asTransactionalD1(db: BunDatabase): D1Database {
  const prepare = (sql: string) => ({
    bind(...params: unknown[]): BoundStatement {
      return {
        __sql: sql,
        __params: params,
        first<T>(): T | null {
          const row = db.prepare(sql).get(...params) as T | null
          return row ?? null
        },
        all<T>(): { results: T[] } {
          const rows = db.prepare(sql).all(...params) as T[]
          return { results: rows ?? [] }
        },
        run() {
          if (/^\s*SELECT\b/iu.test(sql)) {
            const results = db.prepare(sql).all(...params) as unknown[]
            return { meta: { changes: 0 }, results }
          }
          const info = db.prepare(sql).run(...params) as unknown as { changes?: number }
          return { meta: { changes: info.changes ?? 0 } }
        },
      }
    },
  })

  let txChain: Promise<unknown> = Promise.resolve()
  const enqueue = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = txChain.then(fn, fn)
    txChain = run.catch(() => {})
    return run
  }

  return {
    prepare,
    async batch(statements: BoundStatement[]) {
      return enqueue(() => {
        const tx = db.transaction(() => {
          const results: Array<{ meta: { changes: number } }> = []
          for (const s of statements) {
            results.push(s.run())
          }
          return results
        })
        return Promise.resolve(tx())
      })
    },
  } as unknown as D1Database
}

/**
 * Force the pre-read race deterministically by gating batches until
 * `expectedReads` counter pre-reads have occurred ONCE, then leaving the gate
 * permanently open. This forces the initial collision (every concurrent
 * allocator observes the same `next_ticket_number`) but lets subsequent retries
 * proceed normally against the advancing counter — which mirrors production,
 * where retries arrive at different times and resolve progressively. Because
 * `allocateReservation` awaits its sha256 and its pre-read, scheduling N of them
 * via Promise.all interleaves their pre-reads before any batch.
 */
function asRendezvousD1(db: BunDatabase, expectedReads: number): D1Database {
  const base = asTransactionalD1(db)
  const baseBatch = base.batch.bind(base)

  let reads = 0
  let gateOpen = false
  const gated: Array<() => void> = []
  const openGate = () => {
    if (!gateOpen && reads >= expectedReads) {
      gateOpen = true
      for (const r of gated.splice(0)) {
        r()
      }
    }
  }
  const waitForGate = () =>
    new Promise<void>((resolve) => {
      if (gateOpen) {
        resolve()
      }
      else {
        gated.push(resolve)
      }
    })

  const basePrepare = base.prepare.bind(base)
  const prepare = (sql: string) => {
    const inner = basePrepare(sql)
    const isCounterRead = sql.includes('next_ticket_number') && sql.includes('cloud_projects')
    return {
      bind(...params: unknown[]) {
        const innerBound = inner.bind(...params)
        return {
          first<T>(): T | null {
            if (isCounterRead) {
              reads += 1
              openGate()
            }
            return innerBound.first<T>()
          },
          all<T>(): { results: T[] } {
            return innerBound.all<T>()
          },
          run() {
            return innerBound.run()
          },
        }
      },
    }
  }

  const batch = async (statements: BoundStatement[]) => {
    await waitForGate()
    return baseBatch(statements)
  }

  return { prepare, batch } as unknown as D1Database
}

function seedProject(id: string, code: string, nextNumber: number) {
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO cloud_projects (id, project_code, coordination_state, next_ticket_number, projection_revision, created_at, updated_at)
     VALUES (?, ?, 'active', ?, 0, ?, ?)`,
  ).run(id, code, nextNumber, now, now)
}

describe('allocation concurrency (BR-1.1: never a duplicate under concurrency)', () => {
  test('N concurrent allocations against one adapter all win unique numbers via retry', async () => {
    const projectId = 'proj-conc-real'
    const start = 1001
    seedProject(projectId, 'MDT', start)
    const N = 15
    const d1 = asRendezvousD1(db, N)

    // Fire N allocations concurrently. The rendezvous forces every pre-read to
    // observe `start` before any batch commits, so N-1 of them hit the
    // UNIQUE(ticket_number) / statement-3 guard and must retry.
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        allocateReservation(d1, {
          cloudProjectId: projectId,
          idempotencyKey: `conc-key-${i}`,
          requestHash: `conc-hash-${i}`,
          principal: { kind: 'human', id: 'conc@example.com' },
        }, crypto.randomUUID(), new Date().toISOString(), `req-conc-${i}`)),
    )

    const okResults = results
      .filter((r): r is { ok: true, result: { reservationId: string, ticketNumber: number, state: string, replayed: boolean } } => r.ok === true)
      .map(r => r.result.ticketNumber)

    expect(okResults.length).toBe(N) // every allocation eventually succeeded
    expect(new Set(okResults).size).toBe(N) // all unique — no duplicates ever
    expect(Math.min(...okResults)).toBe(start)
    expect(Math.max(...okResults)).toBe(start + N - 1)

    // The counter advanced exactly N from its starting value — every retry
    // consumed exactly one fresh number, no gaps, no duplicates.
    const counter = db.prepare('SELECT next_ticket_number FROM cloud_projects WHERE id = ?')
      .get(projectId) as { next_ticket_number: number }
    expect(counter.next_ticket_number).toBe(start + N)
  })

  test('a concurrent replay of the same key returns the original number, not a new one', async () => {
    const projectId = 'proj-conc-replay'
    const start = 3001
    seedProject(projectId, 'MDT', start)

    // First allocation establishes the reservation with no contention (plain
    // transactional adapter, no gate).
    const first = await allocateReservation(asTransactionalD1(db), {
      cloudProjectId: projectId,
      idempotencyKey: 'replay-key',
      requestHash: 'replay-hash',
      principal: { kind: 'human', id: 'replay@example.com' },
    }, crypto.randomUUID(), new Date().toISOString(), 'req-replay-first')
    expect(first.ok).toBe(true)
    if (!first.ok) {
      return
    }
    const firstNumber = first.result.ticketNumber

    // Now race the same key against fresh allocations, forcing the initial
    // counter collision via a shared 3-way gate adapter. The replay must
    // always return the original number; the fresh ones must each win a new
    // number.
    const racingD1 = asRendezvousD1(db, 3)
    const racing = await Promise.all([
      allocateReservation(racingD1, {
        cloudProjectId: projectId,
        idempotencyKey: 'replay-key', // same key → replay
        requestHash: 'replay-hash',
        principal: { kind: 'human', id: 'replay@example.com' },
      }, crypto.randomUUID(), new Date().toISOString(), 'req-race-replay'),
      allocateReservation(racingD1, {
        cloudProjectId: projectId,
        idempotencyKey: 'fresh-1',
        requestHash: 'fresh-hash-1',
        principal: { kind: 'human', id: 'replay@example.com' },
      }, crypto.randomUUID(), new Date().toISOString(), 'req-race-fresh-1'),
      allocateReservation(racingD1, {
        cloudProjectId: projectId,
        idempotencyKey: 'fresh-2',
        requestHash: 'fresh-hash-2',
        principal: { kind: 'human', id: 'replay@example.com' },
      }, crypto.randomUUID(), new Date().toISOString(), 'req-race-fresh-2'),
    ])

    expect(racing[0].ok).toBe(true)
    if (racing[0].ok) {
      expect(racing[0].result.ticketNumber).toBe(firstNumber) // replay → same
      expect(racing[0].result.replayed).toBe(true)
    }
    const replayAudit = db.prepare(
      `SELECT request_id, resource_id, detail_json
       FROM audit_events
       WHERE cloud_project_id = ? AND outcome = 'replayed'
       ORDER BY occurred_at DESC LIMIT 1`,
    ).get(projectId) as { request_id: string, resource_id: string, detail_json: string }
    expect(replayAudit.request_id).toBe('req-race-replay')
    expect(replayAudit.resource_id).toBe(first.result.reservationId)
    expect(JSON.parse(replayAudit.detail_json)).toEqual({ ticket_number: firstNumber })
    const freshNumbers = racing.slice(1)
      .filter((r): r is { ok: true, result: { ticketNumber: number } } => r.ok === true)
      .map(r => r.result.ticketNumber)
    expect(new Set(freshNumbers).size).toBe(2) // two distinct new numbers
    for (const n of freshNumbers) {
      expect(n).not.toBe(firstNumber) // never the replayed number
    }

    // Counter advanced once for the first allocation plus once for each fresh
    // allocation — the replay did not advance it.
    const counter = db.prepare('SELECT next_ticket_number FROM cloud_projects WHERE id = ?')
      .get(projectId) as { next_ticket_number: number }
    expect(counter.next_ticket_number).toBe(start + 3)
  })
})

/**
 * Reference test: prove the race is real by driving the static batch WITHOUT
 * the retry loop. This documents why the retry exists — without it, N-1 of N
 * concurrent same-counter allocations fail with a UNIQUE constraint error and
 * would surface as 500s (or, absent the constraint, as duplicate numbers).
 * `allocateReservation` includes the retry, so this test uses a minimal inline
 * single-pass allocation to demonstrate the pre-read race directly.
 */
describe('lost-update race is real (reference)', () => {
  test('without retry, only one of N same-counter allocations succeeds', async () => {
    const projectId = 'proj-race-ref'
    const start = 5001
    seedProject(projectId, 'MDT', start)
    const d1 = asRendezvousD1(db, 10)

    // Minimal single-pass allocation: pre-read, then one batch, no retry.
    const singlePass = async (_idempotencyKey: string) => {
      const project = d1.prepare('SELECT next_ticket_number FROM cloud_projects WHERE id = ?')
        .bind(projectId)
        .first<{ next_ticket_number: number }>()
      if (!project) {
        throw new Error('project_not_found')
      }
      const n = project.next_ticket_number
      await d1.batch([
        d1.prepare(
          `INSERT INTO ticket_reservations (cloud_project_id, reservation_id, ticket_number, state, created_by_kind, created_by_id, created_at)
           VALUES (?, ?, ?, 'reserved', 'human', 'race@example.com', ?)`,
        ).bind(projectId, crypto.randomUUID(), n, new Date().toISOString()),
        d1.prepare(
          `UPDATE cloud_projects SET next_ticket_number = ? WHERE id = ? AND next_ticket_number = ?`,
        ).bind(n + 1, projectId, n),
      ])
      return n
    }

    const tasks = Array.from({ length: 10 }, (_, i) =>
      singlePass(`race-key-${i}`).then(
        n => ({ ok: true as const, n }),
        err => ({ ok: false as const, err: String(err) }),
      ))
    const results = await Promise.all(tasks)
    const oks = results.filter(r => r.ok).map(r => (r as { ok: true, n: number }).n)

    // The race is real: without retry, only ONE of the ten same-counter
    // allocations succeeds; the rest throw on the UNIQUE constraint. This is
    // exactly the condition `allocateReservation`'s retry loop recovers from.
    expect(oks.length).toBe(1)
    expect(results.filter(r => !r.ok).length).toBe(9)
    for (const r of results) {
      if (!r.ok) {
        expect(r.err).toContain('UNIQUE constraint failed')
      }
    }
  })
})
