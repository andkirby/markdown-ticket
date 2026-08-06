/**
 * MDT-197: pin rail user preferences.
 *
 * Two independent browser-only toggles, both mirroring the CardDensity pattern
 * (localStorage + window event broadcast + cross-tab storage sync):
 * - enabled: whether the pin rail feature exists at all (rail + collapsed strip).
 * - pinned: whether the rail stays open (true) or auto-collapses to the strip.
 *
 * Mounted once at the app root (App.tsx). Consumers read from this hook so a
 * Settings toggle or cross-tab change re-renders the rail live.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  getPinRailEnabled,
  getPinRailPinned,
  PIN_RAIL_ENABLED_CHANGE_EVENT,
  PIN_RAIL_PINNED_CHANGE_EVENT,
  setPinRailEnabledPreference,
  setPinRailPinnedPreference,
} from '../config/settingsPreferences'

export interface UsePinRailPrefResult {
  enabled: boolean
  pinned: boolean
  setEnabled: (enabled: boolean) => void
  setPinned: (pinned: boolean) => void
}

export function usePinRailPref(): UsePinRailPrefResult {
  const [enabled, setEnabledState] = useState<boolean>(getPinRailEnabled)
  const [pinned, setPinnedState] = useState<boolean>(getPinRailPinned)

  useEffect(() => {
    const syncEnabled = (): void => {
      setEnabledState(getPinRailEnabled())
    }
    const syncPinned = (): void => {
      setPinnedState(getPinRailPinned())
    }
    const syncStorage = (event: StorageEvent): void => {
      if (event.key === 'mdt-settings-pin-rail-enabled') {
        syncEnabled()
      }
      if (event.key === 'mdt-settings-pin-rail-pinned') {
        syncPinned()
      }
    }
    window.addEventListener(PIN_RAIL_ENABLED_CHANGE_EVENT, syncEnabled)
    window.addEventListener(PIN_RAIL_PINNED_CHANGE_EVENT, syncPinned)
    window.addEventListener('storage', syncStorage)
    return () => {
      window.removeEventListener(PIN_RAIL_ENABLED_CHANGE_EVENT, syncEnabled)
      window.removeEventListener(PIN_RAIL_PINNED_CHANGE_EVENT, syncPinned)
      window.removeEventListener('storage', syncStorage)
    }
  }, [])

  const setEnabled = useCallback((value: boolean) => {
    setPinRailEnabledPreference(value)
    setEnabledState(value)
  }, [])

  const setPinned = useCallback((value: boolean) => {
    setPinRailPinnedPreference(value)
    setPinnedState(value)
  }, [])

  return { enabled, pinned, setEnabled, setPinned }
}
