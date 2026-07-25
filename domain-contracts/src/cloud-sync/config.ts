/**
 * Cloud Sync configuration contracts.
 *
 * Source: docs/architecture/cloud-sync/README.md § Project Binding,
 *         constraints C4 (opt-in), C5 (no secrets), C6 (allowlist).
 *
 * Pure types only. Validation lives in shared/services/cloud-sync.
 */

/** Non-secret per-project cloud binding. Lives in .mdt-config.toml. */
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
   */
  allowedOrigins: string[]
}

/** Result of validating a serviceUrl against the global allowlist (C6). */
export type OriginAllowlistResult
  = | { allowed: true }
    | { allowed: false, reason: 'not_allowlisted' | 'not_https' | 'has_path' | 'empty_allowlist' }
