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
  parseProjectedHeader,
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
  const expectedProjectionVersion = requirePositiveSafeInteger(
    body.expectedProjectionVersion,
    'expectedProjectionVersion',
    requestId,
  )
  const req: PublishProjectionRequest = {
    ticketNumber,
    reservationId: requireText(body.reservationId, 'reservationId', requestId, 200),
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
  await requireProjectRole(db, principal, cloudProjectId, 'viewer', 'projection.read', requestId)
  const projection = await getProjectionByTicket(db, cloudProjectId, ticketNumber)
  if (!projection) {
    throw new CoordinationError('project_not_found', { requestId })
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
