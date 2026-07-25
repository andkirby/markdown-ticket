/**
 * Project provisioning use case (operator-only).
 *
 * Source: docs/architecture/cloud-sync/identity-and-access.md § New Cloud Project
 *
 * POST /v1/admin/projects creates a random cloud project UUID, the initial
 * counter, and the first owner membership in one D1 batch. There is no
 * anonymous bootstrap endpoint and no reusable bootstrap secret.
 */

import type { D1Database } from '@cloudflare/workers-types'
import { CoordinationError } from '@mdt/domain-contracts'
import { requirePositiveSafeInteger, requireText } from './validation'

export interface ProvisionRequest {
  projectCode?: string
  initialOwnerEmail?: string
  initialNextTicketNumber?: number
}

export interface ProvisionResult {
  projectId: string
}

export async function provisionProject(
  db: D1Database,
  body: ProvisionRequest | Record<string, unknown>,
  requestId: string,
): Promise<ProvisionResult> {
  const projectCode = requireText(body.projectCode, 'projectCode', requestId, 32)
  if (!/^[A-Z][A-Z0-9_-]*$/u.test(projectCode)) {
    throw new CoordinationError('invalid_request', { requestId, message: 'invalid projectCode' })
  }
  const initialOwnerEmail = requireText(body.initialOwnerEmail, 'initialOwnerEmail', requestId, 320)
  if (!initialOwnerEmail.includes('@')) {
    throw new CoordinationError('invalid_request', { requestId, message: 'invalid initialOwnerEmail' })
  }
  const initialNextTicketNumber = requirePositiveSafeInteger(
    body.initialNextTicketNumber,
    'initialNextTicketNumber',
    requestId,
  )
  const projectId = crypto.randomUUID()
  const ownerEmail = initialOwnerEmail.trim().toLowerCase()
  const now = new Date().toISOString()

  await db.batch([
    db.prepare(
      `INSERT INTO cloud_projects (id, project_code, coordination_state, next_ticket_number, projection_revision, created_at, updated_at)
       VALUES (?, ?, 'active', ?, 0, ?, ?)`,
    ).bind(projectId, projectCode, initialNextTicketNumber, now, now),
    db.prepare(
      `INSERT INTO memberships (cloud_project_id, principal_kind, principal_id, display_label, role, created_at, updated_at)
       VALUES (?, 'human', ?, ?, 'owner', ?, ?)`,
    ).bind(projectId, ownerEmail, ownerEmail, now, now),
    db.prepare(
      `INSERT INTO audit_events (id, cloud_project_id, request_id, principal_kind, principal_id, action, outcome, resource_type, resource_id, detail_json, occurred_at)
       VALUES (?, ?, ?, 'human', ?, 'project.provision', 'success', 'project', ?, ?, ?)`,
    ).bind(crypto.randomUUID(), projectId, requestId, ownerEmail, projectId, JSON.stringify({ project_code: projectCode, initial_next_ticket_number: initialNextTicketNumber }), now),
  ])

  return { projectId }
}
