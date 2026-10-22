import type { PinItem } from '@mdt/domain-contracts'
import { act, renderHook } from '@testing-library/react'
import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test'
import * as realPinsModuleNamespace from '../../config/pins'
import * as realUseToastModuleNamespace from '../useToast'

// Capture the real modules before mocking (value snapshots — mock.module
// mutates the namespace in place) so they can be restored for later files.
const realPinsModule = { ...realPinsModuleNamespace }
const realUseToastModule = { ...realUseToastModuleNamespace }

// Mock the pins client so the hook never reaches the network.
const loadPins = mock(async () => ({ pins: [] as PinItem[] }))
const savePins = mock(async (pins: PinItem[]) => ({ pins }))
mock.module('../../config/pins', () => ({ loadPins, savePins }))

// Mock useToast so sonner isn't pulled into the hook test.
const errorToast = mock(() => ({}))
const toastApi = { error: errorToast, success: mock(), warning: mock(), info: mock(), dismiss: mock() }
const getToastApi = () => toastApi
mock.module('../useToast', () => ({ useToast: getToastApi }))

// bun:test has no per-file module-mock scoping (mock.restore does not undo
// mock.module), so restore the original bindings when this file is done.
afterAll(() => {
  mock.module('../../config/pins', () => realPinsModule)
  mock.module('../useToast', () => realUseToastModule)
})

// eslint-disable-next-line import/first
import { usePins } from '../usePins'

function pin(projectCode: string, num: number, favoritedAt: string): PinItem {
  return { projectCode, ticketCode: `${projectCode}-${num}`, favoritedAt }
}

/** Flush React state updates from synchronous mutations. */
function flush(): Promise<void> {
  return act(async () => {
    await Promise.resolve()
  })
}

describe('usePins (MDT-197)', () => {
  beforeEach(() => {
    loadPins.mockReset()
    savePins.mockReset()
    errorToast.mockReset()
    loadPins.mockResolvedValue({ pins: [] })
    savePins.mockResolvedValue({ pins: [] })
  })

  it('loads the pin set on mount', async () => {
    loadPins.mockResolvedValueOnce({ pins: [pin('MDT', 42, '2026-08-05T00:00:00Z')] })
    const { result } = renderHook(() => usePins(true))
    expect(result.current.pins).toEqual([])
    await flush()
    expect(result.current.pins).toHaveLength(1)
    expect(result.current.pins[0].ticketCode).toBe('MDT-42')
  })

  it('addPin prepends (recency-first) and persists the whole list', async () => {
    const { result } = renderHook(() => usePins(true))
    await flush()

    let changed1 = false
    let changed2 = false
    act(() => {
      changed1 = result.current.addPin('MDT', 'MDT-1')
      changed2 = result.current.addPin('MDT', 'MDT-2')
    })

    expect(changed1).toBe(true)
    expect(changed2).toBe(true)
    // Most recent first
    expect(result.current.pins.map(p => p.ticketCode)).toEqual(['MDT-2', 'MDT-1'])
    // Persisted twice (one PUT per add), each with the whole list
    expect(savePins).toHaveBeenCalledTimes(2)
    expect(savePins.mock.calls[1][0]).toHaveLength(2)
  })

  it('addPin is a no-op when the pin already exists (keeps original recency)', async () => {
    const { result } = renderHook(() => usePins(true))
    await flush()

    act(() => {
      result.current.addPin('MDT', 'MDT-1')
      result.current.addPin('MDT', 'MDT-2')
    })
    savePins.mockClear()

    // Re-pin MDT-1: no reorder, no persist (already pinned).
    let changed = true
    act(() => {
      changed = result.current.addPin('MDT', 'MDT-1')
    })
    expect(changed).toBe(false)
    expect(result.current.pins.map(p => p.ticketCode)).toEqual(['MDT-2', 'MDT-1'])
    expect(savePins).not.toHaveBeenCalled()
  })

  it('removePin drops the pin and persists', async () => {
    const { result } = renderHook(() => usePins(true))
    await flush()
    act(() => {
      result.current.addPin('MDT', 'MDT-1')
      result.current.addPin('MDT', 'MDT-2')
    })
    savePins.mockClear()

    let changed = false
    act(() => {
      changed = result.current.removePin('MDT', 'MDT-1')
    })
    expect(changed).toBe(true)
    expect(result.current.pins.map(p => p.ticketCode)).toEqual(['MDT-2'])
    expect(savePins).toHaveBeenCalledTimes(1)
    expect(savePins.mock.calls[0][0]).toHaveLength(1)
  })

  it('mutations are blocked when canWrite is false (read-only)', async () => {
    const { result } = renderHook(() => usePins(false))
    await flush()

    let added = true
    let removed = true
    act(() => {
      added = result.current.addPin('MDT', 'MDT-1')
      removed = result.current.removePin('MDT', 'MDT-1')
    })
    expect(added).toBe(false)
    expect(removed).toBe(false)
    expect(result.current.pins).toEqual([])
    expect(savePins).not.toHaveBeenCalled()
  })

  it('isPinned reflects current state', async () => {
    const { result } = renderHook(() => usePins(true))
    await flush()
    act(() => {
      result.current.addPin('MDT', 'MDT-42')
    })

    expect(result.current.isPinned('MDT', 'MDT-42')).toBe(true)
    expect(result.current.isPinned('MDT', 'MDT-99')).toBe(false)
    expect(result.current.isPinned('OTHER', 'OTHER-42')).toBe(false)
  })

  it('disambiguates same numeric code across projects (Edge-5)', async () => {
    const { result } = renderHook(() => usePins(true))
    await flush()
    act(() => {
      result.current.addPin('MDT', 'MDT-42')
      result.current.addPin('OTHER', 'OTHER-42')
    })

    expect(result.current.pins).toHaveLength(2)
    expect(result.current.isPinned('MDT', 'MDT-42')).toBe(true)
    expect(result.current.isPinned('OTHER', 'OTHER-42')).toBe(true)
    // Removing one leaves the other.
    act(() => {
      result.current.removePin('MDT', 'MDT-42')
    })
    expect(result.current.isPinned('MDT', 'MDT-42')).toBe(false)
    expect(result.current.isPinned('OTHER', 'OTHER-42')).toBe(true)
  })
})
