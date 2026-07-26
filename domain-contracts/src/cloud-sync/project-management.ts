/**
 * Cloud project management contracts — the reusable service contract for
 * readiness, provisioning, explicit connect, membership, CONFIG_DIR state,
 * diagnostics, disable, and legacy migration (MDT-201 BR-4.1, C1).
 *
 * Pure DTOs only. Orchestration lives in
 * `shared/services/cloud-sync/project-management.ts`. CLI and browser adapters
 * consume this contract and add no lifecycle logic.
 *
 * Authority invariants encoded by these shapes:
 *   - CONFIG_DIR connection is written commit-last after cloud verification
 *     (BR-1.6). A request never carries the connection as authority.
 *   - Provisioning requires the operator audience; `enable` is the ONLY
 *     operation that provisions, and `connect` never provisions (BR-1.1,
 *     BR-1.2, C5).
 *   - Machine membership requests carry the non-secret principal id, never the
 *     client secret (BR-2.3, C8).
 *   - All responses redact secrets; browser-facing consumers never see a
 *     credential value (C6).
 */

import type { CloudSyncConnection } from './config'
import type {
  CoordinationStateRequest,
  ProjectBindingProbe,
  ProjectMember,
  UpsertProjectMemberRequest,
} from './membership'

/**
 * Readiness probe outcome. Adapters surface this before any mutation; the
 * reusable service performs no provisioning until readiness passes.
 */
export interface ReadinessProbe {
  /** True when the trusted service profile and credential path are usable. */
  ready: boolean
  /** Human-stable reason when `ready` is false; never leaks a secret. */
  reason?: string
}

/**
 * Initial provisioning request. Sent to the operator-audience endpoint
 * resolved from the trusted service profile (never repository data — BR-1.3,
 * C5).
 *
 * `idempotencyKey` is journaled client-side BEFORE the first request. A
 * matching retry returns the same cloud project UUID; the same key with
 * changed request content is rejected (BR-1.7, Edge-8).
 */
export interface ProvisionProjectRequest {
  /** Operator-supplied short code, e.g. `MDT`. */
  projectCode: string
  /** Email of the initial owner; verified by the operator Access policy. */
  initialOwnerEmail: string
  /** Optional starting counter; defaults to 1 server-side. */
  initialNextTicketNumber?: number
  /** Client-journaled idempotency key. */
  idempotencyKey: string
  /** SHA-256 of the canonical request body. */
  requestHash: string
}

/** Stable result of a successful or replayed provisioning operation. */
export interface ProvisionProjectResult {
  /** Stable cloud project UUID. Identical for a matching retry. */
  cloudProjectId: string
  /** True when this response is a replay of the original provisioning. */
  replayed: boolean
}

/**
 * Explicit connect request. Accepts an existing non-secret cloud project UUID
 * shared out-of-band and authenticates against the coordination audience.
 *
 * `connect` verifies membership BEFORE writing CONFIG_DIR state and NEVER
 * provisions (BR-1.6, BR-2.2, BR-2.6, C5).
 */
export interface ConnectProjectRequest {
  /** Existing cloud project UUID; never provisioned by connect. */
  cloudProjectId: string
}

/** Result of an explicit connect operation. */
export interface ConnectProjectResult {
  /** The verified cloud project UUID. */
  cloudProjectId: string
  /** Verified membership role at connect time. */
  role: ProjectMember['role']
}

/**
 * Diagnostics view of the installation's cloud connection. Returned to
 * adapters with no secrets (C6) — credentials and tokens never appear here.
 */
export interface CloudConnectionDiagnostics
  extends ReadinessProbe {
  /** Current device-local connection, or null when absent. */
  connection: CloudSyncConnection | null
  /** Latest coordination probe, or null when never probed. */
  probe: ProjectBindingProbe | null
}

/**
 * The reusable cloud project management contract (BR-4.1, C1).
 *
 * One service exposes the whole lifecycle with no presentation logic. CLI and
 * browser adapters only parse input and render output; they never reimplement
 * readiness, provisioning, connect, membership, CONFIG_DIR state, diagnostics,
 * disable, or migration rules.
 *
 * Implementation contract:
 *   - `enable` journals the provisioning idempotency key, provisions (or
 *     recovers the same UUID on retry), probes coordination membership, then
 *     writes CONFIG_DIR state commit-last.
 *   - `connect` authenticates to the coordination audience, verifies existing
 *     membership, then writes CONFIG_DIR state commit-last. It never
 *     provisions.
 *   - `disable` suspends cloud coordination, retains the connection as
 *     `disabled`, and never resumes local numbering.
 *   - `migrateLegacyBinding` reads repository `[project.cloudSync]` only as
 *     explicit migration input; it rejects conflicts and never edits the
 *     repository silently.
 */
export interface CloudProjectManagementService {
  /** Probe readiness without side effects. */
  readiness: () => Promise<ReadinessProbe>

  /**
   * Enable cloud coordination for this installation. The single explicit
   * operation that provisions a new cloud project. Requires the operator
   * Access audience (BR-1.2).
   */
  enable: (req: ProvisionProjectRequest) => Promise<ProvisionProjectResult>

  /**
   * Explicitly connect this installation to an existing cloud project UUID.
   * Authenticates to the coordination audience and verifies membership. Never
   * provisions (BR-2.2, BR-2.6).
   */
  connect: (req: ConnectProjectRequest) => Promise<ConnectProjectResult>

  /** Read the current device-local connection and latest probe (no secrets). */
  diagnostics: () => Promise<CloudConnectionDiagnostics>

  /**
   * Disable cloud coordination: suspend on the cloud side, retain the
   * connection as `disabled`. Ticket creation remains fail-closed (BR-4.2).
   */
  disable: () => Promise<CloudSyncConnection>

  // --- Membership (project-scoped; principal ids only, never secrets) ---

  /** List project members. Requires owner role. */
  listMembers: () => Promise<{ items: ProjectMember[] }>

  /**
   * Add or update a human or machine member at project scope. The request
   * carries only the non-secret principal id and role, never a machine secret
   * (BR-2.1, BR-2.3, C8).
   */
  upsertMember: (
    kind: ProjectMember['kind'],
    principalId: string,
    req: UpsertProjectMemberRequest,
  ) => Promise<ProjectMember>

  /**
   * Revoke a principal from this project. Revocation is project-scoped and
   * blocks the principal on the next protected operation across all devices
   * (BR-2.4, BR-2.5).
   */
  removeMember: (kind: ProjectMember['kind'], principalId: string) => Promise<void>

  /**
   * Update the cloud coordination state. `suspended` is used by `disable`;
   * adapters do not gate ticket creation on this value alone — the local
   * allocator fail-closes on `disabled` connection state (BR-4.2, C2).
   */
  updateCoordinationState: (req: CoordinationStateRequest) => Promise<{ state: 'active' | 'suspended' }>

  /**
   * Explicitly import a legacy repository `[project.cloudSync]` binding into
   * CONFIG_DIR. Rejects a conflicting existing connection and never silently
   * edits repository files (BR-1.8, Edge-9).
   */
  migrateLegacyBinding: () => Promise<{ migrated: boolean, connection: CloudSyncConnection | null }>
}
