/**
 * MDT-205 — level alias resolution in the shared input gate.
 *
 * Asserts the alias map (e→epic, t→ticket, canonical self-maps) lives in the
 * shared attrResolver and that resolveAttrValue dispatches level (C-6: no
 * drift across consumers). Mirrors the existing status-alias precedent.
 */

import { CRLevel } from '@mdt/domain-contracts'
import { ServiceError } from '../../ServiceError'
import { resolveAttrValue, resolveLevelToken } from '../attrResolver'

describe('resolveLevelToken', () => {
  it('resolves the e shorthand to epic', () => {
    expect(resolveLevelToken('e')).toBe(CRLevel.EPIC)
  })

  it('resolves the t shorthand to ticket', () => {
    expect(resolveLevelToken('t')).toBe(CRLevel.TICKET)
  })

  it('resolves canonical values case-insensitively', () => {
    expect(resolveLevelToken('epic')).toBe(CRLevel.EPIC)
    expect(resolveLevelToken('EPIC')).toBe(CRLevel.EPIC)
    expect(resolveLevelToken('Epic')).toBe(CRLevel.EPIC)
    expect(resolveLevelToken('ticket')).toBe(CRLevel.TICKET)
    expect(resolveLevelToken('TICKET')).toBe(CRLevel.TICKET)
  })

  it('trims surrounding whitespace', () => {
    expect(resolveLevelToken('  e ')).toBe(CRLevel.EPIC)
  })

  it('throws an INVALID_OPERATION ServiceError for unknown tokens', () => {
    expect(() => resolveLevelToken('story')).toThrow(ServiceError)
    try {
      resolveLevelToken('initiative')
    }
    catch (e) {
      const err = e as ServiceError
      expect(err.message).toMatch(/initiative/i)
      expect(err.message).toMatch(/epic.*ticket|ticket.*epic/i)
    }
  })
})

describe('resolveAttrValue dispatches level', () => {
  it('resolves level through the generic dispatcher', () => {
    expect(resolveAttrValue('level', 'e')).toBe(CRLevel.EPIC)
    expect(resolveAttrValue('level', 't')).toBe(CRLevel.TICKET)
  })

  it('passes through non-enum fields untouched (e.g. assignee free text)', () => {
    expect(resolveAttrValue('assignee', 'alice@example.com')).toBe('alice@example.com')
    expect(resolveAttrValue('phaseEpic', 'Q3 cleanup')).toBe('Q3 cleanup')
  })
})
