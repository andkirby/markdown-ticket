/**
 * Reservation use case — the cloud-side of a cloud-bound ticket create.
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md
 *
 * Flow:
 *   1. Authorize the caller as a contributor (or owner) of the project.
 *   2. Execute the static allocation batch (idempotent).
 *   3. Map the outcome to the typed envelope:
 *        - allocated/replayed → 200 with the reservation
 *        - reused idempotency key, different hash → 409 idempotency_key_reused
 *        - unknown project → 404 project_not_found (non-disclosing)
 *        - insufficient role → 403 forbidden
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { CloudPrincipal, ProjectedHeader } from '@mdt/domain-contracts'
import type { ReservationRequest } from '../d1/statements'
import { CoordinationError } from '@mdt/domain-contracts'
import { recordAudit } from '../d1/audit'
import { acknowledgeWithInitialProjection } from '../d1/projection'
import { allocateReservation } from '../d1/statements'
import { requireActiveCoordination, requireProjectRole } from './authorization'
import { parseProjectedHeader, requireSha256, requireText } from './validation'

export interface ReservationResponse {
  reservationId: string
  ticketNumber: number
  state: string
  replayed: boolean
}

export async function getReservation(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  reservationId: string,
  requestId: string,
): Promise<ReservationResponse> {
  await requireProjectRole(db, principal, cloudProjectId, 'contributor', 'reservation.recover', requestId)
  const row = await db.prepare(
    `SELECT reservation_id, ticket_number, state
     FROM ticket_reservations
     WHERE cloud_project_id = ? AND reservation_id = ?`,
  ).bind(cloudProjectId, reservationId).first<{
    reservation_id: string
    ticket_number: number
    state: string
  }>()
  if (!row) {
    throw new CoordinationError('reservation_not_found', { requestId })
  }
  await recordAudit(db, {
    cloudProjectId,
    requestId,
    principal,
    action: 'reservation.recover',
    outcome: 'success',
    resourceType: 'reservation',
    resourceId: reservationId,
    detail: { state: row.state, ticket_number: row.ticket_number },
  })
  return {
    reservationId: row.reservation_id,
    ticketNumber: row.ticket_number,
    state: row.state,
    replayed: true,
  }
}

/**
 * Acknowledgement request body.
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md § Acknowledgement.
 *
 * The body carries the projected header + contentHash so the Worker can create
 * projection v1 in the same acknowledgement flow. `operationId` is a random
 * client id used as the projection's operation_id (replay returns the existing
 * projection). All fields are required to create projection v1.
 */
export interface AcknowledgeBody {
  operationId: string
  contentHash: string
  header: ProjectedHeader
}

/** Acknowledgement response: the projection version + project revision created. */
export interface AcknowledgeResponse {
  acknowledged: true
  projectionVersion: number
  projectRevision: number
  /** true when a projection for this reservation+contentHash already existed. */
  replayed: boolean
}

export async function createReservation(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  body: Record<string, unknown>,
  requestId: string,
): Promise<ReservationResponse> {
  const idempotencyKey = requireText(body.idempotencyKey, 'idempotencyKey', requestId, 200)
  const requestHash = requireSha256(body.requestHash, 'requestHash', requestId)

  await requireProjectRole(db, principal, cloudProjectId, 'contributor', 'reservation.create', requestId)
  await requireActiveCoordination(db, principal, cloudProjectId, 'reservation.create', requestId)

  const req: ReservationRequest = {
    cloudProjectId,
    idempotencyKey,
    requestHash,
    principal,
  }
  const reservationId = crypto.randomUUID()
  const now = new Date().toISOString()

  const outcome = await allocateReservation(db, req, reservationId, now, requestId)
  if (!outcome.ok) {
    // Same idempotency key, different request hash.
    throw new CoordinationError('idempotency_key_reused', { requestId })
  }

  return {
    reservationId: outcome.result.reservationId,
    ticketNumber: outcome.result.ticketNumber,
    state: outcome.result.state,
    replayed: outcome.result.replayed,
  }
}

/**
 * Acknowledge a reservation once the local Markdown file exists.
 *
 * Per docs/architecture/cloud-sync/data-and-consistency.md § Acknowledgement:
 * acknowledgement is permitted only for `reserved`/`orphaned` rows, creates
 * `projection_version = 1`, advances the project revision once, and changes the
 * reservation to `acknowledged`. A replay with the same reservation + contentHash
 * returns the existing projection (idempotent).
 *
 * The reservation transition and the initial-projection write are tightly
 * coupled: the projection is created immediately after the reservation moves to
 * `acknowledged`. A replay (same reservation+contentHash) skips both the
 * transition side effects and the projection insert, returning the existing row.
 */
export async function acknowledge(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  reservationId: string,
  body: AcknowledgeBody | Record<string, unknown>,
  requestId: string,
): Promise<AcknowledgeResponse> {
  await requireProjectRole(db, principal, cloudProjectId, 'contributor', 'reservation.acknowledge', requestId)
  await requireActiveCoordination(db, principal, cloudProjectId, 'reservation.acknowledge', requestId)
  const operationId = requireText(body.operationId, 'operationId', requestId, 200)
  const contentHash = requireSha256(body.contentHash, 'contentHash', requestId)
  const header = parseProjectedHeader(body.header, requestId)

  const projection = await acknowledgeWithInitialProjection(
    db,
    cloudProjectId,
    reservationId,
    operationId,
    contentHash,
    header,
    principal,
    new Date().toISOString(),
    requestId,
  )

  return {
    acknowledged: true,
    projectionVersion: projection.projectionVersion,
    projectRevision: projection.projectRevision,
    replayed: projection.replayed,
  }
}
