/**
 * Verified coordination principal — derived from a validated Cloudflare Access
 * application assertion by the Worker, never caller-supplied.
 *
 * Source: docs/architecture/cloud-sync/identity-and-access.md § Principal Contract
 *
 * The Worker validates the `Cf-Access-Jwt-Assertion` and derives exactly one
 * principal kind:
 *   - human: non-empty `email`, normalized with trim and lowercase
 *   - machine: non-empty `common_name` (the Access service-token client ID)
 *
 * Audit records store `kind`, `id`, and membership label only. They never store
 * the raw JWT, Access cookie, service-token secret, or authorization headers.
 */

export type CloudPrincipalKind = 'human' | 'machine'

export interface CloudPrincipalHuman {
  kind: 'human'
  /** Normalized email; stable membership key for human principals. */
  id: string
  /** Display label; identical to `id` in the first slice. */
  display: string
}

export interface CloudPrincipalMachine {
  kind: 'machine'
  /** Verified Access service-token `common_name`; stable membership key. */
  id: string
  /** Membership label, never a secret. */
  display: string
}

/**
 * Verified coordination principal. Discriminated by `kind`.
 */
export type CloudPrincipal = CloudPrincipalHuman | CloudPrincipalMachine
