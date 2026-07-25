/**
 * Rate-limit abuse guard.
 *
 * Source: docs/architecture/cloud-sync/operations.md § Rate Limits,
 *         constraint C7.
 *
 * Rate limiting is ONLY an abuse / runaway-client guard. It must never be used
 * to issue numbers, enforce quotas, or replace D1 unique constraints. Allocation
 * correctness comes from the D1 transaction; this binding only returns 429 when
 * a caller exceeds its operation budget.
 */

import type { CloudPrincipal } from '@mdt/domain-contracts'

/** The two Workers rate-limit bindings declared in wrangler.jsonc. */
export type RateLimitBinding = 'RATE_LIMIT_READ' | 'RATE_LIMIT_MUTATE'

export interface RateLimitEnv {
  RATE_LIMIT_READ: { limit: (o: { key: string }) => Promise<{ success: boolean }> }
  RATE_LIMIT_MUTATE: { limit: (o: { key: string }) => Promise<{ success: boolean }> }
}

/**
 * Build the rate-limit key per operations.md: derived from principal kind,
 * principal id, cloud project uuid, and route class. Location-local and
 * permissive by design (Workers rate limits are eventually consistent).
 */
export function rateLimitKey(
  principal: CloudPrincipal,
  cloudProjectId: string,
  routeClass: 'read' | 'mutate' | 'operator',
): string {
  return `${principal.kind}:${principal.id}:${cloudProjectId}:${routeClass}`
}

/**
 * Check the rate-limit binding for one request. Returns true if the request is
 * within budget, false if it exceeded (caller maps to 429 rate_limited).
 *
 * This guard is advisory: a false return does NOT roll back an allocation — the
 * D1 transaction is the correctness control. The guard only shapes abuse.
 */
export async function withinRateLimit(
  env: RateLimitEnv,
  binding: RateLimitBinding,
  key: string,
): Promise<boolean> {
  const limiter = env[binding]
  const outcome = await limiter.limit({ key })
  return outcome.success
}
