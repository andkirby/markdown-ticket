/**
 * Canonical Regex Pattern Tests (MDT-158)
 *
 * TDD RED phase: Tests for the 4 canonical patterns that should live in domain-contracts.
 * Patterns 1 & 2 already exist. Patterns 3 & 4 (TICKET_KEY_INPUT_PATTERN,
 * PROJECT_SCOPE_INPUT_PATTERN) are expected to be added to frontmatter.ts.
 *
 * These tests verify the target state described in MDT-158.
 */

import { describe, expect, it } from 'bun:test'
import { PROJECT_CODE_PATTERN } from '../../project/schema'
import {
  CR_CODE_PATTERN,
} from '../frontmatter'
// These imports WILL FAIL until the developer implements them (RED phase)
import {
  PROJECT_SCOPE_INPUT_PATTERN,
  TICKET_KEY_INPUT_PATTERN,
} from '../frontmatter'

// ---------------------------------------------------------------------------
// 1. PROJECT_CODE_PATTERN — already exists in domain-contracts/src/project/schema.ts
//    Pattern: /^[A-Z][A-Z0-9]{1,4}$/
// ---------------------------------------------------------------------------
describe('PROJECT_CODE_PATTERN', () => {
  it('accepts "MDT" (3 letters)', () => {
    expect(PROJECT_CODE_PATTERN.test('MDT')).toBe(true)
  })

  it('accepts "TP0" (alphanumeric)', () => {
    expect(PROJECT_CODE_PATTERN.test('TP0')).toBe(true)
  })

  it('accepts "AB" (2 letters, min length)', () => {
    expect(PROJECT_CODE_PATTERN.test('AB')).toBe(true)
  })

  it('accepts "ABCDE" (5 chars, max length)', () => {
    expect(PROJECT_CODE_PATTERN.test('ABCDE')).toBe(true)
  })

  it('rejects "A" (too short — only 1 char)', () => {
    expect(PROJECT_CODE_PATTERN.test('A')).toBe(false)
  })

  it('rejects "ABCDEFG" (too long — 7 chars)', () => {
    expect(PROJECT_CODE_PATTERN.test('ABCDEFG')).toBe(false)
  })

  it('rejects "1AB" (starts with digit)', () => {
    expect(PROJECT_CODE_PATTERN.test('1AB')).toBe(false)
  })

  it('rejects "mdt" (lowercase)', () => {
    expect(PROJECT_CODE_PATTERN.test('mdt')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(PROJECT_CODE_PATTERN.test('')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 2. CR_CODE_PATTERN — already exists in domain-contracts/src/ticket/frontmatter.ts
//    Pattern: /^[A-Z][A-Z0-9]{1,4}-\d{3,4}$/
// ---------------------------------------------------------------------------
describe('CR_CODE_PATTERN', () => {
  it('accepts "MDT-001" (standard 3-digit)', () => {
    expect(CR_CODE_PATTERN.test('MDT-001')).toBe(true)
  })

  it('accepts "TP0-042" (alphanumeric prefix)', () => {
    expect(CR_CODE_PATTERN.test('TP0-042')).toBe(true)
  })

  it('accepts "AB-1234" (4-digit number)', () => {
    expect(CR_CODE_PATTERN.test('AB-1234')).toBe(true)
  })

  it('rejects "MDT-01" (only 2 digits)', () => {
    expect(CR_CODE_PATTERN.test('MDT-01')).toBe(false)
  })

  it('rejects "MDT-12345" (5 digits)', () => {
    expect(CR_CODE_PATTERN.test('MDT-12345')).toBe(false)
  })

  it('rejects "mdt-001" (lowercase)', () => {
    expect(CR_CODE_PATTERN.test('mdt-001')).toBe(false)
  })

  it('rejects "1AB-001" (prefix starts with digit)', () => {
    expect(CR_CODE_PATTERN.test('1AB-001')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(CR_CODE_PATTERN.test('')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 3. TICKET_KEY_INPUT_PATTERN — NEW (to be added to frontmatter.ts)
//    Pattern: /^([A-Z][A-Z0-9]{1,4})-(\d{1,5})$/i
//    Purpose: Parse loose user input (case-insensitive, non-padded)
// ---------------------------------------------------------------------------
describe('TICKET_KEY_INPUT_PATTERN', () => {
  // Accepts valid input
  it('accepts "MDT-1" (unpadded)', () => {
    expect(TICKET_KEY_INPUT_PATTERN.test('MDT-1')).toBe(true)
  })

  it('accepts "mdt-42" (lowercase)', () => {
    expect(TICKET_KEY_INPUT_PATTERN.test('mdt-42')).toBe(true)
  })

  it('accepts "TP0-001" (alphanumeric prefix)', () => {
    expect(TICKET_KEY_INPUT_PATTERN.test('TP0-001')).toBe(true)
  })

  it('accepts "AB-99999" (5-digit number, max)', () => {
    expect(TICKET_KEY_INPUT_PATTERN.test('AB-99999')).toBe(true)
  })

  // Captures project code in group 1
  it('captures project code "MDT" in group 1', () => {
    const match = 'MDT-42'.match(TICKET_KEY_INPUT_PATTERN)!
    expect(match).not.toBeNull()
    expect(match[1]).toBe('MDT')
  })

  it('captures project code "tp0" (lowercase) in group 1', () => {
    const match = 'tp0-42'.match(TICKET_KEY_INPUT_PATTERN)!
    expect(match).not.toBeNull()
    expect(match[1]).toBe('tp0')
  })

  // Captures number in group 2
  it('captures number "42" in group 2', () => {
    const match = 'MDT-42'.match(TICKET_KEY_INPUT_PATTERN)!
    expect(match[2]).toBe('42')
  })

  it('captures number "001" in group 2', () => {
    const match = 'TP0-001'.match(TICKET_KEY_INPUT_PATTERN)!
    expect(match[2]).toBe('001')
  })

  // Rejects invalid input
  it('rejects "A-1" (prefix too short — 1 char)', () => {
    expect(TICKET_KEY_INPUT_PATTERN.test('A-1')).toBe(false)
  })

  it('rejects "ABCDEFG-1" (prefix too long — 7 chars)', () => {
    expect(TICKET_KEY_INPUT_PATTERN.test('ABCDEFG-1')).toBe(false)
  })

  it('rejects "1AB-1" (prefix starts with digit)', () => {
    expect(TICKET_KEY_INPUT_PATTERN.test('1AB-1')).toBe(false)
  })

  it('rejects "MDT-123456" (6-digit number exceeds max)', () => {
    expect(TICKET_KEY_INPUT_PATTERN.test('MDT-123456')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(TICKET_KEY_INPUT_PATTERN.test('')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 4. PROJECT_SCOPE_INPUT_PATTERN — NEW (to be added to frontmatter.ts)
//    Pattern: /^@([A-Z][A-Z0-9]{1,4})\s+(.*)$/i
//    Purpose: Parse @CODE query syntax for scoped search
// ---------------------------------------------------------------------------
describe('PROJECT_SCOPE_INPUT_PATTERN', () => {
  // Accepts valid input
  it('accepts "@MDT search text"', () => {
    expect(PROJECT_SCOPE_INPUT_PATTERN.test('@MDT search text')).toBe(true)
  })

  it('accepts "@tp0 hello" (lowercase)', () => {
    expect(PROJECT_SCOPE_INPUT_PATTERN.test('@tp0 hello')).toBe(true)
  })

  it('accepts "@AB find something" (2-char prefix)', () => {
    expect(PROJECT_SCOPE_INPUT_PATTERN.test('@AB find something')).toBe(true)
  })

  // Captures project code in group 1
  it('captures project code "MDT" in group 1', () => {
    const match = '@MDT search text'.match(PROJECT_SCOPE_INPUT_PATTERN)!
    expect(match).not.toBeNull()
    expect(match[1]).toBe('MDT')
  })

  it('captures project code "tp0" (lowercase) in group 1', () => {
    const match = '@tp0 hello'.match(PROJECT_SCOPE_INPUT_PATTERN)!
    expect(match).not.toBeNull()
    expect(match[1]).toBe('tp0')
  })

  // Captures search text in group 2
  it('captures search text "search text" in group 2', () => {
    const match = '@MDT search text'.match(PROJECT_SCOPE_INPUT_PATTERN)!
    expect(match[2]).toBe('search text')
  })

  it('captures "hello world" in group 2', () => {
    const match = '@MDT hello world'.match(PROJECT_SCOPE_INPUT_PATTERN)!
    expect(match[2]).toBe('hello world')
  })

  // Rejects invalid input
  it('rejects "@M text" (prefix too short — 1 char)', () => {
    expect(PROJECT_SCOPE_INPUT_PATTERN.test('@M text')).toBe(false)
  })

  it('rejects "@A text" (prefix too short — 1 char)', () => {
    expect(PROJECT_SCOPE_INPUT_PATTERN.test('@A text')).toBe(false)
  })

  it('rejects "@ABCDEFG text" (prefix too long — 7 chars)', () => {
    expect(PROJECT_SCOPE_INPUT_PATTERN.test('@ABCDEFG text')).toBe(false)
  })

  it('rejects "@1AB text" (prefix starts with digit)', () => {
    expect(PROJECT_SCOPE_INPUT_PATTERN.test('@1AB text')).toBe(false)
  })

  it('rejects "MDT text" (missing @ prefix)', () => {
    expect(PROJECT_SCOPE_INPUT_PATTERN.test('MDT text')).toBe(false)
  })

  it('rejects "@MDT" (no space after code — missing search text)', () => {
    expect(PROJECT_SCOPE_INPUT_PATTERN.test('@MDT')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(PROJECT_SCOPE_INPUT_PATTERN.test('')).toBe(false)
  })
})
