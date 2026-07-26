/**
 * LegacyBindingMigration — explicit import of a repository `[project.cloudSync]`
 * binding into CONFIG_DIR (MDT-201, BR-1.8 / Edge-9).
 *
 * Source: docs/CRs/MDT-201/architecture.md § Legacy migration,
 *         docs/CRs/MDT-201/requirements.md § Lifecycle Decisions.
 *
 * Migration rules:
 *   - The legacy `ProjectCloudSyncBinding` is read ONLY as migration input.
 *     Normal lifecycle operations never write repository cloud fields.
 *   - A MISSING CONFIG_DIR connection is imported AFTER membership verification.
 *   - An IDENTICAL existing connection is a no-op.
 *   - A CONFLICTING existing connection fails closed (BR-1.8, Edge-9).
 *   - Repository files are NEVER silently edited; migration writes only
 *     CONFIG_DIR. Removing the legacy block is a separate acknowledged cleanup.
 *
 * The legacy binding's `serviceUrl` must be in the trusted service profile; an
 * untrusted origin fails closed (no import, no credential sent).
 */

import type {
  CloudCredential,
  CloudSyncConnection,
  ProjectBindingProbe,
  ProjectCloudSyncBinding,
} from '@mdt/domain-contracts'
import type { ProjectStateStore } from './project-state-store.js'
import type { TrustedServiceProfile } from './trusted-service-profile.js'
import {
  CLOUD_SYNC_CONNECTION_VERSION,
  CloudSyncConnectionState,
  CoordinatorError,
} from '@mdt/domain-contracts'

/** Source of the legacy repository binding (read-only). */
export interface LegacyMigrationSource {
  /** Return the legacy `[project.cloudSync]` binding, or null when absent. */
  readLegacyBinding: () => Promise<ProjectCloudSyncBinding | null>
}

export interface LegacyBindingMigrationOptions {
  localProjectId: string
  profile: TrustedServiceProfile
  stateStore: ProjectStateStore
  source: LegacyMigrationSource
  /** Membership probe used to verify the legacy binding before import. */
  probe: (cloudProjectId: string, credential: CloudCredential) => Promise<ProjectBindingProbe>
  /** Coordination-credential resolver for the verification probe. */
  resolveCredential: () => Promise<CloudCredential | null>
}

/** Result of a migration attempt. */
export interface LegacyMigrationResult {
  migrated: boolean
  connection: CloudSyncConnection | null
}

export class LegacyBindingMigration {
  constructor(private readonly opts: LegacyBindingMigrationOptions) {}

  /**
   * Run the explicit migration. Throws on conflict or verification failure;
   * never edits repository files.
   */
  async migrate(): Promise<LegacyMigrationResult> {
    const legacy = await this.opts.source.readLegacyBinding()
    if (!legacy || !legacy.enabled) {
      // Nothing to migrate (absent or explicitly disabled → local-only).
      return { migrated: false, connection: null }
    }

    // Map the legacy binding to the new connection shape. The serviceUrl must
    // be in the trusted profile; the state store re-checks trust on write.
    const candidate: CloudSyncConnection = {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId: legacy.projectId,
      serviceOrigin: legacy.serviceUrl,
      pollIntervalSeconds: legacy.pollIntervalSeconds,
    }

    // Compare against any existing connection.
    const existing = await this.opts.stateStore.read(this.opts.localProjectId)
    if (existing.kind === 'enabled' || existing.kind === 'disabled' || existing.kind === 'untrusted') {
      const existingConnection = existing.connection
      if (sameConnection(existingConnection, candidate)) {
        // Identical → no-op.
        return { migrated: false, connection: existingConnection }
      }
      // Conflict → fail closed. Neither source is modified.
      throw new CoordinatorError('reservation_state_conflict', {
        message: 'legacy migration conflicts with an existing CONFIG_DIR connection',
      })
    }
    if (existing.kind === 'malformed') {
      // A malformed existing connection is itself a fail-closed state; do not
      // overwrite it silently. Surface the conflict.
      throw new CoordinatorError('reservation_state_conflict', {
        message: 'existing CONFIG_DIR connection is malformed; resolve before migration',
      })
    }

    // existing.kind === 'absent' → verify membership, then import.
    const credential = await this.opts.resolveCredential()
    if (!credential) {
      throw new CoordinatorError('authentication_required', { message: 'no coordination credential available for migration verification' })
    }
    // Verify membership on the legacy cloud project id. This is the same
    // per-operation cloud check used by connect — local state grants nothing.
    await this.opts.probe(candidate.cloudProjectId, credential)

    // Import: write CONFIG_DIR commit-last. The state store enforces trust on
    // write, so an untrusted legacy origin fails here without a partial write.
    await this.opts.stateStore.write(this.opts.localProjectId, candidate)
    return { migrated: true, connection: candidate }
  }
}

/** Structural equality for the connection fields that identify a binding. */
function sameConnection(a: CloudSyncConnection, b: CloudSyncConnection): boolean {
  return a.cloudProjectId === b.cloudProjectId
    && a.serviceOrigin === b.serviceOrigin
    && a.state === b.state
    && a.pollIntervalSeconds === b.pollIntervalSeconds
    && a.version === b.version
}
