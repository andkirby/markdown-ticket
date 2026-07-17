import type { ConfigSelectorDescriptor } from '../config/configApiClient'
/**
 * useBackendConfig hook (MDT-168).
 *
 * Owns backend-backed configuration state/actions: loads selector descriptors
 * with exposure metadata, stages scalar edits, applies them via the config API
 * client, and surfaces per-selector field errors + save status.
 *
 * Browser-only preferences (theme, default view, card density, event history,
 * document tree recents/sort/collapse) NEVER flow through this hook — they
 * remain in `src/config/*.ts` localStorage modules (BR-6.1, Edge-6). This hook
 * is only for backend-owned config selectors.
 */
import { useCallback, useEffect, useState } from 'react'
import { applyConfig, fetchConfigSelectors } from '../config/configApiClient'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseBackendConfigResult {
  selectors: ConfigSelectorDescriptor[]
  loading: boolean
  loadError: string | null
  /** Pending edits keyed by selector. */
  pendingEdits: Record<string, unknown>
  saveStatus: SaveStatus
  /** Field-level errors from the last apply attempt. */
  fieldErrors: Record<string, string>
  /** Stage an edit without saving. */
  stageEdit: (selector: string, value: unknown) => void
  /** Discard all staged edits. */
  discardEdits: () => void
  /** Apply one staged edit. Returns true on success. */
  applyOne: (selector: string) => Promise<boolean>
  /** Reload descriptors from the backend. */
  reload: () => Promise<void>
}

export function useBackendConfig(enabled: boolean): UseBackendConfigResult {
  const [selectors, setSelectors] = useState<ConfigSelectorDescriptor[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pendingEdits, setPendingEdits] = useState<Record<string, unknown>>({})
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const reload = useCallback(async () => {
    if (!enabled) {
      return
    }
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchConfigSelectors()
      setSelectors(data)
    }
    catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load configuration',
      )
    }
    finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (enabled) {
      void reload()
    }
  }, [enabled, reload])

  const stageEdit = useCallback((selector: string, value: unknown) => {
    setPendingEdits(prev => ({ ...prev, [selector]: value }))
    setSaveStatus('idle')
    setFieldErrors((prev) => {
      if (!(selector in prev)) {
        return prev
      }
      const next = { ...prev }
      delete next[selector]
      return next
    })
  }, [])

  const discardEdits = useCallback(() => {
    setPendingEdits({})
    setFieldErrors({})
    setSaveStatus('idle')
  }, [])

  const applyOne = useCallback(
    async (selector: string) => {
      const value = pendingEdits[selector]
      if (value === undefined) {
        return false
      }
      setSaveStatus('saving')
      const outcome = await applyConfig(selector, value)
      if (outcome.ok) {
        // commit the effective value into the descriptor list
        setSelectors(prev =>
          prev.map(s =>
            s.selector === selector ? { ...s, value: outcome.effective } : s,
          ),
        )
        setPendingEdits((prev) => {
          const next = { ...prev }
          delete next[selector]
          return next
        })
        setSaveStatus('saved')
        return true
      }
      else {
        setFieldErrors(prev => ({
          ...prev,
          [outcome.error.selector]: outcome.error.message,
        }))
        setSaveStatus('error')
        return false
      }
    },
    [pendingEdits],
  )

  return {
    selectors,
    loading,
    loadError,
    pendingEdits,
    saveStatus,
    fieldErrors,
    stageEdit,
    discardEdits,
    applyOne,
    reload,
  }
}
