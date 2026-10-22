import { act, renderHook, waitFor } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import * as realDataLayerModuleNamespace from '../../services/dataLayer'
import { useTraceStoreAvailability } from './useTraceStoreAvailability'

// Capture the real module before mocking (value snapshot — mock.module mutates
// the namespace in place) so it can be restored for later test files.
const realDataLayerModule = { ...realDataLayerModuleNamespace }

const fetchTraceStoreMetadata = mock()

mock.module('../../services/dataLayer', () => ({
  dataLayer: {
    fetchTraceStoreMetadata,
  },
}))

// bun:test has no per-file module-mock scoping (mock.restore does not undo
// mock.module), so restore the original bindings when this file is done.
afterAll(() => {
  mock.module('../../services/dataLayer', () => realDataLayerModule)
})

describe('useTraceStoreAvailability', () => {
  beforeEach(() => {
    fetchTraceStoreMetadata.mockReset()
  })

  it('reports presence when metadata exists for the ticket', async () => {
    fetchTraceStoreMetadata.mockResolvedValueOnce({
      exists: true,
      ticketCode: 'MDT-174',
      label: 'MDT-174/store.json',
    })

    const { result } = renderHook(() =>
      useTraceStoreAvailability({ projectCode: 'MDT', ticketCode: 'MDT-174', isEnabled: true }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.hasTraceStore).toBe(true)
    expect(result.current.metadata?.label).toBe('MDT-174/store.json')
    expect(fetchTraceStoreMetadata).toHaveBeenCalledWith('MDT', 'MDT-174')
  })

  it('reports absence when metadata says no store exists', async () => {
    fetchTraceStoreMetadata.mockResolvedValueOnce({
      exists: false,
      ticketCode: 'MDT-174',
      label: 'MDT-174/store.json',
    })

    const { result } = renderHook(() =>
      useTraceStoreAvailability({ projectCode: 'MDT', ticketCode: 'MDT-174', isEnabled: true }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.hasTraceStore).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('does not fetch until project and ticket are available', () => {
    const { result } = renderHook(() =>
      useTraceStoreAvailability({ projectCode: '', ticketCode: '', isEnabled: true }),
    )

    expect(result.current.loading).toBe(false)
    expect(result.current.hasTraceStore).toBe(false)
    expect(fetchTraceStoreMetadata).not.toHaveBeenCalled()
  })

  it('keeps Ticket Viewer usable when metadata fetch fails', async () => {
    fetchTraceStoreMetadata.mockRejectedValueOnce(new Error('Network failure'))

    const { result } = renderHook(() =>
      useTraceStoreAvailability({ projectCode: 'MDT', ticketCode: 'MDT-174', isEnabled: true }),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.hasTraceStore).toBe(false)
    expect(result.current.error).toBe('Network failure')
  })

  it('ignores stale metadata responses after ticket changes', async () => {
    let resolveFirst: (value: unknown) => void = () => {}
    fetchTraceStoreMetadata
      .mockImplementationOnce(() => new Promise(resolve => resolveFirst = resolve))
      .mockResolvedValueOnce({ exists: true, ticketCode: 'MDT-175', label: 'MDT-175/store.json' })

    const { result, rerender } = renderHook(
      ({ ticketCode }) => useTraceStoreAvailability({ projectCode: 'MDT', ticketCode, isEnabled: true }),
      { initialProps: { ticketCode: 'MDT-174' } },
    )

    rerender({ ticketCode: 'MDT-175' })
    await waitFor(() => expect(result.current.metadata?.ticketCode).toBe('MDT-175'))

    await act(async () => {
      resolveFirst({ exists: true, ticketCode: 'MDT-174', label: 'MDT-174/store.json' })
    })

    expect(result.current.metadata?.ticketCode).toBe('MDT-175')
  })
})
