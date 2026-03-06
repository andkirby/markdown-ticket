/**
 * Selector Data Hook (MDT-129)
 *
 * React hook for loading and managing selector data.
 * Fetches preferences + state from /api/config/selector.
 * Manages favorite toggle, usage tracking, and persistence.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SelectorData, SelectorPreferences, SelectorState } from './types'

const DEFAULT_PREFERENCES: SelectorPreferences = {
  visibleCount: 7,
  compactInactive: true,
}

/**
 * Hook for loading and managing selector data
 * Implements BR-7, BR-8, BR-10
 */
export function useSelectorData(): SelectorData & {
  trackProjectUsage: (projectKey: string) => void
  toggleFavorite: (projectKey: string) => void
  error?: string
  loaded: boolean
} {
  const [preferences, setPreferences] = useState<SelectorPreferences>(DEFAULT_PREFERENCES)
  const [selectorState, setSelectorState] = useState<Record<string, SelectorState>>({})
  const [error, setError] = useState<string | undefined>()
  const [loaded, setLoaded] = useState(false)
  const persistenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load initial data from API
  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      try {
        const response = await fetch('/api/config/selector')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()

        if (cancelled) return

        // Validate and sanitize preferences
        const validatedPreferences = validatePreferences(data.preferences || {})

        // Validate and sanitize selector state
        const validatedState = validateSelectorState(data.selectorState || {})

        setPreferences(validatedPreferences)
        setSelectorState(validatedState)
        setLoaded(true)
        setError(undefined)
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load selector data:', err)
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        setPreferences(DEFAULT_PREFERENCES)
        setSelectorState({})
        setLoaded(true)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [])

  // Persist state changes to API (debounced)
  const persistState = useCallback((state: Record<string, SelectorState>) => {
    if (persistenceTimerRef.current !== null) {
      clearTimeout(persistenceTimerRef.current)
    }

    const timer = setTimeout(async () => {
      try {
        await fetch('/api/config/selector', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        })
      } catch (err) {
        console.error('Failed to persist selector state:', err)
      }
    }, 300)

    persistenceTimerRef.current = timer
  }, [])

  // Track project usage (BR-5.3, BR-5.4, BR-5.5)
  const trackProjectUsage = useCallback((projectKey: string) => {
    setSelectorState(prevState => {
      const existing = prevState[projectKey] || {
        favorite: false,
        lastUsedAt: null,
        count: 0,
      }

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
      return newState
    })
  }, [persistState])

  // Toggle favorite state (BR-8.1, BR-8.2)
  const toggleFavorite = useCallback((projectKey: string) => {
    setSelectorState(prevState => {
      const existing = prevState[projectKey] || {
        favorite: false,
        lastUsedAt: null,
        count: 0,
      }

      const updated: SelectorState = {
        ...existing,
        favorite: !existing.favorite,
      }

      const newState = {
        ...prevState,
        [projectKey]: updated,
      }

      persistState(newState)
      return newState
    })
  }, [persistState])

  return {
    preferences,
    selectorState,
    trackProjectUsage,
    toggleFavorite,
    error,
    loaded,
  }
}

/**
 * Validate and sanitize preferences from API
 * Implements BR-7.4, BR-7.5
 */
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

  // Return only known fields
  return {
    visibleCount,
    compactInactive,
  }
}

/**
 * Validate and sanitize selector state from API
 * Implements BR-10.x validation
 */
function validateSelectorState(raw: Record<string, unknown>): Record<string, SelectorState> {
  const validated: Record<string, SelectorState> = {}

  for (const [projectKey, entry] of Object.entries(raw)) {
    if (typeof entry !== 'object' || entry === null) {
      continue
    }

    const stateEntry = entry as Record<string, unknown>

    // Validate favorite: non-boolean treats as false
    let favorite = false
    if (typeof stateEntry.favorite === 'boolean') {
      favorite = stateEntry.favorite
    }

    // Validate lastUsedAt: invalid dates become null
    let lastUsedAt: string | null = null
    if (typeof stateEntry.lastUsedAt === 'string') {
      const date = new Date(stateEntry.lastUsedAt)
      if (!isNaN(date.getTime())) {
        lastUsedAt = stateEntry.lastUsedAt
      }
    }

    // Validate count: non-integer or negative becomes 0
    let count = 0
    if (typeof stateEntry.count === 'number' && Number.isInteger(stateEntry.count)) {
      count = Math.max(0, stateEntry.count)
    }

    // Include entry if at least one field is valid
    validated[projectKey] = {
      favorite,
      lastUsedAt,
      count,
    }
  }

  return validated
}
