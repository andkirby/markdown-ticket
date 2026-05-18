const DEFAULT_VIEW_KEY = 'mdt-settings-default-view'
const CARD_DENSITY_KEY = 'mdt-settings-card-density'

export type DefaultView = 'board' | 'list'
export type CardDensity = 'comfortable' | 'compact'

export function readStorageString(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  }
  catch {
    return fallback
  }
}

export function writeStorageString(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  }
  catch {
    console.warn(`Failed to save setting: ${key}`)
  }
}

export function getDefaultView(): DefaultView {
  return readStorageString(DEFAULT_VIEW_KEY, 'board') as DefaultView
}

export function setDefaultViewPreference(view: DefaultView): void {
  writeStorageString(DEFAULT_VIEW_KEY, view)
}

export function getCardDensity(): CardDensity {
  return readStorageString(CARD_DENSITY_KEY, 'comfortable') as CardDensity
}

export function setCardDensityPreference(density: CardDensity): void {
  writeStorageString(CARD_DENSITY_KEY, density)
}
