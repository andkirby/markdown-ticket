/**
 * Unit Tests for routing.ts normalizeTicketKey (MDT-159)
 *
 * Regression tests verifying that ticket key normalization handles
 * 3-digit, 4-digit, and 5-digit CR keys correctly.
 *
 * Edge-2: Frontend routing must correctly route URLs containing
 * 4-digit and 5-digit CR keys without layout breakage.
 */

import { normalizeTicketKey } from '../routing'

describe('normalizeTicketKey (MDT-159: Edge-2)', () => {
  it('Given 3-digit key "MDT-005" WHEN normalizing THEN returns "MDT-005"', () => {
    expect(normalizeTicketKey('MDT-005')).toBe('MDT-005')
  })

  it('Given 3-digit unpadded key "MDT-5" WHEN normalizing THEN returns "MDT-005"', () => {
    expect(normalizeTicketKey('MDT-5')).toBe('MDT-005')
  })

  it('Given 4-digit key "MDT-1000" WHEN normalizing THEN returns "MDT-1000" (Edge-2)', () => {
    expect(normalizeTicketKey('MDT-1000')).toBe('MDT-1000')
  })

  it('Given 4-digit unpadded key "MDT-1000" WHEN normalizing THEN returns "MDT-1000"', () => {
    // 1000 is already 4 digits, padStart(3,'0') is a no-op
    expect(normalizeTicketKey('MDT-1000')).toBe('MDT-1000')
  })

  it('Given 5-digit key "MDT-10000" WHEN normalizing THEN returns "MDT-10000" (Edge-2)', () => {
    expect(normalizeTicketKey('MDT-10000')).toBe('MDT-10000')
  })

  it('Given different project code "API-1000" WHEN normalizing THEN returns "API-1000"', () => {
    expect(normalizeTicketKey('API-1000')).toBe('API-1000')
  })

  it('Given empty string WHEN normalizing THEN returns empty string', () => {
    expect(normalizeTicketKey('')).toBe('')
  })

  it('Given null WHEN normalizing THEN returns empty string', () => {
    expect(normalizeTicketKey(null as unknown as string)).toBe('')
  })

  it('Given invalid format "MDT5" WHEN normalizing THEN returns sanitized input', () => {
    expect(normalizeTicketKey('MDT5')).toBe('MDT5')
  })
})
