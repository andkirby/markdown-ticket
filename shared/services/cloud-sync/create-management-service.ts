/**
 * Composition seam for the MDT-201 `CloudProjectManagementService`
 * (MDT-202 TASK-1 / ART-shared-mgmt-factory).
 *
 * Source: docs/CRs/MDT-202/architecture.md § The Shared Composition Seam.
 *
 * `CloudProjectManagementService` is the reusable lifecycle contract, but it
 * is only a class — it has no factory. Without this seam, a CLI (or browser)
 * adapter would have to import five collaborators (`ProjectStateStore`,
 * `TrustedServiceProfile`, `ManagementCoordinator`,
 * `AudienceAwareCredentialResolver`, optional `LegacyBindingMigration`) and
 * wire them inline. That wiring is reusable business composition, so it
 * belongs in `shared/`, not in any presentation shell (C-2).
 *
 * This is NOT a provider framework. It is one function that calls existing
 * constructors in the order MDT-201 documents. It owns no lifecycle rules.
 */

import type {
  AudienceAwareCredentialProvider,
  CloudAccessAudienceValue,
  CloudCredential,
  GlobalCloudSyncConfig,
  ProjectCloudSyncBinding,
} from '@mdt/domain-contracts'
import type { LegacyMigrationSource } from './legacy-binding-migration.js'
import type { FetchImpl } from './management-coordinator.js'
import type { CloudProjectManagementService } from './project-management.js'
import { AudienceAwareCredentialResolver } from './credential-providers.js'
import { LegacyBindingMigration } from './legacy-binding-migration.js'
import { ManagementCoordinator } from './management-coordinator.js'
import { CloudProjectManagementService as CloudProjectManagementServiceImpl } from './project-management.js'
import { ProjectStateStore } from './project-state-store.js'
import { resolveTrustedServiceProfile } from './trusted-service-profile.js'

/**
 * Inputs to the composition seam. Every input is an existing type from
 * MDT-201; this function adds no new domain concept.
 */
export interface CreateManagementServiceOptions {
  /** Local project identifier (slug of the project path under CONFIG_DIR). */
  localProjectId: string
  /** Project code (e.g. `MDT`); required for provisioning. */
  projectCode: string
  /** Initial owner email; required for provisioning. */
  initialOwnerEmail: string
  /**
   * Operator-controlled exact-HTTPS extensions from
   * `cloudSync.allowedOrigins` in CONFIG_DIR/config.toml. Empty by default.
   */
  operatorOrigins?: readonly string[]
  /**
   * Audience-aware credential provider. The CLI injects a runtime provider
   * (human + service token); tests inject a fake.
   */
  credentialProvider: AudienceAwareCredentialProvider
  /** Optional idempotency-journal root under CONFIG_DIR. */
  idempotencyJournalRoot?: string
  /** Optional legacy migration source for `migrate-legacy`. */
  legacyMigrationSource?: LegacyMigrationSource
  /** Injected fetch for tests; defaults to global fetch. */
  fetchImpl?: FetchImpl
  /**
   * CONFIG_DIR root for the connection store + credential store. Defaults to
   * the shared CONFIG_DIR. Tests pass a temp dir.
   */
  configDirRoot?: string
}

/** The composed management surface plus the handles adapters also need. */
export interface ManagementServiceHandle {
  /** The reusable lifecycle service. */
  service: CloudProjectManagementService
  /** The trusted profile used to compose the service (for `doctor`). */
  profile: ReturnType<typeof resolveTrustedServiceProfile>
  /** The coordination origin selected from the trusted profile. */
  coordinationOrigin: string
  /** The operator-audience provisioning origin selected from the profile. */
  provisioningOrigin: string
  /** The effective global cloud-sync config (distribution + operator). */
  globalConfig: GlobalCloudSyncConfig
}

/**
 * Compose a `CloudProjectManagementService` from existing MDT-201 parts.
 *
 * Order matches docs/CRs/MDT-201/architecture.md § Module Boundaries:
 * profile → state store → coordinator → resolver → service. The legacy
 * migration source is wired only when supplied.
 */
export function createManagementService(
  opts: CreateManagementServiceOptions,
): ManagementServiceHandle {
  const operatorOrigins = opts.operatorOrigins ?? []
  const profile = resolveTrustedServiceProfile({ operatorOrigins })
  const globalConfig: GlobalCloudSyncConfig = { allowedOrigins: [...profile.origins] }

  const stateStore = new ProjectStateStore({
    profile,
    ...(opts.configDirRoot !== undefined ? { rootDir: opts.configDirRoot } : {}),
  })

  const coordinator = new ManagementCoordinator({
    coordinationOrigin: profile.coordinationOriginDefault,
    provisioningOrigin: profile.provisioningOrigin,
    globalConfig,
    ...(opts.fetchImpl !== undefined ? { fetchImpl: opts.fetchImpl } : {}),
  })

  const resolver = new AudienceAwareCredentialResolver(opts.credentialProvider)

  const legacyMigration = opts.legacyMigrationSource
    ? {
        legacyMigration: {
          migrate: () => {
            const migration = new LegacyBindingMigration({
              localProjectId: opts.localProjectId,
              profile,
              stateStore,
              source: opts.legacyMigrationSource!,
              probe: (cloudProjectId: string, credential: CloudCredential) =>
                coordinator.probe(cloudProjectId, credential),
              resolveCredential: () => resolver.forConnect(profile.coordinationOriginDefault),
            })
            return migration.migrate()
          },
        },
      }
    : {}

  const service = new CloudProjectManagementServiceImpl({
    localProjectId: opts.localProjectId,
    profile,
    stateStore,
    coordinator,
    resolver,
    provisioningOrigin: profile.provisioningOrigin,
    coordinationOrigin: profile.coordinationOriginDefault,
    globalConfig,
    projectCode: opts.projectCode,
    initialOwnerEmail: opts.initialOwnerEmail,
    ...(opts.idempotencyJournalRoot !== undefined
      ? { idempotencyJournalRoot: opts.idempotencyJournalRoot }
      : {}),
    ...legacyMigration,
  })

  return {
    service,
    profile,
    coordinationOrigin: profile.coordinationOriginDefault,
    provisioningOrigin: profile.provisioningOrigin,
    globalConfig,
  }
}

/**
 * A legacy migration source backed by a repository `[project.cloudSync]`
 * binding. CLI `migrate-legacy` builds this from the loaded project config.
 */
export function repositoryLegacyMigrationSource(
  readBinding: () => Promise<ProjectCloudSyncBinding | null>,
): LegacyMigrationSource {
  return { readLegacyBinding: readBinding }
}

/**
 * Compute the initial cloud counter for a new project: one greater than the
 * highest existing local ticket number (BR-1.4). Pure shared logic — the CLI
 * passes existing ticket numbers in, this returns the start number.
 *
 * `existingNumbers` may be empty (returns 1). Negative and non-integer values
 * are ignored. The result is always a positive integer.
 */
export function computeInitialNextTicketNumber(existingNumbers: readonly number[]): number {
  let max = 0
  for (const n of existingNumbers) {
    if (Number.isInteger(n) && n > max) {
      max = n
    }
  }
  return max + 1
}

/**
 * CLI audience-aware credential provider.
 *
 * Adapts the existing `ServiceTokenCredentialProvider` (machine, owner-only
 * CONFIG_DIR store) and `CloudflaredCredentialProvider` (human, interactive)
 * into the `AudienceAwareCredentialProvider` the management service expects.
 *
 * Audience routing for the CLI:
 *   - If a service token is installed for the requested origin, use it
 *     (works headless; the same pair serves both audiences because Access
 *     policies admit the service principal for both apps).
 *   - Otherwise, resolve a human cloudflared token against the requested
 *     origin. The trusted profile already separates the operator-audience
 *     provisioning origin from the coordination origin, so the audience is
 *     encoded in the origin we hand to cloudflared.
 *
 * This is NOT a provider framework — it is one small adapter that the CLI
 * composition seam constructs. Browser/server transports inject their own.
 */
export class CliAudienceAwareCredentialProvider implements AudienceAwareCredentialProvider {
  constructor(private readonly deps: {
    service: { resolve: (origin: string) => Promise<CloudCredential | null> }
    human: { resolve: (origin: string) => Promise<CloudCredential | null> }
  }) {}

  async resolve(serviceOrigin: string, _audience: CloudAccessAudienceValue): Promise<CloudCredential | null> {
    const machine = await this.deps.service.resolve(serviceOrigin)
    if (machine) {
      return machine
    }
    return this.deps.human.resolve(serviceOrigin)
  }
}
