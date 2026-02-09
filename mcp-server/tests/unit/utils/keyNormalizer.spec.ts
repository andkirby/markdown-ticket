/**
 * Unit Tests for keyNormalizer utility (MDT-121)
 *
 * Tests the normalizeKey function which handles:
 * - Pure numeric shorthand: "5" -> "{PROJECTCODE}-005" (pads to 3 digits)
 * - Numeric with leading zeros: "005" -> "{PROJECTCODE}-005" (preserves format)
 * - Full format with prefix: "abc-12" -> "ABC-012" (uppercase, pads to 3 digits)
 * - Invalid format error handling
 *
 * Tickets are stored with 3-digit zero-padded numbers (MDT-001, MDT-002, etc.)
 */

import { normalizeKey } from '../../../src/utils/keyNormalizer'
import { ToolError } from '../../../src/utils/toolError'

describe('keyNormalizer', () => {
  describe('valid Input - Numeric Shorthand', () => {
    it('Given numeric key "5" WHEN normalizing with project "MDT" THEN returns "MDT-005"', () => {
      const result = normalizeKey('5', 'MDT')
      expect(result).toBe('MDT-005')
    })

    it('Given numeric key "123" WHEN normalizing with project "API" THEN returns "API-123"', () => {
      const result = normalizeKey('123', 'API')
      expect(result).toBe('API-123')
    })

    it('Given numeric key with leading zeros "005" WHEN normalizing THEN preserves format', () => {
      const result = normalizeKey('005', 'MDT')
      expect(result).toBe('MDT-005')
    })

    it('Given numeric key with many leading zeros "000123" WHEN normalizing THEN returns "MDT-123"', () => {
      const result = normalizeKey('000123', 'MDT')
      expect(result).toBe('MDT-123')
    })

    it('Given zero "0" WHEN normalizing THEN returns "MDT-000"', () => {
      const result = normalizeKey('0', 'MDT')
      expect(result).toBe('MDT-000')
    })

    it('Given large number "999999" WHEN normalizing THEN returns "MDT-999999"', () => {
      const result = normalizeKey('999999', 'MDT')
      expect(result).toBe('MDT-999999')
    })
  })

  describe('valid Input - Full Format', () => {
    it('Given full uppercase key "MDT-005" WHEN normalizing THEN returns "MDT-005"', () => {
      const result = normalizeKey('MDT-005', 'ANY')
      expect(result).toBe('MDT-005')
    })

    it('Given full lowercase key "mdt-5" WHEN normalizing THEN returns "MDT-005"', () => {
      const result = normalizeKey('mdt-5', 'ANY')
      expect(result).toBe('MDT-005')
    })

    it('Given mixed case key "MdT-5" WHEN normalizing THEN returns "MDT-005"', () => {
      const result = normalizeKey('MdT-5', 'ANY')
      expect(result).toBe('MDT-005')
    })

    it('Given full format with leading zeros "MDT-005" WHEN normalizing THEN returns "MDT-005"', () => {
      const result = normalizeKey('MDT-005', 'ANY')
      expect(result).toBe('MDT-005')
    })

    it('Given full format lowercase with zeros "mdt-005" WHEN normalizing THEN returns "MDT-005"', () => {
      const result = normalizeKey('mdt-005', 'ANY')
      expect(result).toBe('MDT-005')
    })

    it('Given different project code "API-123" WHEN normalizing THEN returns "API-123"', () => {
      const result = normalizeKey('API-123', 'ANY')
      expect(result).toBe('API-123')
    })

    it('Given numeric project code "GLO1-456" WHEN normalizing THEN throws ToolError', () => {
      // Project codes must be alphabetic only (no digits in prefix)
      expect(() => normalizeKey('GLO1-456', 'ANY')).toThrow(ToolError)
      try {
        normalizeKey('GLO1-456', 'ANY')
      }
      catch (error) {
        expect(error).toBeInstanceOf(ToolError)
        const toolError = error as ToolError
        expect(toolError.message).toMatch(/Invalid key format/i)
      }
    })
  })

  describe('invalid Input - Empty and Null', () => {
    it('Given empty string "" WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey('', 'MDT')).toThrow(ToolError)
    })

    it('Given whitespace only "   " WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey('   ', 'MDT')).toThrow(ToolError)
    })

    it('Given null WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey(null as unknown as string, 'MDT')).toThrow(ToolError)
    })

    it('Given undefined WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey(undefined as unknown as string, 'MDT')).toThrow(ToolError)
    })

    it('Given non-string type WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey(123 as unknown as string, 'MDT')).toThrow(ToolError)
    })
  })

  describe('invalid Input - Malformed Keys', () => {
    it('Given key without dash "MDT5" WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey('MDT5', 'MDT')).toThrow(ToolError)
    })

    it('Given key with multiple dashes "MDT-5-6" WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey('MDT-5-6', 'MDT')).toThrow(ToolError)
    })

    it('Given key with special characters "MDT_5" WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey('MDT_5', 'MDT')).toThrow(ToolError)
    })

    it('Given key with spaces "MDT - 5" WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey('MDT - 5', 'MDT')).toThrow(ToolError)
    })

    it('Given key with negative number "MDT--5" WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey('MDT--5', 'MDT')).toThrow(ToolError)
    })

    it('Given dash only "MDT-" WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey('MDT-', 'MDT')).toThrow(ToolError)
    })

    it('Given dash and number only "-5" WHEN normalizing THEN throws ToolError', () => {
      expect(() => normalizeKey('-5', 'MDT')).toThrow(ToolError)
    })

    it('Given key with non-alphabetic prefix "123-5" WHEN normalizing THEN throws ToolError', () => {
      // Full format prefix must be alphabetic only (a-z), not numeric
      // "123-5" doesn't match numeric pattern (contains dash) or full format (prefix not alphabetic)
      expect(() => normalizeKey('123-5', 'MDT')).toThrow(ToolError)
      try {
        normalizeKey('123-5', 'MDT')
      }
      catch (error) {
        expect(error).toBeInstanceOf(ToolError)
        const toolError = error as ToolError
        expect(toolError.message).toMatch(/Invalid key format/i)
      }
    })

    it('Given key with symbols "$$$-5" WHEN normalizing THEN throws ToolError', () => {
      // Full format prefix must be alphabetic only (a-z), not symbols
      // "$$$" is not alphabetic, so it doesn't match the full format pattern
      expect(() => normalizeKey('$$$-5', 'MDT')).toThrow(ToolError)
      try {
        normalizeKey('$$$-5', 'MDT')
      }
      catch (error) {
        expect(error).toBeInstanceOf(ToolError)
        const toolError = error as ToolError
        expect(toolError.message).toMatch(/Invalid key format/i)
      }
    })
  })

  describe('error Messages', () => {
    it('Given invalid key WHEN throwing THEN error includes expected formats', () => {
      expect(() => normalizeKey('invalid', 'MDT')).toThrow(ToolError)
      try {
        normalizeKey('invalid', 'MDT')
      }
      catch (error) {
        expect(error).toBeInstanceOf(ToolError)
        const toolError = error as ToolError
        expect(toolError.message).toContain('Invalid key format')
        expect(toolError.message).toContain('Numeric shorthand')
        expect(toolError.message).toContain('Full format')
        expect(toolError.message).toContain('MDT')
      }
    })
  })

  describe('edge Cases', () => {
    it('Given key with leading/trailing whitespace "  5  " WHEN normalizing THEN trims and normalizes', () => {
      const result = normalizeKey('  5  ', 'MDT')
      expect(result).toBe('MDT-005')
    })

    it('Given full format with whitespace "  MDT-5  " WHEN normalizing THEN trims and normalizes', () => {
      const result = normalizeKey('  MDT-5  ', 'ANY')
      expect(result).toBe('MDT-005')
    })

    it('Given single character prefix "A-5" WHEN normalizing THEN returns "A-005"', () => {
      const result = normalizeKey('A-5', 'ANY')
      expect(result).toBe('A-005')
    })

    it('Given long prefix "ABCDE-5" WHEN normalizing THEN returns "ABCDE-005"', () => {
      const result = normalizeKey('ABCDE-5', 'ANY')
      expect(result).toBe('ABCDE-005')
    })
  })
})
