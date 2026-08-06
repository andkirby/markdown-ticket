const DEFAULT_VIEW_KEY = 'mdt-settings-default-view'
const CARD_DENSITY_KEY = 'mdt-settings-card-density'
const PIN_RAIL_ENABLED_KEY = 'mdt-settings-pin-rail-enabled'
const PIN_RAIL_PINNED_KEY = 'mdt-settings-pin-rail-pinned'
export const MARKDOWN_DENSITY_KEY = 'markdown-ticket:settings:markdown-density'
export const MARKDOWN_DENSITY_CHANGE_EVENT = 'markdown-ticket:settings:markdown-density-change'
export const CARD_DENSITY_CHANGE_EVENT = 'markdown-ticket:settings:card-density-change'
export const PIN_RAIL_ENABLED_CHANGE_EVENT = 'markdown-ticket:settings:pin-rail-enabled-change'
export const PIN_RAIL_PINNED_CHANGE_EVENT = 'markdown-ticket:settings:pin-rail-pinned-change'

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

export function readStorageBool(key: string, fallback: boolean): boolean {
  const raw = readStorageString(key, fallback ? '1' : '0')
  return raw === '1' || raw === 'true'
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

  try {
    window.dispatchEvent(new CustomEvent(CARD_DENSITY_CHANGE_EVENT, {
      detail: { density },
    }))
  }
  catch {
    // Non-browser callers only need persistence.
  }
}

// MDT-197: pin rail browser-only preferences. Two independent toggles:
// - enabled: whether the feature exists at all (rail + collapsed strip). Default true.
// - pinned: whether the rail stays open (true) or auto-collapses to the strip (false). Default true.
// Both persist to localStorage and broadcast a change event (mirrors CardDensity).
export function getPinRailEnabled(): boolean {
  return readStorageBool(PIN_RAIL_ENABLED_KEY, true)
}

export function setPinRailEnabledPreference(enabled: boolean): void {
  writeStorageString(PIN_RAIL_ENABLED_KEY, enabled ? '1' : '0')

  try {
    window.dispatchEvent(new CustomEvent(PIN_RAIL_ENABLED_CHANGE_EVENT, {
      detail: { enabled },
    }))
  }
  catch {
    // Non-browser callers only need persistence.
  }
}

export function getPinRailPinned(): boolean {
  return readStorageBool(PIN_RAIL_PINNED_KEY, true)
}

export function setPinRailPinnedPreference(pinned: boolean): void {
  writeStorageString(PIN_RAIL_PINNED_KEY, pinned ? '1' : '0')

  try {
    window.dispatchEvent(new CustomEvent(PIN_RAIL_PINNED_CHANGE_EVENT, {
      detail: { pinned },
    }))
  }
  catch {
    // Non-browser callers only need persistence.
  }
}

export const COLLAPSED_COLUMNS_KEY = 'mdt-settings-collapsed-columns'
export const COLLAPSED_COLUMNS_CHANGE_EVENT = 'markdown-ticket:settings:collapsed-columns-change'

/** Column ids (primary status strings) the user has collapsed on the board. */
export function getCollapsedColumns(): string[] {
  try {
    const raw = localStorage.getItem(COLLAPSED_COLUMNS_KEY)
    if (!raw)
      return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
  }
  catch {
    return []
  }
}

export function setCollapsedColumns(ids: string[]): void {
  writeStorageString(COLLAPSED_COLUMNS_KEY, JSON.stringify(ids))

  try {
    window.dispatchEvent(new CustomEvent(COLLAPSED_COLUMNS_CHANGE_EVENT, {
      detail: { columns: ids },
    }))
  }
  catch {
    // Non-browser callers only need persistence.
  }
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
