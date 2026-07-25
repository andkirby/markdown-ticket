/**
 * CloudProjectionClient — the local HTTP client for polling ticket header
 * projections (MDT-200 Slice U5).
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md § Projection,
 *         docs/CRs/MDT-200/ux-design.md § Cloud-projected header stub.
 *
 * Polls `GET /v1/projects/{id}/projections?after=<rev>&limit=<n>` and maintains
 * a project-revision cursor: each successful poll advances the cursor to the
 * highest project_revision observed so subsequent polls return only new/updated
 * items. The endpoint is viewer-or-above on the cloud side (the client just
 * calls it); authorization is enforced server-side (identity-and-access.md).
 *
 * Reuses the same security posture as CloudSyncCoordinator (U2):
 *   - origin is checked against the operator allowlist BEFORE the credential is
 *     attached (C6); an off-allowlist destination throws and never reaches the
 *     wire;
 *   - `redirect: 'error'` on every credential-bearing request — a redirect is
 *     rejected so a credential is never silently followed to another origin;
 *   - `globalThis.fetch` bound to globalThis (the bare global detaches `this`
 *     and throws "Illegal invocation" in the Workers runtime — Slice-1 bug);
 *   - the human token is attached as the `cf-access-token` header and is never
 *     logged, persisted, or sent to an untrusted origin.
 *
 * A projected item ONLY carries the approved header fields (BR-3.1: never a
 * body, description, or comments). The board merges these as read-only stubs.
 */

import type {
  CloudCredential,
  CoordinationErrorEnvelope,
  CoordinatorErrorCode,
  GlobalCloudSyncConfig,
  ProjectedHeader,
} from '@mdt/domain-contracts'
import { COORDINATION_ROUTE_PREFIX, CoordinatorError } from '@mdt/domain-contracts'
import { checkOriginAllowlist } from './config.js'

/** The shape of fetch we accept (Web fetch; injected for tests). */
export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>

export interface CloudProjectionClientOptions {
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
 * A single projection item returned by polling. Carries the header plus the
 * versioning/lifecycle metadata the board needs to drop tombstones and detect
 * staleness. The full ProjectionRecord from the cloud side is intentionally NOT
 * re-exported here: the board consumes only what BR-3.1 permits.
 */
export interface ProjectionItem extends ProjectedHeader {
  /** The cloud ticket number (e.g. 500 -> code "MDT-500"). */
  ticketNumber: number
  /** 'active' or 'deleted' — deleted items are tombstones to drop locally. */
  lifecycle: string
  /** Monotonic per-project revision; the cursor advances to this. */
  projectRevision: number
  /** Per-ticket version (If-Match precondition on the cloud side). */
  projectionVersion: number
  reservationId: string
  contentHash: string
}

/** Result of a single poll: new/updated items and the cursor to persist. */
export interface ProjectionPollResult {
  items: ProjectionItem[]
  /** Advance the caller's cursor to this; null when nothing changed. */
  nextCursor: number | null
  hasMore: boolean
}

export interface ProjectionPublishRequest {
  ticketNumber: number
  reservationId: string
  expectedProjectionVersion: number
  operationId: string
  contentHash: string
  header: ProjectedHeader
  lifecycle: 'active' | 'deleted'
}

/**
 * Maps an HTTP status (or envelope code) to a `CoordinatorErrorCode`. Mirrors
 * CloudSyncCoordinator's mapping so projection failures surface identically.
 */
function statusToCode(status: number): CoordinatorErrorCode {
  switch (status) {
    case 401: return 'authentication_required'
    case 403: return 'forbidden'
    case 404: return 'project_not_found'
    case 423: return 'coordination_suspended'
    case 429: return 'rate_limited'
    case 503: return 'coordination_unavailable'
    default:
      // 5xx and anything unrecognized -> recoverable unavailable.
      if (status >= 500)
        return 'coordination_unavailable'
      // Other 4xx -> treat as authentication/forbidden.
      return status === 403 ? 'forbidden' : 'authentication_required'
  }
}

function envelopeToCode(status: number, envelope?: Partial<CoordinationErrorEnvelope>): CoordinatorErrorCode {
  const fromStatus = statusToCode(status)
  if (!envelope?.error?.code)
    return fromStatus
  const known: ReadonlySet<CoordinatorErrorCode> = new Set<CoordinatorErrorCode>([
    'authentication_required',
    'forbidden',
    'project_not_found',
    'rate_limited',
    'coordination_unavailable',
    'coordination_suspended',
  ])
  return known.has(envelope.error.code as CoordinatorErrorCode)
    ? (envelope.error.code as CoordinatorErrorCode)
    : fromStatus
}

function routeUrl(serviceUrl: string, path: string): string {
  return `${serviceUrl.replace(/\/$/, '')}${path}`
}

/**
 * Read-only poller for cloud-projected ticket headers. One instance per project
 * binding; the cursor is held on the instance so callers can poll repeatedly.
 */
export class CloudProjectionClient {
  private readonly serviceUrl: string
  private readonly globalConfig: GlobalCloudSyncConfig
  private readonly fetchImpl: FetchImpl
  private readonly cloudProjectId: string
  /** Monotonic project-revision cursor; only advances forward. */
  private cursor: number

  constructor(opts: CloudProjectionClientOptions, cloudProjectId: string, initialCursor = 0) {
    this.serviceUrl = opts.serviceUrl
    this.globalConfig = opts.globalConfig
    // Bind to globalThis: the bare global detached loses `this` and throws
    // "Illegal invocation" in the Workers runtime (Slice-1).
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis)
    this.cloudProjectId = cloudProjectId
    this.cursor = Math.max(0, Math.trunc(initialCursor))
  }

  /** The current project-revision cursor (the last revision observed). */
  get currentCursor(): number {
    return this.cursor
  }

  /**
   * Poll the projection feed for items strictly after the current cursor.
   * On success the cursor advances to the highest project_revision observed.
   *
   * The endpoint is viewer-or-above; the Worker enforces membership. This
   * client never falls back to local data on failure — a CoordinatorError is
   * thrown so the caller can mark stubs stale without inventing projections
   * (BR-1.5).
   */
  async poll(
    credential: CloudCredential,
    limit = 100,
  ): Promise<ProjectionPollResult> {
    this.requireAllowlisted()
    const clamped = Math.max(1, Math.min(500, Math.trunc(limit)))
    const path
      = `${COORDINATION_ROUTE_PREFIX}/${encodeURIComponent(this.cloudProjectId)}/projections`
        + `?after=${this.cursor}&limit=${clamped}`
    const url = routeUrl(this.serviceUrl, path)
    const headers = this.headers(credential)
    const res = await this.call(() => this.fetchImpl(url, {
      method: 'GET',
      redirect: 'error',
      headers,
    }))
    const body = await this.parseEnvelope<{ items?: unknown[], hasMore?: boolean, nextCursor?: number | null }>(res, 200)
    const data = body.data ?? {}
    const rawItems = Array.isArray(data.items) ? data.items : []
    const items = rawItems.map(normalizeProjectionItem).filter((i): i is ProjectionItem => i !== null)

    // Advance the cursor to the highest revision observed. If the page was full
    // and hasMore is set, the next poll continues from the last item; otherwise
    // we are up to date and the next poll will return nothing new.
    const maxRevision = items.reduce((m, i) => (i.projectRevision > m ? i.projectRevision : m), this.cursor)
    this.cursor = maxRevision

    const hasMore = data.hasMore === true
    // Prefer the server-provided nextCursor when present; otherwise the max
    // revision we observed.
    const nextCursor = typeof data.nextCursor === 'number'
      ? data.nextCursor
      : (items.length > 0 ? maxRevision : null)

    return { items, nextCursor, hasMore }
  }

  async get(
    ticketNumber: number,
    credential: CloudCredential,
  ): Promise<ProjectionItem> {
    this.requireAllowlisted()
    const url = routeUrl(
      this.serviceUrl,
      `${COORDINATION_ROUTE_PREFIX}/${encodeURIComponent(this.cloudProjectId)}/tickets/${ticketNumber}/projection`,
    )
    const response = await this.call(() => this.fetchImpl(url, {
      method: 'GET',
      redirect: 'error',
      headers: this.headers(credential),
    }))
    const body = await this.parseEnvelope<unknown>(response, 200)
    const projection = normalizeProjectionItem(body.data)
    if (!projection) {
      throw new CoordinatorError('coordination_unavailable', {
        message: 'invalid projection response',
      })
    }
    return projection
  }

  async publish(
    request: ProjectionPublishRequest,
    credential: CloudCredential,
  ): Promise<{ projectionVersion: number, projectRevision: number }> {
    this.requireAllowlisted()
    const operation = request.lifecycle === 'deleted' ? 'lifecycle' : 'projection'
    const url = routeUrl(
      this.serviceUrl,
      `${COORDINATION_ROUTE_PREFIX}/${encodeURIComponent(this.cloudProjectId)}/tickets/${request.ticketNumber}/${operation}`,
    )
    const headers = this.headers(credential)
    headers.set('content-type', 'application/json')
    headers.set('If-Match', `"${request.expectedProjectionVersion}"`)
    const response = await this.call(() => this.fetchImpl(url, {
      method: 'PUT',
      redirect: 'error',
      headers,
      body: JSON.stringify({
        reservationId: request.reservationId,
        operationId: request.operationId,
        contentHash: request.contentHash,
        header: request.header,
        lifecycle: request.lifecycle,
      }),
    }))
    return (await this.parseEnvelope<{ projectionVersion: number, projectRevision: number }>(response, 200)).data
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
  private headers(credential: CloudCredential): Headers {
    const headers = new Headers({ accept: 'application/json' })
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
   * Run a credential-bearing fetch and normalize failures (mirrors the
   * coordinator): network/redirect -> coordination_unavailable; non-2xx ->
   * CoordinatorError from the envelope or status.
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
   * success statuses. Throws coordination_unavailable on an unexpected shape.
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

/**
 * Coerce a raw projection row from the wire into a ProjectionItem, dropping
 * anything that lacks the approved header fields (BR-3.1). Defensive: the cloud
 * shape is the source of truth, but malformed items must not crash the board.
 */
export function normalizeProjectionItem(raw: unknown): ProjectionItem | null {
  if (typeof raw !== 'object' || raw === null)
    return null
  const r = raw as Record<string, unknown>
  const ticketNumber = Number(r.ticketNumber)
  const projectRevision = Number(r.projectRevision)
  const projectionVersion = Number(r.projectionVersion)
  if (!Number.isFinite(ticketNumber) || !Number.isFinite(projectRevision))
    return null
  const code = typeof r.code === 'string' ? r.code : ''
  const title = typeof r.title === 'string' ? r.title : ''
  const status = typeof r.status === 'string' ? r.status : ''
  if (!code || !title || !status)
    return null
  return {
    ticketNumber: Math.trunc(ticketNumber),
    code,
    title,
    status,
    type: typeof r.type === 'string' ? r.type : null,
    priority: typeof r.priority === 'string' ? r.priority : null,
    assignee: typeof r.assignee === 'string' ? r.assignee : null,
    date_created: typeof r.date_created === 'string' ? r.date_created : null,
    last_modified: typeof r.last_modified === 'string' ? r.last_modified : '',
    lifecycle: typeof r.lifecycle === 'string' ? r.lifecycle : 'active',
    projectRevision: Math.trunc(projectRevision),
    projectionVersion: Number.isFinite(projectionVersion) ? Math.trunc(projectionVersion) : 0,
    reservationId: typeof r.reservationId === 'string' ? r.reservationId : '',
    contentHash: typeof r.contentHash === 'string' ? r.contentHash : '',
  }
}
