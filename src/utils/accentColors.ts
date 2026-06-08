export interface AccentPaletteEntry {
  name: string
  hex: string
  foreground: string
}

const ACCENT_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/u
const LIGHT_FOREGROUND = '#ffffff'
const DARK_FOREGROUND = '#1a1a1a'

const ACCENT_PRESETS = [
  { name: 'red', hex: '#dc2626' },
  { name: 'orange', hex: '#ea580c' },
  { name: 'amber', hex: '#d97706' },
  { name: 'yellow', hex: '#ca8a04' },
  { name: 'lime', hex: '#65a30d' },
  { name: 'green', hex: '#16a34a' },
  { name: 'emerald', hex: '#059669' },
  { name: 'teal', hex: '#0d9488' },
  { name: 'cyan', hex: '#0891b2' },
  { name: 'blue', hex: '#2563eb' },
  { name: 'indigo', hex: '#4f46e5' },
  { name: 'violet', hex: '#7c3aed' },
  { name: 'purple', hex: '#9333ea' },
  { name: 'fuchsia', hex: '#c026d3' },
  { name: 'pink', hex: '#db2777' },
  { name: 'rose', hex: '#e11d48' },
] as const

export const ACCENT_PALETTE: AccentPaletteEntry[] = ACCENT_PRESETS.map(entry => ({
  ...entry,
  foreground: getForegroundForAccent(entry.hex),
}))

export function isValidAccentHex(value: string): boolean {
  return ACCENT_HEX_PATTERN.test(value)
}

export function normalizeAccentHex(value: string): string {
  return value.toLowerCase()
}

/**
 * Expand and normalize loose hex input into strict `#rrggbb`.
 * - Auto-prepends `#` if missing
 * - Expands 3-char shorthand: `0bc` → `#00bbcc`
 * - Returns empty string if input cannot be resolved to a valid 6-digit hex
 */
export function expandShorthandHex(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`

  // Already valid 6-digit
  if (isValidAccentHex(withHash)) return normalizeAccentHex(withHash)

  // 3-char shorthand (#abc → #aabbcc)
  const shorthand = /^#([0-9a-fA-F]{3})$/u
  const match = shorthand.exec(withHash)
  if (match) {
    const [r, g, b] = match[1]!
    return normalizeAccentHex(`#${r}${r}${g}${g}${b}${b}`)
  }

  return ''
}

/** FNV-1a — fast, excellent distribution for short strings */
function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

const fallbackCache = new Map<string, string>()

export function getFallbackAccent(projectCode: string): string {
  const normalizedCode = projectCode.trim().toUpperCase()
  if (!normalizedCode) {
    return hslToHex(0, 65, 45)
  }

  const cached = fallbackCache.get(normalizedCode)
  if (cached) return cached

  const hash = fnv1a(normalizedCode)
  const hue = (hash * 360 / 4294967296) | 0
  const hex = hslToHex(hue, 65, 45)
  fallbackCache.set(normalizedCode, hex)
  return hex
}

/** HSL (h: 0–360, s: 0–100, l: 0–100) → #rrggbb */
function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100
  const lNorm = l / 100
  const a = sNorm * Math.min(lNorm, 1 - lNorm)
  const f = (n: number): number => {
    const k = (n + h / 30) % 12
    return lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  const toHex = (v: number): string => Math.round(v * 255).toString(16).padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`
}

/** Perceptual brightness classification for accent colors */
export type AccentBrightness = 'light' | 'dark'

/**
 * Classify an accent hex as 'light' or 'dark' using sRGB perceptual brightness.
 * Used by components to set `data-accent-brightness` for CSS theme-aware foreground selection.
 */
export function getAccentBrightness(hex: string): AccentBrightness {
  const { r, g, b } = hexToRgb(normalizeAccentHex(hex))
  const perceivedBrightness = (r * 299 + g * 587 + b * 114) / 1000
  return perceivedBrightness > 150 ? 'light' : 'dark'
}

export function getForegroundForAccent(hex: string): string {
  return getAccentBrightness(hex) === 'light' ? DARK_FOREGROUND : LIGHT_FOREGROUND
}

function hexToRgb(hex: string): { r: number, g: number, b: number } {
  const normalizedHex = normalizeAccentHex(hex).replace('#', '')
  const value = Number.parseInt(normalizedHex, 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}
