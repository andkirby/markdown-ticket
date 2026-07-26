/**
 * Cloud Sync configuration contracts.
 *
 * Source: docs/architecture/cloud-sync/README.md § Local Cloud Connection,
 *         docs/CRs/MDT-201/requirements.md § Authority and Storage,
 *         constraints C3 (connection record), C4 (opt-in), C5 (no secrets),
 *         C6 (allowlist).
 *
 * Pure types only. Validation lives in shared/services/cloud-sync.
 *
 * MDT-201 authority model:
 *   - Active cloud connection state lives ONLY in
 *     `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml`.
 *   - Repository `.mdt-config.toml` and the registry entry
 *     `CONFIG_DIR/projects/{localProjectId}.toml` carry no cloud connection.
 *   - The legacy `ProjectCloudSyncBinding` type is retained as migration input
 *     only — never written by normal lifecycle operations (BR-1.5, C3).
 */

/** Connection schema version written to `cloud-sync.toml`. Currently `1`. */
export const CLOUD_SYNC_CONNECTION_VERSION = 1 as const

/**
 * Connection state written under CONFIG_DIR. `disabled` is retained and
 * fail-closed — only a complete absence selects local-only behavior (C3,
 * BR-4.2).
 */
export const CloudSyncConnectionState = {
  ENABLED: 'enabled',
  DISABLED: 'disabled',
} as const

export type CloudSyncConnectionStateValue
  = (typeof CloudSyncConnectionState)[keyof typeof CloudSyncConnectionState]

/**
 * Non-secret device-local cloud connection record. Lives at
 * `CONFIG_DIR/projects/{localProjectId}/cloud-sync.toml` (C3).
 *
 * Writes are atomic and commit-last after cloud verification (BR-1.6). This
 * record never contains credentials (C5, C6).
 */
export interface CloudSyncConnection {
  /** Schema version; currently {@link CLOUD_SYNC_CONNECTION_VERSION}. */
  version: typeof CLOUD_SYNC_CONNECTION_VERSION
  /** `enabled` selects cloud coordination; `disabled` remains fail-closed. */
  state: CloudSyncConnectionStateValue
  /** Stable UUID issued by the cloud; never caller-supplied by repository data. */
  cloudProjectId: string
  /** Absolute HTTPS coordination origin; exact trusted-profile match (C4). */
  serviceOrigin: string
  /** Integer 5–300; default 15. */
  pollIntervalSeconds: number
}

/**
 * Discriminated read result for the project connection record. `absent` is the
 * ONLY outcome that selects local allocation (C3, BR-4.2, BR-5.1). Disabled,
 * malformed, and untrusted outcomes fail closed.
 */
export type ProjectConnectionRead
  = | { kind: 'absent' }
    | { kind: 'enabled', connection: CloudSyncConnection }
    | { kind: 'disabled', connection: CloudSyncConnection }
    | { kind: 'malformed', reason: string }
    | { kind: 'untrusted', connection: CloudSyncConnection, reason: string }

/**
 * Legacy repository `[project.cloudSync]` binding.
 *
 * MDT-201 reads this ONLY as explicit migration input
 * (`legacy-binding-migration.ts`). Normal lifecycle operations never write it,
 * and repository files contain no active cloud state (BR-1.5, BR-1.8, C3).
 */
export interface ProjectCloudSyncBinding {
  /** Opt-in; true only after provisioning + a successful membership probe (C4). */
  enabled: boolean
  /** UUID issued by the cloud; immutable while enabled. */
  projectId: string
  /** Absolute HTTPS origin; no path/query/fragment/credentials/wildcard. */
  serviceUrl: string
  /** Integer 5–300; default 15. */
  pollIntervalSeconds: number
}

/** Global operator-controlled origin allowlist. Lives in CONFIG_DIR/config.toml. */
export interface GlobalCloudSyncConfig {
  /**
   * Absolute HTTPS origins only. Default empty — denies every credential flow
   * until an operator configures an origin (C6). Project files cannot expand it.
   *
   * Distribution-provided origins are merged in by the trusted service profile
   * (MDT-201); this list holds operator-added exact-HTTPS extensions only.
   */
  allowedOrigins: string[]
}

/** Result of validating a serviceUrl against the global allowlist (C6). */
export type OriginAllowlistResult
  = | { allowed: true }
    | { allowed: false, reason: 'not_allowlisted' | 'not_https' | 'has_path' | 'empty_allowlist' }
