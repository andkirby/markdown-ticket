/**
 * CloudSyncCoordinator — the local HTTP client for cloud coordination.
 *
 * Source: docs/architecture/cloud-sync/README.md § Local Integration Contract,
 *         docs/architecture/cloud-sync/identity-and-access.md § Client Credential Flows,
 *         docs/architecture/cloud-sync/data-and-consistency.md § Error Envelope.
 *
 * Concrete implementation of the `CloudSyncCoordinator` port from
 * @mdt/domain-contracts. Uses `globalThis.fetch` exclusively (no Node http
 * module) so it can run in Workers-adjacent runtimes too.
 *
 * Security invariants enforced here (architecture: identity-and-access.md):
 *   - The origin is checked against the operator allowlist BEFORE the credential
 *     is attached. An off-allowlist destination throws and never reaches the
 *     wire (C6).
 *   - `redirect: 'error'` on every credential-bearing request — redirects are
 *     rejected so a credential is never silently followed to another origin.
 *   - The human token is attached as the `cf-access-token` header and is never
 *     logged, persisted, or sent to an untrusted origin.
 *   - The Worker's `{error, message, requestId}` envelope is mapped to the
 *     matching `CoordinatorError` code; network/unknown failures map to
 *     `coordination_unavailable` (recoverable; never a local fallback — BR-1.5).
 *
 * Worker endpoints (see cloud/src/cloudflare/worker.ts):
 *   POST /v1/projects/{id}/reservations                       → 200|201 reservation
 *   POST /v1/projects/{id}/reservations/{rid}/acknowledge     → 200 acknowledged
 */

import type {
  AcknowledgeReservationRequest,
  AcknowledgeReservationResponse,
  CloudCredential,
  CoordinationErrorEnvelope,
  CoordinatorErrorCode,
  GlobalCloudSyncConfig,
  CloudSyncCoordinator as ICloudSyncCoordinator,
  ReservationDTO,
  ReserveRequest,
} from '@mdt/domain-contracts'
import { COORDINATION_ROUTE_PREFIX, CoordinatorError } from '@mdt/domain-contracts'
import { checkOriginAllowlist } from './config.js'

/** The shape of fetch we accept (Web fetch; injected for tests). */
export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>

export interface CloudSyncCoordinatorOptions {
  /** Absolute HTTPS origin from validated project config (C6). */
  serviceUrl: string
  /** Operator-controlled global allowlist. Default empty denies every origin. */
  globalConfig: GlobalCloudSyncConfig
  /**
   * Injected for tests. Defaults to `globalThis.fetch` bound to globalThis:
   * storing the bare global detached loses `this` and throws "Illegal
   * invocation" in the Workers runtime (Slice-1 bug).
   */
  fetchImpl?: FetchImpl
}

/**
 * Maps an HTTP status (or envelope code) to a `CoordinatorErrorCode`.
 *
 * The Worker returns one of these stable codes per status; edge/Access failures
 * and unrecognized bodies collapse to `coordination_unavailable` (recoverable)
 * or `authentication_required` (401). Neither triggers a local fallback (BR-1.5).
 */
function statusToCode(status: number): CoordinatorErrorCode {
  switch (status) {
    case 401: return 'authentication_required'
    case 403: return 'forbidden'
    case 404: return 'project_not_found'
    case 409: return 'idempotency_key_reused'
    case 423: return 'coordination_suspended'
    case 429: return 'rate_limited'
    case 503: return 'coordination_unavailable'
    default:
      // 5xx and anything unrecognized -> recoverable unavailable.
      if (status >= 500)
        return 'coordination_unavailable'
      // Other 4xx with no recognized envelope -> treat as authentication/forbidden.
      return status === 403 ? 'forbidden' : 'authentication_required'
  }
}

/**
 * The Worker's error envelope carries a stable `error` code. If that code is one
 * we know, prefer it over the status-derived code (e.g. a 409 could be a state
 * conflict, which we surface as the reused-key code per the local contract).
 */
function envelopeToCode(status: number, envelope?: Partial<CoordinationErrorEnvelope>): CoordinatorErrorCode {
  const fromStatus = statusToCode(status)
  if (!envelope?.error?.code)
    return fromStatus
  // Only honor envelope codes that exist on the local-facing CoordinatorErrorCode.
  const known: ReadonlySet<CoordinatorErrorCode> = new Set<CoordinatorErrorCode>([
    'authentication_required',
    'forbidden',
    'project_not_found',
    'idempotency_key_reused',
    'rate_limited',
    'coordination_unavailable',
    'coordination_suspended',
  ])
  return known.has(envelope.error.code as CoordinatorErrorCode)
    ? (envelope.error.code as CoordinatorErrorCode)
    : fromStatus
}

/** Build the absolute URL for a coordination route under the service origin. */
function routeUrl(serviceUrl: string, path: string): string {
  // serviceUrl is a validated absolute HTTPS origin (no trailing path). path
  // begins with `/v1/...`.
  return `${serviceUrl.replace(/\/$/, '')}${path}`
}

export class CloudSyncCoordinator implements ICloudSyncCoordinator {
  private readonly serviceUrl: string
  private readonly globalConfig: GlobalCloudSyncConfig
  private readonly fetchImpl: FetchImpl

  constructor(opts: CloudSyncCoordinatorOptions) {
    this.serviceUrl = opts.serviceUrl
    this.globalConfig = opts.globalConfig
    // Bind to globalThis: the bare global detached loses `this` and throws
    // "Illegal invocation" in the Workers runtime (Slice-1).
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis)
  }

  async reserve(req: ReserveRequest, credential: CloudCredential): Promise<ReservationDTO> {
    this.requireAllowlisted()
    const url = routeUrl(
      this.serviceUrl,
      `${COORDINATION_ROUTE_PREFIX}/${encodeURIComponent(req.cloudProjectId)}/reservations`,
    )
    const headers = this.headers(credential, { 'Idempotency-Key': req.idempotencyKey })
    const res = await this.call(() => this.fetchImpl(url, {
      method: 'POST',
      redirect: 'error',
      headers,
      body: JSON.stringify({ idempotencyKey: req.idempotencyKey, requestHash: req.requestHash }),
    }))
    const body = await this.parseEnvelope<{ reservationId: string, ticketNumber: number, state: string, replayed: boolean }>(res, 200, 201)
    return {
      reservationId: body.data.reservationId,
      ticketNumber: body.data.ticketNumber,
      state: body.data.state,
      replayed: body.data.replayed,
    }
  }

  async acknowledge(
    req: AcknowledgeReservationRequest,
    credential: CloudCredential,
  ): Promise<AcknowledgeReservationResponse> {
    this.requireAllowlisted()
    const url = routeUrl(
      this.serviceUrl,
      `${COORDINATION_ROUTE_PREFIX}/${encodeURIComponent(req.cloudProjectId)}/reservations/${encodeURIComponent(req.reservationId)}/acknowledgement`,
    )
    const headers = this.headers(credential)
    const res = await this.call(() => this.fetchImpl(url, {
      method: 'PUT',
      redirect: 'error',
      headers,
      body: JSON.stringify({
        operationId: req.operationId,
        contentHash: req.contentHash,
        header: req.header,
      }),
    }))
    return (await this.parseEnvelope<AcknowledgeReservationResponse>(res, 200)).data
  }

  /**
   * Enforce the origin allowlist BEFORE the credential is attached. Throws a
   * CoordinatorError and never reaches the wire for an untrusted destination.
   */
  private requireAllowlisted(): void {
    const result = checkOriginAllowlist(this.serviceUrl, this.globalConfig)
    if (!result.allowed) {
      // authentication_required — the caller must surface this without a local
      // fallback (BR-1.5). Never attach a credential off-allowlist.
      throw new CoordinatorError(
        'authentication_required',
        { message: `cloud serviceUrl is not on the operator allowlist (${result.reason})` },
      )
    }
  }

  /** Build the request headers, attaching the human token as cf-access-token. */
  private headers(credential: CloudCredential, extra: Record<string, string> = {}): Headers {
    const headers = new Headers({
      'content-type': 'application/json',
      ...extra,
    })
    if (credential.kind === 'human') {
      headers.set('cf-access-token', credential.cfAccessToken)
    }
    else {
      headers.set('CF-Access-Client-Id', credential.clientId)
      headers.set('CF-Access-Client-Secret', credential.clientSecret)
    }
    return headers
  }

  /**
   * Run a credential-bearing fetch and normalize failures:
   *   - network error / non-JSON -> coordination_unavailable (recoverable).
   *   - redirect -> already rejected by fetch (redirect: 'error'); a thrown
   *     TypeError is normalized to coordination_unavailable.
   *   - non-2xx -> CoordinatorError from the envelope or status.
   */
  private async call(run: () => Promise<Response>): Promise<Response> {
    let res: Response
    try {
      res = await run()
    }
    catch (err) {
      // redirect: 'error' throws a TypeError on a redirect; network failures throw
      // too. Both are recoverable unavailability — never a local fallback (BR-1.5).
      throw new CoordinatorError('coordination_unavailable', { message: (err as Error)?.message ?? 'fetch failed' })
    }
    if (!res.ok) {
      let envelope: Partial<CoordinationErrorEnvelope> | undefined
      try {
        envelope = (await res.json()) as Partial<CoordinationErrorEnvelope>
      }
      catch {
        envelope = undefined
      }
      throw new CoordinatorError(envelopeToCode(res.status, envelope), {
        requestId: envelope?.error?.requestId,
        message: envelope?.error?.message,
        currentVersion: envelope?.error?.currentVersion,
      })
    }
    return res
  }

  /**
   * Parse a success envelope `{requestId, data}` for one of the accepted
   * success statuses. Throws coordination_unavailable on an unexpected success
   * status shape (defense in depth).
   */
  private async parseEnvelope<T>(
    res: Response,
    ...accept: number[]
  ): Promise<{ requestId: string, data: T }> {
    if (!accept.includes(res.status)) {
      throw new CoordinatorError('coordination_unavailable', { message: `unexpected status ${res.status}` })
    }
    let body: { requestId?: string, data?: T }
    try {
      body = (await res.json()) as { requestId?: string, data?: T }
    }
    catch (err) {
      throw new CoordinatorError('coordination_unavailable', { message: (err as Error)?.message ?? 'invalid response body' })
    }
    if (!body || typeof body.data !== 'object' || body.data === null) {
      throw new CoordinatorError('coordination_unavailable', { message: 'missing data in response envelope' })
    }
    return { requestId: body.requestId ?? '', data: body.data }
  }
}
