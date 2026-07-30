/**
 * Project provisioning use case (operator-only).
 *
 * Source: docs/architecture/cloud-sync/identity-and-access.md § New Cloud Project,
 *         docs/CRs/MDT-201/architecture.md § Provisioning Idempotency (BR-1.7,
 *         Edge-8).
 *
 * POST /v1/admin/projects creates a random cloud project UUID, the initial
 * counter, and the first owner membership in one D1 batch. There is no
 * anonymous bootstrap endpoint and no reusable bootstrap secret.
 *
 * MDT-201 retry safety: the client journals an idempotency key BEFORE the
 * first request and sends it (plus a canonical request hash). D1 stores one
 * provisioning record keyed by the idempotency key. An identical retry returns
 * the SAME cloud project UUID; the same key with changed request content is
 * rejected with `idempotency_key_reused`. This protects retries of one
 * provisioning operation; it does not deduplicate unrelated enable operations.
 */

import type { D1Database } from '@cloudflare/workers-types'
import { CoordinationError } from '@mdt/domain-contracts'
import { requirePositiveSafeInteger, requireSha256, requireText } from './validation'

export interface ProvisionRequest {
  projectCode?: string
  initialOwnerEmail?: string
  initialNextTicketNumber?: number
  /**
   * Client-journaled idempotency key (MDT-201). Required: provisioning is
   * retry-idempotent only when the client supplies this key.
   */
  idempotencyKey?: string
  /** SHA-256 of the canonical request body; conflict-detection on key reuse. */
  requestHash?: string
}

export interface ProvisionResult {
  projectId: string
  /** True when this response is a replay of the original provisioning. */
  replayed: boolean
}

/**
 * Provision a cloud project with retry idempotency.
 *
 * Idempotency contract (BR-1.7, Edge-8):
 *   - identical idempotency key + identical request hash → same UUID, replayed.
 *   - identical idempotency key + different request hash → idempotency_key_reused.
 *   - new key → create project + owner + audit + idempotency record atomically.
 *
 * D1 does not support interactive transactions across `batch()`, so we read the
 * idempotency record first; the UNIQUE PRIMARY KEY on `idempotency_key_hash`
 * guarantees at most one row per key. A concurrent race that inserts between
 * our read and our insert surfaces as a UNIQUE violation, which we re-read to
 * resolve to the winning record.
 */
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
  const idempotencyKey = requireText(body.idempotencyKey, 'idempotencyKey', requestId, 256)
  const requestHash = requireSha256(body.requestHash, 'requestHash', requestId)

  // 1. Check for an existing idempotency record (retry of the same request).
  const existing = await db.prepare(
    `SELECT cloud_project_id, request_hash FROM project_provisioning_idempotency
     WHERE idempotency_key_hash = ?`,
  ).bind(await sha256(idempotencyKey)).first<{ cloud_project_id: string, request_hash: string } | null>()

  if (existing) {
    if (existing.request_hash === requestHash) {
      // Identical retry → return the original UUID, no duplicate project.
      return { projectId: existing.cloud_project_id, replayed: true }
    }
    // Same key, changed content → reject.
    throw new CoordinationError('idempotency_key_reused', {
      requestId,
      message: 'idempotency key reused with different request content',
    })
  }

  // 1b. Check for an existing project with the SAME project code.
  //
  // "enable provisions exactly once" (MDT-202 AC): one cloud project per code,
  // globally. The idempotency key protects retry of the identical request, but
  // a second enable with a different owner email (e.g. a plus-addressing alias)
  // produces a different key and would bypass it. This code-based check is the
  // authoritative server-side guard: a project with this code already exists,
  // so we replay its UUID instead of provisioning a duplicate.
  const existingByCode = await db.prepare(
    `SELECT id FROM cloud_projects WHERE project_code = ? ORDER BY created_at ASC LIMIT 1`,
  ).bind(projectCode).first<{ id: string } | null>()

  if (existingByCode) {
    // Link this idempotency key to the existing project so future retries of
    // THIS request also resolve to the same UUID.
    const now = new Date().toISOString()
    await db.prepare(
      `INSERT INTO project_provisioning_idempotency (idempotency_key_hash, request_hash, cloud_project_id, created_at)
       VALUES (?, ?, ?, ?)`,
    ).bind(await sha256(idempotencyKey), requestHash, existingByCode.id, now).run()
    return { projectId: existingByCode.id, replayed: true }
  }

  // 2. New key + new code → create project + owner + audit + idempotency record.
  const projectId = crypto.randomUUID()
  const ownerEmail = initialOwnerEmail.trim().toLowerCase()
  const now = new Date().toISOString()
  const keyHash = await sha256(idempotencyKey)

  try {
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
      db.prepare(
        `INSERT INTO project_provisioning_idempotency (idempotency_key_hash, request_hash, cloud_project_id, created_at)
         VALUES (?, ?, ?, ?)`,
      ).bind(keyHash, requestHash, projectId, now),
    ])
  }
  catch (err) {
    // A uniqueness race (another isolate won the insert between our read and
    // our batch) re-reads the winning record and reconciles to it. This keeps
    // a collision from surfacing as an opaque error to a legitimate retry.
    const code = (err as { message?: string })?.message ?? ''
    if (/UNIQUE|PRIMARY KEY|constraint/i.test(code)) {
      const winner = await db.prepare(
        `SELECT cloud_project_id, request_hash FROM project_provisioning_idempotency
         WHERE idempotency_key_hash = ?`,
      ).bind(keyHash).first<{ cloud_project_id: string, request_hash: string } | null>()
      if (winner) {
        if (winner.request_hash === requestHash) {
          return { projectId: winner.cloud_project_id, replayed: true }
        }
        throw new CoordinationError('idempotency_key_reused', {
          requestId,
          message: 'idempotency key reused with different request content',
        })
      }
    }
    throw err
  }

  return { projectId, replayed: false }
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}
