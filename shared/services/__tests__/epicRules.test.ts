/**
 * MDT-205 — Pure epic rules unit tests.
 *
 * These test the stable domain facts with zero I/O: ticket-key shape, usable
 * epic state, close-terminal set, phaseEpic target resolution (all outcomes),
 * and the epic close guard with mixed/terminal/empty children. Also asserts the
 * stable EPIC_* error codes that every surface maps to user-facing text.
 */

import type { RuleTicket } from '../epicRules'
import {
  assertEpicClosable,
  EPIC_CLOSE_TERMINAL_STATUSES,
  EPIC_ERROR_CODES,
  EpicRuleError,
  isEpicCloseTerminal,
  isTicketKey,
  isUsableEpicState,
  resolvePhaseEpicTarget,

  USABLE_EPIC_STATUSES,
} from '../epicRules'

const epic = (code: string, status = 'Approved'): RuleTicket => ({ code, level: 'epic', status })
const child = (code: string, status = 'In Progress'): RuleTicket => ({ code, level: 'ticket', status })

describe('isTicketKey', () => {
  it.each([
    ['MDT-205', true],
    ['ABC-1', true],
    ['abc-123', true], // case-insensitive
    ['TEST-1234', true],
  ])('accepts %s → %s', (value, expected) => {
    expect(isTicketKey(value)).toBe(expected)
  })

  it.each([
    ['Q3 cleanup', false], // free text — not validated (Edge-6)
    ['', false],
    ['MDT', false],
    [undefined, false],
    [null, false],
    [123, false],
  ])('rejects %s → %s', (value, expected) => {
    expect(isTicketKey(value)).toBe(expected)
  })
})

describe('usable / terminal state sets', () => {
  it('treats Approved and Implemented as usable epic states', () => {
    expect(USABLE_EPIC_STATUSES).toEqual(['Approved', 'Implemented'])
    expect(isUsableEpicState('Approved')).toBe(true)
    expect(isUsableEpicState('Implemented')).toBe(true)
    expect(isUsableEpicState('Proposed')).toBe(false)
  })

  it('treats Implemented/Rejected/Partially Implemented as close-terminal (C-3)', () => {
    expect(EPIC_CLOSE_TERMINAL_STATUSES).toEqual([
      'Implemented',
      'Rejected',
      'Partially Implemented',
    ])
    expect(isEpicCloseTerminal('Implemented')).toBe(true)
    expect(isEpicCloseTerminal('Rejected')).toBe(true)
    expect(isEpicCloseTerminal('Partially Implemented')).toBe(true)
    expect(isEpicCloseTerminal('In Progress')).toBe(false)
    expect(isEpicCloseTerminal('Approved')).toBe(false)
  })
})

describe('resolvePhaseEpicTarget', () => {
  describe('clearing and free text', () => {
    it('allows clearing phaseEpic regardless of epic state (Edge-2)', () => {
      expect(resolvePhaseEpicTarget('', epic('MDT-1', 'Proposed'))).toEqual({ outcome: 'ok' })
      expect(resolvePhaseEpicTarget(undefined, null)).toEqual({ outcome: 'ok' })
    })

    it('skips validation for free-text (non-key) values (Edge-6)', () => {
      const res = resolvePhaseEpicTarget('Q3 security overhaul', null)
      expect(res.outcome).toBe('skipped')
    })
  })

  describe('key-shaped targets', () => {
    it('rejects a missing target with TARGET_NOT_FOUND (Edge-7)', () => {
      const res = resolvePhaseEpicTarget('MDT-999', null)
      expect(res).toEqual({
        outcome: 'reject',
        code: EPIC_ERROR_CODES.TARGET_NOT_FOUND,
        message: expect.stringContaining('MDT-999'),
      })
    })

    it('rejects a target that is not an epic with TARGET_NOT_EPIC', () => {
      const res = resolvePhaseEpicTarget('MDT-010', { code: 'MDT-010', level: 'ticket', status: 'In Progress' })
      expect(res.outcome).toBe('reject')
      if (res.outcome === 'reject') {
        expect(res.code).toBe(EPIC_ERROR_CODES.TARGET_NOT_EPIC)
        expect(res.message).toContain('MDT-010')
        expect(res.message).toMatch(/not an epic/i)
      }
    })

    it('rejects a Proposed epic with NOT_USABLE (must be Approved first)', () => {
      const res = resolvePhaseEpicTarget('MDT-010', epic('MDT-010', 'Proposed'))
      expect(res.outcome).toBe('reject')
      if (res.outcome === 'reject') {
        expect(res.code).toBe(EPIC_ERROR_CODES.NOT_USABLE)
        expect(res.message).toMatch(/approve/i)
      }
    })

    it('accepts an Approved epic', () => {
      expect(resolvePhaseEpicTarget('MDT-010', epic('MDT-010', 'Approved'))).toEqual({ outcome: 'ok' })
    })

    it('accepts an Implemented epic', () => {
      expect(resolvePhaseEpicTarget('MDT-010', epic('MDT-010', 'Implemented'))).toEqual({ outcome: 'ok' })
    })

    it('accepts a cross-project key (MDT-205 scope validates target shape only here)', () => {
      // The orchestrator resolves the cross-project target; the pure rule only
      // requires that a usable epic was passed in. ABC-012 is key-shaped (Edge-1).
      expect(isTicketKey('ABC-012')).toBe(true)
      expect(resolvePhaseEpicTarget('ABC-012', epic('ABC-012', 'Approved'))).toEqual({ outcome: 'ok' })
    })
  })
})

describe('assertEpicClosable (close guard)', () => {
  it('blocks close when any child is non-terminal and lists blockers (BR-5)', () => {
    const children = [
      child('MDT-011', 'In Progress'),
      child('MDT-012', 'Implemented'),
      child('MDT-013', 'Approved'),
    ]
    expect(() => assertEpicClosable(epic('MDT-010'), children)).toThrow(EpicRuleError)
    try {
      assertEpicClosable(epic('MDT-010'), children)
    }
    catch (e) {
      const err = e as EpicRuleError
      expect(err.code).toBe(EPIC_ERROR_CODES.HAS_OPEN_CHILDREN)
      expect(err.message).toContain('MDT-011')
      expect(err.message).toContain('MDT-013')
      expect(err.message).not.toContain('MDT-012')
      expect(err.details).toEqual({ blockers: ['MDT-011', 'MDT-013'] })
    }
  })

  it('allows close when all children are terminal (BR-5)', () => {
    const children = [
      child('MDT-011', 'Implemented'),
      child('MDT-012', 'Rejected'),
      child('MDT-013', 'Partially Implemented'),
    ]
    expect(() => assertEpicClosable(epic('MDT-010'), children)).not.toThrow()
  })

  it('allows close when the epic has zero children (Edge-3)', () => {
    expect(() => assertEpicClosable(epic('MDT-010'), [])).not.toThrow()
  })

  it('allows close when children are all terminal including Implemented', () => {
    expect(() => assertEpicClosable(epic('MDT-010'), [child('MDT-1', 'Implemented')])).not.toThrow()
  })
})

describe('EPIC_ERROR_CODES stability (cross-surface contract)', () => {
  it('exposes stable string codes', () => {
    expect(EPIC_ERROR_CODES.TARGET_NOT_FOUND).toBe('EPIC_TARGET_NOT_FOUND')
    expect(EPIC_ERROR_CODES.TARGET_NOT_EPIC).toBe('EPIC_TARGET_NOT_EPIC')
    expect(EPIC_ERROR_CODES.NOT_USABLE).toBe('EPIC_NOT_USABLE')
    expect(EPIC_ERROR_CODES.HAS_OPEN_CHILDREN).toBe('EPIC_HAS_OPEN_CHILDREN')
  })
})
