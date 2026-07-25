/**
 * Projection repository — versioned header projection writes + polling.
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md
 *   § Acknowledgement, § Projection Write Transaction, § Polling Contract.
 *
 * Acknowledgement creates projection_version = 1 in the same batch. Later
 * writes use If-Match projectionVersion precondition; zero affected rows →
 * 409 projection_version_conflict. An operationId replay returns the existing
 * result. Tombstones (lifecycle=deleted) are retained; numbers never reused.
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { CloudPrincipal, ProjectedHeader } from '@mdt/domain-contracts'
import { CoordinationError } from '@mdt/domain-contracts'
import { recordAudit } from './audit'

export interface PublishProjectionRequest {
  ticketNumber: number
  reservationId: string
  /** If-Match: last observed projection version. */
  expectedProjectionVersion: number
  operationId: string
  contentHash: string
  header: ProjectedHeader
  lifecycle: 'active' | 'deleted'
}

export interface ProjectionRecord extends ProjectedHeader {
  ticketNumber: number
  reservationId: string
  lifecycle: string
  projectionVersion: number
  projectRevision: number
  operationId: string
  contentHash: string
  updatedByKind: string
  updatedById: string
  updatedAt: string
  deletedAt: string | null
}

export interface PollResult {
  items: ProjectionRecord[]
  nextCursor: number | null
  hasMore: boolean
}

/**
 * Atomically acknowledge a reservation and create its initial projection.
 * D1 `batch()` is one transaction, so callers can never observe an
 * acknowledged reservation without projection v1 (or the inverse).
 */
export async function acknowledgeWithInitialProjection(
  db: D1Database,
  cloudProjectId: string,
  reservationId: string,
  operationId: string,
  contentHash: string,
  header: ProjectedHeader,
  principal: CloudPrincipal,
  now: string,
  requestId: string,
): Promise<{ projectionVersion: number, projectRevision: number, replayed: boolean }> {
  const reservation = await db.prepare(
    `SELECT ticket_number, state FROM ticket_reservations
     WHERE cloud_project_id = ? AND reservation_id = ?`,
  ).bind(cloudProjectId, reservationId).first<{ ticket_number: number, state: string }>()
  if (!reservation) {
    throw new CoordinationError('reservation_not_found', { requestId })
  }

  const existing = await db.prepare(
    `SELECT projection_version, project_revision, content_hash
     FROM ticket_projections
     WHERE cloud_project_id = ? AND reservation_id = ?`,
  ).bind(cloudProjectId, reservationId).first<{
    projection_version: number
    project_revision: number
    content_hash: string
  }>()
  if (existing) {
    if (existing.content_hash !== contentHash) {
      await recordAudit(db, {
        cloudProjectId,
        requestId,
        principal,
        action: 'reservation.acknowledge',
        outcome: 'conflict',
        resourceType: 'reservation',
        resourceId: reservationId,
        detail: { reason: 'content_hash_mismatch' },
      })
      throw new CoordinationError('reservation_state_conflict', { requestId })
    }
    await recordAudit(db, {
      cloudProjectId,
      requestId,
      principal,
      action: 'reservation.acknowledge',
      outcome: 'replayed',
      resourceType: 'reservation',
      resourceId: reservationId,
      detail: { projection_version: existing.projection_version },
    })
    return {
      projectionVersion: existing.projection_version,
      projectRevision: existing.project_revision,
      replayed: true,
    }
  }
  if (reservation.state !== 'reserved' && reservation.state !== 'orphaned') {
    throw new CoordinationError('reservation_state_conflict', { requestId })
  }

  await db.batch([
    db.prepare(
      `UPDATE ticket_reservations
       SET state = 'acknowledged', acknowledged_at = ?
       WHERE cloud_project_id = ? AND reservation_id = ?
         AND state IN ('reserved', 'orphaned')`,
    ).bind(now, cloudProjectId, reservationId),
    db.prepare(
      `INSERT INTO ticket_projections
         (cloud_project_id, ticket_number, reservation_id, lifecycle, projection_version,
          project_revision, operation_id, content_hash, code, title, status, type, priority,
          assignee, date_created, last_modified, updated_by_kind, updated_by_id, updated_at, deleted_at)
       SELECT ?, r.ticket_number, ?, 'active', 1, p.projection_revision + 1,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL
       FROM ticket_reservations r
       JOIN cloud_projects p ON p.id = r.cloud_project_id
       WHERE r.cloud_project_id = ? AND r.reservation_id = ? AND r.state = 'acknowledged'
         AND NOT EXISTS (
           SELECT 1 FROM ticket_projections
           WHERE cloud_project_id = ? AND reservation_id = ?
         )`,
    ).bind(
      cloudProjectId,
      reservationId,
      operationId,
      contentHash,
      header.code,
      header.title,
      header.status,
      header.type,
      header.priority,
      header.assignee,
      header.date_created,
      header.last_modified,
      principal.kind,
      principal.id,
      now,
      cloudProjectId,
      reservationId,
      cloudProjectId,
      reservationId,
    ),
    db.prepare(
      `UPDATE cloud_projects
       SET projection_revision = projection_revision + 1, updated_at = ?
       WHERE id = ?
         AND projection_revision = (
           SELECT project_revision - 1 FROM ticket_projections
           WHERE cloud_project_id = ? AND operation_id = ?
         )`,
    ).bind(now, cloudProjectId, cloudProjectId, operationId),
    db.prepare(
      `INSERT INTO audit_events
         (id, cloud_project_id, request_id, principal_kind, principal_id, action, outcome,
          resource_type, resource_id, detail_json, occurred_at)
       SELECT ?, ?, ?, ?, ?, 'reservation.acknowledge', 'success', 'reservation', ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM ticket_projections
         WHERE cloud_project_id = ? AND operation_id = ?
       )
       AND NOT EXISTS (
         SELECT 1 FROM audit_events
         WHERE cloud_project_id = ? AND request_id = ? AND action = 'reservation.acknowledge'
       )`,
    ).bind(
      crypto.randomUUID(),
      cloudProjectId,
      requestId,
      principal.kind,
      principal.id,
      reservationId,
      JSON.stringify({ ticket_number: reservation.ticket_number, projection_version: 1 }),
      now,
      cloudProjectId,
      requestId,
      cloudProjectId,
      operationId,
    ),
  ])

  const created = await db.prepare(
    `SELECT projection_version, project_revision
     FROM ticket_projections
     WHERE cloud_project_id = ? AND reservation_id = ? AND content_hash = ?`,
  ).bind(cloudProjectId, reservationId, contentHash).first<{
    projection_version: number
    project_revision: number
  }>()
  if (!created) {
    throw new CoordinationError('coordination_unavailable', { requestId })
  }
  return {
    projectionVersion: created.projection_version,
    projectRevision: created.project_revision,
    replayed: false,
  }
}

/**
 * Create the first projection (projection_version = 1) as part of
 * acknowledgement. Advances the project revision once. Idempotent on
 * (reservation, contentHash) — a replay returns the existing projection.
 */
export async function createInitialProjection(
  db: D1Database,
  cloudProjectId: string,
  reservationId: string,
  ticketNumber: number,
  operationId: string,
  contentHash: string,
  header: ProjectedHeader,
  principal: CloudPrincipal,
  now: string,
): Promise<{ projectionVersion: number, projectRevision: number, replayed: boolean }> {
  // Idempotency: if a projection already exists for this reservation+hash, return it.
  const existing = await db.prepare(
    `SELECT projection_version, project_revision FROM ticket_projections
     WHERE cloud_project_id = ? AND reservation_id = ? AND content_hash = ?`,
  ).bind(cloudProjectId, reservationId, contentHash).first<{ projection_version: number, project_revision: number }>()
  if (existing) {
    return { projectionVersion: existing.projection_version, projectRevision: existing.project_revision, replayed: true }
  }

  // Read the current project revision to set the projection's project_revision.
  const project = await db.prepare('SELECT projection_revision FROM cloud_projects WHERE id = ?')
    .bind(cloudProjectId)
    .first<{ projection_revision: number }>()
  if (!project) {
    throw new CoordinationError('project_not_found', { requestId: operationId })
  }
  const projectRevision = project.projection_revision + 1

  await db.batch([
    db.prepare(
      `INSERT INTO ticket_projections
         (cloud_project_id, ticket_number, reservation_id, lifecycle, projection_version,
          project_revision, operation_id, content_hash, code, title, status, type, priority,
          assignee, date_created, last_modified, updated_by_kind, updated_by_id, updated_at, deleted_at)
       VALUES (?, ?, ?, 'active', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
    ).bind(
      cloudProjectId,
      ticketNumber,
      reservationId,
      projectRevision,
      operationId,
      contentHash,
      header.code,
      header.title,
      header.status,
      header.type,
      header.priority,
      header.assignee,
      header.date_created,
      header.last_modified,
      principal.kind,
      principal.id,
      now,
    ),
    // Advance the project revision once for this projection.
    db.prepare(
      `UPDATE cloud_projects SET projection_revision = ?, updated_at = ? WHERE id = ?`,
    ).bind(projectRevision, now, cloudProjectId),
    db.prepare(
      `INSERT INTO audit_events
         (id, cloud_project_id, request_id, principal_kind, principal_id, action, outcome,
          resource_type, resource_id, detail_json, occurred_at)
       VALUES (?, ?, ?, ?, ?, 'projection.publish', 'created', 'projection', ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      cloudProjectId,
      operationId,
      principal.kind,
      principal.id,
      reservationId,
      JSON.stringify({ ticket_number: ticketNumber, version: 1 }),
      now,
    ),
  ])

  const row = await db.prepare(
    `SELECT projection_version, project_revision FROM ticket_projections
     WHERE cloud_project_id = ? AND reservation_id = ?`,
  ).bind(cloudProjectId, reservationId).first<{ projection_version: number, project_revision: number }>()
  if (!row) {
    throw new CoordinationError('reservation_not_found', { requestId: operationId })
  }
  return { projectionVersion: row.projection_version, projectRevision: row.project_revision, replayed: false }
}

/**
 * Versioned projection publish. If-Match precondition: zero affected rows on
 * the ticket update → 409 projection_version_conflict (BR-3.2). An operationId
 * replay returns the existing result without advancing the revision.
 */
export async function publishProjection(
  db: D1Database,
  cloudProjectId: string,
  req: PublishProjectionRequest,
  principal: CloudPrincipal,
  now: string,
  requestId: string = req.operationId,
): Promise<{ projectionVersion: number, projectRevision: number, conflict: false } | { conflict: true, currentVersion: number }> {
  // operationId replay → return existing, no revision advance.
  const replay = await db.prepare(
    `SELECT projection_version, project_revision FROM ticket_projections
     WHERE cloud_project_id = ? AND operation_id = ?`,
  ).bind(cloudProjectId, req.operationId).first<{ projection_version: number, project_revision: number }>()
  if (replay) {
    return { projectionVersion: replay.projection_version, projectRevision: replay.project_revision, conflict: false }
  }

  const result = await db.batch([
    db.prepare(
      `UPDATE ticket_projections SET
         lifecycle = ?, projection_version = projection_version + 1,
         project_revision = (SELECT projection_revision + 1 FROM cloud_projects WHERE id = ?),
         operation_id = ?, content_hash = ?, code = ?, title = ?, status = ?, type = ?,
         priority = ?, assignee = ?, date_created = ?, last_modified = ?,
         updated_by_kind = ?, updated_by_id = ?, updated_at = ?,
         deleted_at = CASE WHEN ? = 'deleted' THEN ? ELSE NULL END
       WHERE cloud_project_id = ? AND ticket_number = ? AND projection_version = ?`,
    ).bind(
      req.lifecycle,
      cloudProjectId,
      req.operationId,
      req.contentHash,
      req.header.code,
      req.header.title,
      req.header.status,
      req.header.type,
      req.header.priority,
      req.header.assignee,
      req.header.date_created,
      req.header.last_modified,
      principal.kind,
      principal.id,
      now,
      req.lifecycle,
      now,
      cloudProjectId,
      req.ticketNumber,
      req.expectedProjectionVersion,
    ),
    db.prepare(
      `UPDATE cloud_projects
       SET projection_revision = projection_revision + 1, updated_at = ?
       WHERE id = ?
         AND projection_revision = (
           SELECT project_revision - 1 FROM ticket_projections
           WHERE cloud_project_id = ? AND operation_id = ?
         )`,
    ).bind(now, cloudProjectId, cloudProjectId, req.operationId),
    db.prepare(
      `INSERT INTO audit_events
         (id, cloud_project_id, request_id, principal_kind, principal_id, action, outcome,
          resource_type, resource_id, detail_json, occurred_at)
       SELECT ?, ?, ?, ?, ?, 'projection.publish', 'success', 'projection', ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM ticket_projections
         WHERE cloud_project_id = ? AND operation_id = ?
       )
       AND NOT EXISTS (
         SELECT 1 FROM audit_events
         WHERE cloud_project_id = ? AND request_id = ? AND action = 'projection.publish'
       )`,
    ).bind(
      crypto.randomUUID(),
      cloudProjectId,
      requestId,
      principal.kind,
      principal.id,
      String(req.ticketNumber),
      JSON.stringify({ version: req.expectedProjectionVersion + 1, lifecycle: req.lifecycle }),
      now,
      cloudProjectId,
      requestId,
      cloudProjectId,
      req.operationId,
    ),
  ])

  const affected = (result[0].meta?.changes ?? 0)
  if (affected === 0) {
    // Stale If-Match → conflict.
    const current = await db.prepare(
      `SELECT projection_version FROM ticket_projections WHERE cloud_project_id = ? AND ticket_number = ?`,
    ).bind(cloudProjectId, req.ticketNumber).first<{ projection_version: number }>()
    const currentVersion = current?.projection_version ?? 0
    await recordAudit(db, {
      cloudProjectId,
      requestId,
      principal,
      action: 'projection.publish',
      outcome: 'conflict',
      resourceType: 'projection',
      resourceId: String(req.ticketNumber),
      detail: { current_version: currentVersion, expected_version: req.expectedProjectionVersion },
    })
    return { conflict: true, currentVersion }
  }

  const row = await db.prepare(
    `SELECT projection_version, project_revision FROM ticket_projections
     WHERE cloud_project_id = ? AND ticket_number = ?`,
  ).bind(cloudProjectId, req.ticketNumber).first<{ projection_version: number, project_revision: number }>()
  return { projectionVersion: row!.projection_version, projectRevision: row!.project_revision, conflict: false }
}

/**
 * Poll projections by project-revision cursor. Ordered by (project_revision,
 * ticket_number). Never exposes reserved (unacknowledged) tickets (BR-3.1).
 */
export async function pollProjections(
  db: D1Database,
  cloudProjectId: string,
  after: number,
  limit: number,
): Promise<PollResult> {
  const clamped = Math.max(1, Math.min(500, limit))
  const rows = await db.prepare(
    `SELECT ticket_number, reservation_id, lifecycle, projection_version, project_revision,
            operation_id, content_hash, code, title, status, type, priority, assignee,
            date_created, last_modified, updated_by_kind, updated_by_id, updated_at, deleted_at
     FROM ticket_projections
     WHERE cloud_project_id = ? AND project_revision > ?
     ORDER BY project_revision ASC, ticket_number ASC
     LIMIT ?`,
  ).bind(cloudProjectId, after, clamped + 1).all<RawProjectionRow>()

  const all = rows.results.map(rowToProjection)
  const items = all.slice(0, clamped)
  const hasMore = all.length > clamped
  const nextCursor = hasMore ? items[items.length - 1].projectRevision : null
  return { items, nextCursor, hasMore }
}

export async function getProjectionByTicket(
  db: D1Database,
  cloudProjectId: string,
  ticketNumber: number,
): Promise<ProjectionRecord | null> {
  const row = await db.prepare(
    `SELECT ticket_number, reservation_id, lifecycle, projection_version, project_revision,
            operation_id, content_hash, code, title, status, type, priority, assignee,
            date_created, last_modified, updated_by_kind, updated_by_id, updated_at, deleted_at
     FROM ticket_projections
     WHERE cloud_project_id = ? AND ticket_number = ?`,
  ).bind(cloudProjectId, ticketNumber).first<RawProjectionRow>()
  return row ? rowToProjection(row) : null
}

/** Raw snake_case row from D1. */
interface RawProjectionRow {
  ticket_number: number
  reservation_id: string
  lifecycle: string
  projection_version: number
  project_revision: number
  operation_id: string
  content_hash: string
  code: string
  title: string
  status: string
  type: string | null
  priority: string | null
  assignee: string | null
  date_created: string | null
  last_modified: string
  updated_by_kind: string
  updated_by_id: string
  updated_at: string
  deleted_at: string | null
}

function rowToProjection(r: RawProjectionRow): ProjectionRecord {
  return {
    ticketNumber: r.ticket_number,
    reservationId: r.reservation_id,
    lifecycle: r.lifecycle,
    projectionVersion: r.projection_version,
    projectRevision: r.project_revision,
    operationId: r.operation_id,
    contentHash: r.content_hash,
    code: r.code,
    title: r.title,
    status: r.status,
    type: r.type,
    priority: r.priority,
    assignee: r.assignee,
    date_created: r.date_created,
    last_modified: r.last_modified,
    updatedByKind: r.updated_by_kind,
    updatedById: r.updated_by_id,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  }
}
