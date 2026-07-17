import type { ConfigSelectorDescriptor } from '../config/configApiClient'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

// Mock the config API client so the hook never reaches the network.
const fetchConfigSelectors = mock(async (): Promise<ConfigSelectorDescriptor[]> => [
  { selector: 'links.enableTicketLinks', scope: 'global', exposure: 'editable', ownerSurface: 'settings', validation: 'Boolean.', value: true },
])
const applyConfig = mock(async (selector: string, _value: unknown) => {
  if (selector === 'bad.selector') {
    return { ok: false, error: { selector, message: 'Invalid value.' } } as const
  }
  return { ok: true, selector, effective: false, filePath: '/x/config.toml' } as const
})

mock.module('../config/configApiClient', () => ({
  fetchConfigSelectors,
  applyConfig,
}))

// eslint-disable-next-line import/first
import { useBackendConfig as useHook } from './useBackendConfig'

describe('useBackendConfig hook', () => {
  beforeEach(() => {
    fetchConfigSelectors.mockClear()
    applyConfig.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('loads selector descriptors when enabled', async () => {
    const { result } = renderHook(() => useHook(true))
    await waitFor(() => {
      expect(result.current.selectors.length).toBeGreaterThan(0)
    })
    expect(result.current.selectors[0].selector).toBe('links.enableTicketLinks')
  })

  it('does not load when disabled', async () => {
    renderHook(() => useHook(false))
    expect(fetchConfigSelectors).not.toHaveBeenCalled()
  })

  it('stages an edit without saving and discards on demand', async () => {
    const { result } = renderHook(() => useHook(true))
    await waitFor(() => expect(result.current.selectors.length).toBeGreaterThan(0))

    act(() => {
      result.current.stageEdit('links.enableTicketLinks', false)
    })
    expect(result.current.pendingEdits['links.enableTicketLinks']).toBe(false)
    expect(result.current.saveStatus).toBe('idle')

    act(() => {
      result.current.discardEdits()
    })
    expect(Object.keys(result.current.pendingEdits)).toHaveLength(0)
  })

  it('applies a staged edit and commits the effective value', async () => {
    const { result } = renderHook(() => useHook(true))
    await waitFor(() => expect(result.current.selectors.length).toBeGreaterThan(0))

    act(() => {
      result.current.stageEdit('links.enableTicketLinks', false)
    })
    let success = false
    await act(async () => {
      success = await result.current.applyOne('links.enableTicketLinks')
    })
    expect(success).toBe(true)
    expect(result.current.saveStatus).toBe('saved')
    expect(result.current.selectors.find(s => s.selector === 'links.enableTicketLinks')?.value).toBe(false)
  })

  it('surfaces a field error on a rejected apply', async () => {
    const { result } = renderHook(() => useHook(true))
    await waitFor(() => expect(result.current.selectors.length).toBeGreaterThan(0))

    act(() => {
      result.current.stageEdit('bad.selector', 'whatever')
    })
    await act(async () => {
      await result.current.applyOne('bad.selector')
    })
    expect(result.current.saveStatus).toBe('error')
    expect(result.current.fieldErrors['bad.selector']).toBe('Invalid value.')
  })

  it('never triggers a backend call for a browser-only change (isolation)', () => {
    // The hook is only for backend selectors; browser-only prefs use src/config/*.ts.
    // This test documents that staging a browser-only selector through this hook is
    // not its responsibility — no fetch/apply is invoked until applyOne.
    const { result } = renderHook(() => useHook(true))
    const callsBefore = applyConfig.mock.calls.length
    act(() => {
      // intentionally staging something; applyConfig must NOT fire until applyOne
      result.current.stageEdit('links.enableTicketLinks', true)
    })
    expect(applyConfig.mock.calls.length).toBe(callsBefore)
  })
})

function cleanup(): void {
  // testing-library/react v16 auto-cleans; keep a noop for symmetry.
}
