export interface AccentPaletteEntry {
  name: string
  hex: string
  foreground: string
}

const ACCENT_HEX_PATTERN = /^#[0-9a-fA-F]{6}$/u
const LIGHT_FOREGROUND = '#ffffff'
const DARK_FOREGROUND = '#1a1a1a'

/**
 * Fallback accent pool — 24 colors from Figma design tokens,
 * evenly spaced by hue (~15° intervals) for maximum visual variety.
 * High saturation is intentional — at 0.3 opacity they render as soft pastels.
 */
const FALLBACK_ACCENT_POOL = [
  '#ed2100', '#c04000', '#e86100', '#ffa500',
  '#ffce1b', '#ccff00', '#7cfc00', '#00bb77',
  '#00cec8', '#00ffff', '#007ba7', '#0047ab',
  '#0014a8', '#0000cd', '#7f00ff', '#8a00c4',
  '#ff1dce', '#e40078', '#ff1d8d', '#ff0038',
  '#c11c84', '#636b2f', '#4682b4', '#6d8196',
] as const

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

export function getFallbackAccent(projectCode: string): string {
  const normalizedCode = projectCode.trim().toUpperCase()
  if (!normalizedCode) {
    return ACCENT_PALETTE[0].hex
  }

  const hash = fnv1a(normalizedCode)
  return FALLBACK_ACCENT_POOL[hash % FALLBACK_ACCENT_POOL.length]
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

export function getForegroundForAccent(hex: string): string {
  const normalizedHex = normalizeAccentHex(hex)
  const lightContrast = getContrastRatio(LIGHT_FOREGROUND, normalizedHex)
  const darkContrast = getContrastRatio(DARK_FOREGROUND, normalizedHex)

  return darkContrast > lightContrast ? DARK_FOREGROUND : LIGHT_FOREGROUND
}

function getContrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(getRelativeLuminance(foreground), getRelativeLuminance(background))
  const darker = Math.min(getRelativeLuminance(foreground), getRelativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * toLinearChannel(r) + 0.7152 * toLinearChannel(g) + 0.0722 * toLinearChannel(b)
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

function toLinearChannel(channel: number): number {
  const normalizedChannel = channel / 255
  return normalizedChannel <= 0.03928
    ? normalizedChannel / 12.92
    : ((normalizedChannel + 0.055) / 1.055) ** 2.4
}
