/**
 * Projection stream envelopes for the MDT-226 event-driven delivery contract.
 *
 * Source: docs/CRs/MDT-226/architecture.md § Wire contract,
 *         docs/CRs/MDT-226/requirements.md C-4, C-6, C-11.
 *
 * The versioned stream envelope is a discriminated union shared between the
 * cloud `ProjectProjectionHub` (server→client) and the local stream client
 * (client→server). It carries approved projection headers and delivery metadata
 * only — never ticket bodies, Cloudflare Access assertions, service tokens,
 * filesystem paths, or raw principal identifiers (C-4).
 */

import type { ProjectedHeader } from './projection'

/**
 * The stream-session control-plane protocol version. The typed session
 * response carries it so a local client can detect a deployed protocol or
 * version mismatch and pause as incompatible instead of retrying (C-14).
 */
export const PROJECTION_STREAM_PROTOCOL_VERSION = 2

/**
 * Typed outcome of one stream-session authorization request (MDT-226 incident
 * recovery). `granted` carries the opaque server-only grant; every failure
 * carries a stable non-secret reason code. The kinds mirror the manager's
 * durable pause classification: authentication/authorization outcomes pause
 * durably, incompatibility pauses durably, and transient failures fall inside
 * the bounded reconnect budget (C-14, C-15).
 */
export const PROJECTION_STREAM_SESSION_OUTCOMES = [
  'granted',
  'authentication_required',
  'authorization_required',
  'incompatible',
  'transient_failure',
] as const

export type ProjectionStreamSessionOutcomeKind
  = (typeof PROJECTION_STREAM_SESSION_OUTCOMES)[number]

/** A short-lived stream grant plus its effective expiry (epoch-ms). */
export interface ProjectionStreamSessionGrant {
  kind: 'granted'
  /**
   * Opaque server-only capability. Held in local process memory only — never
   * persisted, logged, or exposed to the browser (C-3, C-10).
   */
  grant: string
  /**
   * Epoch-ms after which the grant must not be reused. Bounded by the issuing
   * Access credential expiry (C-10).
   */
  grantExpiresAt: number
}

/** Stable non-secret reason codes for session authorization failures. */
export const ProjectionStreamSessionReason = {
  AUTHENTICATION_REQUIRED: 'authentication_required',
  FORBIDDEN: 'forbidden',
  PROJECT_NOT_FOUND: 'project_not_found',
  INCOMPATIBLE_PROTOCOL: 'incompatible_protocol',
  ROUTE_NOT_FOUND: 'route_not_found',
  RATE_LIMITED: 'rate_limited',
  COORDINATION_UNAVAILABLE: 'coordination_unavailable',
  NETWORK_ERROR: 'network_error',
} as const

export type ProjectionStreamSessionReasonCode
  = (typeof ProjectionStreamSessionReason)[keyof typeof ProjectionStreamSessionReason]

export interface ProjectionStreamSessionFailure {
  kind: Exclude<ProjectionStreamSessionOutcomeKind, 'granted'>
  reasonCode: ProjectionStreamSessionReasonCode
}

export type ProjectionStreamSessionResult
  = | ProjectionStreamSessionGrant
    | ProjectionStreamSessionFailure

/**
 * Server-to-client envelope kinds.
 *
 * - `catchup`: complete projection delta emitted before `ready`;
 * - `delta`: complete committed projection delta for live delivery;
 * - `ready`: current committed project revision after catch-up;
 * - `stale`: typed server-side indication that delivery cannot currently proceed;
 * - `error`: stable non-secret error code and retry disposition.
 */
export const PROJECTION_STREAM_ENVELOPES = [
  'catchup',
  'delta',
  'ready',
  'stale',
  'error',
] as const

export type ProjectionStreamEnvelopeKind
  = (typeof PROJECTION_STREAM_ENVELOPES)[number]

/** Projection lifecycle tag carried by catch-up/live deltas. */
export const ProjectionStreamLifecycle = {
  ACTIVE: 'active',
  DELETED: 'deleted',
} as const

export type ProjectionStreamLifecycleValue
  = (typeof ProjectionStreamLifecycle)[keyof typeof ProjectionStreamLifecycle]

/** Common metadata present on every data envelope (C-4). */
interface EnvelopeMetadata {
  cloudProjectId: string
  projectRevision: number
}

/**
 * A complete projection delta. It is not a field patch and contains no ticket
 * body. Used by both `catchup` (before `ready`) and `delta` (live) deliveries.
 */
export interface ProjectionDelta extends EnvelopeMetadata {
  ticketNumber: number
  projectionVersion: number
  lifecycle: ProjectionStreamLifecycleValue
  header: ProjectedHeader
}

export type CatchupDelta = ProjectionDelta & { kind: 'catchup' }
export type LiveDelta = ProjectionDelta & { kind: 'delta' }

/** Any envelope that carries a complete projection header. */
export type AnyProjectionDelta = CatchupDelta | LiveDelta

/** Signals catch-up completion; carries only the high-water revision. */
export interface ReadySignal extends EnvelopeMetadata {
  kind: 'ready'
}

/** Typed server-side stale signal; carries a non-secret reason only. */
export interface StaleSignal {
  kind: 'stale'
  cloudProjectId: string
  reason: string
}

/** Stable non-secret error code and retry disposition. */
export interface StreamError {
  kind: 'error'
  cloudProjectId: string
  code: string
  retry: 'reconnect' | 'none'
}

export type StreamEnvelope
  = | CatchupDelta
    | LiveDelta
    | ReadySignal
    | StaleSignal
    | StreamError

/** The single client-to-server envelope kind. */
export const CLIENT_ENVELOPES = ['ack'] as const

export type ClientEnvelopeKind = (typeof CLIENT_ENVELOPES)[number]

/**
 * Client acknowledgement. Carries the highest revision the local read model has
 * applied AND persisted. Sent for a completed catch-up `ready` cursor or a live
 * delta, never merely because bytes were received (C-6).
 */
export interface ClientAck {
  kind: 'ack'
  cloudProjectId: string
  projectRevision: number
}

export type ClientEnvelope = ClientAck

/** Type guard: narrows an unknown value to a validated server envelope. */
export function isStreamEnvelope(value: unknown): value is StreamEnvelope {
  if (typeof value !== 'object' || value === null)
    return false
  const v = value as Record<string, unknown>
  if (typeof v.kind !== 'string')
    return false
  switch (v.kind) {
    case 'catchup':
    case 'delta':
      return isProjectionDelta(value)
    case 'ready':
      return typeof v.cloudProjectId === 'string'
        && typeof v.projectRevision === 'number'
        && !('body' in v)
    case 'stale':
      return typeof v.cloudProjectId === 'string' && typeof v.reason === 'string'
    case 'error':
      return typeof v.cloudProjectId === 'string'
        && typeof v.code === 'string'
        && (v.retry === 'reconnect' || v.retry === 'none')
    default:
      return false
  }
}

/** Disallowed field names that must never appear on a stream envelope. */
const FORBIDDEN_ENVELOPE_FIELDS = new Set([
  'body',
  'content',
  'cfAccessToken',
  'serviceToken',
  'cfAccessJwtAssertion',
  'cookie',
  'authorization',
  'principal',
  'filesystemPath',
])

/**
 * Recursively reject any forbidden field nested at any depth (C-4). The approved
 * header surface is the most likely smuggling vector, so nested objects are
 * scanned too — not just top-level keys.
 */
function containsForbiddenField(value: unknown): boolean {
  if (typeof value !== 'object' || value === null)
    return false
  const obj = value as Record<string, unknown>
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_ENVELOPE_FIELDS.has(key))
      return true
    if (containsForbiddenField(obj[key]))
      return true
  }
  return false
}

/** Validates a projection delta payload, enforcing header-only redaction (C-4). */
function isValidDeltaPayload(v: Record<string, unknown>): boolean {
  if (containsForbiddenField(v))
    return false
  return typeof v.cloudProjectId === 'string'
    && typeof v.projectRevision === 'number'
    && typeof v.ticketNumber === 'number'
    && typeof v.projectionVersion === 'number'
    && (v.lifecycle === 'active' || v.lifecycle === 'deleted')
    && typeof v.header === 'object' && v.header !== null
}

/** Type guard: narrows to a catch-up or live projection delta. */
export function isProjectionDelta(value: unknown): value is AnyProjectionDelta {
  if (typeof value !== 'object' || value === null)
    return false
  const v = value as Record<string, unknown>
  if (v.kind !== 'catchup' && v.kind !== 'delta')
    return false
  return isValidDeltaPayload(v)
}

export type ParseResult
  = | { ok: true, value: StreamEnvelope }
    | { ok: false }

/**
 * Parses and validates a JSON string into a server envelope. Rejects malformed
 * JSON, unknown kinds, and any envelope (or nested header) carrying a forbidden
 * field. Never throws.
 */
export function parseStreamEnvelope(raw: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return { ok: false }
  }
  if (typeof parsed !== 'object' || parsed === null)
    return { ok: false }
  const v = parsed as Record<string, unknown>
  // Reject any forbidden field at any depth first (C-4, C-11).
  if (containsForbiddenField(v))
    return { ok: false }
  switch (v.kind) {
    case 'catchup':
    case 'delta':
      return isValidDeltaPayload(v)
        ? { ok: true, value: v as unknown as StreamEnvelope }
        : { ok: false }
    case 'ready':
      return typeof v.cloudProjectId === 'string' && typeof v.projectRevision === 'number'
        ? { ok: true, value: v as unknown as StreamEnvelope }
        : { ok: false }
    case 'stale':
      return typeof v.cloudProjectId === 'string' && typeof v.reason === 'string'
        ? { ok: true, value: v as unknown as StreamEnvelope }
        : { ok: false }
    case 'error':
      return typeof v.cloudProjectId === 'string'
        && typeof v.code === 'string'
        && (v.retry === 'reconnect' || v.retry === 'none')
        ? { ok: true, value: v as unknown as StreamEnvelope }
        : { ok: false }
    default:
      return { ok: false }
  }
}
