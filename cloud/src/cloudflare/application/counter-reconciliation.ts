import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types'
import type { CloudPrincipal, CounterReconciliationRequest, CounterReconciliationResponse } from '@mdt/domain-contracts'
import { CoordinationError, CounterReconciliationRequestSchema, CounterReconciliationResponseSchema } from '@mdt/domain-contracts'
import { requireProjectRole } from './authorization'

type ReviewedTicket = CounterReconciliationRequest['canonicalTickets'][number]
interface ProjectSnapshot {
  project_code: string
  coordination_state: string
  next_ticket_number: number
  projection_revision: number
}
interface TicketSnapshot {
  reservation_id: string
  ticket_number: number
  creation_id: string | null
  state: string
  projection_version: number
  projection_json: string | null
}

/** Called only by the operator-audience route; project owner authorization is additional. */
export async function reconcileCounter(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  input: unknown,
  requestId: string,
): Promise<CounterReconciliationResponse> {
  const parsed = CounterReconciliationRequestSchema.safeParse(input)
  if (!parsed.success)
    throw new CoordinationError('invalid_request', { requestId, message: 'invalid reviewed reconciliation request' })
  const request = parsed.data
  await requireProjectRole(db, principal, cloudProjectId, 'owner', 'counter.reconcile', requestId)
  const requestHash = await hash(stableJson({ ...request, dryRun: false }))
  const replay = await operationReplay(db, cloudProjectId, request, requestHash, requestId)
  if (replay)
    return replay

  const project = await db.prepare(
    'SELECT project_code, coordination_state, next_ticket_number, projection_revision FROM cloud_projects WHERE id = ?',
  ).bind(cloudProjectId).first<ProjectSnapshot>()
  if (!project)
    throw new CoordinationError('project_not_found', { requestId })
  if (project.coordination_state !== 'suspended'
    || project.next_ticket_number !== request.expectedNextTicketNumber
    || project.projection_revision !== request.expectedProjectionRevision) {
    throw conflict(requestId)
  }
  const snapshots = await reviewedSnapshots(db, cloudProjectId, request, project, requestId)
  const highest = await db.prepare('SELECT MAX(ticket_number) maximum FROM ticket_reservations WHERE cloud_project_id = ?')
    .bind(cloudProjectId)
    .first<{ maximum: number | null }>()
  const highWater = Math.max(highest?.maximum ?? 0, ...request.canonicalTickets.map(ticket => ticket.ticketNumber), 0)
  const nextTicketNumber = Math.max(project.next_ticket_number, highWater + 1)
  const projectionRevision = project.projection_revision + request.canonicalTickets.length
  if (!Number.isSafeInteger(nextTicketNumber) || !Number.isSafeInteger(projectionRevision)) {
    throw new CoordinationError('invalid_request', { requestId, message: 'reconciliation exceeds safe integer range' })
  }
  const result: CounterReconciliationResponse = {
    operationId: request.operationId,
    dryRun: request.dryRun,
    replayed: false,
    previousNextTicketNumber: project.next_ticket_number,
    nextTicketNumber,
    previousProjectionRevision: project.projection_revision,
    projectionRevision,
    corrections: request.canonicalTickets.length,
  }
  // An authorized dry run performs SELECTs only, including no success-audit write.
  if (request.dryRun)
    return result

  const now = new Date().toISOString()
  const statements = [guardStatement(db, cloudProjectId, principal, request, requestHash, snapshots, result, now)]
  // Release only the reviewed identity bindings inside this transaction, allowing
  // explicit identity swaps without deleting or moving any reservation number row.
  for (const ticket of request.canonicalTickets) {
    statements.push(db.prepare('UPDATE ticket_reservations SET creation_id = NULL WHERE cloud_project_id = ? AND ticket_number = ?')
      .bind(cloudProjectId, ticket.ticketNumber))
  }
  for (const [index, ticket] of request.canonicalTickets.entries()) {
    const snapshot = snapshots[index]
    const reservationId = snapshot?.reservation_id ?? `reconcile-${request.operationId}-${ticket.ticketNumber}`
    statements.push(db.prepare(
      `INSERT INTO ticket_reservations
       (cloud_project_id, reservation_id, ticket_number, state, created_by_kind, created_by_id, created_at, acknowledged_at, creation_id, minimum_ticket_number)
       VALUES (?, ?, ?, 'acknowledged', ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cloud_project_id, ticket_number) DO UPDATE SET
         creation_id = excluded.creation_id, state = 'acknowledged', acknowledged_at = excluded.acknowledged_at,
         minimum_ticket_number = COALESCE(ticket_reservations.minimum_ticket_number, excluded.minimum_ticket_number)`,
    ).bind(cloudProjectId, reservationId, ticket.ticketNumber, principal.kind, principal.id, now, now, ticket.creationId, ticket.ticketNumber))
    statements.push(projectionCorrection(db, cloudProjectId, principal, request.operationId, ticket, reservationId, project.projection_revision + index + 1, now))
  }
  statements.push(db.prepare('UPDATE cloud_projects SET next_ticket_number = ?, projection_revision = ?, updated_at = ? WHERE id = ?')
    .bind(nextTicketNumber, projectionRevision, now, cloudProjectId))
  statements.push(db.prepare(
    `INSERT INTO audit_events
     (id, cloud_project_id, request_id, principal_kind, principal_id, action, outcome, resource_type, resource_id, detail_json, occurred_at)
     VALUES (?, ?, ?, ?, ?, 'counter.reconcile', 'success', 'project', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), cloudProjectId, requestId, principal.kind, principal.id, cloudProjectId, JSON.stringify({ operation_id: request.operationId, previous_next: project.next_ticket_number, next: nextTicketNumber, corrections: request.canonicalTickets.length }), now))
  try {
    await db.batch(statements)
  }
  catch (error) {
    // A concurrent identical operator operation may have won while we prepared.
    const winning = await operationReplay(db, cloudProjectId, request, requestHash, requestId)
    if (winning)
      return winning
    if (error instanceof Error && /(?:CHECK|UNIQUE) constraint failed/iu.test(error.message))
      throw conflict(requestId)
    throw error
  }
  return result
}

async function operationReplay(db: D1Database, cloudProjectId: string, request: CounterReconciliationRequest, requestHash: string, requestId: string) {
  const row = await db.prepare('SELECT request_hash, result_json FROM reconciliation_operations WHERE cloud_project_id = ? AND operation_id = ?')
    .bind(cloudProjectId, request.operationId)
    .first<{ request_hash: string, result_json: string }>()
  if (!row)
    return null
  if (row.request_hash !== requestHash)
    throw new CoordinationError('idempotency_key_reused', { requestId })
  const result = CounterReconciliationResponseSchema.parse(JSON.parse(row.result_json))
  return { ...result, dryRun: request.dryRun, replayed: true }
}

async function reviewedSnapshots(db: D1Database, cloudProjectId: string, request: CounterReconciliationRequest, project: ProjectSnapshot, requestId: string) {
  const snapshots: Array<TicketSnapshot | null> = []
  const reviewedNumbers = new Set(request.canonicalTickets.map(ticket => ticket.ticketNumber))
  // One JSON binding keeps both query count and parameter count independent of
  // the reviewed set size (the public contract allows up to 200 mappings).
  const reviewedJson = JSON.stringify(request.canonicalTickets)
  const rows = await db.prepare(
    `SELECT r.reservation_id, r.ticket_number, r.creation_id, r.state,
      COALESCE(p.projection_version, 0) projection_version,
      CASE WHEN p.ticket_number IS NULL THEN NULL ELSE json_set(json_object(
        'reservationId', p.reservation_id, 'lifecycle', p.lifecycle,
        'projectionVersion', p.projection_version, 'projectRevision', p.project_revision,
        'operationId', p.operation_id, 'contentHash', p.content_hash,
        'code', p.code, 'title', p.title, 'status', p.status, 'type', p.type,
        'priority', p.priority, 'assignee', p.assignee, 'date_created', p.date_created,
        'last_modified', p.last_modified),
        '$.updatedByKind', p.updated_by_kind, '$.updatedById', p.updated_by_id,
        '$.updatedAt', p.updated_at, '$.deletedAt', p.deleted_at
      ) END projection_json
     FROM ticket_reservations r LEFT JOIN ticket_projections p
       ON p.cloud_project_id = r.cloud_project_id AND p.ticket_number = r.ticket_number
     WHERE r.cloud_project_id = ?
       AND r.ticket_number IN (SELECT json_extract(value, '$.ticketNumber') FROM json_each(?))`,
  ).bind(cloudProjectId, reviewedJson).all<TicketSnapshot>()
  const byNumber = new Map(rows.results.map(row => [row.ticket_number, row]))
  const identities = await db.prepare(
    `SELECT ticket_number FROM ticket_reservations WHERE cloud_project_id = ?
     AND creation_id IN (SELECT json_extract(value, '$.creationId') FROM json_each(?))`,
  ).bind(cloudProjectId, reviewedJson).all<{ ticket_number: number }>()
  if (identities.results.some(row => !reviewedNumbers.has(row.ticket_number)))
    throw conflict(requestId)
  for (const ticket of request.canonicalTickets) {
    if (ticket.header.code !== `${project.project_code}-${String(ticket.ticketNumber).padStart(3, '0')}`
      || ticket.header.creationId !== ticket.creationId
      || await hash(stableJson(ticket.header)) !== ticket.contentHash) {
      throw new CoordinationError('invalid_request', { requestId, message: 'reviewed header identity or hash does not match canonical ticket' })
    }
    const row = byNumber.get(ticket.ticketNumber) ?? null
    if (ticket.expectedState === 'unreserved') {
      if (row || ticket.expectedReservationId !== null || ticket.expectedCreationId !== null || ticket.expectedProjectionVersion !== 0)
        throw conflict(requestId)
    }
    else if (!row || row.reservation_id !== ticket.expectedReservationId || row.creation_id !== ticket.expectedCreationId
      || row.state !== ticket.expectedState || row.projection_version !== ticket.expectedProjectionVersion) {
      throw conflict(requestId)
    }
    snapshots.push(row)
  }
  return snapshots
}

function guardStatement(db: D1Database, cloudProjectId: string, principal: CloudPrincipal, request: CounterReconciliationRequest, requestHash: string, snapshots: Array<TicketSnapshot | null>, result: CounterReconciliationResponse, now: string) {
  return db.prepare(
    `INSERT INTO reconciliation_operations
     (cloud_project_id, operation_id, request_hash, verified, result_json, detail_json, created_by_kind, created_by_id, created_at)
     VALUES (?, ?, ?, CASE WHEN
       EXISTS (SELECT 1 FROM cloud_projects WHERE id = ? AND coordination_state = 'suspended'
         AND next_ticket_number = ? AND projection_revision = ?)
       AND NOT EXISTS (
         SELECT 1 FROM json_each(?) reviewed
         LEFT JOIN ticket_reservations r ON r.cloud_project_id = ?
           AND r.ticket_number = json_extract(reviewed.value, '$.ticketNumber')
         LEFT JOIN ticket_projections p ON p.cloud_project_id = r.cloud_project_id AND p.ticket_number = r.ticket_number
         WHERE CASE WHEN json_extract(reviewed.value, '$.expectedState') = 'unreserved'
           THEN r.reservation_id IS NOT NULL
           ELSE r.reservation_id IS NULL
             OR r.reservation_id IS NOT json_extract(reviewed.value, '$.expectedReservationId')
             OR r.creation_id IS NOT json_extract(reviewed.value, '$.expectedCreationId')
             OR r.state IS NOT json_extract(reviewed.value, '$.expectedState')
             OR COALESCE(p.projection_version, 0) != json_extract(reviewed.value, '$.expectedProjectionVersion')
           END
       ) THEN 1 ELSE 0 END, ?, ?, ?, ?, ?)`,
  ).bind(cloudProjectId, request.operationId, requestHash, cloudProjectId, request.expectedNextTicketNumber, request.expectedProjectionRevision, JSON.stringify(request.canonicalTickets), cloudProjectId, JSON.stringify(result), stableJson({ reason: request.reason, previous: snapshots, reviewed: request.canonicalTickets }), principal.kind, principal.id, now)
}

function projectionCorrection(db: D1Database, cloudProjectId: string, principal: CloudPrincipal, operationId: string, ticket: ReviewedTicket, reservationId: string, revision: number, now: string): D1PreparedStatement {
  const h = ticket.header
  return db.prepare(
    `INSERT INTO ticket_projections
     (cloud_project_id, ticket_number, reservation_id, lifecycle, projection_version, project_revision,
      operation_id, content_hash, code, title, status, type, priority, assignee, date_created, last_modified,
      updated_by_kind, updated_by_id, updated_at, deleted_at)
     VALUES (?, ?, ?, 'active', 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
     ON CONFLICT(cloud_project_id, ticket_number) DO UPDATE SET
      reservation_id = excluded.reservation_id, lifecycle = 'active', deleted_at = NULL,
      projection_version = ticket_projections.projection_version + 1, project_revision = excluded.project_revision,
      operation_id = excluded.operation_id, content_hash = excluded.content_hash, code = excluded.code,
      title = excluded.title, status = excluded.status, type = excluded.type, priority = excluded.priority,
      assignee = excluded.assignee, date_created = excluded.date_created, last_modified = excluded.last_modified,
      updated_by_kind = excluded.updated_by_kind, updated_by_id = excluded.updated_by_id, updated_at = excluded.updated_at`,
  ).bind(cloudProjectId, ticket.ticketNumber, reservationId, revision, `${operationId}:${ticket.ticketNumber}`, ticket.contentHash, h.code, h.title, h.status, h.type, h.priority, h.assignee, h.date_created, h.last_modified, principal.kind, principal.id, now)
}

function conflict(requestId: string) {
  return new CoordinationError('reservation_state_conflict', { requestId, message: 'reviewed reconciliation state no longer matches; inspect and preview again' })
}
function stableJson(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map(stableJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}
async function hash(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}
