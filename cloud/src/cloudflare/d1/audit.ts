import type { D1Database } from '@cloudflare/workers-types'
import type { CloudPrincipal } from '@mdt/domain-contracts'

export interface AuditEvent {
  cloudProjectId: string | null
  requestId: string
  principal: CloudPrincipal
  action: string
  outcome: string
  resourceType: string
  resourceId?: string | null
  detail?: Record<string, string | number | boolean | null>
  occurredAt?: string
}

/** Write one redacted structured event. Callers never pass credentials. */
export async function recordAudit(db: D1Database, event: AuditEvent): Promise<void> {
  await db.prepare(
    `INSERT INTO audit_events
       (id, cloud_project_id, request_id, principal_kind, principal_id, action,
        outcome, resource_type, resource_id, detail_json, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    crypto.randomUUID(),
    event.cloudProjectId,
    event.requestId,
    event.principal.kind,
    event.principal.id,
    event.action,
    event.outcome,
    event.resourceType,
    event.resourceId ?? null,
    JSON.stringify(event.detail ?? {}),
    event.occurredAt ?? new Date().toISOString(),
  ).run()
}
