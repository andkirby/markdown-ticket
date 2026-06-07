/**
 * Selector Data Hook (MDT-129)
 *
 * React hook for loading and managing selector data.
 * Fetches preferences + state from /api/config/selector.
 * Manages favorite toggle, usage tracking, and persistence.
 */

import type { SelectorData, SelectorPreferences, SelectorState } from './types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { authFetch } from '../../auth/authFetch'
import { isValidAccentHex, normalizeAccentHex } from '../../utils/accentColors'

interface UseSelectorDataOptions {
  loadOwnerState?: boolean
}

const DEFAULT_PREFERENCES: SelectorPreferences = {
  visibleCount: 7,
  compactInactive: true,
  accentEnabled: true,
  accentGradients: true,
}

export const SELECTOR_STATE_SYNC_EVENT = 'mdt:selector-state-updated'

/**
 * Hook for loading and managing selector data
 * Implements BR-7, BR-8, BR-10
 */
export function useSelectorData(options: UseSelectorDataOptions = {}): SelectorData {
  const { loadOwnerState = true } = options
  const [preferences, setPreferences] = useState<SelectorPreferences>(DEFAULT_PREFERENCES)
  const [selectorState, setSelectorState] = useState<Record<string, SelectorState>>({})
  const [error, setError] = useState<string | undefined>()
  const [loaded, setLoaded] = useState(false)
  const persistenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (persistenceTimerRef.current !== null) {
        clearTimeout(persistenceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!loadOwnerState || typeof window === 'undefined') {
      return
    }

    const handleSelectorStateSync = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, SelectorState>>
      if (customEvent.detail) {
        setSelectorState(customEvent.detail)
      }
    }

    window.addEventListener(SELECTOR_STATE_SYNC_EVENT, handleSelectorStateSync)
    return () => {
      window.removeEventListener(SELECTOR_STATE_SYNC_EVENT, handleSelectorStateSync)
    }
  }, [loadOwnerState])

  // Load initial data from API
  useEffect(() => {
    if (!loadOwnerState) {
      setPreferences(DEFAULT_PREFERENCES)
      setSelectorState({})
      setError(undefined)
      setLoaded(true)
      return
    }

    let cancelled = false
    const loadData = async () => {
      try {
        const response = await authFetch('/api/config/selector')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()

        if (cancelled)
          return

        const validatedPreferences = validatePreferences(data.preferences || {})
        const validatedState = validateSelectorState(data.selectorState || {})

        // Merge localStorage overrides (accentEnabled, accentGradients)
        const localOverrides = loadLocalPreferences()
        const merged = { ...validatedPreferences, ...localOverrides }

        setPreferences(merged)
        setSelectorState(validatedState)
        setLoaded(true)
        setError(undefined)
      }
      catch (err) {
        if (cancelled)
          return
        console.error('Failed to load selector data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setPreferences(DEFAULT_PREFERENCES)
        setSelectorState({})
        setLoaded(true)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [loadOwnerState])

  // Persist state changes to API (debounced)
  const persistState = useCallback((state: Record<string, SelectorState>) => {
    if (!loadOwnerState) {
      return
    }

    if (persistenceTimerRef.current !== null) {
      clearTimeout(persistenceTimerRef.current)
    }

    const timer = setTimeout(async () => {
      try {
        await authFetch('/api/config/selector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        })
      }
      catch (err) {
        console.error('Failed to persist selector state:', err)
      }
    }, 300)

    persistenceTimerRef.current = timer
  }, [loadOwnerState, preferences])

  // Track project usage (BR-5.3, BR-5.4, BR-5.5)
  const trackProjectUsage = useCallback((projectKey: string) => {
    setSelectorState((prevState) => {
      const existing = prevState[projectKey] || createDefaultSelectorStateEntry()

      const updated: SelectorState = {
        ...existing,
        lastUsedAt: new Date().toISOString(),
        count: existing.count + 1,
      }

      const newState = {
        ...prevState,
        [projectKey]: updated,
      }

      persistState(newState)
      broadcastSelectorState(newState)
      return newState
    })
  }, [persistState])

  // Toggle favorite state (BR-8.1, BR-8.2)
  const toggleFavorite = useCallback((projectKey: string) => {
    setSelectorState((prevState) => {
      const existing = prevState[projectKey] || createDefaultSelectorStateEntry()

      const updated: SelectorState = {
        ...existing,
        favorite: !existing.favorite,
      }

      const newState = {
        ...prevState,
        [projectKey]: updated,
      }

      persistState(newState)
      broadcastSelectorState(newState)
      return newState
    })
  }, [persistState])

  const setAccent = useCallback((projectKey: string, accent: string) => {
    if (!loadOwnerState || !isValidAccentHex(accent)) {
      return
    }

    setSelectorState((prevState) => {
      const existing = prevState[projectKey] || createDefaultSelectorStateEntry()
      const updated: SelectorState = {
        ...existing,
        accent: normalizeAccentHex(accent),
      }

      const newState = {
        ...prevState,
        [projectKey]: updated,
      }

      persistState(newState)
      broadcastSelectorState(newState)
      return newState
    })
  }, [loadOwnerState, persistState])

  const clearAccent = useCallback((projectKey: string) => {
    if (!loadOwnerState) {
      return
    }

    setSelectorState((prevState) => {
      const existing = prevState[projectKey] || createDefaultSelectorStateEntry()
      const { accent: _, ...withoutAccent } = existing
      const updated: SelectorState = withoutAccent as SelectorState

      const newState = {
        ...prevState,
        [projectKey]: updated,
      }

      persistState(newState)
      broadcastSelectorState(newState)
      return newState
    })
  }, [loadOwnerState, persistState])

  const persistPreferences = useCallback((prefs: SelectorPreferences) => {
    try {
      localStorage.setItem('mdt-selector-preferences', JSON.stringify(prefs))
    }
    catch {
      console.warn('Failed to persist selector preferences')
    }
  }, [])

  const setAccentEnabled = useCallback((enabled: boolean) => {
    setPreferences(prev => {
      const next = { ...prev, accentEnabled: enabled }
      persistPreferences(next)
      return next
    })
  }, [persistPreferences])

  const setAccentGradients = useCallback((gradients: boolean) => {
    setPreferences(prev => {
      const next = { ...prev, accentGradients: gradients }
      persistPreferences(next)
      return next
    })
  }, [persistPreferences])

  return {
    preferences,
    selectorState,
    trackProjectUsage,
    toggleFavorite,
    setAccent,
    clearAccent,
    setAccentEnabled,
    setAccentGradients,
    error,
    loaded,
  }
}

function loadLocalPreferences(): Partial<SelectorPreferences> {
  try {
    const stored = localStorage.getItem('mdt-selector-preferences')
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SelectorPreferences>
      return {
        ...(parsed.accentEnabled !== undefined && { accentEnabled: parsed.accentEnabled }),
        ...(parsed.accentGradients !== undefined && { accentGradients: parsed.accentGradients }),
      }
    }
  }
  catch { /* ignore */ }
  return {}
}

function validatePreferences(raw: Record<string, unknown>): SelectorPreferences {
  let visibleCount = DEFAULT_PREFERENCES.visibleCount
  const rawVisibleCount = raw.visibleCount
  if (typeof rawVisibleCount === 'number' && Number.isInteger(rawVisibleCount) && rawVisibleCount > 0) {
    visibleCount = rawVisibleCount
  }

  let compactInactive = DEFAULT_PREFERENCES.compactInactive
  const rawCompactInactive = raw.compactInactive
  if (typeof rawCompactInactive === 'boolean') {
    compactInactive = rawCompactInactive
  }

  let accentEnabled = DEFAULT_PREFERENCES.accentEnabled
  const rawAccentEnabled = raw.accentEnabled
  if (typeof rawAccentEnabled === 'boolean') {
    accentEnabled = rawAccentEnabled
  }

  let accentGradients = DEFAULT_PREFERENCES.accentGradients
  const rawAccentGradients = raw.accentGradients
  if (typeof rawAccentGradients === 'boolean') {
    accentGradients = rawAccentGradients
  }

  return {
    visibleCount,
    compactInactive,
    accentEnabled,
    accentGradients,
  }
}

function validateSelectorState(raw: Record<string, unknown>): Record<string, SelectorState> {
  const validated: Record<string, SelectorState> = {}

  for (const [projectKey, entry] of Object.entries(raw)) {
    if (typeof entry !== 'object' || entry === null) {
      continue
    }

    const stateEntry = entry as Record<string, unknown>

    let favorite = false
    if (typeof stateEntry.favorite === 'boolean') {
      favorite = stateEntry.favorite
    }

    let lastUsedAt: string | null = null
    if (typeof stateEntry.lastUsedAt === 'string') {
      const date = new Date(stateEntry.lastUsedAt)
      if (!Number.isNaN(date.getTime())) {
        lastUsedAt = stateEntry.lastUsedAt
      }
    }

    let count = 0
    if (typeof stateEntry.count === 'number' && Number.isInteger(stateEntry.count)) {
      count = Math.max(0, stateEntry.count)
    }

    const validatedEntry: SelectorState = {
      favorite,
      lastUsedAt,
      count,
    }

    if (typeof stateEntry.accent === 'string' && isValidAccentHex(stateEntry.accent)) {
      validatedEntry.accent = normalizeAccentHex(stateEntry.accent)
    }

    validated[projectKey] = validatedEntry
  }

  return validated
}

function createDefaultSelectorStateEntry(): SelectorState {
  return {
    favorite: false,
    lastUsedAt: null,
    count: 0,
  }
}

function broadcastSelectorState(state: Record<string, SelectorState>) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent<Record<string, SelectorState>>(SELECTOR_STATE_SYNC_EVENT, {
    detail: state,
  }))
}
