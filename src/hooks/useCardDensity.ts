import type { CardDensity } from '../config/settingsPreferences'
/**
 * v3 card-density driver — bridges the `CardDensity` user preference to v3
 * card tokens (--pad-y/--pad-x/--fs-xs/--fs-md/--radius-card) on <html>.
 *
 * Mounted once at the app root. Responds to live preference changes via
 * CARD_DENSITY_CHANGE_EVENT and cross-tab sync via the `storage` event.
 */
import { useEffect } from 'react'
import {
  CARD_DENSITY_CHANGE_EVENT,

  getCardDensity,
} from '../config/settingsPreferences'

const DENSITY_VARS: Record<CardDensity, Record<string, string>> = {
  compact: {
    '--pad-y': '6px',
    '--pad-x': '8px',
    '--fs-xs': '10px',
    '--fs-md': '12px',
    '--radius-card': '4px',
  },
  comfortable: {
    '--pad-y': '10px',
    '--pad-x': '12px',
    '--fs-xs': '11px',
    '--fs-md': '13px',
    '--radius-card': '8px',
  },
}

export function useCardDensity(): void {
  useEffect(() => {
    const apply = (): void => {
      const density = getCardDensity()
      const vars = DENSITY_VARS[density] ?? DENSITY_VARS.comfortable
      for (const [prop, value] of Object.entries(vars)) {
        document.documentElement.style.setProperty(prop, value)
      }
    }
    apply()
    window.addEventListener(CARD_DENSITY_CHANGE_EVENT, apply)
    window.addEventListener('storage', apply)
    return () => {
      window.removeEventListener(CARD_DENSITY_CHANGE_EVENT, apply)
      window.removeEventListener('storage', apply)
    }
  }, [])
}
