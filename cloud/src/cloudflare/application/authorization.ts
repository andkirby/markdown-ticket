import type { D1Database } from '@cloudflare/workers-types'
import type { CloudPrincipal, ProjectRole } from '@mdt/domain-contracts'
import { CoordinationError } from '@mdt/domain-contracts'
import { recordAudit } from '../d1/audit'
import { authorize } from '../d1/membership'
import { assertCoordinationActive } from '../d1/project'

export async function requireProjectRole(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  role: ProjectRole,
  action: string,
  requestId: string,
) {
  const result = await authorize(db, cloudProjectId, principal, role)
  if (result.ok)
    return result.membership

  await recordAudit(db, {
    cloudProjectId,
    requestId,
    principal,
    action,
    outcome: 'denied',
    resourceType: 'project',
    resourceId: cloudProjectId,
    detail: { reason: result.reason },
  })
  throw new CoordinationError(
    result.reason === 'forbidden' ? 'forbidden' : 'project_not_found',
    { requestId },
  )
}

export async function requireActiveCoordination(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  action: string,
  requestId: string,
): Promise<void> {
  try {
    await assertCoordinationActive(db, cloudProjectId, requestId)
  }
  catch (error) {
    if (error instanceof CoordinationError) {
      await recordAudit(db, {
        cloudProjectId,
        requestId,
        principal,
        action,
        outcome: 'denied',
        resourceType: 'project',
        resourceId: cloudProjectId,
        detail: { reason: error.code },
      })
    }
    throw error
  }
}
