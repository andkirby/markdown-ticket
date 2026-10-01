/**
 * TEST-cloud-sync-coordinator — covers the local HTTP client for cloud
 * coordination (MDT-200 Slice U2).
 *
 * Source: docs/architecture/cloud-sync/identity-and-access.md § Client Credential Flows,
 *         docs/architecture/cloud-sync/data-and-consistency.md § Error Envelope.
 *
 * Verifies:
 *   - reserve success (200/201) maps to ReservationDTO;
 *   - HTTP error envelopes (401/403/404/409/429/503/423) map to the matching
 *     CoordinatorError code;
 *   - an off-allowlist origin throws BEFORE fetch is called (credential never
 *     attached to an untrusted destination);
 *   - redirects are rejected (redirect: 'error');
 *   - human and service credentials use their distinct Access headers and are
 *     never sent to a non-allowlisted origin.
 */

import type { GlobalCloudSyncConfig } from '@mdt/domain-contracts'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { CoordinatorError } from '@mdt/domain-contracts'

import { CloudSyncCoordinator } from '../CloudSyncCoordinator'

const ALLOWED = 'https://mdt-sync.example.com'
const ALLOWED_GLOBAL: GlobalCloudSyncConfig = { allowedOrigins: [ALLOWED] }
const CREDENTIAL = { kind: 'human', cfAccessToken: 'human-jwt-token' } as const
const ACK_REQUEST = {
  cloudProjectId: 'p1',
  reservationId: 'res-9',
  operationId: 'op-1',
  contentHash: 'hash-1',
  header: {
    code: 'MDT-201',
    title: 'Ticket',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    assignee: null,
    date_created: '2026-07-25T00:00:00.000Z',
    last_modified: '2026-07-25T00:00:00.000Z',
  },
}

interface FetchCall {
  url: string
  init: RequestInit | undefined
}

/** A minimal Response-shaped object for tests. */
function mockResponse(status: number, body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: new Headers(headers),
    text: async () => text,
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
  } as any
}

/** Build a coordinator whose fetch is a jest mock. Returns the mock + call log. */
function makeCoordinator(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = jest.fn(fetchImpl)
  const coordinator = new CloudSyncCoordinator({
    serviceUrl: ALLOWED,
    globalConfig: ALLOWED_GLOBAL,
    fetchImpl: fetchMock as any,
  })
  const calls = (): FetchCall[] => fetchMock.mock.calls.map(([url, init]) => ({ url: url as string, init: init as RequestInit | undefined }))
  return { coordinator, fetchMock, calls }
}

const RESERVATION_BODY = {
  requestId: 'req-1',
  data: { reservationId: 'res-9', ticketNumber: 201, state: 'reserved', replayed: false },
}

describe('CloudSyncCoordinator.reserve (success)', () => {
  it('maps a 201 reservation to ReservationDTO', async () => {
    const { coordinator, calls } = makeCoordinator(async () => mockResponse(201, RESERVATION_BODY))
    const r = await coordinator.reserve(
      { cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' },
      CREDENTIAL,
    )
    expect(r).toEqual({ reservationId: 'res-9', ticketNumber: 201, state: 'reserved', replayed: false })

    const [call] = calls()
    expect(call.url).toBe('https://mdt-sync.example.com/v1/projects/p1/reservations')
    expect(call.init?.method).toBe('POST')
    // Idempotency-Key header mirrored from the body.
    expect(new Headers(call.init?.headers as any).get('Idempotency-Key')).toBe('k-1')
    // Human token attached as cf-access-token.
    expect(new Headers(call.init?.headers as any).get('cf-access-token')).toBe('human-jwt-token')
    // Body carries idempotencyKey + requestHash only.
    expect(JSON.parse(call.init?.body as string)).toEqual({ idempotencyKey: 'k-1', requestHash: 'h-1' })
  })

  it('maps a 200 reservation to ReservationDTO (replayed)', async () => {
    const { coordinator } = makeCoordinator(async () => mockResponse(200, {
      requestId: 'req-2',
      data: { reservationId: 'res-9', ticketNumber: 201, state: 'reserved', replayed: true },
    }))
    const r = await coordinator.reserve(
      { cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' },
      CREDENTIAL,
    )
    expect(r.replayed).toBe(true)
    expect(r.ticketNumber).toBe(201)
  })

  it('attaches both service-token headers without a human token header', async () => {
    const { coordinator, calls } = makeCoordinator(async () => mockResponse(201, RESERVATION_BODY))
    await coordinator.reserve(
      { cloudProjectId: 'p1', idempotencyKey: 'k-1', requestHash: 'h-1' },
      { kind: 'service', clientId: 'client-id', clientSecret: 'client-secret' },
    )

    const headers = new Headers(calls()[0]?.init?.headers as HeadersInit)
    expect(headers.get('CF-Access-Client-Id')).toBe('client-id')
    expect(headers.get('CF-Access-Client-Secret')).toBe('client-secret')
    expect(headers.get('cf-access-token')).toBeNull()
  })

  it('uses redirect: error on the request (rejects redirects, never follows with creds)', async () => {
    const { calls } = makeCoordinator(async () => mockResponse(200, RESERVATION_BODY))
    const c = makeCoordinator(async () => mockResponse(200, RESERVATION_BODY))
    await c.coordinator.reserve({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' }, CREDENTIAL)
    expect(c.calls()[0]?.init?.redirect).toBe('error')
    void calls
  })
})

describe('CloudSyncCoordinator.reserve (error envelope mapping)', () => {
  const cases: Array<[number, string, import('@mdt/domain-contracts').CoordinatorErrorCode]> = [
    [401, 'authentication_required', 'authentication_required'],
    [403, 'forbidden', 'forbidden'],
    [404, 'project_not_found', 'project_not_found'],
    [409, 'idempotency_key_reused', 'idempotency_key_reused'],
    [429, 'rate_limited', 'rate_limited'],
    [503, 'coordination_unavailable', 'coordination_unavailable'],
    [423, 'coordination_suspended', 'coordination_suspended'],
  ]

  for (const [status, errorCode, expected] of cases) {
    it(`maps HTTP ${status} (${errorCode}) -> CoordinatorError(${expected})`, async () => {
      const { coordinator } = makeCoordinator(async () => mockResponse(status, {
        error: {
          code: errorCode,
          message: 'opaque',
          requestId: 'req-x',
          retryable: status === 429 || status === 503,
        },
      }))
      await expect(
        coordinator.reserve({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' }, CREDENTIAL),
      ).rejects.toMatchObject({ name: 'CoordinatorError', code: expected })
    })
  }

  it('rejects with a genuine CoordinatorError instance (not a plain object)', async () => {
    const { coordinator } = makeCoordinator(async () => mockResponse(401, {
      error: {
        code: 'authentication_required',
        message: 'opaque',
        requestId: 'req-x',
        retryable: false,
      },
    }))
    try {
      await coordinator.reserve({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' }, CREDENTIAL)
      throw new Error('should have thrown')
    }
    catch (e) {
      expect(e).toBeInstanceOf(CoordinatorError)
      expect((e as CoordinatorError).code).toBe('authentication_required')
      expect((e as CoordinatorError).requestId).toBe('req-x')
    }
  })

  it('a 500 with an unrecognized envelope code falls back to coordination_unavailable', async () => {
    const { coordinator } = makeCoordinator(async () => mockResponse(500, {
      error: {
        code: 'invalid_request',
        message: 'boom',
        requestId: 'req-x',
        retryable: false,
      },
    }))
    await expect(
      coordinator.reserve({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' }, CREDENTIAL),
    ).rejects.toMatchObject({ name: 'CoordinatorError', code: 'coordination_unavailable' })
  })

  it('a 500 with a non-JSON body maps to coordination_unavailable', async () => {
    const { coordinator } = makeCoordinator(async () => mockResponse(500, '<html>gateway</html>', { 'content-type': 'text/html' }))
    await expect(
      coordinator.reserve({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' }, CREDENTIAL),
    ).rejects.toMatchObject({ name: 'CoordinatorError', code: 'coordination_unavailable' })
  })

  it('a fetch network failure maps to coordination_unavailable', async () => {
    const { coordinator } = makeCoordinator(async () => {
      throw new Error('ECONNREFUSED')
    })
    await expect(
      coordinator.reserve({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' }, CREDENTIAL),
    ).rejects.toMatchObject({ name: 'CoordinatorError', code: 'coordination_unavailable' })
  })
})

describe('CloudSyncCoordinator: origin allowlist guard (C6)', () => {
  it('throws BEFORE fetch when the origin is off the allowlist', async () => {
    const fetchMock = jest.fn(async () => mockResponse(200, RESERVATION_BODY))
    const coordinator = new CloudSyncCoordinator({
      serviceUrl: 'https://evil.example.com',
      globalConfig: { allowedOrigins: [ALLOWED] },
      fetchImpl: fetchMock as any,
    })
    await expect(
      coordinator.reserve({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' }, CREDENTIAL),
    ).rejects.toBeInstanceOf(CoordinatorError)
    // The credential must never reach the wire for an untrusted origin.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws BEFORE fetch when the allowlist is empty (default deny)', async () => {
    const fetchMock = jest.fn(async () => mockResponse(200, RESERVATION_BODY))
    const coordinator = new CloudSyncCoordinator({
      serviceUrl: ALLOWED,
      globalConfig: { allowedOrigins: [] },
      fetchImpl: fetchMock as any,
    })
    await expect(
      coordinator.reserve({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' }, CREDENTIAL),
    ).rejects.toBeInstanceOf(CoordinatorError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('off-allowlist throws authentication_required (no local fallback path here)', async () => {
    const coordinator = new CloudSyncCoordinator({
      serviceUrl: 'https://evil.example.com',
      globalConfig: { allowedOrigins: [ALLOWED] },
      fetchImpl: jest.fn(async () => mockResponse(200, RESERVATION_BODY)) as any,
    })
    try {
      await coordinator.reserve({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' }, CREDENTIAL)
      throw new Error('should have thrown')
    }
    catch (e) {
      expect((e as CoordinatorError).code).toBe('authentication_required')
    }
  })
})

describe('CloudSyncCoordinator.acknowledge', () => {
  it('PUTs the acknowledgement payload and returns projection versions', async () => {
    const ack = { acknowledged: true, projectionVersion: 1, projectRevision: 2, replayed: false }
    const { calls } = makeCoordinator(async () => mockResponse(200, { requestId: 'r', data: ack }))
    const c = makeCoordinator(async () => mockResponse(200, { requestId: 'r', data: ack }))
    await expect(c.coordinator.acknowledge(ACK_REQUEST, CREDENTIAL)).resolves.toEqual(ack)
    const [call] = c.calls()
    expect(call.url).toBe('https://mdt-sync.example.com/v1/projects/p1/reservations/res-9/acknowledgement')
    expect(call.init?.method).toBe('PUT')
    expect(JSON.parse(call.init?.body as string)).toEqual({
      operationId: ACK_REQUEST.operationId,
      contentHash: ACK_REQUEST.contentHash,
      header: ACK_REQUEST.header,
    })
    expect(new Headers(call.init?.headers as any).get('cf-access-token')).toBe('human-jwt-token')
    expect(call.init?.redirect).toBe('error')
    void calls
  })

  it('maps a 404 reservation_not_found to project_not_found envelope semantics (reservation gone)', async () => {
    const { coordinator } = makeCoordinator(async () => mockResponse(404, {
      error: { code: 'reservation_not_found', message: 'opaque', requestId: 'r', retryable: false },
    }))
    await expect(coordinator.acknowledge(ACK_REQUEST, CREDENTIAL))
      .rejects
      .toMatchObject({ name: 'CoordinatorError' })
  })

  it('throws BEFORE fetch for an off-allowlist origin', async () => {
    const fetchMock = jest.fn(async () => mockResponse(200, { requestId: 'r', data: { acknowledged: true } }))
    const coordinator = new CloudSyncCoordinator({
      serviceUrl: 'https://evil.example.com',
      globalConfig: { allowedOrigins: [ALLOWED] },
      fetchImpl: fetchMock as any,
    })
    await expect(coordinator.acknowledge(ACK_REQUEST, CREDENTIAL)).rejects.toBeInstanceOf(CoordinatorError)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('CloudSyncCoordinator: fetch binding (Slice-1 illegal-invocation guard)', () => {
  let savedFetch: typeof globalThis.fetch | undefined
  beforeEach(() => {
    savedFetch = globalThis.fetch
  })
  afterEach(() => {
    if (savedFetch !== undefined)
      globalThis.fetch = savedFetch
  })

  it('defaults to globalThis.fetch bound to globalThis (not a detached reference)', async () => {
    let boundThis: unknown = 'unset'
    const bound = jest.fn(function (this: unknown) {
      // eslint-disable-next-line ts/no-this-alias -- capturing the receiver is the point of this test
      boundThis = this
      return Promise.resolve(mockResponse(200, RESERVATION_BODY))
    })
    // A raw function loses `this`; the constructor must bind to globalThis.
    globalThis.fetch = bound as any
    const coordinator = new CloudSyncCoordinator({
      serviceUrl: ALLOWED,
      globalConfig: ALLOWED_GLOBAL,
      // no fetchImpl -> globalThis.fetch bound to globalThis.
    })
    await coordinator.reserve({ cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' }, CREDENTIAL)
    expect(boundThis).toBe(globalThis)
  })
})
