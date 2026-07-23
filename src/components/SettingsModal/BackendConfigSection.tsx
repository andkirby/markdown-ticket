/**
 * BackendConfigSection — owned Settings section for backend-backed global/user
 * configuration (MDT-168).
 *
 * Consumes the `useBackendConfig` hook to load editable selectors with exposure
 * metadata, stage edits, and apply them through the configuration management
 * API. Browser-only preferences are NOT rendered here (they stay in the
 * Appearance/Board tabs and never reach the backend).
 *
 * Mounted only for owner/admin callers (`canUseOwnerEndpoints`).
 */
import type { ChangeEvent } from 'react'
import { useBackendConfig } from '../../hooks/useBackendConfig'

function isBooleanSelector(selector: string): boolean {
  return selector.startsWith('links.') || selector === 'discovery.autoDiscover'
}

function isNumberSelector(selector: string): boolean {
  return selector.endsWith('.maxDepth') || selector.endsWith('.visibleCount')
}

export function BackendConfigSection({ enabled }: { enabled: boolean }) {
  const {
    selectors,
    loading,
    loadError,
    pendingEdits,
    saveStatus,
    fieldErrors,
    stageEdit,
    applyOne,
  } = useBackendConfig(enabled)

  if (!enabled) {
    return null
  }

  // Only render editable, non-guarded global/user selectors here. Guarded
  // selectors belong in advanced workflows; this section shows the safe,
  // common editable ones (links, discovery.autoDiscover, user prefs).
  const editable = selectors.filter(
    s =>
      s.exposure === 'editable' && (s.scope === 'global' || s.scope === 'user'),
  )

  if (loading && editable.length === 0) {
    return (
      <div className="settings-group">
        <label className="settings-label">Backend Configuration</label>
        <p className="settings-desc">Loading backend-owned settings…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="settings-group">
        <label className="settings-label">Backend Configuration</label>
        <p className="settings-desc text-destructive">
          Failed to load backend settings:
          {' '}
          {loadError}
        </p>
      </div>
    )
  }

  if (editable.length === 0) {
    return null
  }

  return (
    <div className="settings-group" data-testid="backend-config-section">
      <label className="settings-label">Backend Configuration</label>
      <p className="settings-desc">
        Server-owned settings persisted to config files. Browser-only
        preferences are not shown here.
      </p>

      {editable.map((s) => {
        const staged = pendingEdits[s.selector]
        const isStaged = staged !== undefined
        const displayValue = isStaged ? staged : s.value
        const error = fieldErrors[s.selector]

        return (
          <div key={s.selector} className="settings-group-row">
            <div>
              <label
                className="settings-label"
                htmlFor={`backend-cfg-${s.selector}`}
              >
                {s.selector}
              </label>
              <p className="settings-desc">{s.validation}</p>
              {error && (
                <p
                  className="settings-desc text-destructive"
                  data-testid={`backend-cfg-error-${s.selector}`}
                >
                  {error}
                </p>
              )}
            </div>

            {isBooleanSelector(s.selector)
              ? (
                  <input
                    id={`backend-cfg-${s.selector}`}
                    type="checkbox"
                    checked={Boolean(displayValue)}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      stageEdit(s.selector, e.target.checked)}
                    data-testid={`backend-cfg-input-${s.selector}`}
                  />
                )
              : isNumberSelector(s.selector)
                ? (
                    <input
                      id={`backend-cfg-${s.selector}`}
                      type="number"
                      value={Number(displayValue ?? 0)}
                      onChange={e =>
                        stageEdit(s.selector, Number(e.target.value))}
                      className="w-20 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800"
                      data-testid={`backend-cfg-input-${s.selector}`}
                    />
                  )
                : (
                    <span className="settings-desc">
                      {String(displayValue ?? '—')}
                    </span>
                  )}

            {isStaged && (
              <button
                type="button"
                onClick={() => applyOne(s.selector)}
                className="settings-action-btn"
                data-testid={`backend-cfg-save-${s.selector}`}
              >
                Save
              </button>
            )}
          </div>
        )
      })}

      {saveStatus === 'saved' && (
        <p className="settings-desc" data-testid="backend-config-saved">
          Saved.
        </p>
      )}
    </div>
  )
}
