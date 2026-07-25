import type { D1Database } from '@cloudflare/workers-types'
import { CoordinationError } from '@mdt/domain-contracts'

export interface CloudProjectRow {
  id: string
  projectCode: string
  coordinationState: 'active' | 'suspended'
  nextTicketNumber: number
  projectionRevision: number
}

export async function getCloudProject(
  db: D1Database,
  cloudProjectId: string,
): Promise<CloudProjectRow | null> {
  const row = await db.prepare(
    `SELECT id, project_code, coordination_state, next_ticket_number, projection_revision
     FROM cloud_projects WHERE id = ?`,
  ).bind(cloudProjectId).first<{
    id: string
    project_code: string
    coordination_state: 'active' | 'suspended'
    next_ticket_number: number
    projection_revision: number
  }>()

  return row
    ? {
        id: row.id,
        projectCode: row.project_code,
        coordinationState: row.coordination_state,
        nextTicketNumber: row.next_ticket_number,
        projectionRevision: row.projection_revision,
      }
    : null
}

/** Mutations fail while an owner has suspended cloud coordination. */
export async function assertCoordinationActive(
  db: D1Database,
  cloudProjectId: string,
  requestId: string,
): Promise<CloudProjectRow> {
  const project = await getCloudProject(db, cloudProjectId)
  if (!project) {
    throw new CoordinationError('project_not_found', { requestId })
  }
  if (project.coordinationState !== 'active') {
    throw new CoordinationError('coordination_suspended', { requestId })
  }
  return project
}
