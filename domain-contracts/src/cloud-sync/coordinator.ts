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
