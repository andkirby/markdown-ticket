import type * as React from 'react'
import type { Project } from '@mdt/shared/models/Project'
import type { SelectorState } from '../ProjectSelector/types'
import { Check, ChevronDown, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ACCENT_PALETTE, getFallbackAccent, isValidAccentHex, normalizeAccentHex } from '@/utils/accentColors'

interface ProjectAccentsProps {
  projects: Project[]
  defaultProjectCode?: string
  selectorState: Record<string, SelectorState>
  loaded: boolean
  onAccentChange: (projectKey: string, accent: string) => void
  onAccentReset: (projectKey: string) => void
  onSave: () => void
  hasUnsavedChanges: boolean
}

const CHOOSE_COLOR_URL = 'https://share.google/ATp6ypatbFk69dC91'

export function ProjectAccents({
  projects,
  defaultProjectCode,
  selectorState,
  loaded,
  onAccentChange,
  onAccentReset,
  onSave,
  hasUnsavedChanges,
}: ProjectAccentsProps): React.JSX.Element {
  const projectOptions = useMemo(
    () => projects.map(p => ({ code: p.project.code, name: p.project.name || p.project.code })),
    [projects],
  )

  const [selectedCode, setSelectedCode] = useState<string>(
    () => defaultProjectCode || projectOptions[0]?.code || '',
  )

  // Keep selected in sync if projects change
  useEffect(() => {
    if (projectOptions.length > 0 && !projectOptions.some(p => p.code === selectedCode)) {
      setSelectedCode(projectOptions[0].code)
    }
  }, [projectOptions, selectedCode])

  const currentEntry = selectorState[selectedCode]
  const currentAccent = currentEntry?.accent
  const hasAccent = !!currentAccent
  const resolvedAccent = currentAccent || getFallbackAccent(selectedCode)

  const normalizedValue = useMemo(() => {
    if (!currentAccent || !isValidAccentHex(currentAccent)) {
      return ''
    }
    return normalizeAccentHex(currentAccent)
  }, [currentAccent])

  const fallbackHex = useMemo(() => getFallbackAccent(selectedCode), [selectedCode])

  const [customHex, setCustomHex] = useState(normalizedValue)
  const [validationError, setValidationError] = useState<string | undefined>()
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Sync when project changes
  useEffect(() => {
    setCustomHex(normalizedValue)
    setValidationError(undefined)
  }, [normalizedValue, selectedCode])

  const handlePresetSelect = useCallback((hex: string) => {
    const normalized = normalizeAccentHex(hex)
    setCustomHex(normalized)
    setValidationError(undefined)
    onAccentChange(selectedCode, normalized)
  }, [onAccentChange, selectedCode])

  const handleInputChange = useCallback((value: string) => {
    setCustomHex(value)
    if (validationError) {
      setValidationError(undefined)
    }
  }, [validationError])

  const commitHex = useCallback(() => {
    const nextValue = customHex.trim()
    if (!nextValue) {
      setValidationError(undefined)
      return
    }
    if (!isValidAccentHex(nextValue)) {
      setValidationError('Enter a valid hex like #2563eb')
      return
    }
    const normalized = normalizeAccentHex(nextValue)
    setCustomHex(normalized)
    setValidationError(undefined)
    if (normalized !== normalizedValue) {
      onAccentChange(selectedCode, normalized)
    }
  }, [customHex, normalizedValue, onAccentChange, selectedCode])

  const handleReset = useCallback(() => {
    setCustomHex('')
    setValidationError(undefined)
    onAccentReset(selectedCode)
  }, [onAccentReset, selectedCode])

  if (!loaded) {
    return <p className="settings-desc mt-1">Loading…</p>
  }

  return (
    <div className="project-accents" data-testid="project-accents-section">
      {/* Row 1: label + dropdown (rendered by host) — dropdown is here */}
      <select
        data-testid="accent-project-select"
        value={selectedCode}
        onChange={e => setSelectedCode(e.target.value)}
        className="settings-select project-accents__select"
      >
        {projectOptions.map(p => (
          <option key={p.code} value={p.code}>{p.name} ({p.code})</option>
        ))}
      </select>

      {/* Row 2: swatch + hex input + reset + expand */}
      <div className="project-accents__row">
        <span
          className="project-accents__swatch"
          style={{ backgroundColor: resolvedAccent }}
        />
        <div className="project-accents__field">
          <input
            data-testid="accent-custom-hex-input"
            type="text"
            inputMode="text"
            value={customHex}
            placeholder={fallbackHex}
            className="project-accents__input"
            onChange={e => handleInputChange(e.target.value)}
            onBlur={commitHex}
            onKeyDown={e => { if (e.key === 'Enter') commitHex() }}
          />
          {validationError && (
            <p className="project-accents__error" data-testid="accent-validation-error">
              {validationError}
            </p>
          )}
        </div>
        {hasAccent && (
          <button
            type="button"
            className="project-accents__icon-btn"
            data-testid="accent-reset-button"
            title="Reset to default"
            onClick={handleReset}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        {hasUnsavedChanges && (
          <button
            type="button"
            className="project-accents__icon-btn project-accents__save-btn"
            data-testid="save-accents-button"
            title="Save changes"
            onClick={onSave}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          className="project-accents__icon-btn"
          data-testid="accent-palette-toggle"
          title="Color palette"
          onClick={() => setPaletteOpen(prev => !prev)}
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${paletteOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Collapsible preset palette */}
      {paletteOpen && (
        <div className="project-accents__palette" data-testid="accent-palette">
          <div className="accent-color-picker__preset-grid" data-testid="project-accent-presets">
            {ACCENT_PALETTE.map(accent => (
              <button
                key={accent.name}
                type="button"
                className="accent-color-picker__preset"
                data-testid={`accent-preset-${accent.name}`}
                data-selected={normalizedValue === accent.hex}
                aria-label={`Select ${accent.name} accent`}
                title={accent.name}
                onClick={() => handlePresetSelect(accent.hex)}
              >
                <span
                  className="accent-color-picker__preset-swatch"
                  style={{ backgroundColor: accent.hex }}
                />
                <span className="accent-color-picker__preset-name">{accent.name}</span>
              </button>
            ))}
          </div>

          <a
            className="accent-color-picker__link"
            data-testid="accent-choose-color-link"
            href={CHOOSE_COLOR_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Choose color ↗
          </a>
        </div>
      )}
    </div>
  )
}
