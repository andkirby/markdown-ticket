/**
 * TEST-stream-session-client — covers C-10, C-14, C-15.
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream-session client,
 *         § Wire contract.
 *
 * Verifies CloudProjectionSessionClient:
 *   - one typed HTTPS POST performs exactly one request and maps the typed
 *     Access/Worker outcome without any internal retry;
 *   - 401/403/404 map to authorization-side pauses and 426/protocol mismatch
 *     to incompatible (C-14);
 *   - a successful grant is held in memory only and reused for transport
 *     reconnects until expiry;
 *   - the effective grant expiry is bounded by the Access credential expiry
 *     (C-10);
 *   - the origin allowlist is enforced before the credential is attached.
 */

import type { GlobalCloudSyncConfig } from '@mdt/domain-contracts'
import { describe, expect, it } from '@jest/globals'
import { CloudProjectionSessionClient } from '../CloudProjectionSessionClient'

const CLOUD_PROJECT_ID = 'cloud-uuid-1'
const SERVICE_ORIGIN = 'https://mdt-sync.example.com'
const GLOBAL_CONFIG: GlobalCloudSyncConfig = { allowedOrigins: [SERVICE_ORIGIN] }
const NOW = 1_000_000

interface RecordedCall {
  url: string
  init?: RequestInit
}

/** fetch double that records every call and replays queued responses/errors. */
function makeFetch(): {
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response>
  calls: RecordedCall[]
  queueResponse: (status: number, body: unknown) => void
  queueError: (err: Error) => void
} {
  const calls: RecordedCall[] = []
  const pending: Array<Promise<Response>> = []
  return {
    calls,
    queueResponse(status, body) {
      pending.push(Promise.resolve(new Response(
        body === undefined ? null : JSON.stringify(body),
        { status, headers: { 'content-type': 'application/json' } },
      )))
    },
    queueError(err) {
      pending.push(Promise.reject(err))
    },
    fetchImpl(url, init) {
      calls.push({ url, init })
      const next = pending.shift()
      if (!next)
        return Promise.reject(new Error('unexpected fetch'))
      return next
    },
  }
}

function okGrant(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'req-1',
    data: {
      grant: 'grant-opaque-1',
      grantExpiresAt: NOW + 120_000,
      streamProtocol: 2,
      ...overrides,
    },
  }
}

function auth(overrides: Partial<{ headers: Record<string, string>, tokenExpiry: number, activationId: string }> = {}) {
  return {
    headers: { 'cf-access-token': 'token-xyz' },
    tokenExpiry: 0,
    activationId: 'activation-fingerprint-1',
    ...overrides,
  }
}

describe('CloudProjectionSessionClient (TEST-stream-session-client)', () => {
  function makeClient(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>) {
    return new CloudProjectionSessionClient({
      serviceUrl: SERVICE_ORIGIN,
      globalConfig: GLOBAL_CONFIG,
      fetchImpl,
      now: () => NOW,
    }, CLOUD_PROJECT_ID)
  }

  it('performs exactly one typed POST with the activation id and Access header', async () => {
    const fetch = makeFetch()
    fetch.queueResponse(200, okGrant())
    const client = makeClient(fetch.fetchImpl)

    const result = await client.authorize(auth())

    expect(fetch.calls).toHaveLength(1)
    const call = fetch.calls[0]!
    expect(call.url).toBe(`${SERVICE_ORIGIN}/v1/projects/${CLOUD_PROJECT_ID}/projection-stream-sessions`)
    expect(call.init?.method).toBe('POST')
    expect(call.init?.redirect).toBe('error')
    const headers = new Headers(call.init?.headers)
    expect(headers.get('cf-access-token')).toBe('token-xyz')
    const body = JSON.parse(String(call.init?.body)) as Record<string, unknown>
    expect(body.activationId).toBe('activation-fingerprint-1')

    expect(result).toEqual({
      kind: 'granted',
      grant: 'grant-opaque-1',
      grantExpiresAt: NOW + 120_000,
    })
  })

  it('maps 401 to authentication_required (C-14)', async () => {
    const fetch = makeFetch()
    fetch.queueResponse(401, { error: { code: 'authentication_required', requestId: 'req-1' } })
    const client = makeClient(fetch.fetchImpl)
    await expect(client.authorize(auth())).resolves.toEqual({
      kind: 'authentication_required',
      reasonCode: 'authentication_required',
    })
  })

  it('maps 403 and hidden-project 404 to authorization_required (C-14)', async () => {
    const fetch = makeFetch()
    fetch.queueResponse(403, { error: { code: 'forbidden', requestId: 'req-1' } })
    fetch.queueResponse(404, { error: { code: 'project_not_found', requestId: 'req-1' } })
    const client = makeClient(fetch.fetchImpl)

    await expect(client.authorize(auth())).resolves.toEqual({
      kind: 'authorization_required',
      reasonCode: 'forbidden',
    })
    await expect(client.authorize(auth())).resolves.toEqual({
      kind: 'authorization_required',
      reasonCode: 'project_not_found',
    })
  })

  it('maps 426 and stream-protocol mismatch to incompatible (C-14)', async () => {
    const fetch = makeFetch()
    fetch.queueResponse(426, { error: { code: 'invalid_request', requestId: 'req-1' } })
    const client = makeClient(fetch.fetchImpl)
    await expect(client.authorize(auth())).resolves.toEqual({
      kind: 'incompatible',
      reasonCode: 'incompatible_protocol',
    })

    fetch.queueResponse(200, okGrant({ streamProtocol: 1 }))
    await expect(client.authorize(auth())).resolves.toEqual({
      kind: 'incompatible',
      reasonCode: 'incompatible_protocol',
    })
  })

  it('maps an unknown-route 404 to incompatible (old deployment without the session route)', async () => {
    const fetch = makeFetch()
    fetch.queueResponse(404, { error: { code: 'invalid_request', message: 'not found', requestId: 'req-1' } })
    const client = makeClient(fetch.fetchImpl)
    await expect(client.authorize(auth())).resolves.toEqual({
      kind: 'incompatible',
      reasonCode: 'route_not_found',
    })
  })

  it('maps 429/5xx and network failure to transient_failure without retrying (C-14, C-15)', async () => {
    const fetch = makeFetch()
    fetch.queueResponse(503, { error: { code: 'coordination_unavailable', requestId: 'req-1' } })
    fetch.queueError(new TypeError('fetch failed'))
    const client = makeClient(fetch.fetchImpl)

    await expect(client.authorize(auth())).resolves.toEqual({
      kind: 'transient_failure',
      reasonCode: 'coordination_unavailable',
    })
    await expect(client.authorize(auth())).resolves.toEqual({
      kind: 'transient_failure',
      reasonCode: 'network_error',
    })
    // Exactly one HTTPS request per authorize call — never an internal retry.
    expect(fetch.calls).toHaveLength(2)
  })

  it('holds the grant in memory only and reports validity against the clock (C-10, C-15)', async () => {
    const fetch = makeFetch()
    fetch.queueResponse(200, okGrant())
    const client = makeClient(fetch.fetchImpl)

    expect(client.currentGrant).toBeNull()
    await client.authorize(auth())
    expect(client.currentGrant).toEqual({ grant: 'grant-opaque-1', expiresAt: NOW + 120_000 })
    expect(client.hasValidGrant()).toBe(true)

    const later = new CloudProjectionSessionClient({
      serviceUrl: SERVICE_ORIGIN,
      globalConfig: GLOBAL_CONFIG,
      fetchImpl: fetch.fetchImpl,
      now: () => NOW + 120_001,
    }, CLOUD_PROJECT_ID)
    await later.authorize(auth())
    expect(later.hasValidGrant()).toBe(false)

    client.clearGrant()
    expect(client.currentGrant).toBeNull()
  })

  it('bounds the effective grant expiry by the Access credential expiry (C-10)', async () => {
    const fetch = makeFetch()
    // Server offers a 10-minute grant, but the Access credential expires in 60s.
    fetch.queueResponse(200, okGrant({ grantExpiresAt: NOW + 600_000 }))
    const client = makeClient(fetch.fetchImpl)

    const result = await client.authorize(auth({ tokenExpiry: NOW + 60_000 }))

    expect(result).toEqual({
      kind: 'granted',
      grant: 'grant-opaque-1',
      grantExpiresAt: NOW + 60_000,
    })
    expect(client.currentGrant?.expiresAt).toBe(NOW + 60_000)
  })

  it('rejects an off-allowlist origin before any request reaches the wire', async () => {
    const fetch = makeFetch()
    const client = new CloudProjectionSessionClient({
      serviceUrl: 'https://evil.example.com',
      globalConfig: GLOBAL_CONFIG,
      fetchImpl: fetch.fetchImpl,
      now: () => NOW,
    }, CLOUD_PROJECT_ID)

    await expect(client.authorize(auth())).rejects.toThrow()
    expect(fetch.calls).toHaveLength(0)
  })
})
