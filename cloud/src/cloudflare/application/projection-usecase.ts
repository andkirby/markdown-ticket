/**
 * Projection use case — wraps the projection repository with authorization.
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md § Projection.
 */

import type { D1Database } from '@cloudflare/workers-types'
import type { CloudPrincipal } from '@mdt/domain-contracts'
import type { PublishProjectionRequest } from '../d1/projection'
import { CoordinationError } from '@mdt/domain-contracts'
import {
  getProjectionByTicket,
  pollProjections,
  publishProjection,
} from '../d1/projection'
import { requireActiveCoordination, requireProjectRole } from './authorization'
import {
  optionalText,
  parseProjectedHeader,
  requireNonNegativeSafeInteger,
  requirePositiveSafeInteger,
  requireSha256,
  requireText,
} from './validation'

export interface PublishBody {
  ticketNumber?: unknown
  reservationId?: unknown
  expectedProjectionVersion?: unknown
  operationId?: unknown
  contentHash?: unknown
  header?: unknown
  lifecycle?: unknown
}

export async function publish(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  body: PublishBody,
  requestId: string,
) {
  await requireProjectRole(db, principal, cloudProjectId, 'contributor', 'projection.publish', requestId)
  await requireActiveCoordination(db, principal, cloudProjectId, 'projection.publish', requestId)
  const ticketNumber = requirePositiveSafeInteger(body.ticketNumber, 'ticketNumber', requestId)
  // 0 is valid: it means the caller has never observed a cloud projection for
  // this ticket (a pre-cloud ticket from the local write journal). The D1
  // UPDATE then matches 0 rows and currentVersion===0 → projection_not_found.
  const expectedProjectionVersion = requireNonNegativeSafeInteger(
    body.expectedProjectionVersion,
    'expectedProjectionVersion',
    requestId,
  )
  const req: PublishProjectionRequest = {
    ticketNumber,
    // reservationId is the INSERT/reservation FK, but the versioned UPDATE in
    // publishProjection never binds it. The local write journal sends no GET
    // (conditional PUT), so it has no reservation to pass here — resolve empty
    // to ''. Clients that still carry a reservation (e.g. create-orchestrator)
    // are validated normally. No D1 semantics change.
    reservationId: optionalText(body.reservationId, 'reservationId', requestId, 200),
    expectedProjectionVersion,
    operationId: requireText(body.operationId, 'operationId', requestId, 200),
    contentHash: requireSha256(body.contentHash, 'contentHash', requestId),
    header: parseProjectedHeader(body.header, requestId),
    lifecycle: body.lifecycle === 'deleted' ? 'deleted' : 'active',
  }
  const result = await publishProjection(
    db,
    cloudProjectId,
    req,
    principal,
    new Date().toISOString(),
    requestId,
  )
  if (result.conflict) {
    // publishProjection's UPDATE affects 0 rows whether the projection is
    // missing OR the version is stale. It re-reads the current version to tell
    // them apart: projection_version starts at 1 on INSERT, so a `currentVersion`
    // of 0 means the row does not exist. Map that to projection_not_found so the
    // local write journal classifies it as `unmanaged` (terminal, no retry)
    // rather than a version conflict. A genuine version mismatch carries the
    // observed version as currentVersion.
    if (result.currentVersion === 0) {
      throw new CoordinationError('projection_not_found', { requestId })
    }
    throw new CoordinationError('projection_version_conflict', {
      requestId,
      currentVersion: result.currentVersion,
    })
  }
  return { projectionVersion: result.projectionVersion, projectRevision: result.projectRevision }
}

export async function getProjection(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  ticketNumber: number,
  requestId: string,
) {
  // Membership denial throws project_not_found (non-disclosing hidden project).
  await requireProjectRole(db, principal, cloudProjectId, 'viewer', 'projection.read', requestId)
  const projection = await getProjectionByTicket(db, cloudProjectId, ticketNumber)
  if (!projection) {
    // The project is visible and membership is valid, but this ticket has no
    // projection row — distinct from a hidden/unknown project. This read path
    // and the publish path (currentVersion === 0, above) both surface this as
    // projection_not_found so a GET-based import/recovery workflow and the local
    // write journal's conditional PUT both classify it as unmanaged.
    throw new CoordinationError('projection_not_found', { requestId })
  }
  return projection
}

export async function poll(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  after: number,
  limit: number,
  requestId: string,
) {
  // Polling is a read: viewer or above.
  await requireProjectRole(db, principal, cloudProjectId, 'viewer', 'projection.poll', requestId)
  return pollProjections(db, cloudProjectId, after, limit)
}
