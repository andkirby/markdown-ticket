/**
 * Pure helpers for ProjectProjectionHub, extracted so they can be tested without
 * the `cloudflare:workers` runtime module (MDT-226).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Wire contract, § D1 cursor catch-up.
 */

import type {
  CatchupDelta,
  ClientAck,
  ProjectedHeader,
} from '@mdt/domain-contracts'
import type { ProjectionRecord } from '../d1/projection'

/** Type guard: a client-to-server ack envelope (C-6). */
export function isProjectionStreamClientAck(value: unknown): value is ClientAck {
  if (typeof value !== 'object' || value === null)
    return false
  const v = value as Record<string, unknown>
  return v.kind === 'ack'
    && typeof v.cloudProjectId === 'string'
    && typeof v.projectRevision === 'number'
}

/**
 * Map a D1 projection record to a catch-up delta envelope. Carries the approved
 * header + delivery metadata only — never a body, reservation id, operation id,
 * content hash, or principal (C-4).
 */
export function recordToCatchup(cloudProjectId: string, record: ProjectionRecord): CatchupDelta {
  const header: ProjectedHeader = {
    code: record.code,
    title: record.title,
    status: record.status,
    type: record.type,
    priority: record.priority,
    assignee: record.assignee,
    date_created: record.date_created,
    last_modified: record.last_modified,
  }
  return {
    kind: 'catchup',
    cloudProjectId,
    projectRevision: record.projectRevision,
    ticketNumber: record.ticketNumber,
    projectionVersion: record.projectionVersion,
    lifecycle: record.lifecycle === 'deleted' ? 'deleted' : 'active',
    header,
  }
}
