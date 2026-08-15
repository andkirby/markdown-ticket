/**
 * Pure helpers for ProjectProjectionHub, extracted so they can be tested without
 * the `cloudflare:workers` runtime module (MDT-226).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Wire contract, § D1 cursor
 *         catch-up, § Worker routing, § Security and Revocation.
 *
 * MDT-226 incident recovery adds the control-plane/data-plane split helpers:
 * a digest-only stream grant registry, the one-decision session
 * authorization orchestration, upgrade-preserving Worker forwarding, and the
 * accurate stream route telemetry labels (C-10, C-14, C-15, Edge-8).
 */

import type {
  CatchupDelta,
  ClientAck,
  CoordinatorErrorCode,
  ProjectedHeader,
} from '@mdt/domain-contracts'
import type { ProjectionRecord } from '../d1/projection'

// ── Stream session grants (C-10, C-14, C-15) ────────────────────────────────

/** Grant lifetime ceiling: short-lived even when the credential lives longer. */
export const MAX_STREAM_GRANT_MS = 10 * 60_000
/** Cached session decisions are bounded derivatives of one D1 decision. */
export const MAX_STREAM_SESSION_DECISION_MS = 60 * 60_000
/** Bounded registries: FIFO eviction keeps DO storage small. */
export const MAX_STREAM_GRANTS = 256
export const MAX_STREAM_SESSION_DECISIONS = 256

/** The principal tag a grant is scoped to (no raw assertion or token). */
export interface StreamGrantPrincipal {
  principalKind: string
  principalId: string
}

/** Hub-side grant record. Stores the DIGEST only — never the opaque grant. */
export interface StoredStreamGrant {
  digest: string
  principalKind: string
  principalId: string
  activationId: string
  /** Epoch-ms after which the grant is invalid. */
  expiresAt: number
  /** Authorizing credential expiry, reused for post-hibernation reauthorization. */
  tokenExpiry: number
}

/** Hub-side cached session decision for one principal + activation. */
export interface StoredSessionDecision {
  principalKind: string
  principalId: string
  activationId: string
  outcome: 'allowed' | 'denied'
  /** Coordination error code for denials. */
  code?: CoordinatorErrorCode
  /** Epoch-ms after which the cached decision expires. */
  expiresAt: number
}

/** Serializable registry state for Durable Object storage. */
export interface StreamGrantRegistryState {
  grants: StoredStreamGrant[]
  decisions: StoredSessionDecision[]
}

export interface StreamGrantRegistryOptions {
  now?: () => number
  maxGrants?: number
  maxDecisions?: number
}

/** SHA-256 hex digest of an arbitrary string (Web Crypto; Bun + Workers). */
export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Generate a 32-byte random opaque grant, base64url-encoded. */
export function newOpaqueStreamGrant(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

function decisionKey(principal: StreamGrantPrincipal, activationId: string): string {
  return `${principal.principalKind}:${principal.principalId}:${activationId}`
}

function boundedExpiry(now: number, ceilingMs: number, tokenExpiry: number): number {
  const capped = now + ceilingMs
  return tokenExpiry > 0 ? Math.min(capped, tokenExpiry) : capped
}

/**
 * Digest-only registry of stream grants and bounded session decisions. The
 * Durable Object owns one instance persisted through DO storage; grants and
 * decisions are bounded derivatives of one D1 membership decision — never a
 * second membership authority (C-2, C-10, C-15).
 */
export class StreamGrantRegistry {
  private readonly now: () => number
  private readonly maxGrants: number
  private readonly maxDecisions: number
  private grants: StoredStreamGrant[] = []
  private decisions = new Map<string, StoredSessionDecision>()

  constructor(opts: StreamGrantRegistryOptions = {}) {
    this.now = opts.now ?? Date.now
    this.maxGrants = opts.maxGrants ?? MAX_STREAM_GRANTS
    this.maxDecisions = opts.maxDecisions ?? MAX_STREAM_SESSION_DECISIONS
  }

  /** Full serializable state (digests only) for DO storage persistence. */
  exportState(): StreamGrantRegistryState {
    return { grants: [...this.grants], decisions: [...this.decisions.values()] }
  }

  /** Restore state previously persisted through DO storage. */
  loadState(state: StreamGrantRegistryState): void {
    this.grants = Array.isArray(state.grants) ? [...state.grants] : []
    this.decisions = new Map(
      (Array.isArray(state.decisions) ? state.decisions : [])
        .map(d => [decisionKey(d, d.activationId), d] as const),
    )
  }

  /**
   * The cached session decision for this principal + activation, or null on a
   * miss (or after the cached decision expired).
   */
  async cachedDecision(
    principal: StreamGrantPrincipal,
    activationId: string,
  ): Promise<StoredSessionDecision | null> {
    const key = decisionKey(principal, activationId)
    const cached = this.decisions.get(key)
    if (!cached)
      return null
    if (cached.expiresAt <= this.now()) {
      this.decisions.delete(key)
      return null
    }
    return cached
  }

  /** Record the outcome of the ONE membership decision for this activation. */
  async recordDecision(
    principal: StreamGrantPrincipal,
    activationId: string,
    outcome: 'allowed' | 'denied',
    opts: { code?: CoordinatorErrorCode, tokenExpiry: number },
  ): Promise<StoredSessionDecision> {
    const record: StoredSessionDecision = {
      principalKind: principal.principalKind,
      principalId: principal.principalId,
      activationId,
      outcome,
      ...(outcome === 'denied' && opts.code ? { code: opts.code } : {}),
      expiresAt: boundedExpiry(this.now(), MAX_STREAM_SESSION_DECISION_MS, opts.tokenExpiry),
    }
    const key = decisionKey(principal, activationId)
    this.decisions.delete(key)
    this.decisions.set(key, record)
    while (this.decisions.size > this.maxDecisions)
      this.decisions.delete(this.decisions.keys().next().value as string)
    return record
  }

  /**
   * Issue a fresh opaque grant for an allowed activation. The raw grant is
   * returned ONCE to the Worker; only its digest is retained.
   */
  async issueGrant(
    principal: StreamGrantPrincipal,
    activationId: string,
    tokenExpiry: number,
  ): Promise<{ grant: string, digest: string, expiresAt: number }> {
    const grant = newOpaqueStreamGrant()
    const digest = await sha256Hex(grant)
    const record: StoredStreamGrant = {
      digest,
      principalKind: principal.principalKind,
      principalId: principal.principalId,
      activationId,
      expiresAt: boundedExpiry(this.now(), MAX_STREAM_GRANT_MS, tokenExpiry),
      tokenExpiry,
    }
    this.grants.push(record)
    while (this.grants.length > this.maxGrants)
      this.grants.shift()
    return { grant, digest, expiresAt: record.expiresAt }
  }

  /** Validate an opaque grant: returns its record, or null when invalid/expired. */
  async validateGrant(grant: string): Promise<StoredStreamGrant | null> {
    if (typeof grant !== 'string' || grant.length === 0)
      return null
    const digest = await sha256Hex(grant)
    const now = this.now()
    const record = this.grants.find(g => g.digest === digest)
    if (!record || record.expiresAt <= now)
      return null
    return record
  }

  /** Drop grants and cached decisions affected by a membership mutation (Edge-4). */
  revokeByPrincipal(principalId: string): { grants: number, decisions: number } {
    const grantsBefore = this.grants.length
    this.grants = this.grants.filter(g => g.principalId !== principalId)
    let revokedDecisions = 0
    for (const [key, d] of this.decisions) {
      if (d.principalId === principalId) {
        this.decisions.delete(key)
        revokedDecisions += 1
      }
    }
    return { grants: grantsBefore - this.grants.length, decisions: revokedDecisions }
  }
}

// ── Session authorization orchestration (C-14, C-15) ────────────────────────

/** The hub-side session RPC surface the orchestration needs. */
export interface StreamSessionHubPort {
  cachedSessionDecision: (
    principal: StreamGrantPrincipal,
    activationId: string,
  ) => Promise<StoredSessionDecision | null>
  recordSessionDecision: (
    principal: StreamGrantPrincipal,
    activationId: string,
    outcome: 'allowed' | 'denied',
    opts: { code?: CoordinatorErrorCode, tokenExpiry: number },
  ) => Promise<{ kind: 'granted', grant: string, expiresAt: number } | { kind: 'denied', code: CoordinatorErrorCode }>
}

/**
 * The ONLY path allowed to perform a D1 membership decision (and its single
 * denial audit) for a stream session.
 */
export interface StreamSessionMembershipPort {
  authorizeOnce: () => Promise<
    | { ok: true }
    | { ok: false, code: CoordinatorErrorCode, status: number }
  >
}

export interface AuthorizeStreamSessionDeps {
  hub: StreamSessionHubPort
  membership: StreamSessionMembershipPort
  principal: StreamGrantPrincipal
  activationId: string
  /** Client credential expiry epoch-ms; 0 when unknown. */
  tokenExpiry: number
}

export type AuthorizeStreamSessionResult
  = | { ok: true, grant: string, expiresAt: number }
    | { ok: false, code: CoordinatorErrorCode, status: number }

/**
 * One typed session authorization: ask the hub for a cached decision first; a
 * cached denial is returned with zero D1 statements and a cached allowance
 * issues a fresh grant with zero D1 statements. Only a cache miss performs the
 * single membership decision (+ one denial audit) and records the bounded
 * decision in the hub (C-15).
 */
export async function authorizeProjectionStreamSession(
  deps: AuthorizeStreamSessionDeps,
): Promise<AuthorizeStreamSessionResult> {
  const { hub, membership, principal, activationId, tokenExpiry } = deps

  const cached = await hub.cachedSessionDecision(principal, activationId)
  if (cached) {
    if (cached.outcome === 'denied') {
      const code = cached.code ?? 'forbidden'
      return { ok: false, code, status: coordinationStatus(code) }
    }
    const renewed = await hub.recordSessionDecision(principal, activationId, 'allowed', { tokenExpiry })
    if (renewed.kind === 'granted')
      return { ok: true, grant: renewed.grant, expiresAt: renewed.expiresAt }
    return { ok: false, code: renewed.code, status: coordinationStatus(renewed.code) }
  }

  const decision = await membership.authorizeOnce()
  if (!decision.ok) {
    await hub.recordSessionDecision(principal, activationId, 'denied', {
      code: decision.code,
      tokenExpiry,
    })
    return { ok: false, code: decision.code, status: decision.status }
  }

  const granted = await hub.recordSessionDecision(principal, activationId, 'allowed', { tokenExpiry })
  if (granted.kind === 'granted')
    return { ok: true, grant: granted.grant, expiresAt: granted.expiresAt }
  return { ok: false, code: granted.code, status: coordinationStatus(granted.code) }
}

/** Coordination error code → HTTP status for session denial envelopes. */
function coordinationStatus(code: CoordinatorErrorCode): number {
  switch (code) {
    case 'authentication_required': return 401
    case 'forbidden': return 403
    case 'project_not_found': return 404
    default: return 403
  }
}

// ── Worker→hub upgrade forwarding (Edge-8) ──────────────────────────────────

/**
 * Build the forwarded request headers for the data-plane upgrade: EVERY client
 * header survives — including `Upgrade: websocket` and the `Sec-WebSocket-*`
 * handshake — while the internal context headers are appended. Replacing the
 * header set here is exactly how the 2026-08-15 incident lost the upgrade
 * (Edge-8).
 */
export function buildHubForwardedHeaders(
  original: Headers,
  internal: Record<string, string>,
): Headers {
  const merged = new Headers()
  for (const [key, value] of original)
    merged.set(key, value)
  for (const [key, value] of Object.entries(internal))
    merged.set(key, value)
  return merged
}

/**
 * Accurate stream route telemetry. The session control plane and the WebSocket
 * data plane are distinct routes; a generic `project.probe` label hid the
 * failing loop during the incident (operations.md § Telemetry).
 */
export function projectionStreamRouteName(method: string, pathname: string): string | null {
  if (!pathname.startsWith('/v1/projects/'))
    return null
  if (pathname.endsWith('/projection-stream-sessions'))
    return method.toUpperCase() === 'POST' ? 'projection.stream.session' : null
  if (pathname.endsWith('/projection-stream'))
    return 'projection.stream'
  return null
}

// ── Envelope mapping (C-4, C-6) ─────────────────────────────────────────────

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
