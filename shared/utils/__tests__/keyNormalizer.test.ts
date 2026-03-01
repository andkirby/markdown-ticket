/**
 * Unit Tests for keyNormalizer utility (MDT-121, MDT-090)
 *
 * Tests the normalizeKey function which handles:
 * - Pure numeric shorthand: "5" -> "{PROJECTCODE}-005" (pads to 3 digits)
 * - Numeric with leading zeros: "005" -> "{PROJECTCODE}-005" (preserves format)
 * - Full format with prefix: "abc-12" -> "ABC-012" (uppercase, pads to 3 digits)
 * - Alphanumeric project codes: "tp0-12" -> "TP0-012" (supports numbers in project code)
 * - Invalid format error handling
 *
 * Tickets are stored with 3-digit zero-padded numbers (MDT-001, MDT-002, etc.)
 */

import { normalizeKey, KeyNormalizationError } from '../keyNormalizer'

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

  describe('valid Input - Full Format (Alphabetic)', () => {
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
  })

  describe('valid Input - Full Format (Alphanumeric Project Code)', () => {
    // MDT-090: Project codes can contain numbers (matching PATTERNS.PROJECT_CODE)
    it('Given alphanumeric project code "TP0-002" WHEN normalizing THEN returns "TP0-002"', () => {
      const result = normalizeKey('TP0-002', 'ANY')
      expect(result).toBe('TP0-002')
    })

    it('Given lowercase alphanumeric "tp0-5" WHEN normalizing THEN returns "TP0-005"', () => {
      const result = normalizeKey('tp0-5', 'ANY')
      expect(result).toBe('TP0-005')
    })

    it('Given alphanumeric with trailing number "WEB2-123" WHEN normalizing THEN returns "WEB2-123"', () => {
      const result = normalizeKey('WEB2-123', 'ANY')
      expect(result).toBe('WEB2-123')
    })

    it('Given alphanumeric with embedded number "GLO1-456" WHEN normalizing THEN returns "GLO1-456"', () => {
      const result = normalizeKey('GLO1-456', 'ANY')
      expect(result).toBe('GLO1-456')
    })

    it('Given alphanumeric "A1-001" WHEN normalizing THEN returns "A1-001"', () => {
      const result = normalizeKey('A1-001', 'ANY')
      expect(result).toBe('A1-001')
    })

    it('Given alphanumeric with multiple numbers "AB1C2-005" WHEN normalizing THEN returns "AB1C2-005"', () => {
      const result = normalizeKey('AB1C2-005', 'ANY')
      expect(result).toBe('AB1C2-005')
    })
  })

  describe('invalid Input - Empty and Null', () => {
    it('Given empty string "" WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey('', 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given whitespace only "   " WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey('   ', 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given null WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey(null as unknown as string, 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given undefined WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey(undefined as unknown as string, 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given non-string type WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey(123 as unknown as string, 'MDT')).toThrow(KeyNormalizationError)
    })
  })

  describe('invalid Input - Malformed Keys', () => {
    it('Given key without dash "MDT5" WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey('MDT5', 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given key with multiple dashes "MDT-5-6" WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey('MDT-5-6', 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given key with special characters "MDT_5" WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey('MDT_5', 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given key with spaces "MDT - 5" WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey('MDT - 5', 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given key with negative number "MDT--5" WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey('MDT--5', 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given dash only "MDT-" WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey('MDT-', 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given dash and number only "-5" WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey('-5', 'MDT')).toThrow(KeyNormalizationError)
    })

    it('Given key with numeric-only prefix "123-5" WHEN normalizing THEN throws KeyNormalizationError', () => {
      // Prefix must start with a letter
      expect(() => normalizeKey('123-5', 'MDT')).toThrow(KeyNormalizationError)
      try {
        normalizeKey('123-5', 'MDT')
      }
      catch (error) {
        expect(error).toBeInstanceOf(KeyNormalizationError)
        const err = error as KeyNormalizationError
        expect(err.message).toMatch(/Invalid key format/i)
      }
    })

    it('Given key with symbols "$$$-5" WHEN normalizing THEN throws KeyNormalizationError', () => {
      expect(() => normalizeKey('$$$-5', 'MDT')).toThrow(KeyNormalizationError)
      try {
        normalizeKey('$$$-5', 'MDT')
      }
      catch (error) {
        expect(error).toBeInstanceOf(KeyNormalizationError)
        const err = error as KeyNormalizationError
        expect(err.message).toMatch(/Invalid key format/i)
      }
    })
  })

  describe('invalid Input - Project Code Length', () => {
    it('Given single character project code "A-5" WHEN normalizing THEN throws KeyNormalizationError (too short)', () => {
      // PATTERNS.PROJECT_CODE requires 2-5 characters
      expect(() => normalizeKey('A-5', 'ANY')).toThrow(KeyNormalizationError)
      try {
        normalizeKey('A-5', 'ANY')
      }
      catch (error) {
        expect(error).toBeInstanceOf(KeyNormalizationError)
        const err = error as KeyNormalizationError
        expect(err.message).toMatch(/Invalid project code.*2-5/i)
      }
    })

    it('Given 6-character project code "ABCDEF-5" WHEN normalizing THEN throws KeyNormalizationError (too long)', () => {
      // PATTERNS.PROJECT_CODE requires 2-5 characters
      expect(() => normalizeKey('ABCDEF-5', 'ANY')).toThrow(KeyNormalizationError)
      try {
        normalizeKey('ABCDEF-5', 'ANY')
      }
      catch (error) {
        expect(error).toBeInstanceOf(KeyNormalizationError)
        const err = error as KeyNormalizationError
        expect(err.message).toMatch(/Invalid project code.*2-5/i)
      }
    })
  })

  describe('error Messages', () => {
    it('Given invalid key WHEN throwing THEN error includes expected formats', () => {
      expect(() => normalizeKey('invalid', 'MDT')).toThrow(KeyNormalizationError)
      try {
        normalizeKey('invalid', 'MDT')
      }
      catch (error) {
        expect(error).toBeInstanceOf(KeyNormalizationError)
        const err = error as KeyNormalizationError
        expect(err.message).toContain('Invalid key format')
        expect(err.message).toContain('Numeric shorthand')
        expect(err.message).toContain('Full format')
        expect(err.message).toContain('MDT')
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

    it('Given 2-character prefix "AB-5" WHEN normalizing THEN returns "AB-005"', () => {
      const result = normalizeKey('AB-5', 'ANY')
      expect(result).toBe('AB-005')
    })

    it('Given 5-character prefix "ABCDE-5" WHEN normalizing THEN returns "ABCDE-005"', () => {
      const result = normalizeKey('ABCDE-5', 'ANY')
      expect(result).toBe('ABCDE-005')
    })
  })
})
