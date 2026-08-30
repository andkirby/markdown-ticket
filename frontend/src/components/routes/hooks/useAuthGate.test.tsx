/**
 * useAuthGate tests (controlled refactor stage 3d).
 *
 * Pins the load-bearing auth behaviors: the owner-admin refresh-once guard,
 * the unlock-error sync, the close-modals-BEFORE-lock ordering (onBeforeLock),
 * and the owner-unlock HTTP flow.
 */
import type { AccessMode, SessionStatus } from '@mdt/domain-contracts'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { useAuthGate } from './useAuthGate'

const originalFetch = globalThis.fetch
const fetchMock = mock(async () => new Response('{}', { status: 200 }))

function makeParams(overrides: Partial<Parameters<typeof useAuthGate>[0]> = {}) {
  return {
    accessMode: 'owner-admin' as AccessMode,
    sessionStatus: 'idle' as SessionStatus,
    unlock: mock(async (_token: string) => {}),
    lock: mock(async () => {}),
    markLocked: mock(() => {}),
    markOwnerAdmin: mock(() => {}),
    refreshProjects: mock(async () => {}),
    onBeforeLock: mock(() => {}),
    ...overrides,
  }
}

beforeEach(() => {
  globalThis.fetch = fetchMock as unknown as typeof fetch
  fetchMock.mockReset()
  fetchMock.mockImplementation(async () => new Response('{}', { status: 200 }))
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('useAuthGate owner-admin refresh-once guard', () => {
  it('refreshes projects exactly once per owner-admin session', async () => {
    const refreshProjects = mock(async () => {})
    const params = makeParams({ refreshProjects })

    const { rerender } = renderHook(() => useAuthGate(params))
    await act(async () => {
      rerender()
    })
    await act(async () => {
      rerender()
    })

    expect(refreshProjects).toHaveBeenCalledTimes(1)
  })

  it('resets the guard when access mode leaves owner-admin, allowing a later refresh', async () => {
    const refreshProjects = mock(async () => {})
    const params = makeParams({ refreshProjects })

    const { rerender } = renderHook(() => useAuthGate(params))
    await act(async () => {
      params.accessMode = 'locked'
      rerender()
    })
    await act(async () => {
      params.accessMode = 'owner-admin'
      rerender()
    })

    expect(refreshProjects).toHaveBeenCalledTimes(2)
  })

  it('does not refresh outside owner-admin mode', () => {
    const refreshProjects = mock(async () => {})

    renderHook(() => useAuthGate(makeParams({ accessMode: 'read-only', refreshProjects })))

    expect(refreshProjects).not.toHaveBeenCalled()
  })

  it('tracks the refresh in flight flag around the refresh', async () => {
    let resolveRefresh: () => void = () => {}
    const refreshProjects = mock(() => new Promise<void>(r => (resolveRefresh = r)))

    const { result } = renderHook(() => useAuthGate(makeParams({ refreshProjects })))
    expect(result.current.authRefreshInFlight).toBe(true)

    await act(async () => {
      resolveRefresh()
    })
    await waitFor(() => expect(result.current.authRefreshInFlight).toBe(false))
  })
})

describe('useAuthGate unlock-error sync', () => {
  it('shows the token error when locked and the session reports an error', () => {
    const params = makeParams({ accessMode: 'locked', sessionStatus: 'error' })
    const { result } = renderHook(() => useAuthGate(params))

    expect(result.current.unlockError).toBe('Token was not accepted.')
  })

  it('clears the error when the session is healthy again', async () => {
    const params = makeParams({ accessMode: 'locked', sessionStatus: 'error' })
    const { result, rerender } = renderHook(() => useAuthGate(params))
    expect(result.current.unlockError).toBe('Token was not accepted.')

    await act(async () => {
      params.sessionStatus = 'idle'
      rerender()
    })
    expect(result.current.unlockError).toBe(null)
  })
})

describe('useAuthGate lock ordering (close-then-lock)', () => {
  it('runs onBeforeLock before lock and then refreshes projects', async () => {
    const order: string[] = []
    const params = makeParams({
      accessMode: 'locked', // no owner-admin mount refresh in the background
      lock: mock(async () => { order.push('lock') }),
      refreshProjects: mock(async () => { order.push('refresh') }),
      onBeforeLock: mock(() => { order.push('close-modals') }),
    })

    const { result } = renderHook(() => useAuthGate(params))
    await act(async () => {
      await result.current.handleLock()
    })

    expect(order).toEqual(['close-modals', 'lock', 'refresh'])
  })
})

describe('useAuthGate unlock click routing', () => {
  it('opens the owner-unlock modal in read-only mode (error state starts clear)', () => {
    const params = makeParams({ accessMode: 'read-only' })
    const { result } = renderHook(() => useAuthGate(params))

    act(() => result.current.handleUnlockClick())

    expect(result.current.showOwnerUnlock).toBe(true)
    expect(result.current.ownerUnlockError).toBe(null)
  })

  it('focuses an existing token input instead of locking', () => {
    const params = makeParams({ accessMode: 'locked' })
    const focus = mock(() => {})
    const input = document.createElement('input')
    input.setAttribute('data-testid', 'auth-token-input')
    input.focus = focus
    document.body.appendChild(input)

    try {
      const { result } = renderHook(() => useAuthGate(params))
      act(() => result.current.handleUnlockClick())

      expect(focus).toHaveBeenCalledTimes(1)
      expect(params.markLocked).not.toHaveBeenCalled()
    }
    finally {
      input.remove()
    }
  })

  it('falls through to markLocked when no input exists', () => {
    const params = makeParams({ accessMode: 'locked' })

    const { result } = renderHook(() => useAuthGate(params))
    act(() => result.current.handleUnlockClick())

    expect(params.markLocked).toHaveBeenCalledTimes(1)
  })
})

describe('useAuthGate owner unlock flow', () => {
  it('accepts a valid token: marks owner-admin, syncs SSE, closes the modal', async () => {
    const calls: Array<[string, RequestInit | undefined]> = []
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push([String(input), init])
      return new Response('{}', { status: 200 })
    })
    const params = makeParams({ accessMode: 'read-only' })

    const { result } = renderHook(() => useAuthGate(params))
    await act(async () => {
      await result.current.handleOwnerUnlock('secret-token')
    })

    expect(calls[0]![0]).toBe('/api/auth/session')
    expect(JSON.parse(calls[0]![1]!.body as string)).toEqual({ token: 'secret-token' })
    expect(params.markOwnerAdmin).toHaveBeenCalledTimes(1)
    expect(result.current.showOwnerUnlock).toBe(false)
    expect(result.current.ownerUnlockError).toBe(null)
  })

  it('rejects an unaccepted token with the inline error and keeps read-only session', async () => {
    fetchMock.mockImplementation(async () => new Response('denied', { status: 401 }))
    const params = makeParams({ accessMode: 'read-only' })

    const { result } = renderHook(() => useAuthGate(params))
    await act(async () => {
      await result.current.handleOwnerUnlock('bad-token')
    })

    expect(params.markOwnerAdmin).not.toHaveBeenCalled()
    expect(result.current.ownerUnlockError).toBe('Owner token was not accepted.')
  })

  it('reports the same error when the request itself fails', async () => {
    fetchMock.mockImplementation(async () => {
      throw new TypeError('Failed to fetch')
    })
    const params = makeParams({ accessMode: 'read-only' })

    const { result } = renderHook(() => useAuthGate(params))
    await act(async () => {
      await result.current.handleOwnerUnlock('any')
    })

    expect(result.current.ownerUnlockError).toBe('Owner token was not accepted.')
  })
})
