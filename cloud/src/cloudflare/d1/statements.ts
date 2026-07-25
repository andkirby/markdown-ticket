/**
 * D1 prepared statements and the static allocation batch.
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md § Allocation Transaction
 *
 * The batch shape is the production form of the MDT-198 E10 proof. It is static:
 * no branching on intermediate results. The request-scoped `reservation_id` is
 * what lets a fixed statement list express idempotent allocation. D1 executes
 * the batch as one transaction; unique constraints are the final guard.
 *
 * The counter is pre-read outside the transaction, so two concurrent requests
 * can read the same `next_ticket_number`. `allocateReservation` wraps the
 * static batch in a bounded retry loop that detects the resulting lost update
 * (UNIQUE violation on the reservation insert, or 0 rows on the counter
 * advance) and re-runs — it never returns a duplicate number.
 *
 * A replay returns the existing reservation without advancing the counter.
 * Reusing one key with a different request hash returns 409 idempotency_key_reused.
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { CloudPrincipal } from '@mdt/domain-contracts'
import { CoordinationError } from '@mdt/domain-contracts'

export interface ReservationRequest {
  cloudProjectId: string
  /** Client-generated, journaled before the first request. Worker stores SHA-256. */
  idempotencyKey: string
  /** SHA-256 of the canonical request body. */
  requestHash: string
  principal: CloudPrincipal
}

export interface ReservationResult {
  reservationId: string
  ticketNumber: number
  state: string
  /** true when this call returned a prior reservation without advancing the counter. */
  replayed: boolean
}

export interface IdempotencyConflict {
  kind: 'reused_key'
}

export type AllocationOutcome
  = | { ok: true, result: ReservationResult }
    | { ok: false, conflict: IdempotencyConflict }

/** Result row from the idempotency lookup (statement 5). */
interface AllocationRow {
  reservation_id: string
  ticket_number: number
  state: string
  request_hash: string
  idempotency_key_hash: string
}

/**
 * Upper bound on lost-update retries before giving up (BR-1.1, C3). Tuned from
 * live deployment evidence: under a 5-way concurrent burst, a bound of 3 left
 * ~1 request exhausting retries and surfacing coordination_unavailable. 10
 * attempts covers bursty collisions (worst-case added latency ~80 ms) while
 * staying bounded; the jittered backoff spreads concurrent losers across rounds.
 */
const ALLOCATION_MAX_ATTEMPTS = 10

/**
 * Execute the static allocation batch for one reservation request.
 *
 * The five statements run in one D1 batch (one transaction):
 *   1. INSERT reservation with projects.next_ticket_number, only when no row
 *      exists for project + idempotency-key hash;
 *   2. INSERT OR IGNORE idempotency result by selecting the row with this
 *      request's reservation_id;
 *   3. UPDATE cloud_projects.next_ticket_number by one only when its current
 *      value equals this request's selected ticket number;
 *   4. INSERT allocation or replay audit event by comparing the selected
 *      reservation_id with this request's reservation_id;
 *   5. SELECT the row for project + idempotency-key hash.
 *
 * Concurrency / lost-update recovery (BR-1.1, C3). The counter is pre-read
 * OUTSIDE the transaction so two concurrent requests can observe the same
 * `next_ticket_number`. The static batch has two independent guards against
 * that race:
 *   - Statement 1 inserts `(cloud_project_id, ticket_number)` which has a
 *     UNIQUE constraint — a racing insert with the same number throws, aborting
 *     the batch.
 *   - Statement 3 advances the counter with `WHERE next_ticket_number = ?`; a
 *     racing request that already advanced it leaves 0 affected rows.
 * Either way NO duplicate number is returned. But the loser of the race must
 * not surface a stale error: it re-reads the counter and re-runs the batch up
 * to `ALLOCATION_MAX_ATTEMPTS`. If it still cannot win, it throws
 * `coordination_unavailable` (503) so the client retries with a fresh attempt.
 * This preserves the static batch shape; it only adds a retry loop around it.
 */
export async function allocateReservation(
  db: D1Database,
  req: ReservationRequest,
  reservationId: string,
  now: string,
  requestId: string,
): Promise<AllocationOutcome> {
  const idempotencyKeyHash = await sha256(req.idempotencyKey)

  for (let attempt = 1; ; attempt += 1) {
    // Pre-read the counter so the batch can reference next_ticket_number
    // without branching. Re-read on every attempt so a retry sees the value
    // the winner advanced to. The SELECT is outside the transaction; the
    // statement-3 WHERE guard + the UNIQUE(ticket_number) constraint are the
    // actual lost-update guards inside the batch.
    const project = await db.prepare('SELECT next_ticket_number FROM cloud_projects WHERE id = ?')
      .bind(req.cloudProjectId)
      .first<{ next_ticket_number: number }>()
    if (!project) {
      // Caller maps to project_not_found (non-disclosing).
      throw new CoordinationError('project_not_found', { requestId })
    }
    const ticketNumber = project.next_ticket_number

    const outcome = await runAllocationBatch(db, req, reservationId, now, ticketNumber, idempotencyKeyHash, requestId)

    if (outcome.kind === 'retry') {
      if (attempt >= ALLOCATION_MAX_ATTEMPTS) {
        // Lost the counter race too many times. Surface a retryable 503; the
        // client re-issues the same idempotency key and either wins on retry
        // or observes its earlier reservation as a replay. Never a duplicate.
        throw new CoordinationError('coordination_unavailable', { requestId })
      }
      // Brief jittered backoff so concurrent losers of one round do not all
      // collide again on the next. The total is bounded by
      // ALLOCATION_MAX_ATTEMPTS so latency stays small.
      await backoff(attempt)
      continue
    }
    return outcome.result
  }
}

/**
 * One attempt of the allocation batch. Returns `retry` when a lost update was
 * detected (statement 3 affected 0 rows on a fresh allocation, or a UNIQUE
 * constraint aborted the batch) so the caller re-reads and re-runs. Returns
 * `done` with the final `AllocationOutcome` otherwise.
 */
async function runAllocationBatch(
  db: D1Database,
  req: ReservationRequest,
  reservationId: string,
  now: string,
  ticketNumber: number,
  idempotencyKeyHash: string,
  requestId: string,
): Promise<{ kind: 'retry' } | { kind: 'done', result: AllocationOutcome }> {
  // Statement 1: INSERT the reservation only when no idempotency row exists.
  const insertReservation = db.prepare(
    `INSERT INTO ticket_reservations
       (cloud_project_id, reservation_id, ticket_number, state,
        created_by_kind, created_by_id, created_at)
     SELECT ?, ?, ?, 'reserved', ?, ?, ?
     WHERE NOT EXISTS (
       SELECT 1 FROM idempotency_keys
       WHERE cloud_project_id = ? AND idempotency_key_hash = ?
     )`,
  ).bind(
    req.cloudProjectId,
    reservationId,
    ticketNumber,
    req.principal.kind,
    req.principal.id,
    now,
    req.cloudProjectId,
    idempotencyKeyHash,
  )

  // Statement 2: INSERT OR IGNORE the idempotency result for this reservation.
  const insertIdempotency = db.prepare(
    `INSERT OR IGNORE INTO idempotency_keys
       (cloud_project_id, idempotency_key_hash, request_hash, reservation_id, created_at)
     SELECT ?, ?, ?, ?, ? FROM ticket_reservations
     WHERE cloud_project_id = ? AND reservation_id = ?`,
  ).bind(
    req.cloudProjectId,
    idempotencyKeyHash,
    req.requestHash,
    reservationId,
    now,
    req.cloudProjectId,
    reservationId,
  )

  // Statement 3: advance the counter only when this was a fresh allocation
  // (a reservation row for THIS request's reservation_id was inserted). On
  // replay, no row exists for this reservation_id, so the counter is untouched.
  // This is the idempotency guarantee: a replay never advances the counter.
  // Under a lost update, a concurrent request already advanced the counter, so
  // `next_ticket_number != ticketNumber` and this affects 0 rows.
  const advanceCounter = db.prepare(
    `UPDATE cloud_projects SET next_ticket_number = ?, updated_at = ?
     WHERE id = ?
       AND next_ticket_number = ?
       AND EXISTS (
         SELECT 1 FROM ticket_reservations
         WHERE cloud_project_id = ? AND reservation_id = ?
       )`,
  ).bind(
    ticketNumber + 1,
    now,
    req.cloudProjectId,
    ticketNumber,
    req.cloudProjectId,
    reservationId,
  )

  // Statement 4: audit allocation vs replay using the canonical idempotency
  // result. On replay, resource_id and ticket_number must describe the
  // original reservation rather than this request's temporary reservation id.
  const auditAllocation = db.prepare(
    `INSERT INTO audit_events
       (id, cloud_project_id, request_id, principal_kind, principal_id,
        action, outcome, resource_type, resource_id, detail_json, occurred_at)
     SELECT ?, ?, ?, ?, ?, 'reservation.create',
       CASE WHEN k.reservation_id = ? THEN 'allocated' ELSE 'replayed' END,
       'reservation', k.reservation_id,
       json_object('ticket_number', r.ticket_number), ?
     FROM idempotency_keys k
     JOIN ticket_reservations r
       ON r.cloud_project_id = k.cloud_project_id
       AND r.reservation_id = k.reservation_id
     WHERE k.cloud_project_id = ? AND k.idempotency_key_hash = ?`,
  ).bind(
    crypto.randomUUID(),
    req.cloudProjectId,
    requestId,
    req.principal.kind,
    req.principal.id,
    reservationId,
    now,
    req.cloudProjectId,
    idempotencyKeyHash,
  )

  // Statement 5: read back the canonical row in the same transaction.
  const selectReservation = db.prepare(
    `SELECT r.reservation_id, r.ticket_number, r.state,
            k.request_hash, k.idempotency_key_hash
     FROM idempotency_keys k
     JOIN ticket_reservations r
       ON r.cloud_project_id = k.cloud_project_id
       AND r.reservation_id = k.reservation_id
     WHERE k.cloud_project_id = ? AND k.idempotency_key_hash = ?`,
  ).bind(req.cloudProjectId, idempotencyKeyHash)

  // Statements 1–5 run in one D1 batch (one transaction). A UNIQUE violation
  // on statement 1 (two racing inserts of the same ticket_number) aborts the
  // whole batch; we catch it and retry.
  let batchResults: Array<{ meta: { changes: number }, results?: unknown[] }>
  try {
    batchResults = await db.batch([
      insertReservation,
      insertIdempotency,
      advanceCounter,
      auditAllocation,
      selectReservation,
    ])
  }
  catch (err) {
    // A constraint violation from a racing allocation is recoverable: re-read
    // the counter and re-run. Any other error (e.g. a genuine misuse) is not.
    if (isUniqueConstraintError(err)) {
      return { kind: 'retry' }
    }
    throw err
  }

  const row = batchResults[4]?.results?.[0] as AllocationRow | undefined
  if (!row) {
    // Internal invariant: the row must exist right after a successful batch.
    // Surface a retryable 503 client-facing; the code stays non-disclosing.
    throw new CoordinationError('coordination_unavailable', { requestId, message: 'allocation_select_failed' })
  }

  // Lost-update guard: statement 3 (index 2) must advance the counter for a
  // fresh allocation. If it affected 0 rows AND the returned reservation is
  // THIS request's (i.e. not a replay of an earlier one), a concurrent request
  // won the counter after we read it — retry instead of returning a number
  // whose counter was not advanced. (On a legitimate replay, the returned
  // reservation_id differs from this request's and 0 changes is expected.)
  const counterAdvanced = batchResults[2]?.meta.changes ?? 0
  const isReplay = row.reservation_id !== reservationId
  if (!isReplay && counterAdvanced === 0) {
    return { kind: 'retry' }
  }

  // Idempotency-key reuse with a different request hash → conflict.
  if (row.request_hash !== req.requestHash) {
    return { kind: 'done', result: { ok: false, conflict: { kind: 'reused_key' } } }
  }

  return {
    kind: 'done',
    result: {
      ok: true,
      result: {
        reservationId: row.reservation_id,
        ticketNumber: row.ticket_number,
        state: row.state,
        replayed: isReplay,
      },
    },
  }
}

/**
 * Jittered backoff for allocation retries. Attempt n waits in [0, 2^n) ms
 * capped at 8 ms — enough to desynchronize concurrent losers of one round so
 * they do not all re-read the same counter on the next, while keeping total
 * retry latency under ~16 ms across the bounded loop. Uses Web Crypto for an
 * unbiased random fraction (available in the Workers runtime).
 */
async function backoff(attempt: number): Promise<void> {
  // Wider cap than 2^attempt so concurrent losers spread across a larger window
  // and are less likely to re-collide on the next round. Bounded by the attempt
  // count so total latency stays small (10 attempts × ≤20 ms ≈ 200 ms worst case).
  const cap = Math.min(20, 4 * attempt)
  const buf = new Uint8Array(1)
  crypto.getRandomValues(buf)
  const fraction = buf[0]! / 256
  const ms = Math.floor(fraction * cap)
  if (ms <= 0) {
    // Yield to the event loop so other in-flight retries can progress even when
    // the jitter draw is zero. This is what lets concurrent losers spread out.
    return new Promise<void>(resolve => setTimeout(resolve, 0))
  }
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

/**
 * Detect a UNIQUE constraint violation across D1 (Cloudflare) and bun:sqlite
 * (tests). D1 surfaces SQLite's SQLITE_CONSTRAINT message; bun:sqlite throws
 * a SqliteError with code 'SQLITE_CONSTRAINT_UNIQUE' / message 'UNIQUE ...'.
 */
function isUniqueConstraintError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false
  }
  const code = (err as { code?: unknown }).code
  const message = (err as { message?: unknown }).message
  const messageStr = typeof message === 'string' ? message : ''
  const codeStr = typeof code === 'string' ? code : ''
  return (
    codeStr.includes('SQLITE_CONSTRAINT')
    || messageStr.includes('UNIQUE constraint failed')
    || messageStr.includes('SQLITE_CONSTRAINT')
  )
}

/** Acknowledge a reservation: local Markdown file exists. */
export async function acknowledgeReservation(
  db: D1Database,
  cloudProjectId: string,
  reservationId: string,
  now: string,
): Promise<{ acknowledged: boolean, state: string }> {
  const res = await db.prepare(
    `UPDATE ticket_reservations
       SET state = 'acknowledged', acknowledged_at = ?
     WHERE cloud_project_id = ? AND reservation_id = ?
       AND state IN ('reserved', 'orphaned')`,
  ).bind(now, cloudProjectId, reservationId).run()
  return { acknowledged: res.meta.changes > 0, state: 'acknowledged' }
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}
