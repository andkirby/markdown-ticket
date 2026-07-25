/**
 * Cloud Sync HTTP contract — request/response shapes crossing the coordination
 * boundary.
 *
 * Source: docs/architecture/cloud-sync/data-and-consistency.md,
 *         docs/architecture/cloud-sync/identity-and-access.md
 *
 * Pure DTOs only. No runtime logic; the Worker and shared client both import
 * these so the wire shape is compile-time shared.
 */

import type { CloudPrincipal } from './principal'

/** API version prefix; all coordination routes live under /v1. */
export const COORDINATION_API_VERSION = 'v1'

/** Routes for normal project operations (coordination audience). */
export const COORDINATION_ROUTE_PREFIX = `/v1/projects`
/** Routes for operator/admin operations (operator audience). */
export const OPERATOR_ROUTE_PREFIX = `/v1/admin`
/** Unauthenticated health probe. */
export const HEALTH_ROUTE = '/healthz'

/** Project roles (identity-and-access.md § Membership and Roles). */
export type ProjectRole = 'viewer' | 'contributor' | 'owner'

/** Role rank for hierarchy checks; a principal cannot grant above its own. */
export const ROLE_RANK: Record<ProjectRole, number> = {
  viewer: 0,
  contributor: 1,
  owner: 2,
}

/**
 * Result of Access JWT validation + membership resolution, attached to each
 * authorized request context.
 */
export interface PrincipalContext {
  principal: CloudPrincipal
  /** Cloud project UUID from the route, after membership is confirmed. */
  cloudProjectId: string
  role: ProjectRole
}

/** Standard success envelope for responses carrying data. */
export interface CoordinationResponse<T = unknown> {
  requestId: string
  data: T
}

/** Minimal type for a JSON body in a coordination request. */
export type CoordinationRequestBody = Record<string, unknown>
