/**
 * Cloud Sync domain contracts — pure types shared across the HTTP boundary.
 *
 * Permanent owner of pure request, response, error, projection, allocator, and
 * credential-port types for the MDT-200 cloud coordination service.
 *
 * Boundary: docs/CRs/MDT-200/cloud-package-boundary.md
 * Identity: docs/architecture/cloud-sync/identity-and-access.md
 *
 * This barrel currently exports only the foundational principal contract that
 * crosses the coordination HTTP boundary. Allocation, projection,
 * idempotency, membership, and credential-port DTOs arrive with MDT-200
 * Slice 3 (shared local orchestration). Adding them here keeps the
 * `domain-contracts <- cloud/cloudflare` and
 * `domain-contracts <- shared` dependency arrows pure and compile-time
 * enforceable.
 */

export * from './config'
export * from './coordinator'
export * from './errors'
export * from './http'
export * from './membership'
export * from './principal'
export * from './project-management'
export * from './projection'
