import type { CardDensity, SpaceDensity } from '../config/settingsPreferences'
/**
 * Density driver (design3 §Density) — bridges the two density preference axes
 * to v3 card tokens on <html>:
 *
 *   SIZE  (CardDensity:  compact / regular / comfortable) → --fs-xs / --fs-md / --radius-card
 *   SPACE (SpaceDensity: tight / normal / relaxed)        → --pad-y / --pad-x
 *
 * The axes are independent: text scale and padding/gaps respond separately,
 * exactly like the design3 Density panel. Mounted once at the app root.
 * Responds to live preference changes via change events and cross-tab sync
 * via the `storage` event.
 */
import { useEffect } from 'react'
import {
  CARD_DENSITY_CHANGE_EVENT,
  getCardDensity,
  getSpaceDensity,
  SPACE_DENSITY_CHANGE_EVENT,
} from '../config/settingsPreferences'

const SIZE_VARS: Record<CardDensity, Record<string, string>> = {
  compact: {
    '--fs-xs': '10px',
    '--fs-md': '12px',
    '--radius-card': '4px',
  },
  regular: {
    '--fs-xs': '11px',
    '--fs-md': '13px',
    '--radius-card': '8px',
  },
  comfortable: {
    '--fs-xs': '12px',
    '--fs-md': '14px',
    '--radius-card': '8px',
  },
}

const SPACE_VARS: Record<SpaceDensity, Record<string, string>> = {
  tight: {
    '--pad-y': '6px',
    '--pad-x': '8px',
  },
  normal: {
    '--pad-y': '10px',
    '--pad-x': '12px',
  },
  relaxed: {
    '--pad-y': '14px',
    '--pad-x': '16px',
  },
}

export function useCardDensity(): void {
  useEffect(() => {
    const apply = (): void => {
      const sizeVars = SIZE_VARS[getCardDensity()] ?? SIZE_VARS.regular
      const spaceVars = SPACE_VARS[getSpaceDensity()] ?? SPACE_VARS.normal
      for (const [prop, value] of Object.entries({ ...sizeVars, ...spaceVars })) {
        document.documentElement.style.setProperty(prop, value)
      }
    }
    apply()
    window.addEventListener(CARD_DENSITY_CHANGE_EVENT, apply)
    window.addEventListener(SPACE_DENSITY_CHANGE_EVENT, apply)
    window.addEventListener('storage', apply)
    return () => {
      window.removeEventListener(CARD_DENSITY_CHANGE_EVENT, apply)
      window.removeEventListener(SPACE_DENSITY_CHANGE_EVENT, apply)
      window.removeEventListener('storage', apply)
    }
  }, [])
}
