/**
 * Unit Tests for formatCrKey (MDT-159)
 *
 * Tests the centralized CR key formatting function:
 * - Dynamic zero-padding with minimum width of 3 digits
 * - Correct format: PROJECTCODE-NUMBER
 * - Backward compatibility with existing 3-digit padding
 * - Pure function behavior (no side effects)
 *
 * Requirements covered: BR-1, BR-2, C2, C4, Edge-1
 */

import { formatCrKey } from '../keyNormalizer'

describe('formatCrKey', () => {
  describe('BR-1: dynamic zero-padding with minimum width of 3 digits', () => {
    it('Given ticket number 1 WHEN formatting THEN pads to 3 digits (MDT-001)', () => {
      expect(formatCrKey('MDT', 1)).toBe('MDT-001')
    })

    it('Given ticket number 42 WHEN formatting THEN pads to 3 digits (MDT-042)', () => {
      expect(formatCrKey('MDT', 42)).toBe('MDT-042')
    })

    it('Given ticket number 999 WHEN formatting THEN preserves 3 digits (MDT-999)', () => {
      expect(formatCrKey('MDT', 999)).toBe('MDT-999')
    })

    it('Given ticket number 1000 WHEN formatting THEN uses 4 digits naturally (MDT-1000)', () => {
      expect(formatCrKey('MDT', 1000)).toBe('MDT-1000')
    })

    it('Given ticket number 10000 WHEN formatting THEN uses 5 digits naturally (MDT-10000)', () => {
      expect(formatCrKey('MDT', 10000)).toBe('MDT-10000')
    })
  })

  describe('BR-2: key format PROJECTCODE-NUMBER', () => {
    it('Given project code "API" and number 42 WHEN formatting THEN returns "API-042"', () => {
      expect(formatCrKey('API', 42)).toBe('API-042')
    })

    it('Given project code "TP0" and number 5 WHEN formatting THEN returns "TP0-005"', () => {
      expect(formatCrKey('TP0', 5)).toBe('TP0-005')
    })

    it('Given project code "ABCDE" and number 1 WHEN formatting THEN returns "ABCDE-001"', () => {
      expect(formatCrKey('ABCDE', 1)).toBe('ABCDE-001')
    })
  })

  describe('Edge-1: boundary numbers', () => {
    it('Given number 1 THEN returns MDT-001 (minimum boundary)', () => {
      expect(formatCrKey('MDT', 1)).toBe('MDT-001')
    })

    it('Given number 999 THEN returns MDT-999 (3-digit upper boundary)', () => {
      expect(formatCrKey('MDT', 999)).toBe('MDT-999')
    })

    it('Given number 1000 THEN returns MDT-1000 (4-digit boundary)', () => {
      expect(formatCrKey('MDT', 1000)).toBe('MDT-1000')
    })

    it('Given number 10000 THEN returns MDT-10000 (5-digit boundary)', () => {
      expect(formatCrKey('MDT', 10000)).toBe('MDT-10000')
    })
  })

  describe('C2: backward compatibility with padStart(3, \'0\')', () => {
    it('numbers 1-999 produce identical output to padStart(3, \'0\')', () => {
      for (let n = 1; n <= 999; n++) {
        const expected = `MDT-${String(n).padStart(3, '0')}`
        expect(formatCrKey('MDT', n)).toBe(expected)
      }
    })
  })

  describe('C4: pure string operation (no side effects)', () => {
    it('returns a string type', () => {
      const result = formatCrKey('MDT', 1)
      expect(typeof result).toBe('string')
    })

    it('does not modify input arguments', () => {
      const code = 'MDT'
      const num = 42
      formatCrKey(code, num)
      expect(code).toBe('MDT')
      expect(num).toBe(42)
    })

    it('returns consistent results for identical inputs (no hidden state)', () => {
      const first = formatCrKey('MDT', 1000)
      const second = formatCrKey('MDT', 1000)
      expect(first).toBe(second)
    })
  })

  describe('additional edge cases', () => {
    it('Given number 0 THEN returns MDT-000', () => {
      expect(formatCrKey('MDT', 0)).toBe('MDT-000')
    })

    it('Given very large number 99999 THEN returns MDT-99999 (no truncation)', () => {
      expect(formatCrKey('MDT', 99999)).toBe('MDT-99999')
    })

    it('Given negative number THEN handles gracefully (returns MDT--001 or throws)', () => {
      // Negative numbers should be handled — either padded or rejected
      // The function uses String() which produces "-1", then padStart applies
      const result = formatCrKey('MDT', -1)
      // Accept any reasonable behavior — the key point is no crash
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^MDT-/)
    })
  })
})
