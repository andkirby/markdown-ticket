import {
  safeValidateSelectorStateEntry,
  validateSelectorStateEntry,
} from '../validation.js'

describe('selector accent contract', () => {
  it('accepts selector entries without an accent preference', () => {
    expect(validateSelectorStateEntry({
      favorite: false,
      lastUsedAt: null,
      count: 0,
    })).toEqual({
      favorite: false,
      lastUsedAt: null,
      count: 0,
    })
  })

  it('accepts a valid 6-digit hex accent with a leading #', () => {
    const result = safeValidateSelectorStateEntry({
      favorite: true,
      lastUsedAt: '2026-06-07T00:00:00.000Z',
      count: 3,
      accent: '#2563eb',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.accent).toBe('#2563eb')
    }
  })

  it('accepts uppercase hex and normalizes it to lowercase', () => {
    const result = validateSelectorStateEntry({
      favorite: false,
      lastUsedAt: null,
      count: 0,
      accent: '#FF0000',
    })

    expect(result.accent).toBe('#ff0000')
  })

  it.each([
    '#f00',
    'blue',
    '2563eb',
    '#ffffff00',
    '#gggggg',
  ])('rejects malformed selector accent %s', (accent) => {
    const result = safeValidateSelectorStateEntry({
      favorite: false,
      lastUsedAt: null,
      count: 0,
      accent,
    })

    expect(result.success).toBe(false)
  })
})
