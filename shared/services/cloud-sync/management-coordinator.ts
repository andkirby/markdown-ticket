/**
 * ManagementCoordinator — HTTP client for cloud project management operations
 * (MDT-201, BR-4.1 / C1 / C5).
 *
 * Source: docs/CRs/MDT-201/architecture.md § Module Boundaries,
 *         docs/architecture/cloud-sync/README.md § Local Integration Contract.
 *
 * Routes management calls by Access audience:
 *   - `provision` → operator audience (`POST /v1/admin/projects`).
 *   - `probe`, `listMembers`, `upsertMember`, `removeMember`,
 *     `updateCoordinationState` → coordination audience (`/v1/projects/...`).
 *
 * Security invariants (identity-and-access.md):
 *   - The origin is checked against the trusted profile + allowlist BEFORE any
 *     credential is attached. An off-allowlist destination throws and never
 *     reaches the wire.
 *   - `redirect: 'error'` on every credential-bearing request — a credential
 *     is never silently followed to another origin.
 *   - The Worker's `{error}` envelope is mapped to the matching
 *     `CoordinatorError` code; network/unknown failures map to
 *     `coordination_unavailable` (recoverable).
 *   - No presentation logic: raw typed DTOs only. No credential is ever logged.
 *
 * `connect` never provisions: this coordinator exposes no provision call from
 * the connect path. Provisioning is invoked only by `enable`.
 */

import type {
  CloudCredential,
  CloudSyncConnection,
  CoordinationErrorEnvelope,
  CoordinatorErrorCode,
  GlobalCloudSyncConfig,
  ProjectBindingProbe,
  ProjectMember,
  ProvisionProjectRequest,
  ProvisionProjectResult,
} from '@mdt/domain-contracts'
import { CoordinatorError } from '@mdt/domain-contracts'
import { checkOriginAllowlist } from './config.js'

/** The shape of fetch we accept (Web fetch; injected for tests). */
export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>

export interface ManagementCoordinatorOptions {
  /** Coordination HTTPS origin (from the trusted profile). */
  coordinationOrigin: string
  /** Provisioning HTTPS origin (operator audience; from the trusted profile). */
  provisioningOrigin: string
  /** Operator-controlled global allowlist merged with distribution origins. */
  globalConfig: GlobalCloudSyncConfig
  /** Injected for tests. Defaults to `globalThis.fetch` bound to globalThis. */
  fetchImpl?: FetchImpl
}

/** Stable result of a provisioning operation (operator audience). */
export interface ManagementProvisionResponse {
  projectId: string
  replayed: boolean
}

/**
 * HTTP client for management operations. One coordinator serves both audiences;
 * the audience is selected per operation by the route prefix (operator vs
 * coordination), matching the Worker's router.
 */
export class ManagementCoordinator {
  private readonly coordinationOrigin: string
  private readonly provisioningOrigin: string
  private readonly globalConfig: GlobalCloudSyncConfig
  private readonly fetchImpl: FetchImpl

  constructor(opts: ManagementCoordinatorOptions) {
    this.coordinationOrigin = opts.coordinationOrigin
    this.provisioningOrigin = opts.provisioningOrigin
    this.globalConfig = opts.globalConfig
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis)
  }

  /** Probe project binding and membership (coordination audience). */
  async probe(cloudProjectId: string, credential: CloudCredential): Promise<ProjectBindingProbe> {
    const url = this.route(this.coordinationOrigin, `/v1/projects/${encodeURIComponent(cloudProjectId)}`)
    const res = await this.call(credential, url, { method: 'GET' })
    return (await this.parseEnvelope<ProjectBindingProbe>(res, 200)).data
  }

  /** List project members (coordination audience; owner role enforced server-side). */
  async listMembers(cloudProjectId: string, credential: CloudCredential): Promise<{ items: ProjectMember[] }> {
    const url = this.route(this.coordinationOrigin, `/v1/projects/${encodeURIComponent(cloudProjectId)}/members`)
    const res = await this.call(credential, url, { method: 'GET' })
    return (await this.parseEnvelope<{ items: ProjectMember[] }>(res, 200)).data
  }

  /** Add or update a member (coordination audience). Body carries no secret. */
  async upsertMember(
    cloudProjectId: string,
    kind: ProjectMember['kind'],
    principalId: string,
    body: { displayLabel: string, role: ProjectMember['role'] },
    credential: CloudCredential,
  ): Promise<ProjectMember> {
    const url = this.route(
      this.coordinationOrigin,
      `/v1/projects/${encodeURIComponent(cloudProjectId)}/members/${encodeURIComponent(kind)}/${encodeURIComponent(principalId)}`,
    )
    const res = await this.call(credential, url, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return (await this.parseEnvelope<ProjectMember>(res, 200)).data
  }

  /** Remove a member (coordination audience). */
  async removeMember(
    cloudProjectId: string,
    kind: ProjectMember['kind'],
    principalId: string,
    credential: CloudCredential,
  ): Promise<void> {
    const url = this.route(
      this.coordinationOrigin,
      `/v1/projects/${encodeURIComponent(cloudProjectId)}/members/${encodeURIComponent(kind)}/${encodeURIComponent(principalId)}`,
    )
    const res = await this.call(credential, url, { method: 'DELETE' })
    if (res.status !== 204) {
      throw new CoordinatorError('coordination_unavailable', { message: `unexpected status ${res.status}` })
    }
  }

  /** Update coordination state (coordination audience). Used by disable. */
  async updateCoordinationState(
    cloudProjectId: string,
    body: { state: 'active' | 'suspended' },
    credential: CloudCredential,
  ): Promise<{ state: 'active' | 'suspended' }> {
    const url = this.route(
      this.coordinationOrigin,
      `/v1/projects/${encodeURIComponent(cloudProjectId)}/coordination-state`,
    )
    const res = await this.call(credential, url, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    return (await this.parseEnvelope<{ state: 'active' | 'suspended' }>(res, 200)).data
  }

  /**
   * Provision a cloud project (OPERATOR audience). The privileged endpoint
   * comes from the trusted profile; the idempotency key is journaled
   * client-side before this call. Returns `{ projectId, replayed }`.
   */
  async provision(req: ProvisionProjectRequest, credential: CloudCredential): Promise<ManagementProvisionResponse> {
    const url = this.route(this.provisioningOrigin, '/v1/admin/projects')
    const res = await this.call(credential, url, {
      method: 'POST',
      body: JSON.stringify({
        projectCode: req.projectCode,
        initialOwnerEmail: req.initialOwnerEmail,
        ...(req.initialNextTicketNumber !== undefined ? { initialNextTicketNumber: req.initialNextTicketNumber } : {}),
        idempotencyKey: req.idempotencyKey,
        requestHash: req.requestHash,
      }),
      extraHeaders: { 'Idempotency-Key': req.idempotencyKey },
    })
    return (await this.parseEnvelope<{ projectId: string, replayed?: boolean }>(res, 201)).data as ManagementProvisionResponse
  }

  /** Resolve the connection's coordination origin from a trusted connection. */
  coordinationOriginFor(connection: CloudSyncConnection): string {
    return connection.serviceOrigin
  }

  private route(origin: string, path: string): string {
    return `${origin.replace(/\/$/, '')}${path}`
  }

  /**
   * Enforce the allowlist BEFORE the credential is attached. Throws a
   * CoordinatorError and never reaches the wire for an untrusted destination.
   */
  private requireAllowlisted(origin: string): void {
    const result = checkOriginAllowlist(origin, this.globalConfig)
    if (!result.allowed) {
      throw new CoordinatorError(
        'authentication_required',
        { message: `cloud origin is not on the effective allowlist (${result.reason})` },
      )
    }
  }

  private headers(
    credential: CloudCredential,
    extra: Record<string, string> = {},
  ): Headers {
    const headers = new Headers({ 'content-type': 'application/json', ...extra })
    if (credential.kind === 'human') {
      headers.set('cf-access-token', credential.cfAccessToken)
    }
    else {
      headers.set('CF-Access-Client-Id', credential.clientId)
      headers.set('CF-Access-Client-Secret', credential.clientSecret)
    }
    return headers
  }

  private async call(
    credential: CloudCredential,
    url: string,
    init: { method: string, body?: string, extraHeaders?: Record<string, string> },
  ): Promise<Response> {
    // Derive the origin from the URL to enforce the allowlist. The URL is
    // always one of the two trusted-profile origins, but we check the actual
    // request origin defensively.
    const origin = originOf(url)
    this.requireAllowlisted(origin)

    let res: Response
    try {
      res = await this.fetchImpl(url, {
        method: init.method,
        redirect: 'error',
        headers: this.headers(credential, init.extraHeaders),
        ...(init.body !== undefined ? { body: init.body } : {}),
      })
    }
    catch (err) {
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

  private async parseEnvelope<T>(res: Response, ...accept: number[]): Promise<{ requestId: string, data: T }> {
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

function originOf(url: string): string {
  const u = new URL(url)
  return `${u.protocol}//${u.host}`
}

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
      if (status >= 500)
        return 'coordination_unavailable'
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
    'idempotency_key_reused',
    'last_owner_required',
    'rate_limited',
    'coordination_unavailable',
    'coordination_suspended',
  ])
  return known.has(envelope.error.code as CoordinatorErrorCode)
    ? (envelope.error.code as CoordinatorErrorCode)
    : fromStatus
}

export type { ProvisionProjectResult }
