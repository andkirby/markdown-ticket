import type { D1Database } from '@cloudflare/workers-types'
import type {
  CloudPrincipal,
  CloudPrincipalKind,
  CoordinationStateRequest,
  ProjectBindingProbe,
  ProjectMember,
  ProjectRole,
  UpsertProjectMemberRequest,
} from '@mdt/domain-contracts'
import { CoordinationError } from '@mdt/domain-contracts'
import {
  deleteMember,
  listMembers,
  setCoordinationState,
  upsertMember,
} from '../d1/membership'
import { getCloudProject } from '../d1/project'
import { requireProjectRole } from './authorization'

const ROLES: ReadonlySet<string> = new Set(['viewer', 'contributor', 'owner'])
const KINDS: ReadonlySet<string> = new Set(['human', 'machine'])

export async function probeProject(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  requestId: string,
): Promise<ProjectBindingProbe> {
  const membership = await requireProjectRole(db, principal, cloudProjectId, 'viewer', 'project.probe', requestId)
  const project = await getCloudProject(db, cloudProjectId)
  if (!project) {
    throw new CoordinationError('project_not_found', { requestId })
  }
  return {
    projectId: project.id,
    projectCode: project.projectCode,
    coordinationState: project.coordinationState,
    role: membership.role,
  }
}

export async function getMembers(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  requestId: string,
): Promise<{ items: ProjectMember[] }> {
  await requireProjectRole(db, principal, cloudProjectId, 'owner', 'membership.list', requestId)
  return { items: await listMembers(db, cloudProjectId) }
}

export async function putMember(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  kindInput: string,
  principalIdInput: string,
  body: Partial<UpsertProjectMemberRequest> | Record<string, unknown>,
  requestId: string,
): Promise<ProjectMember> {
  await requireProjectRole(db, principal, cloudProjectId, 'owner', 'membership.upsert', requestId)
  const kind = parseKind(kindInput, requestId)
  const role = parseRole(body.role, requestId)
  const id = normalizePrincipalId(kind, principalIdInput, requestId)
  const displayLabel = typeof body.displayLabel === 'string' ? body.displayLabel.trim() : ''
  if (!displayLabel || displayLabel.length > 200) {
    throw new CoordinationError('invalid_request', { requestId, message: 'invalid displayLabel' })
  }
  return upsertMember(
    db,
    cloudProjectId,
    { kind, id, displayLabel, role },
    principal,
    requestId,
  )
}

export async function removeMember(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  kindInput: string,
  principalIdInput: string,
  requestId: string,
): Promise<void> {
  await requireProjectRole(db, principal, cloudProjectId, 'owner', 'membership.delete', requestId)
  const kind = parseKind(kindInput, requestId)
  const id = normalizePrincipalId(kind, principalIdInput, requestId)
  const removed = await deleteMember(db, cloudProjectId, kind, id, principal, requestId)
  if (!removed) {
    throw new CoordinationError('project_not_found', { requestId })
  }
}

export async function updateCoordinationState(
  db: D1Database,
  principal: CloudPrincipal,
  cloudProjectId: string,
  body: Partial<CoordinationStateRequest> | Record<string, unknown>,
  requestId: string,
): Promise<{ state: 'active' | 'suspended' }> {
  await requireProjectRole(db, principal, cloudProjectId, 'owner', 'project.coordination-state', requestId)
  if (body.state !== 'active' && body.state !== 'suspended') {
    throw new CoordinationError('invalid_request', { requestId, message: 'invalid coordination state' })
  }
  await setCoordinationState(db, cloudProjectId, body.state, principal, requestId)
  return { state: body.state }
}

function parseKind(value: string, requestId: string): CloudPrincipalKind {
  if (!KINDS.has(value)) {
    throw new CoordinationError('invalid_request', { requestId, message: 'invalid principal kind' })
  }
  return value as CloudPrincipalKind
}

function parseRole(value: unknown, requestId: string): ProjectRole {
  if (typeof value !== 'string' || !ROLES.has(value)) {
    throw new CoordinationError('invalid_request', { requestId, message: 'invalid role' })
  }
  return value as ProjectRole
}

function normalizePrincipalId(
  kind: CloudPrincipalKind,
  value: string,
  requestId: string,
): string {
  const decoded = decodeURIComponent(value).trim()
  const id = kind === 'human' ? decoded.toLowerCase() : decoded
  if (!id || id.length > 320 || (kind === 'human' && !id.includes('@'))) {
    throw new CoordinationError('invalid_request', { requestId, message: 'invalid principal id' })
  }
  return id
}
