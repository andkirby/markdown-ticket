import type { ProjectionFeed } from './useCloudProjections'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

const authFetch = mock(async (): Promise<Response> => new Response(null, { status: 500 }))

mock.module('../auth/authFetch', () => ({ authFetch }))

// eslint-disable-next-line import/first
import { useCloudProjectionFeed } from './useCloudProjectionFeed'

const projection = {
  ticketNumber: 42,
  lifecycle: 'active' as const,
  code: 'MDT-042',
  title: 'Projected ticket',
  status: 'Proposed',
  type: 'Feature Enhancement',
  priority: 'Medium',
  assignee: null,
  date_created: '2026-07-25T00:00:00.000Z',
  last_modified: '2026-07-25T00:00:00.000Z',
}

describe('useCloudProjectionFeed', () => {
  beforeEach(() => {
    authFetch.mockReset()
  })

  afterEach(() => {
    authFetch.mockReset()
  })

  it('polls the local owner endpoint and exposes only the returned projection feed', async () => {
    authFetch.mockResolvedValueOnce(Response.json({
      enabled: true,
      pollIntervalSeconds: 60,
      items: [projection],
      nextCursor: 1,
      hasMore: false,
      stale: false,
    }))

    const { result, unmount } = renderHook(() => useCloudProjectionFeed({
      projectId: 'MDT',
      enabled: true,
    }))

    await waitFor(() => expect(result.current?.items).toEqual([projection]))
    expect(String(authFetch.mock.calls[0]?.[0])).toContain('/api/projects/MDT/cloud-projections?after=0')
    unmount()
  })

  it('does not poll for a read-only session', async () => {
    const { result } = renderHook(() => useCloudProjectionFeed({
      projectId: 'MDT',
      enabled: false,
    }))

    expect(result.current).toBeNull()
    expect(authFetch).not.toHaveBeenCalled()
  })

  it('uses an injected feed without a network request', async () => {
    const injected: ProjectionFeed = { items: [projection], stale: false }
    const { result } = renderHook(() => useCloudProjectionFeed({
      projectId: 'MDT',
      enabled: true,
      injectedFeed: injected,
    }))

    await act(async () => {})
    expect(result.current).toEqual(injected)
    expect(authFetch).not.toHaveBeenCalled()
  })

  it('keeps returned projection headers visible when the server marks them stale', async () => {
    authFetch.mockResolvedValueOnce(Response.json({
      enabled: true,
      pollIntervalSeconds: 60,
      items: [projection],
      nextCursor: 1,
      hasMore: false,
      stale: true,
    }))

    const { result, unmount } = renderHook(() => useCloudProjectionFeed({
      projectId: 'MDT',
      enabled: true,
    }))

    await waitFor(() => expect(result.current?.stale).toBe(true))
    expect(result.current?.items).toEqual([projection])
    unmount()
  })
})
