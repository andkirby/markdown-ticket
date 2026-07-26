/**
 * Cloud Sync coordinator port — the local-facing contract for reaching the
 * cloud coordination service over JSON/HTTPS.
 *
 * Source: docs/architecture/cloud-sync/README.md § Local Integration Contract,
 *         docs/CRs/MDT-199/architecture.md § Module Ownership.
 *
 * This is the port the shared CloudTicketNumberAllocator and
 * CloudProjectionClient implement against. Credential providers are injected;
 * credentials are never part of these request shapes (C5).
 */

import type {
  AcknowledgeReservationRequest,
  AcknowledgeReservationResponse,
} from './projection'

/**
 * Cloudflare Access audiences used by audience-aware credential resolution and
 * management HTTP routing.
 *
 * - `operator` — required for initial project provisioning (BR-1.2, C5). A
 *   project owner who is not an operator is denied at this audience.
 * - `coordination` — used by every other operation (teammate connect, normal
 *   project operations, membership, diagnostics, disable).
 *
 * The privileged provisioning endpoint is resolved only from the trusted
 * service profile, never from repository data (BR-1.3).
 */
export const CloudAccessAudience = {
  OPERATOR: 'operator',
  COORDINATION: 'coordination',
} as const

export type CloudAccessAudienceValue
  = (typeof CloudAccessAudience)[keyof typeof CloudAccessAudience]

/** A reservation returned by the coordinator. */
export interface ReservationDTO {
  reservationId: string
  ticketNumber: number
  state: string
  replayed: boolean
}

/** A cloud-bound allocation request. Idempotency key is journaled client-side first. */
export interface ReserveRequest {
  cloudProjectId: string
  /** Client-generated; persisted to the operation journal before the first call. */
  idempotencyKey: string
  /** SHA-256 of the canonical request body. */
  requestHash: string
}

/**
 * Credential provider port — injected per runtime (browser server, interactive
 * CLI/MCP, headless MCP). Returns the header to attach, or null if no
 * credential is available (caller must NOT fall back to local numbering).
 *
 * MDT-201 adds audience-aware resolution: provisioning requests the `operator`
 * audience; all other operations request `coordination` (C5, BR-1.2).
 */
export type CloudCredential
  = | { kind: 'human', cfAccessToken: string }
    | { kind: 'service', clientId: string, clientSecret: string }

export interface CloudCredentialProvider {
  /**
   * Resolve the credential for the validated serviceUrl. Returns the
   * `cf-access-token` header value, or null when no session exists.
   * Never throws on "no session" — returns null so the caller can surface
   * authentication_required without a local fallback.
   */
  resolve: (serviceUrl: string) => Promise<CloudCredential | null>
}

/**
 * Audience-aware credential provider port (MDT-201).
 *
 * Implementations resolve a credential for the given audience at the validated
 * service origin. Returns null when no credential is available for that
 * audience; the caller surfaces authentication_required without a local
 * fallback (BR-1.2, BR-1.5, C5).
 *
 * - `operator` resolution is used for provisioning. A project owner who is not
 *   admitted by the operator Access policy receives a clear denial.
 * - `coordination` resolution is used for connect, membership, diagnostics,
 *   disable, and normal operations.
 */
export interface AudienceAwareCredentialProvider {
  resolve: (
    serviceOrigin: string,
    audience: CloudAccessAudienceValue,
  ) => Promise<CloudCredential | null>
}

/**
 * Coordinator port — the JSON/HTTPS client. Implementations enforce the origin
 * allowlist (C6) and reject redirects before attaching credentials.
 */
export interface CloudSyncCoordinator {
  reserve: (req: ReserveRequest, credential: CloudCredential) => Promise<ReservationDTO>
  acknowledge: (
    req: AcknowledgeReservationRequest,
    credential: CloudCredential,
  ) => Promise<AcknowledgeReservationResponse>
}
