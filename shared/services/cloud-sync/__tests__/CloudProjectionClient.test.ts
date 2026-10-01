/**
 * TEST-cloud-projection-client — covers the local projection poller
 * (MDT-200 Slice U5).
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md § Projection,
 *         docs/CRs/MDT-200/ux-design.md § Cloud-projected header stub.
 *
 * Verifies:
 *   - poll success returns the projected items and advances the cursor;
 *   - the next poll after the cursor returns nothing new (incremental feed);
 *   - the URL carries after=<cursor>&limit=<n>;
 *   - HTTP error envelopes map to the matching CoordinatorError code;
 *   - an off-allowlist origin throws BEFORE fetch (credential never attached);
 *   - redirects are rejected (redirect: 'error');
 *   - the human token is attached as cf-access-token and never logged;
 *   - normalizeProjectionItem drops malformed rows and tombstones are surfaced.
 */

import type { GlobalCloudSyncConfig } from '@mdt/domain-contracts'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { CoordinatorError } from '@mdt/domain-contracts'

import { CloudProjectionClient, normalizeProjectionItem } from '../CloudProjectionClient'

const ALLOWED = 'https://mdt-sync.example.com'
const ALLOWED_GLOBAL: GlobalCloudSyncConfig = { allowedOrigins: [ALLOWED] }
const CREDENTIAL = { kind: 'human', cfAccessToken: 'human-jwt-token' } as const

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

function projectionItem(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    ticketNumber: 500,
    reservationId: 'res-1',
    lifecycle: 'active',
    projectionVersion: 1,
    projectRevision: 1,
    operationId: 'op-1',
    contentHash: 'hash-1',
    code: 'MDT-500',
    title: 'Test',
    status: 'Open',
    type: 'Feature',
    priority: 'High',
    assignee: 'owner@example.com',
    date_created: '2026-07-24',
    last_modified: '2026-07-24',
    updatedByKind: 'human',
    updatedById: 'owner@example.com',
    updatedAt: '2026-07-24',
    deletedAt: null,
    ...overrides,
  }
}

function makeClient(fetchImpl: (url: string, init?: RequestInit) => Promise<Response>, cloudProjectId = 'p1', initialCursor = 0) {
  const fetchMock = jest.fn(fetchImpl)
  const client = new CloudProjectionClient({
    serviceUrl: ALLOWED,
    globalConfig: ALLOWED_GLOBAL,
    fetchImpl: fetchMock as any,
  }, cloudProjectId, initialCursor)
  const calls = (): FetchCall[] => fetchMock.mock.calls.map(([url, init]) => ({ url: url as string, init: init as RequestInit | undefined }))
  return { client, fetchMock, calls }
}

describe('CloudProjectionClient.poll (success)', () => {
  it('returns projected items and advances the cursor', async () => {
    const { client, calls } = makeClient(async () => mockResponse(200, {
      requestId: 'req-1',
      data: { items: [projectionItem({ projectRevision: 5 })], hasMore: false, nextCursor: null },
    }))
    const result = await client.poll(CREDENTIAL)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ ticketNumber: 500, code: 'MDT-500', title: 'Test', status: 'Open' })
    expect(result.hasMore).toBe(false)
    // Cursor advanced to the observed revision.
    expect(client.currentCursor).toBe(5)

    const [call] = calls()
    expect(call.url).toBe('https://mdt-sync.example.com/v1/projects/p1/projections?after=0&limit=100')
    expect(call.init?.method).toBe('GET')
  })

  it('the next poll uses the advanced cursor (incremental feed)', async () => {
    // A scripted feed: the first poll returns revision 5, the second is empty.
    const feed = [
      { requestId: 'req-1', data: { items: [projectionItem({ projectRevision: 5 })], hasMore: false } },
      { requestId: 'req-2', data: { items: [], hasMore: false } },
    ]
    let i = 0
    const { client, calls } = makeClient(async () => mockResponse(200, feed[i++]))
    // First poll: one item at revision 5 -> cursor advances from 0 to 5.
    const first = await client.poll(CREDENTIAL)
    expect(first.items).toHaveLength(1)
    expect(client.currentCursor).toBe(5)
    expect(calls()[0]?.url).toContain('after=0')
    // Second poll: cursor is 5, so after=5 is sent and the feed is empty.
    const second = await client.poll(CREDENTIAL)
    expect(second.items).toHaveLength(0)
    expect(calls()[1]?.url).toContain('after=5')
    expect(client.currentCursor).toBe(5) // unchanged when nothing new
  })

  it('honors the limit query parameter and clamps it', async () => {
    const { client, calls } = makeClient(async () => mockResponse(200, {
      requestId: 'req-1',
      data: { items: [], hasMore: false, nextCursor: null },
    }))
    await client.poll(CREDENTIAL, 5)
    expect(calls()[0]?.url).toContain('limit=5')

    // Too-large limit clamps to 500.
    await client.poll(CREDENTIAL, 99999)
    expect(calls()[1]?.url).toContain('limit=500')

    // Too-small/non-numeric limit clamps to 1.
    await client.poll(CREDENTIAL, 0)
    expect(calls()[2]?.url).toContain('limit=1')
  })

  it('attaches cf-access-token and uses redirect: error', async () => {
    const { client, calls } = makeClient(async () => mockResponse(200, {
      requestId: 'req-1',
      data: { items: [], hasMore: false, nextCursor: null },
    }))
    await client.poll(CREDENTIAL)
    const [call] = calls()
    expect(new Headers(call.init?.headers as any).get('cf-access-token')).toBe('human-jwt-token')
    expect(call.init?.redirect).toBe('error')
  })
})

describe('CloudProjectionClient.poll (error envelope mapping)', () => {
  const cases: Array<[number, string, import('@mdt/domain-contracts').CoordinatorErrorCode]> = [
    [401, 'authentication_required', 'authentication_required'],
    [403, 'forbidden', 'forbidden'],
    [404, 'project_not_found', 'project_not_found'],
    [429, 'rate_limited', 'rate_limited'],
    [503, 'coordination_unavailable', 'coordination_unavailable'],
    [423, 'coordination_suspended', 'coordination_suspended'],
  ]

  for (const [status, errorCode, expected] of cases) {
    it(`maps HTTP ${status} (${errorCode}) -> CoordinatorError(${expected})`, async () => {
      const { client } = makeClient(async () => mockResponse(status, {
        error: errorCode,
        message: 'opaque',
        requestId: 'req-x',
      }))
      await expect(client.poll(CREDENTIAL)).rejects.toMatchObject({ name: 'CoordinatorError', code: expected })
    })
  }

  it('rejects with a genuine CoordinatorError instance (not a plain object)', async () => {
    const { client } = makeClient(async () => mockResponse(401, {
      error: 'authentication_required',
      message: 'opaque',
      requestId: 'req-x',
    }))
    try {
      await client.poll(CREDENTIAL)
      throw new Error('should have thrown')
    }
    catch (e) {
      expect(e).toBeInstanceOf(CoordinatorError)
      expect((e as CoordinatorError).code).toBe('authentication_required')
    }
  })

  it('a 500 with a non-JSON body maps to coordination_unavailable', async () => {
    const { client } = makeClient(async () => mockResponse(500, '<html>gateway</html>', { 'content-type': 'text/html' }))
    await expect(client.poll(CREDENTIAL)).rejects.toMatchObject({ name: 'CoordinatorError', code: 'coordination_unavailable' })
  })

  it('a fetch network failure maps to coordination_unavailable', async () => {
    const { client } = makeClient(async () => {
      throw new Error('ECONNREFUSED')
    })
    await expect(client.poll(CREDENTIAL)).rejects.toMatchObject({ name: 'CoordinatorError', code: 'coordination_unavailable' })
  })

  it('a missing data envelope maps to coordination_unavailable', async () => {
    const { client } = makeClient(async () => mockResponse(200, { requestId: 'req-1' }))
    await expect(client.poll(CREDENTIAL)).rejects.toMatchObject({ name: 'CoordinatorError', code: 'coordination_unavailable' })
  })
})

describe('CloudProjectionClient: origin allowlist guard (C6)', () => {
  it('throws BEFORE fetch when the origin is off the allowlist', async () => {
    const fetchMock = jest.fn(async () => mockResponse(200, { requestId: 'r', data: { items: [] } }))
    const client = new CloudProjectionClient({
      serviceUrl: 'https://evil.example.com',
      globalConfig: { allowedOrigins: [ALLOWED] },
      fetchImpl: fetchMock as any,
    }, 'p1')
    await expect(client.poll(CREDENTIAL)).rejects.toBeInstanceOf(CoordinatorError)
    // The credential must never reach the wire for an untrusted origin.
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws BEFORE fetch when the allowlist is empty (default deny)', async () => {
    const fetchMock = jest.fn(async () => mockResponse(200, { requestId: 'r', data: { items: [] } }))
    const client = new CloudProjectionClient({
      serviceUrl: ALLOWED,
      globalConfig: { allowedOrigins: [] },
      fetchImpl: fetchMock as any,
    }, 'p1')
    await expect(client.poll(CREDENTIAL)).rejects.toBeInstanceOf(CoordinatorError)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('off-allowlist throws authentication_required (no local fallback)', async () => {
    const client = new CloudProjectionClient({
      serviceUrl: 'https://evil.example.com',
      globalConfig: { allowedOrigins: [ALLOWED] },
      fetchImpl: jest.fn(async () => mockResponse(200, { requestId: 'r', data: { items: [] } })) as any,
    }, 'p1')
    try {
      await client.poll(CREDENTIAL)
      throw new Error('should have thrown')
    }
    catch (e) {
      expect((e as CoordinatorError).code).toBe('authentication_required')
    }
  })
})

describe('CloudProjectionClient: fetch binding (Slice-1 illegal-invocation guard)', () => {
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
      return Promise.resolve(mockResponse(200, { requestId: 'r', data: { items: [] } }))
    })
    globalThis.fetch = bound as any
    const client = new CloudProjectionClient({
      serviceUrl: ALLOWED,
      globalConfig: ALLOWED_GLOBAL,
      // no fetchImpl -> globalThis.fetch bound to globalThis.
    }, 'p1')
    await client.poll(CREDENTIAL)
    expect(boundThis).toBe(globalThis)
  })
})

describe('normalizeProjectionItem (BR-3.1: never a body)', () => {
  it('keeps only approved header fields and drops the body/description', () => {
    const item = normalizeProjectionItem(projectionItem({ description: 'secret body', content: 'more body' }))
    expect(item).not.toBeNull()
    expect(item).toMatchObject({ code: 'MDT-500', title: 'Test', status: 'Open' })
    // No body/description leaks into the projected header.
    expect(item).not.toHaveProperty('description')
    expect(item).not.toHaveProperty('content')
  })

  it('surfaces tombstones (lifecycle=deleted) so the board can drop them', () => {
    const item = normalizeProjectionItem(projectionItem({ lifecycle: 'deleted' }))
    expect(item?.lifecycle).toBe('deleted')
  })

  it('drops malformed rows missing required header fields', () => {
    expect(normalizeProjectionItem({ ticketNumber: 1, projectRevision: 1 })).toBeNull() // no code/title/status
    expect(normalizeProjectionItem(null)).toBeNull()
    expect(normalizeProjectionItem({})).toBeNull()
  })

  it('nulls out optional header fields when absent on the wire', () => {
    const item = normalizeProjectionItem(projectionItem({ type: null, priority: null, assignee: null, date_created: null }))
    expect(item?.type).toBeNull()
    expect(item?.priority).toBeNull()
    expect(item?.assignee).toBeNull()
    expect(item?.date_created).toBeNull()
  })
})
