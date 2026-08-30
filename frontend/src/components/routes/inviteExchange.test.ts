/**
 * Characterization tests for the invite-code exchange cache semantics
 * (controlled refactor stage 0 — moved verbatim from App.tsx).
 *
 * Pins INV-5: in-flight promise reuse (dedupe) and cache eviction on failure.
 * fetch is mocked at the global seam; authFetch delegates to it unchanged.
 */
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { exchangeInviteCode } from './inviteExchange'

const originalFetch = globalThis.fetch
const fetchMock = mock(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response())

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  fetchMock.mockReset()
})

function okResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('exchangeInviteCode (INV-5 cache semantics)', () => {
  it('returns ok with projectRefs on success', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ projectRefs: ['MDT'] }))

    const result = await exchangeInviteCode('invite-1')

    expect(result).toEqual({
      ok: true,
      status: 200,
      backendDown: false,
      projectRefs: ['MDT'],
    })
  })

  it('defaults missing projectRefs to an empty array', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({}))

    const result = await exchangeInviteCode('invite-2')

    expect(result.ok).toBe(true)
    expect(result.projectRefs).toEqual([])
  })

  it('reuses the in-flight promise for concurrent calls with the same code', async () => {
    let resolveFetch: (r: Response) => void = () => {}
    fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => (resolveFetch = resolve)))

    const first = exchangeInviteCode('invite-3')
    const second = exchangeInviteCode('invite-3')

    expect(second).toBe(first) // same Promise instance — dedupe, no second fetch

    resolveFetch(okResponse({ projectRefs: ['MDT'] }))
    const [a, b] = await Promise.all([first, second])
    expect(a).toEqual(b)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('evicts the cache on a non-ok response so a retry re-fetches', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ error: 'nope' }, 404))
    const first = await exchangeInviteCode('invite-4')
    expect(first).toEqual({
      ok: false,
      status: 404,
      backendDown: false,
      projectRefs: [],
    })

    fetchMock.mockResolvedValueOnce(okResponse({ projectRefs: ['MDT'] }))
    const second = await exchangeInviteCode('invite-4')
    expect(second.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('marks backendDown for 5xx responses and evicts the cache', async () => {
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 503 }))
    const first = await exchangeInviteCode('invite-5')
    expect(first.backendDown).toBe(true)
    expect(first.ok).toBe(false)

    fetchMock.mockResolvedValueOnce(okResponse({ projectRefs: ['MDT'] }))
    await exchangeInviteCode('invite-5')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('evicts the cache when fetch rejects (network error → backendDown)', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const first = await exchangeInviteCode('invite-6')
    expect(first).toEqual({
      ok: false,
      status: 0,
      backendDown: true,
      projectRefs: [],
    })

    fetchMock.mockResolvedValueOnce(okResponse({ projectRefs: ['MDT'] }))
    const second = await exchangeInviteCode('invite-6')
    expect(second.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('encodes the invite code into the request URL', async () => {
    fetchMock.mockResolvedValueOnce(okResponse({ projectRefs: [] }))
    await exchangeInviteCode('code with/special')

    const call = fetchMock.mock.calls[0] as unknown as [RequestInfo | URL]
    expect(String(call[0])).toBe('/api/read-tokens/invites/code%20with%2Fspecial/session')
  })
})
