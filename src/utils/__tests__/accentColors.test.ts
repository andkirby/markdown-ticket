import {
  ACCENT_PALETTE,
  expandShorthandHex,
  getFallbackAccent,
  getForegroundForAccent,
  isValidAccentHex,
} from '../accentColors'
import { describe, expect, it } from 'bun:test'

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  const value = Number.parseInt(normalized, 16)

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  }
}

function toLinearChannel(channel: number) {
  const normalized = channel / 255
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

function relativeLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return 0.2126 * toLinearChannel(r) + 0.7152 * toLinearChannel(g) + 0.0722 * toLinearChannel(b)
}

function contrastRatio(foreground: string, background: string) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return (lighter + 0.05) / (darker + 0.05)
}

describe('accentColors palette', () => {
  it('defines exactly 16 preset accents with unique names and hex values', () => {
    expect(ACCENT_PALETTE).toHaveLength(16)

    const names = new Set(ACCENT_PALETTE.map(entry => entry.name))
    const hexes = new Set(ACCENT_PALETTE.map(entry => entry.hex))

    expect(names.size).toBe(16)
    expect(hexes.size).toBe(16)
  })

  it('keeps every preset foreground at WCAG AA contrast', () => {
    for (const accent of ACCENT_PALETTE) {
      expect(contrastRatio(accent.foreground, accent.hex)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('accentColors validation', () => {
  it.each(['#2563eb', '#dc2626', '#FFAA00'])('accepts valid 6-digit hex value %s', (value) => {
    expect(isValidAccentHex(value)).toBe(true)
  })

  it.each(['#f00', 'blue', '2563eb', '#ffffff00', '#gggggg'])('rejects invalid accent value %s', (value) => {
    expect(isValidAccentHex(value)).toBe(false)
  })
})

describe('accentColors fallback accent', () => {
  it('derives deterministic fallback accents from the project code', () => {
    const first = getFallbackAccent('MDT')
    const second = getFallbackAccent('MDT')
    const different = getFallbackAccent('OPS')

    expect(first).toBe(second)
    expect(first).toMatch(/^#[0-9a-f]{6}$/)
    expect(different).toMatch(/^#[0-9a-f]{6}$/)
    expect(first).not.toBe(different)
  })
})

describe('accentColors foreground auto-selection', () => {
  it('chooses a dark foreground for very light accents and light foreground for dark accents', () => {
    expect(getForegroundForAccent('#facc15')).toBe('#1a1a1a')
    expect(getForegroundForAccent('#111827')).toBe('#ffffff')
  })

  it.each(['#2563eb', '#16a34a', '#f59e0b', '#f8fafc'])('keeps custom accent foreground contrast at WCAG AA for %s', (accent) => {
    const foreground = getForegroundForAccent(accent)
    expect(contrastRatio(foreground, accent)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('expandShorthandHex', () => {
  const { expandShorthandHex } = require('../accentColors')

  it('expands 3-char shorthand without # prefix', () => {
    expect(expandShorthandHex('0bc')).toBe('#00bbcc')
  })

  it('expands 3-char shorthand with # prefix', () => {
    expect(expandShorthandHex('#abc')).toBe('#aabbcc')
  })

  it('auto-prepends # to 6-digit hex', () => {
    expect(expandShorthandHex('2563eb')).toBe('#2563eb')
  })

  it('passes through valid 6-digit hex unchanged', () => {
    expect(expandShorthandHex('#2563eb')).toBe('#2563eb')
  })

  it('normalizes to lowercase', () => {
    expect(expandShorthandHex('#AABBCC')).toBe('#aabbcc')
  })

  it('returns empty string for unresolvable input', () => {
    expect(expandShorthandHex('xyz')).toBe('')
  })

  it('returns empty string for empty input', () => {
    expect(expandShorthandHex('')).toBe('')
  })
})
