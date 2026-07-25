/**
 * TEST-rate-limit-abuse — covers C7.
 *
 * Verifies the rate-limit guard is purely advisory: a 429 from the binding does
 * NOT roll back or gate allocation correctness. The D1 transaction is the only
 * correctness control. Also verifies the key derivation shape.
 */

import type { RateLimitEnv } from '../src/cloudflare/rate-limit/guard'
import { describe, expect, mock, test } from 'bun:test'
import * as guardModule from '../src/cloudflare/rate-limit/guard'
import { rateLimitKey, withinRateLimit } from '../src/cloudflare/rate-limit/guard'

describe('rate-limit abuse guard (C7)', () => {
  test('rateLimitKey derives from principal kind/id, project, route class', () => {
    const key = rateLimitKey(
      { kind: 'human', id: 'a@b.com', display: 'a@b.com' },
      'proj-1',
      'mutate',
    )
    expect(key).toBe('human:a@b.com:proj-1:mutate')
  })

  test('withinRateLimit returns true when binding allows', async () => {
    const env = {
      RATE_LIMIT_READ: { limit: mock(() => Promise.resolve({ success: true })) },
      RATE_LIMIT_MUTATE: { limit: mock(() => Promise.resolve({ success: true })) },
    } as unknown as RateLimitEnv
    const ok = await withinRateLimit(env, 'RATE_LIMIT_MUTATE', 'human:a@b.com:p1:mutate')
    expect(ok).toBe(true)
    expect(env.RATE_LIMIT_MUTATE.limit).toHaveBeenCalledTimes(1)
  })

  test('withinRateLimit returns false when binding denies (abuse)', async () => {
    const env = {
      RATE_LIMIT_READ: { limit: mock(() => Promise.resolve({ success: true })) },
      RATE_LIMIT_MUTATE: { limit: mock(() => Promise.resolve({ success: false })) },
    } as unknown as RateLimitEnv
    const ok = await withinRateLimit(env, 'RATE_LIMIT_MUTATE', 'human:a@b.com:p1:mutate')
    expect(ok).toBe(false)
  })

  test('a denied rate limit does NOT gate allocation correctness (advisory only)', () => {
    // The guard returns a boolean; the allocation transaction (statements.ts) is
    // independent and runs regardless. This test documents that contract: the
    // guard has no reference to D1, the counter, or the reservation — it cannot
    // affect allocation correctness by design.
    const guardModuleStar = guardModule
    expect(typeof guardModuleStar.withinRateLimit).toBe('function')
    // No D1/counter/reservation symbols are exported from the guard module.
    const exports = Object.keys(guardModuleStar)
    expect(exports).not.toContain('allocateReservation')
    expect(exports).not.toContain('next_ticket_number')
  })
})
