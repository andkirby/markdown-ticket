/**
 * Membership repository + authorization.
 *
 * Source: docs/architecture/cloud-sync/identity-and-access.md § Membership and Roles
 *
 * Membership is keyed by (cloud_project_id, principal_kind, principal_id).
 * Unknown projects and projects hidden from the caller both return the same
 * non-disclosing outcome (BR-2.4). A known member with insufficient role is
 * denied (BR-2.3). No authorization cache in the first slice (BR-2.5).
 */

import type { D1Database } from '@cloudflare/workers-types'
import type {
  CloudPrincipal,
  CloudPrincipalKind,
  ProjectMember,
  ProjectRole,
} from '@mdt/domain-contracts'
import { CoordinationError, ROLE_RANK } from '@mdt/domain-contracts'
import { recordAudit } from './audit'

export interface MembershipRow {
  cloudProjectId: string
  principalKind: 'human' | 'machine'
  principalId: string
  displayLabel: string
  role: ProjectRole
}

/**
 * Resolve a principal's membership in one project.
 *
 * Returns `{ found: false }` for BOTH unknown projects and projects the caller
 * has no membership in — the caller cannot distinguish them (tenant isolation).
 * Throws only on infrastructure failure.
 */
export async function resolveMembership(
  db: D1Database,
  cloudProjectId: string,
  principal: CloudPrincipal,
): Promise<{ found: false } | { found: true, membership: MembershipRow }> {
  const row = await db.prepare(
    `SELECT m.cloud_project_id, m.principal_kind, m.principal_id,
            m.display_label, m.role, p.id AS project_exists
     FROM cloud_projects p
     LEFT JOIN memberships m
       ON m.cloud_project_id = p.id
       AND m.principal_kind = ?
       AND m.principal_id = ?
     WHERE p.id = ?`,
  ).bind(principal.kind, principal.id, cloudProjectId).first<{ cloud_project_id: string | null, principal_kind: string, principal_id: string, display_label: string, role: ProjectRole, project_exists: string }>()

  if (!row || !row.cloud_project_id) {
    // Unknown project OR caller is not a member → identical non-disclosing result.
    return { found: false }
  }
  return {
    found: true,
    membership: {
      cloudProjectId: row.cloud_project_id,
      principalKind: row.principal_kind as 'human' | 'machine',
      principalId: row.principal_id,
      displayLabel: row.display_label,
      role: row.role,
    },
  }
}

/**
 * Check that the principal has at least the minimum role in the project.
 * Returns the resolved membership on success, or the denial reason on failure.
 */
export async function authorize(
  db: D1Database,
  cloudProjectId: string,
  principal: CloudPrincipal,
  minRole: ProjectRole,
): Promise<
  | { ok: true, membership: MembershipRow }
  | { ok: false, reason: 'not_found' | 'forbidden' }
> {
  const res = await resolveMembership(db, cloudProjectId, principal)
  if (!res.found) {
    return { ok: false, reason: 'not_found' }
  }
  if (ROLE_RANK[res.membership.role] < ROLE_RANK[minRole]) {
    return { ok: false, reason: 'forbidden' }
  }
  return { ok: true, membership: res.membership }
}

/** Count owners — used to protect the final owner (Edge-4). */
export async function countOwners(
  db: D1Database,
  cloudProjectId: string,
): Promise<number> {
  const row = await db.prepare(
    'SELECT COUNT(*) AS n FROM memberships WHERE cloud_project_id = ? AND role = ?',
  ).bind(cloudProjectId, 'owner').first<{ n: number }>()
  return row?.n ?? 0
}

export async function listMembers(
  db: D1Database,
  cloudProjectId: string,
): Promise<ProjectMember[]> {
  const rows = await db.prepare(
    `SELECT principal_kind, principal_id, display_label, role
     FROM memberships
     WHERE cloud_project_id = ?
     ORDER BY role DESC, principal_kind ASC, principal_id ASC`,
  ).bind(cloudProjectId).all<{
    principal_kind: CloudPrincipalKind
    principal_id: string
    display_label: string
    role: ProjectRole
  }>()
  return rows.results.map(row => ({
    kind: row.principal_kind,
    id: row.principal_id,
    displayLabel: row.display_label,
    role: row.role,
  }))
}

export async function upsertMember(
  db: D1Database,
  cloudProjectId: string,
  member: ProjectMember,
  actor: CloudPrincipal,
  requestId: string,
): Promise<ProjectMember> {
  const existing = await db.prepare(
    `SELECT role FROM memberships
     WHERE cloud_project_id = ? AND principal_kind = ? AND principal_id = ?`,
  ).bind(cloudProjectId, member.kind, member.id).first<{ role: ProjectRole }>()

  const now = new Date().toISOString()
  const result = await db.batch([
    db.prepare(
      `INSERT INTO memberships
         (cloud_project_id, principal_kind, principal_id, display_label, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (cloud_project_id, principal_kind, principal_id)
       DO UPDATE SET display_label = excluded.display_label, role = excluded.role, updated_at = excluded.updated_at
       WHERE memberships.role != 'owner'
          OR excluded.role = 'owner'
          OR (SELECT COUNT(*) FROM memberships
              WHERE cloud_project_id = excluded.cloud_project_id AND role = 'owner') > 1`,
    ).bind(cloudProjectId, member.kind, member.id, member.displayLabel, member.role, now, now),
    db.prepare(
      `INSERT INTO audit_events
         (id, cloud_project_id, request_id, principal_kind, principal_id, action, outcome,
          resource_type, resource_id, detail_json, occurred_at)
       SELECT ?, ?, ?, ?, ?, 'membership.upsert', 'success', 'membership', ?, ?, ?
       WHERE EXISTS (
         SELECT 1 FROM memberships
         WHERE cloud_project_id = ? AND principal_kind = ? AND principal_id = ?
           AND display_label = ? AND role = ?
       )`,
    ).bind(
      crypto.randomUUID(),
      cloudProjectId,
      requestId,
      actor.kind,
      actor.id,
      `${member.kind}:${member.id}`,
      JSON.stringify({ role: member.role }),
      now,
      cloudProjectId,
      member.kind,
      member.id,
      member.displayLabel,
      member.role,
    ),
  ])
  if ((result[0]?.meta.changes ?? 0) === 0) {
    if (existing?.role === 'owner' && member.role !== 'owner') {
      await recordAudit(db, {
        cloudProjectId,
        requestId,
        principal: actor,
        action: 'membership.upsert',
        outcome: 'denied',
        resourceType: 'membership',
        resourceId: `${member.kind}:${member.id}`,
        detail: { reason: 'last_owner_required' },
      })
      throw new CoordinationError('last_owner_required', { requestId })
    }
    throw new CoordinationError('coordination_unavailable', { requestId })
  }
  return member
}

export async function deleteMember(
  db: D1Database,
  cloudProjectId: string,
  kind: CloudPrincipalKind,
  principalId: string,
  actor: CloudPrincipal,
  requestId: string,
): Promise<boolean> {
  const existing = await db.prepare(
    `SELECT role FROM memberships
     WHERE cloud_project_id = ? AND principal_kind = ? AND principal_id = ?`,
  ).bind(cloudProjectId, kind, principalId).first<{ role: ProjectRole }>()
  if (!existing) {
    return false
  }
  const now = new Date().toISOString()
  const result = await db.batch([
    db.prepare(
      `DELETE FROM memberships
       WHERE cloud_project_id = ? AND principal_kind = ? AND principal_id = ?
         AND (
           role != 'owner'
           OR (SELECT COUNT(*) FROM memberships
               WHERE cloud_project_id = ? AND role = 'owner') > 1
         )`,
    ).bind(cloudProjectId, kind, principalId, cloudProjectId),
    db.prepare(
      `INSERT INTO audit_events
         (id, cloud_project_id, request_id, principal_kind, principal_id, action, outcome,
          resource_type, resource_id, detail_json, occurred_at)
       SELECT ?, ?, ?, ?, ?, 'membership.delete', 'success', 'membership', ?, '{}', ?
       WHERE NOT EXISTS (
         SELECT 1 FROM memberships
         WHERE cloud_project_id = ? AND principal_kind = ? AND principal_id = ?
       )`,
    ).bind(
      crypto.randomUUID(),
      cloudProjectId,
      requestId,
      actor.kind,
      actor.id,
      `${kind}:${principalId}`,
      now,
      cloudProjectId,
      kind,
      principalId,
    ),
  ])
  if ((result[0]?.meta.changes ?? 0) === 0) {
    if (existing.role === 'owner') {
      await recordAudit(db, {
        cloudProjectId,
        requestId,
        principal: actor,
        action: 'membership.delete',
        outcome: 'denied',
        resourceType: 'membership',
        resourceId: `${kind}:${principalId}`,
        detail: { reason: 'last_owner_required' },
      })
      throw new CoordinationError('last_owner_required', { requestId })
    }
    return false
  }
  return true
}

export async function setCoordinationState(
  db: D1Database,
  cloudProjectId: string,
  state: 'active' | 'suspended',
  actor: CloudPrincipal,
  requestId: string,
): Promise<void> {
  const now = new Date().toISOString()
  await db.batch([
    db.prepare(
      `UPDATE cloud_projects SET coordination_state = ?, updated_at = ? WHERE id = ?`,
    ).bind(state, now, cloudProjectId),
    db.prepare(
      `INSERT INTO audit_events
         (id, cloud_project_id, request_id, principal_kind, principal_id, action, outcome,
          resource_type, resource_id, detail_json, occurred_at)
       VALUES (?, ?, ?, ?, ?, 'project.coordination-state', 'success', 'project', ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      cloudProjectId,
      requestId,
      actor.kind,
      actor.id,
      cloudProjectId,
      JSON.stringify({ state }),
      now,
    ),
  ])
}
