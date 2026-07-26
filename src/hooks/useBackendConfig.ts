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
 *
 * MDT-168 UAT 2026-07-26 / BR-7.1: after a successful applyConfig for
 * `ui.projectSelector.visibleCount` or `ui.projectSelector.compactInactive`,
 * this hook notifies live project selector consumers by dispatching the
 * existing narrow named window event already consumed by `useSelectorData`
 * (`SELECTOR_PREFS_SYNC_EVENT`). The notification fires ONLY for those two
 * selectors — it is not a generic event bus and is not broadcast on other
 * config writes. This PoC transport is intentionally narrow; a server-side
 * SSE-based config:changed event is the target architecture for the wider
 * selector-refresh contract (see follow-up CR).
 */
import { useCallback, useEffect, useState } from 'react'
import { SELECTOR_PREFS_SYNC_EVENT } from '../components/ProjectSelector/useSelectorData'
import { applyConfig, fetchConfigSelectors } from '../config/configApiClient'

/**
 * Selectors whose successful write requires a same-browser consumer refresh
 * of the project selector rail (BR-7.1). Keep this list narrow: every entry
 * here is a feature the config layer is coupled to. Adding selectors to this
 * set is the PoC's known scaling limit and is gated by the follow-up CR.
 */
const SELECTOR_PREFS_REFRESH_SELECTORS: ReadonlySet<string> = new Set([
  'ui.projectSelector.visibleCount',
  'ui.projectSelector.compactInactive',
])

function notifySelectorPrefsConsumers(): void {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new CustomEvent(SELECTOR_PREFS_SYNC_EVENT))
}

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
        // BR-7.1: notify live selector consumers after a successful
        // ui.projectSelector.* save so they can re-fetch backend prefs.
        if (SELECTOR_PREFS_REFRESH_SELECTORS.has(selector)) {
          notifySelectorPrefsConsumers()
        }
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
