import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'bun:test'

import {
  getPinRailEnabled,
  getPinRailPinned,
  setPinRailEnabledPreference,
  setPinRailPinnedPreference,
} from '../../config/settingsPreferences'

import { usePinRailPref } from '../usePinRailPref'

describe('usePinRailPref (MDT-197)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to enabled=true, pinned=true', () => {
    const { result } = renderHook(() => usePinRailPref())
    expect(result.current.enabled).toBe(true)
    expect(result.current.pinned).toBe(true)
  })

  it('setEnabled persists and reflects locally', () => {
    const { result } = renderHook(() => usePinRailPref())
    act(() => {
      result.current.setEnabled(false)
    })
    expect(result.current.enabled).toBe(false)
    expect(getPinRailEnabled()).toBe(false)
    expect(localStorage.getItem('mdt-settings-pin-rail-enabled')).toBe('0')
  })

  it('setPinned persists and reflects locally', () => {
    const { result } = renderHook(() => usePinRailPref())
    act(() => {
      result.current.setPinned(false)
    })
    expect(result.current.pinned).toBe(false)
    expect(getPinRailPinned()).toBe(false)
    expect(localStorage.getItem('mdt-settings-pin-rail-pinned')).toBe('0')
  })

  it('responds to the change event (Settings toggle from another consumer)', () => {
    const { result } = renderHook(() => usePinRailPref())
    expect(result.current.enabled).toBe(true)
    act(() => {
      setPinRailEnabledPreference(false)
    })
    expect(result.current.enabled).toBe(false)
    act(() => {
      setPinRailPinnedPreference(false)
    })
    expect(result.current.pinned).toBe(false)
  })
})
