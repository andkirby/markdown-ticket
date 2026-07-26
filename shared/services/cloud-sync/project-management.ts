/**
 * CloudProjectManagementService — the reusable cloud project lifecycle service
 * (MDT-201, BR-4.1 / C1).
 *
 * Source: docs/CRs/MDT-201/architecture.md § Module Boundaries + Runtime Flows,
 *         docs/CRs/MDT-201/requirements.md § Lifecycle Decisions.
 *
 * One service exposes readiness, provisioning, explicit connect, membership,
 * CONFIG_DIR state, diagnostics, disable, and legacy migration with no
 * presentation logic. CLI and browser adapters consume this contract and only
 * parse input and render output.
 *
 * Lifecycle invariants:
 *   - `enable` journals the provisioning idempotency key, requires the operator
 *     Access audience, provisions (or replays the same UUID on retry), probes
 *     coordination membership, then writes CONFIG_DIR state commit-last.
 *     A failed readiness/provisioning/membership step leaves connection state
 *     unchanged (BR-1.6).
 *   - `connect` authenticates to the coordination audience, verifies existing
 *     membership, then writes CONFIG_DIR state commit-last. It NEVER provisions
 *     (BR-2.2, BR-2.6).
 *   - `disable` suspends cloud coordination, retains the connection as
 *     `disabled`. Ticket creation remains fail-closed (BR-4.2, TASK-9).
 *   - Membership + migration are project-scoped; machine secrets never enter
 *     membership requests (TASK-7, TASK-10).
 */

import type {
  CloudConnectionDiagnostics,
  CloudCredential,
  CloudSyncConnection,
  ConnectProjectRequest,
  ConnectProjectResult,
  CoordinationStateRequest,
  GlobalCloudSyncConfig,
  ProjectBindingProbe,
  ProjectMember,
  ProvisionProjectRequest,
  ProvisionProjectResult,
  ReadinessProbe,
  UpsertProjectMemberRequest,
} from '@mdt/domain-contracts'
import type { ProjectStateStore } from './project-state-store.js'
import type { TrustedServiceProfile } from './trusted-service-profile.js'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  CLOUD_SYNC_CONNECTION_VERSION,
  CloudSyncConnectionState,
  CoordinatorError,
} from '@mdt/domain-contracts'

/**
 * Audience-aware credential resolver surface consumed by this service. We
 * accept a focused subset so the orchestration can route operator vs
 * coordination audiences without depending on the full provider type.
 */
export interface ManagementCredentialResolver {
  forProvisioning: (serviceOrigin: string) => Promise<CloudCredential | null>
  requireForProvisioning: (serviceOrigin: string) => Promise<
    | { ok: true, credential: CloudCredential }
    | { ok: false, reason: 'operator_authority_required' | 'authentication_required', message: string }
  >
  forConnect: (serviceOrigin: string) => Promise<CloudCredential | null>
  forMembership?: (serviceOrigin: string) => Promise<CloudCredential | null>
  forDisable?: (serviceOrigin: string) => Promise<CloudCredential | null>
}

/** The subset of ManagementCoordinator this service depends on. */
export interface ManagementCoordinatorPort {
  provision: (req: ProvisionProjectRequest, credential: CloudCredential) => Promise<{ projectId: string, replayed: boolean }>
  probe: (cloudProjectId: string, credential: CloudCredential) => Promise<ProjectBindingProbe>
  listMembers: (cloudProjectId: string, credential: CloudCredential) => Promise<{ items: ProjectMember[] }>
  upsertMember: (
    cloudProjectId: string,
    kind: ProjectMember['kind'],
    principalId: string,
    body: UpsertProjectMemberRequest,
    credential: CloudCredential,
  ) => Promise<ProjectMember>
  removeMember: (
    cloudProjectId: string,
    kind: ProjectMember['kind'],
    principalId: string,
    credential: CloudCredential,
  ) => Promise<void>
  updateCoordinationState: (
    cloudProjectId: string,
    body: CoordinationStateRequest,
    credential: CloudCredential,
  ) => Promise<{ state: 'active' | 'suspended' }>
}

export interface CloudProjectManagementServiceOptions {
  localProjectId: string
  profile: TrustedServiceProfile
  stateStore: ProjectStateStore
  coordinator: ManagementCoordinatorPort
  resolver: ManagementCredentialResolver
  /** Operator-audience provisioning origin (from the trusted profile). */
  provisioningOrigin: string
  /** Coordination origin (from the trusted profile / existing connection). */
  coordinationOrigin: string
  globalConfig: GlobalCloudSyncConfig
  /** Defaults for provisioning when enable() omits them. */
  projectCode: string
  initialOwnerEmail: string
  /**
   * Optional idempotency-key journal root. When provided, the provisioning key
   * is journaled before the first request so a lost response can be retried.
   */
  idempotencyJournalRoot?: string
  /**
   * Optional legacy binding migration. When provided, `migrateLegacyBinding()`
   * delegates to it; otherwise migration is a no-op (no legacy source).
   */
  legacyMigration?: { migrate: () => Promise<{ migrated: boolean, connection: CloudSyncConnection | null }> }
}

/** Default poll interval (seconds) for a new connection. */
const DEFAULT_POLL_INTERVAL_SECONDS = 15

export class CloudProjectManagementService {
  private readonly opts: CloudProjectManagementServiceOptions

  constructor(opts: CloudProjectManagementServiceOptions) {
    this.opts = opts
  }

  /** Probe readiness without side effects. */
  async readiness(): Promise<ReadinessProbe> {
    if (this.opts.profile.origins.length === 0) {
      return { ready: false, reason: 'no trusted service profile origins configured' }
    }
    return { ready: true }
  }

  /**
   * Enable cloud coordination. The single explicit operation that provisions a
   * new cloud project. Requires the operator Access audience (BR-1.2).
   *
   * Flow: journal key → require operator credential → provision → probe
   * coordination membership → write CONFIG_DIR state commit-last.
   */
  async enable(req: ProvisionProjectRequest): Promise<ProvisionProjectResult> {
    const existing = await this.opts.stateStore.read(this.opts.localProjectId)
    if (existing.kind === 'enabled') {
      return { cloudProjectId: existing.connection.cloudProjectId, replayed: true }
    }

    const ready = await this.readiness()
    if (!ready.ready) {
      throw new CoordinatorError('coordination_unavailable', { message: ready.reason ?? 'not ready' })
    }

    // 1. Journal the idempotency key BEFORE the first request (BR-1.7).
    await this.journalProvisioningKey(req.idempotencyKey, req.requestHash)

    // 2. Require the operator audience. A project owner who is not an operator
    //    is denied here, before any provisioning call (BR-1.2, BR-1.6).
    const required = await this.opts.resolver.requireForProvisioning(this.opts.provisioningOrigin)
    if (!required.ok) {
      throw new CoordinatorError('authentication_required', { message: required.message })
    }

    // 3. Provision (or replay the same UUID on retry).
    const provisioned = await this.opts.coordinator.provision(
      {
        projectCode: req.projectCode,
        initialOwnerEmail: req.initialOwnerEmail,
        ...(req.initialNextTicketNumber !== undefined ? { initialNextTicketNumber: req.initialNextTicketNumber } : {}),
        idempotencyKey: req.idempotencyKey,
        requestHash: req.requestHash,
      },
      required.credential,
    )

    // 4. Probe coordination membership with a coordination-audience credential.
    //    The provisioning credential was operator-audience; normal operations
    //    use the coordination audience (C5).
    const coordinationCredential = await this.opts.resolver.forConnect(this.opts.coordinationOrigin)
    if (!coordinationCredential) {
      // Provisioning succeeded but this installation has no coordination
      // credential yet. Commit-last: do NOT write state. The cloud project
      // exists; connect later to bind this installation.
      throw new CoordinatorError('authentication_required', { message: 'no coordination credential available after provisioning' })
    }
    await this.opts.coordinator.probe(provisioned.projectId, coordinationCredential)

    // 5. Commit-last: write CONFIG_DIR connection only after verification.
    await this.writeEnabledConnection(provisioned.projectId)

    return { cloudProjectId: provisioned.projectId, replayed: provisioned.replayed }
  }

  /**
   * Explicitly connect this installation to an existing cloud project UUID.
   * Authenticates to the coordination audience, verifies existing membership,
   * then writes CONFIG_DIR state commit-last. NEVER provisions (BR-2.2, BR-2.6).
   */
  async connect(req: ConnectProjectRequest): Promise<ConnectProjectResult> {
    const credential = await this.opts.resolver.forConnect(this.opts.coordinationOrigin)
    if (!credential) {
      throw new CoordinatorError('authentication_required', { message: 'no coordination credential available' })
    }

    // Verify existing membership. Connect never provisions — there is no
    // provision call anywhere on this path.
    const probe = await this.opts.coordinator.probe(req.cloudProjectId, credential)

    // Commit-last: write CONFIG_DIR connection only after membership verifies.
    await this.writeEnabledConnection(req.cloudProjectId)

    return { cloudProjectId: req.cloudProjectId, role: probe.role }
  }

  /** Read the current device-local connection + latest probe (no secrets). */
  async diagnostics(): Promise<CloudConnectionDiagnostics> {
    const read = await this.opts.stateStore.read(this.opts.localProjectId)
    const connection = read.kind === 'enabled' || read.kind === 'disabled' || read.kind === 'untrusted'
      ? read.connection
      : null
    let probe: ProjectBindingProbe | null = null
    if (connection) {
      try {
        const credential = await this.opts.resolver.forConnect(this.opts.coordinationOrigin)
        if (credential) {
          probe = await this.opts.coordinator.probe(connection.cloudProjectId, credential)
        }
      }
      catch {
        // Diagnostics never throw on a probe failure; they surface probe=null.
        probe = null
      }
    }
    const ready = await this.readiness()
    return { ready: ready.ready, reason: ready.reason, connection, probe }
  }

  /**
   * Disable: suspend cloud coordination, retain the connection as `disabled`.
   * Ticket creation remains fail-closed (BR-4.2). Full suspend-on-cloud +
   * allocator fail-closed wiring lands in TASK-9; this writes the retained
   * disabled state.
   */
  async disable(): Promise<CloudSyncConnection> {
    const read = await this.opts.stateStore.read(this.opts.localProjectId)
    const current = read.kind === 'enabled' || read.kind === 'disabled' || read.kind === 'untrusted'
      ? read.connection
      : null
    if (!current) {
      throw new CoordinatorError('project_not_found', { message: 'no cloud connection to disable' })
    }
    // Best-effort cloud suspend (TASK-9 hardens ordering). Disable retains
    // state locally even if the cloud suspend is unavailable.
    try {
      const credential = await (this.opts.resolver.forDisable ?? this.opts.resolver.forConnect)(this.opts.coordinationOrigin)
      if (credential) {
        await this.opts.coordinator.updateCoordinationState(
          current.cloudProjectId,
          { state: 'suspended' },
          credential,
        )
      }
    }
    catch {
      // Retain disabled state locally regardless; fail-closed is the guarantee.
    }
    const disabled: CloudSyncConnection = {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.DISABLED,
      cloudProjectId: current.cloudProjectId,
      serviceOrigin: current.serviceOrigin,
      pollIntervalSeconds: current.pollIntervalSeconds,
    }
    await this.opts.stateStore.write(this.opts.localProjectId, disabled)
    return disabled
  }

  // --- Membership (project-scoped; principal ids only, never secrets) ---

  async listMembers(): Promise<{ items: ProjectMember[] }> {
    const { credential, cloudProjectId } = await this.requireCoordinationContext()
    return this.opts.coordinator.listMembers(cloudProjectId, credential)
  }

  async upsertMember(
    kind: ProjectMember['kind'],
    principalId: string,
    req: UpsertProjectMemberRequest,
  ): Promise<ProjectMember> {
    const { credential, cloudProjectId } = await this.requireCoordinationContext()
    return this.opts.coordinator.upsertMember(cloudProjectId, kind, principalId, req, credential)
  }

  async removeMember(kind: ProjectMember['kind'], principalId: string): Promise<void> {
    const { credential, cloudProjectId } = await this.requireCoordinationContext()
    await this.opts.coordinator.removeMember(cloudProjectId, kind, principalId, credential)
  }

  async updateCoordinationState(req: CoordinationStateRequest): Promise<{ state: 'active' | 'suspended' }> {
    const { credential, cloudProjectId } = await this.requireCoordinationContext()
    return this.opts.coordinator.updateCoordinationState(cloudProjectId, req, credential)
  }

  /**
   * Explicitly import a legacy repository `[project.cloudSync]` binding into
   * CONFIG_DIR. Rejects a conflicting connection and never silently edits
   * repository files (BR-1.8, Edge-9).
   *
   * Delegates to LegacyBindingMigration when a legacy source is configured;
   * otherwise returns a no-op (no legacy binding to migrate).
   */
  async migrateLegacyBinding(): Promise<{ migrated: boolean, connection: CloudSyncConnection | null }> {
    if (!this.opts.legacyMigration) {
      return { migrated: false, connection: null }
    }
    return this.opts.legacyMigration.migrate()
  }

  // --- internals ---

  private async writeEnabledConnection(cloudProjectId: string): Promise<void> {
    const connection: CloudSyncConnection = {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: CloudSyncConnectionState.ENABLED,
      cloudProjectId,
      serviceOrigin: this.opts.coordinationOrigin,
      pollIntervalSeconds: DEFAULT_POLL_INTERVAL_SECONDS,
    }
    await this.opts.stateStore.write(this.opts.localProjectId, connection)
  }

  private async requireCoordinationContext(): Promise<{ credential: CloudCredential, cloudProjectId: string }> {
    const read = await this.opts.stateStore.read(this.opts.localProjectId)
    if (read.kind !== 'enabled') {
      // Disabled, malformed, untrusted, or absent → fail closed.
      throw new CoordinatorError('coordination_suspended', { message: 'no enabled cloud connection' })
    }
    const credential = await this.opts.resolver.forConnect(this.opts.coordinationOrigin)
    if (!credential) {
      throw new CoordinatorError('authentication_required', { message: 'no coordination credential available' })
    }
    return { credential, cloudProjectId: read.connection.cloudProjectId }
  }

  /**
   * Persist the provisioning idempotency key + request hash before the first
   * request so a lost response can be retried safely (BR-1.7). Non-secret; the
   * key itself is a client-generated opaque token. Lives under the project's
   * CONFIG_DIR cloud-sync directory.
   */
  private async journalProvisioningKey(idempotencyKey: string, requestHash: string): Promise<void> {
    if (!this.opts.idempotencyJournalRoot) {
      // No journal configured — the coordinator still sends the key/hash, and
      // D1 enforces idempotency server-side. The journal only improves the
      // client's ability to retry the EXACT same request after a lost response.
      return
    }
    const file = join(this.opts.idempotencyJournalRoot, this.opts.localProjectId, 'provisioning.json')
    await mkdir(dirname(file), { recursive: true, mode: 0o700 })
    await writeFile(file, JSON.stringify({
      idempotencyKey,
      requestHash,
      fingerprint: sha256(`${this.opts.localProjectId}|${idempotencyKey}`),
      journaledAt: new Date().toISOString(),
    }, null, 2), { mode: 0o600 })
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}
