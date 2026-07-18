/**
 * Tests for dependency satisfaction classifier (MDT-189 TASK-satisfaction).
 *
 * Covers every status in CRStatusSchema (7 values) with an explicit expected
 * result, plus the safe-default behavior for unknown/legacy statuses (Edge-1)
 * and the classifyViolation matrix for Implemented / Rejected / missing /
 * unknown.
 *
 * Framework: @jest/globals (cross-runner safe — works under jest and bun test).
 */

import { describe, expect, it } from '@jest/globals'
import {
  classifyViolation,
  isDependencySatisfied,
  MISSING_DEP_STATUS,
} from '../satisfaction.js'

describe('isDependencySatisfied', () => {
  it('returns true for Implemented (terminal success)', () => {
    expect(isDependencySatisfied('Implemented')).toBe(true)
  })

  it.each([
    ['Proposed'],
    ['Approved'],
    ['In Progress'],
    ['On Hold'],
    ['Rejected'],
    ['Partially Implemented'],
  ])('returns false for %s (non-terminal or failure)', (status) => {
    expect(isDependencySatisfied(status)).toBe(false)
  })

  it('returns false for an unrecognized legacy status (Edge-1 safe default)', () => {
    // "Deferred" appeared in legacy data and is not in CRStatusSchema.
    // The prior validator died on this case; v1 treats unknown as unsatisfied.
    expect(isDependencySatisfied('Deferred')).toBe(false)
    expect(isDependencySatisfied('Pending')).toBe(false)
    expect(isDependencySatisfied('')).toBe(false)
  })
})

describe('classifyViolation', () => {
  it('classifies Implemented as satisfied', () => {
    expect(classifyViolation('Implemented')).toBe('satisfied')
  })

  it('classifies Rejected as broken-plan (terminal failure)', () => {
    expect(classifyViolation('Rejected')).toBe('broken-plan')
  })

  it('classifies a missing target as broken-plan (plan is internally broken)', () => {
    expect(classifyViolation(MISSING_DEP_STATUS)).toBe('broken-plan')
    // The literal string is also accepted for callers that don't import the sentinel.
    expect(classifyViolation('missing')).toBe('broken-plan')
  })

  it.each([
    ['Proposed'],
    ['Approved'],
    ['In Progress'],
    ['On Hold'],
    ['Partially Implemented'],
  ])('classifies %s as waiting (reality incomplete)', (status) => {
    expect(classifyViolation(status)).toBe('waiting')
  })

  it('classifies an unknown/legacy status as waiting (Edge-1 safe default)', () => {
    // Unknown statuses do not throw — they fall through to the safe default.
    expect(classifyViolation('Deferred')).toBe('waiting')
    expect(classifyViolation('Pending')).toBe('waiting')
    expect(classifyViolation('')).toBe('waiting')
  })
})
