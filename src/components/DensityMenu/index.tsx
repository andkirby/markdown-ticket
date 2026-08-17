import type { CardDensity, SpaceDensity } from '../../config/settingsPreferences'
import { Grid2x2 } from 'lucide-react'
import * as React from 'react'
import { createPortal } from 'react-dom'
import { useAnchoredPopover } from '@/components/shared/useAnchoredPopover'
import {
  getCardDensity,
  getSpaceDensity,
  setCardDensityPreference,
  setSpaceDensityPreference,
} from '../../config/settingsPreferences'

/**
 * DensityMenu — header control for the two-axis density system (design3
 * §Density): SIZE (compact/regular/comfortable — text & elements) and SPACE
 * (tight/normal/relaxed — padding & gaps). Self-contained: reads and writes
 * the preference layer directly; useCardDensity applies the tokens.
 *
 * @testid density-menu — root
 * @testid density-menu-trigger — trigger button
 * @testid density-menu-size-{value} — size tiles (compact|regular|comfortable)
 * @testid density-menu-space-{value} — space tiles (tight|normal|relaxed)
 * @testid density-menu-reset — reset link
 */

const SIZE_OPTIONS: Array<{ value: CardDensity, label: string, lines: [string, string] }> = [
  { value: 'compact', label: 'Compact', lines: ['50%', '70%'] },
  { value: 'regular', label: 'Regular', lines: ['55%', '75%'] },
  { value: 'comfortable', label: 'Comfortable', lines: ['60%', '80%'] },
]

const SPACE_OPTIONS: Array<{ value: SpaceDensity, label: string }> = [
  { value: 'tight', label: 'Tight' },
  { value: 'normal', label: 'Normal' },
  { value: 'relaxed', label: 'Relaxed' },
]

const SIZE_LINE_HEIGHT: Record<CardDensity, string> = {
  compact: '2px',
  regular: '4px',
  comfortable: '6px',
}
const SPACE_BOX_SCALE: Record<SpaceDensity, string> = {
  tight: '90%',
  normal: '75%',
  relaxed: '55%',
}

export const DensityMenu: React.FC = () => {
  const { open, toggle, position, triggerRef, popoverRef } = useAnchoredPopover()
  const [size, setSize] = React.useState<CardDensity>(getCardDensity)
  const [space, setSpace] = React.useState<SpaceDensity>(getSpaceDensity)

  const pickSize = (value: CardDensity) => {
    setSize(value)
    setCardDensityPreference(value)
  }
  const pickSpace = (value: SpaceDensity) => {
    setSpace(value)
    setSpaceDensityPreference(value)
  }
  const reset = () => {
    pickSize('regular')
    pickSpace('normal')
  }

  return (
    <div data-testid="density-menu" className="density-menu">
      <button
        ref={triggerRef}
        type="button"
        data-testid="density-menu-trigger"
        className="density-menu__trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Density"
        title="Density"
        onClick={toggle}
      >
        <Grid2x2 aria-hidden="true" />
        <span className="density-menu__label">Density</span>
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          className="density-menu__popover"
          role="dialog"
          aria-label="Density"
          style={{ top: position.top, left: position.left }}
        >
          <div className="density-menu__section">
            <div className="density-menu__section-head">
              Size
              <span className="density-menu__section-hint">Text &amp; elements</span>
            </div>
            <div className="density-menu__tiles" role="group" aria-label="Size">
              {SIZE_OPTIONS.map(({ value, label, lines }) => (
                <button
                  key={value}
                  type="button"
                  data-testid={`density-menu-size-${value}`}
                  className="density-menu__tile"
                  aria-pressed={size === value}
                  onClick={() => pickSize(value)}
                >
                  <span className="density-menu__preview-lines" aria-hidden="true">
                    <div style={{ height: SIZE_LINE_HEIGHT[value], width: lines[0] }} />
                    <div style={{ height: SIZE_LINE_HEIGHT[value], width: lines[1] }} />
                  </span>
                  <span className="density-menu__tile-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="density-menu__section">
            <div className="density-menu__section-head">
              Space
              <span className="density-menu__section-hint">Padding &amp; gaps</span>
            </div>
            <div className="density-menu__tiles" role="group" aria-label="Space">
              {SPACE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  data-testid={`density-menu-space-${value}`}
                  className="density-menu__tile"
                  aria-pressed={space === value}
                  onClick={() => pickSpace(value)}
                >
                  <span className="density-menu__preview-box" aria-hidden="true">
                    <div style={{ width: SPACE_BOX_SCALE[value], height: SPACE_BOX_SCALE[value] }} />
                  </span>
                  <span className="density-menu__tile-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="density-menu__footer">
            <span className="density-menu__readout">
              {size}
              {' '}
              ·
              {' '}
              {space}
            </span>
            <button type="button" data-testid="density-menu-reset" className="density-menu__reset" onClick={reset}>
              Reset
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
