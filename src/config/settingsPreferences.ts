const DEFAULT_VIEW_KEY = 'mdt-settings-default-view'
const CARD_DENSITY_KEY = 'mdt-settings-card-density'
export const MARKDOWN_DENSITY_KEY = 'markdown-ticket:settings:markdown-density'
export const MARKDOWN_DENSITY_CHANGE_EVENT = 'markdown-ticket:settings:markdown-density-change'

export type DefaultView = 'board' | 'list'
export type CardDensity = 'comfortable' | 'compact'
export type MarkdownDensity = 'compact' | 'default' | 'comfortable'

export const MarkdownDensities = ['compact', 'default', 'comfortable'] as const

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

function isMarkdownDensity(value: string): value is MarkdownDensity {
  return MarkdownDensities.includes(value as MarkdownDensity)
}

export function getMarkdownDensity(): MarkdownDensity {
  const storedDensity = readStorageString(MARKDOWN_DENSITY_KEY, 'compact')
  return isMarkdownDensity(storedDensity) ? storedDensity : 'compact'
}

export function getMarkdownDensityClass(density: MarkdownDensity = getMarkdownDensity()): string {
  return `prose--density-${density}`
}

export function setMarkdownDensityPreference(density: MarkdownDensity): void {
  const safeDensity = isMarkdownDensity(density) ? density : 'compact'
  writeStorageString(MARKDOWN_DENSITY_KEY, safeDensity)

  try {
    window.dispatchEvent(new CustomEvent(MARKDOWN_DENSITY_CHANGE_EVENT, {
      detail: { density: safeDensity },
    }))
  }
  catch {
    // Non-browser callers only need persistence.
  }
}
