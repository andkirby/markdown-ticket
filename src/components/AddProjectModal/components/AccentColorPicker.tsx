import type * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { ACCENT_PALETTE, isValidAccentHex, normalizeAccentHex } from '@/utils/accentColors'

interface AccentColorPickerProps {
  value?: string
  onChange: (accent: string) => void
  onReset?: () => void
  error?: string
  disabled?: boolean
}

const CHOOSE_COLOR_URL = 'https://share.google/ATp6ypatbFk69dC91'

export function AccentColorPicker({ value, onChange, onReset, error, disabled = false }: AccentColorPickerProps): React.JSX.Element {
  const normalizedValue = useMemo(() => {
    if (!value || !isValidAccentHex(value)) {
      return ''
    }

    return normalizeAccentHex(value)
  }, [value])

  const [customHex, setCustomHex] = useState(normalizedValue)
  const [validationError, setValidationError] = useState(error)

  useEffect(() => {
    if (normalizedValue) {
      setCustomHex(normalizedValue)
    }
  }, [normalizedValue])

  useEffect(() => {
    setValidationError(error)
  }, [error])

  const handlePresetSelect = (accent: string) => {
    if (disabled) {
      return
    }

    const normalizedAccent = normalizeAccentHex(accent)
    setCustomHex(normalizedAccent)
    setValidationError(undefined)
    onChange(normalizedAccent)
  }

  const handleCustomBlur = () => {
    const nextValue = customHex.trim()
    if (!nextValue) {
      setValidationError(undefined)
      return
    }

    if (!isValidAccentHex(nextValue)) {
      setValidationError('Enter a valid 6-digit hex color like #2563eb.')
      return
    }

    const normalizedAccent = normalizeAccentHex(nextValue)
    setCustomHex(normalizedAccent)
    setValidationError(undefined)

    if (normalizedAccent !== normalizedValue) {
      onChange(normalizedAccent)
    }
  }

  return (
    <div className="accent-color-picker" data-testid="project-accent-picker">
      <div className="accent-color-picker__header">
        <p className="accent-color-picker__label">Pick from presets or enter a custom hex color.</p>
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

      <div className="accent-color-picker__preset-grid" data-testid="project-accent-presets">
        {ACCENT_PALETTE.map(accent => (
          <button
            key={accent.name}
            type="button"
            className="accent-color-picker__preset"
            data-testid={`accent-preset-${accent.name}`}
            data-selected={normalizedValue === accent.hex}
            disabled={disabled}
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

      <div className="accent-color-picker__custom-field">
        <label className="accent-color-picker__custom-label" htmlFor="accent-custom-hex-input">
          Custom hex
        </label>
        <input
          id="accent-custom-hex-input"
          data-testid="accent-custom-hex-input"
          type="text"
          inputMode="text"
          value={customHex}
          disabled={disabled}
          placeholder="#2563eb"
          className="accent-color-picker__custom-input"
          onChange={(event) => {
            setCustomHex(event.target.value)
            if (validationError) {
              setValidationError(undefined)
            }
          }}
          onBlur={handleCustomBlur}
        />
        {validationError ? (
          <p className="accent-color-picker__error" data-testid="accent-validation-error">
            {validationError}
          </p>
        ) : null}
      </div>

      {onReset && normalizedValue ? (
        <button
          type="button"
          className="accent-color-picker__reset"
          data-testid="accent-reset-button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setCustomHex('')
              setValidationError(undefined)
              onReset()
            }
          }}
        >
          Reset to default
        </button>
      ) : null}
    </div>
  )
}
