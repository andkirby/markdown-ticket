import type { ProjectionFeed } from './useCloudProjections'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, mock } from 'bun:test'

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

describe('useCloudProjectionFeed (MDT-226: production polling disabled)', () => {
  it('does not poll the cloud-projections endpoint for an enabled session', async () => {
    const { result } = renderHook(() =>
      useCloudProjectionFeed({ projectId: 'MDT', enabled: true }),
    )

    await act(async () => {})
    // Production polling is disabled; the browser consumes the unified ticket API.
    expect(result.current).toBeNull()
    expect(authFetch).not.toHaveBeenCalled()
  })

  it('does not poll for a read-only session', async () => {
    const { result } = renderHook(() =>
      useCloudProjectionFeed({ projectId: 'MDT', enabled: false }),
    )

    await act(async () => {})
    expect(result.current).toBeNull()
    expect(authFetch).not.toHaveBeenCalled()
  })

  it('uses an injected feed without a network request (test seam)', async () => {
    const injected: ProjectionFeed = { items: [projection], stale: false }
    const { result } = renderHook(() =>
      useCloudProjectionFeed({ projectId: 'MDT', enabled: true, injectedFeed: injected }),
    )

    await act(async () => {})
    expect(result.current).toEqual(injected)
    expect(authFetch).not.toHaveBeenCalled()
  })
})
