/**
 * Scheduled maintenance — invoked by the Cron Trigger every 15 minutes (UTC).
 *
 * Source: docs/architecture/cloud-sync/operations.md § Scheduled Maintenance,
 *         docs/architecture/cloud-sync/data-and-consistency.md § Reservation Lifecycle
 *
 * Expires stale `reserved` reservations (older than 24 hours) to `abandoned` in
 * bounded batches, and emits an audit record per expiry. It NEVER decrements the
 * counter and NEVER deletes the reservation (numbers are never reused — C3).
 */

import type { D1Database } from '@cloudflare/workers-types'

/** A reservation is stale after 24 hours in the `reserved` state. */
export const RESERVATION_TTL_MS = 24 * 60 * 60 * 1000
/** Bounded batch: expire at most this many per run to keep the transaction small. */
export const EXPIRY_BATCH_LIMIT = 100
/** Durable audit events are retained in D1 for 180 days. */
export const AUDIT_RETENTION_MS = 180 * 24 * 60 * 60 * 1000
/** Bounded deletion batch so retention work cannot dominate a Cron invocation. */
export const AUDIT_RETENTION_BATCH_LIMIT = 100

export interface MaintenanceResult {
  expired: number
  auditDeleted: number
}

/**
 * Expire stale reservations in one bounded batch. Each expiry:
 *   - transitions `reserved` → `abandoned` (sets abandoned_at)
 *   - writes an audit event (action=reservation.expire, outcome=abandoned)
 *   - leaves the counter and reservation row intact (no reuse).
 *
 * Returns the count expired. Safe to run concurrently — the UPDATE's WHERE
 * clause (state='reserved' AND created_at < cutoff) makes each expiry idempotent.
 */
export async function expireStaleReservations(
  db: D1Database,
  now: number = Date.now(),
  batchLimit: number = EXPIRY_BATCH_LIMIT,
): Promise<MaintenanceResult> {
  const cutoff = new Date(now - RESERVATION_TTL_MS).toISOString()
  const auditCutoff = new Date(now - AUDIT_RETENTION_MS).toISOString()
  const nowIso = new Date(now).toISOString()

  // Select the stale reservation ids first (bounded), then update each with audit.
  const stale = await db.prepare(
    `SELECT cloud_project_id, reservation_id, ticket_number
     FROM ticket_reservations
     WHERE state = 'reserved' AND created_at < ?
     LIMIT ?`,
  ).bind(cutoff, batchLimit).all<{ cloud_project_id: string, reservation_id: string, ticket_number: number }>()

  const expiredAudit = await db.prepare(
    `SELECT id
     FROM audit_events
     WHERE occurred_at < ?
     ORDER BY occurred_at
     LIMIT ?`,
  ).bind(auditCutoff, AUDIT_RETENTION_BATCH_LIMIT).all<{ id: string }>()

  // One transactional batch: UPDATE each reservation + INSERT its audit event.
  const statements = stale.results.flatMap((row) => {
    const auditId = crypto.randomUUID()
    return [
      db.prepare(
        `UPDATE ticket_reservations
           SET state = 'abandoned', abandoned_at = ?
         WHERE cloud_project_id = ? AND reservation_id = ? AND state = 'reserved'`,
      ).bind(nowIso, row.cloud_project_id, row.reservation_id),
      db.prepare(
        `INSERT INTO audit_events
           (id, cloud_project_id, request_id, principal_kind, principal_id,
            action, outcome, resource_type, resource_id, detail_json, occurred_at)
         VALUES (?, ?, ?, 'system', 'scheduled-maintenance',
                 'reservation.expire', 'abandoned', 'reservation', ?, ?, ?)`,
      ).bind(
        auditId,
        row.cloud_project_id,
        row.reservation_id,
        row.reservation_id,
        JSON.stringify({ ticket_number: row.ticket_number, reason: 'ttl_expired' }),
        nowIso,
      ),
    ]
  }).concat(
    expiredAudit.results
      .map(row => db.prepare(`DELETE FROM audit_events WHERE id = ? AND occurred_at < ?`).bind(row.id, auditCutoff)),
  )

  if (statements.length > 0) {
    await db.batch(statements)
  }
  return { expired: stale.results.length, auditDeleted: expiredAudit.results.length }
}
