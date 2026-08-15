/**
 * CloudProjectionSessionClient — the typed HTTPS control-plane client for
 * projection stream sessions (MDT-226 incident recovery).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream-session client,
 *         § Wire contract.
 *
 * Owns exactly ONE typed authorization call per `authorize()`: it validates
 * the origin allowlist before attaching the credential, POSTs the stable
 * non-secret activation fingerprint, and normalizes the Access/Worker outcome
 * into the typed session result (`granted`, `authentication_required`,
 * `authorization_required`, `incompatible`, or `transient_failure`).
 *
 * It performs NO retries and owns no reconnect policy — the stream manager
 * decides what happens after an outcome (C-14, C-15). A successful grant is
 * held in memory only and reused by transport reconnects until its effective
 * expiry, which is bounded by the underlying Access credential expiry (C-10).
 */

import type {
  CoordinationErrorEnvelope,
  GlobalCloudSyncConfig,
  ProjectionStreamSessionFailure,
  ProjectionStreamSessionReasonCode,
  ProjectionStreamSessionResult,
} from '@mdt/domain-contracts'
import { COORDINATION_ROUTE_PREFIX, PROJECTION_STREAM_PROTOCOL_VERSION } from '@mdt/domain-contracts'
import { checkOriginAllowlist } from './config.js'

/** The shape of fetch we accept (Web fetch; injected for tests). */
export type SessionFetchImpl = (url: string, init?: RequestInit) => Promise<Response>

/** Authorization value for one session request (headers + expiry travel together). */
export interface SessionAuthorization {
  /** Resolved Access credential headers (human token or service token). */
  headers: Record<string, string>
  /** Credential expiry epoch-ms; 0 when unknown. Bounds the grant lifetime. */
  tokenExpiry: number
  /**
   * Stable non-secret activation fingerprint. An unchanged fingerprint may not
   * re-arm a terminal failure (C-15).
   */
  activationId: string
}

export interface CloudProjectionSessionClientOptions {
  /** Absolute HTTPS origin from validated project config (C6). */
  serviceUrl: string
  /** Operator-controlled global allowlist. Default empty denies every origin. */
  globalConfig: GlobalCloudSyncConfig
  /**
   * Injected for tests. Defaults to `globalThis.fetch` bound to globalThis:
   * storing the bare global loses `this` and throws "Illegal invocation" in
   * the Workers runtime.
   */
  fetchImpl?: SessionFetchImpl
  /** Injectable clock; defaults to Date.now. */
  now?: () => number
}

/** A grant held in process memory for transport reconnects. */
export interface HeldSessionGrant {
  grant: string
  expiresAt: number
}

export class CloudProjectionSessionClient {
  private readonly serviceUrl: string
  private readonly globalConfig: GlobalCloudSyncConfig
  private readonly fetchImpl: SessionFetchImpl
  private readonly now: () => number
  private readonly cloudProjectId: string
  private held?: HeldSessionGrant

  constructor(opts: CloudProjectionSessionClientOptions, cloudProjectId: string) {
    this.serviceUrl = opts.serviceUrl
    this.globalConfig = opts.globalConfig
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis)
    this.now = opts.now ?? Date.now
    this.cloudProjectId = cloudProjectId
  }

  /**
   * Perform exactly one typed session authorization request. The outcome is
   * returned to the caller; this client never retries and never schedules
   * anything (C-14, C-15).
   */
  async authorize(auth: SessionAuthorization): Promise<ProjectionStreamSessionResult> {
    this.requireAllowlisted()

    const url = `${this.serviceUrl.replace(/\/$/, '')}${COORDINATION_ROUTE_PREFIX}`
      + `/${encodeURIComponent(this.cloudProjectId)}/projection-stream-sessions`
    let res: Response
    try {
      res = await this.fetchImpl(url, {
        method: 'POST',
        redirect: 'error',
        headers: { ...auth.headers, 'content-type': 'application/json' },
        body: JSON.stringify({
          activationId: auth.activationId,
          tokenExpiry: auth.tokenExpiry,
        }),
      })
    }
    catch {
      // Network/redirect failures are transient — the manager's bounded
      // budget owns any retry, never this client.
      return failure('transient_failure', 'network_error')
    }

    if (res.status === 426) {
      return failure('incompatible', 'incompatible_protocol')
    }

    // The session route answers 201 Created (both for a fresh decision and a
    // cached-decision grant renewal); 200 is accepted for symmetric clients.
    if (res.status !== 200 && res.status !== 201) {
      return this.classifyError(res.status, await readEnvelope(res))
    }

    let body: { data?: Record<string, unknown> }
    try {
      body = (await res.json()) as { data?: Record<string, unknown> }
    }
    catch {
      return failure('transient_failure', 'coordination_unavailable')
    }
    const data = body.data
    const grant = typeof data?.grant === 'string' ? data.grant : ''
    const serverExpiresAt = typeof data?.grantExpiresAt === 'number' ? data.grantExpiresAt : 0
    const streamProtocol = typeof data?.streamProtocol === 'number' ? data.streamProtocol : 0
    if (!grant || !Number.isSafeInteger(serverExpiresAt) || serverExpiresAt <= 0) {
      return failure('transient_failure', 'coordination_unavailable')
    }
    if (streamProtocol !== PROJECTION_STREAM_PROTOCOL_VERSION) {
      // Deployed protocol/version mismatch: pause durably, never retry (C-14).
      return failure('incompatible', 'incompatible_protocol')
    }

    // The grant may outlive nothing: its effective expiry is bounded by the
    // Access credential that authorized it (C-10).
    const expiresAt = auth.tokenExpiry > 0
      ? Math.min(serverExpiresAt, auth.tokenExpiry)
      : serverExpiresAt
    this.held = { grant, expiresAt }
    return { kind: 'granted', grant, grantExpiresAt: expiresAt }
  }

  /** The in-memory grant for transport reconnects; null when none is held. */
  get currentGrant(): HeldSessionGrant | null {
    return this.held ?? null
  }

  /** Whether the held grant is still usable for a reconnect at `now`. */
  hasValidGrant(): boolean {
    return this.held !== undefined && this.now() < this.held.expiresAt
  }

  /** Drop the held grant (e.g. after revocation or transport terminal state). */
  clearGrant(): void {
    this.held = undefined
  }

  /**
   * Enforce the origin allowlist BEFORE the credential is attached. Throws a
   * CoordinatorError-shaped TypeError and never reaches the wire.
   */
  private requireAllowlisted(): void {
    const result = checkOriginAllowlist(this.serviceUrl, this.globalConfig)
    if (!result.allowed) {
      throw new Error(
        `cloud serviceUrl is not on the operator allowlist (${result.reason})`,
      )
    }
  }

  /** Map a non-200 response to the durable/transient outcome classification. */
  private classifyError(
    status: number,
    envelope: Partial<CoordinationErrorEnvelope> | undefined,
  ): ProjectionStreamSessionResult {
    const code = envelope?.error?.code
    if (status === 401) {
      return failure('authentication_required', 'authentication_required')
    }
    if (status === 403) {
      return failure('authorization_required', 'forbidden')
    }
    if (status === 404) {
      // Hidden/unknown project pauses as authorization; a missing route means
      // the deployment predates the session endpoint and is incompatible.
      return code === 'invalid_request'
        ? failure('incompatible', 'route_not_found')
        : failure('authorization_required', 'project_not_found')
    }
    if (status === 429) {
      return failure('transient_failure', 'rate_limited')
    }
    return failure('transient_failure', 'coordination_unavailable')
  }
}

async function readEnvelope(res: Response): Promise<Partial<CoordinationErrorEnvelope> | undefined> {
  try {
    return (await res.json()) as Partial<CoordinationErrorEnvelope>
  }
  catch {
    return undefined
  }
}

function failure(
  kind: ProjectionStreamSessionFailure['kind'],
  reasonCode: ProjectionStreamSessionReasonCode,
): ProjectionStreamSessionFailure {
  return { kind, reasonCode }
}
