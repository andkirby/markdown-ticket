/**
 * ProjectionStreamManager — server-lifecycle owner of one upstream projection
 * stream per enabled local project (MDT-226).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream manager.
 *
 * The SOLE owner of activation and reconnect policy (incident recovery):
 *   - at most one CloudProjectionStreamClient per enabled cloud project;
 *   - one typed session authorization through the injected session client;
 *   - durable pause classification: 401/403/404 → paused_authorization,
 *     426/protocol mismatch → paused_incompatible (C-14);
 *   - a persisted activation fingerprint + bounded attempt budget that time,
 *     browser activity, and server restart cannot reset (C-15);
 *   - a bounded, backoff-spaced transient reconnect budget that reuses a valid
 *     grant with zero membership reads, and NO timer-driven retry for a
 *     terminal pause;
 *   - re-arm only on an approved event: fingerprint change, operator retry,
 *     membership reconciliation, or a successful explicit cloud operation
 *     after a transport-only failure;
 *   - ack only after the read model confirms atomic state/cursor persistence;
 *   - browser mounts do not change upstream connection count.
 *
 * It does NOT own ticket-list presentation or browser state.
 */

import type { ProjectionStreamSessionGrant, ProjectionStreamSessionResult, StreamEnvelope } from '@mdt/domain-contracts'
import type {
  CloudProjectionReadModel,
  ReadModelChangeCallback,
} from '@mdt/shared/services/cloud-sync/CloudProjectionReadModel.js'
import type {
  CloudProjectionStreamClient,
  StreamClientOptions,
} from '@mdt/shared/services/cloud-sync/CloudProjectionStreamClient.js'
import type {
  ProjectionStreamPhase,
  ProjectionStreamState,
} from '@mdt/shared/services/cloud-sync/projection-stream-state-store.js'
import { PROJECTION_STREAM_PROTOCOL_VERSION } from '@mdt/domain-contracts'
import {
  activationFingerprint,
  credentialIdentityFromAuthorization,
  ProjectionStreamStateStore,
} from '@mdt/shared/services/cloud-sync/projection-stream-state-store.js'

/** The session control-plane surface the manager needs (no retry inside). */
export interface StreamSessionClientPort {
  authorize: (auth: {
    headers: Record<string, string>
    tokenExpiry: number
    activationId: string
  }) => Promise<ProjectionStreamSessionResult>
  hasValidGrant: () => boolean
  readonly currentGrant: { grant: string, expiresAt: number } | null
  clearGrant: () => void
}

/**
 * Factory that builds a session client for a project. Injectable so tests can
 * pass a fake; production builds CloudProjectionSessionClient.
 */
export type SessionClientFactory = (opts: {
  serviceOrigin: string
  cloudProjectId: string
}) => StreamSessionClientPort

/**
 * Resolves a non-interactive credential for a service origin (the
 * process-scoped broker). Returns null when no cached human token or service
 * credential is available — never launches an interactive login (C-13).
 */
export type CredentialResolver = (serviceOrigin: string) => Promise<{
  headers: Record<string, string>
  tokenExpiry: number
} | null>

/** Factory that builds a stream client for a project. */
export type StreamClientFactory = (opts: StreamClientOptions) => CloudProjectionStreamClient

/** Factory that builds a read model for a project. */
export type ReadModelFactory = (localProjectId: string, rootDir?: string) => CloudProjectionReadModel

export interface ProjectionStreamManagerOptions {
  /** Builds the grant-bearing stream client (production: transport). */
  clientFactory: StreamClientFactory
  /** Builds the read model (production: CONFIG_DIR root). */
  readModelFactory: ReadModelFactory
  /** Builds the typed session client (production: CloudProjectionSessionClient). */
  sessionClientFactory: SessionClientFactory
  /** Non-interactive credential resolution (the process broker). */
  credentialResolver: CredentialResolver
  /** Invoked after a read-model change (drives SSE fan-out). */
  onChange: ReadModelChangeCallback
  /** Injectable clock (tests). */
  now?: () => number
  /** Injectable scheduler (tests) — used ONLY for bounded backoff spacing and grant rotation. */
  scheduler?: (ms: number, fn: () => void) => unknown
  /** Injectable timer cancellation (tests). */
  cancelScheduled?: (handle: unknown) => void
}

/** Bounded transient reconnect budget for one activation. */
export const MAX_TRANSIENT_ATTEMPTS = 5
/** Backoff bounds between transient reconnect attempts (ms). */
export const MIN_BACKOFF_MS = 1_000
export const MAX_BACKOFF_MS = 30_000
/** Reconnect no later than this skew before grant/credential expiry. */
export const GRANT_ROTATION_SKEW_MS = 60_000

/** Local-only diagnostic view (GET /api/projects/:id/cloud-sync/status). */
export interface ProjectionStreamStatus {
  state:
    | 'connecting'
    | 'live'
    | 'stale_offline'
    | 'authentication_required'
    | 'authorization_required'
    | 'incompatible'
  reasonCode: string
  lastTransitionAt: number
  lastLiveAt: number
  nextAction: 'none' | 'await_reconnect' | 'operator_retry' | 'rearm'
}

interface ManagedProject {
  localProjectId: string
  cloudProjectId: string
  serviceOrigin: string
  rootDir?: string
  client: CloudProjectionStreamClient
  readModel: CloudProjectionReadModel
  session: StreamSessionClientPort
  state: ProjectionStreamState
  reconnectHandle?: unknown
  rotationHandle?: unknown
}

interface PendingStart {
  promise: Promise<void>
  cancelled: boolean
}

/** Phases that may not re-arm automatically (C-14, C-15). */
const TERMINAL_PHASEES: ReadonlySet<ProjectionStreamPhase> = new Set([
  'paused_authorization',
  'paused_incompatible',
  'stale_offline',
])

function statusFromState(state: ProjectionStreamState): ProjectionStreamStatus {
  let statusState: ProjectionStreamStatus['state']
  switch (state.phase) {
    case 'connecting':
      statusState = 'connecting'
      break
    case 'live':
      statusState = 'live'
      break
    case 'stale_offline':
      statusState = 'stale_offline'
      break
    case 'paused_authorization':
      statusState = state.reasonCode === 'authentication_required'
        ? 'authentication_required'
        : 'authorization_required'
      break
    case 'paused_incompatible':
      statusState = 'incompatible'
      break
  }
  const nextAction: ProjectionStreamStatus['nextAction']
    = state.phase === 'live'
      ? 'none'
      : state.phase === 'connecting'
        ? 'await_reconnect'
        : state.phase === 'stale_offline'
          ? 'operator_retry'
          : 'rearm'
  return {
    state: statusState,
    reasonCode: state.reasonCode,
    lastTransitionAt: state.lastTransitionAt,
    lastLiveAt: state.lastLiveAt,
    nextAction,
  }
}

export class ProjectionStreamManager {
  private readonly projects: Map<string, ManagedProject> // keyed by localProjectId
  private readonly starting = new Map<string, PendingStart>()
  private readonly clientFactory: StreamClientFactory
  private readonly readModelFactory: ReadModelFactory
  private readonly sessionClientFactory: SessionClientFactory
  private readonly credentialResolver: CredentialResolver
  private readonly onChange: ReadModelChangeCallback
  private readonly now: () => number
  private readonly scheduler: (ms: number, fn: () => void) => unknown
  private readonly cancelScheduled: (handle: unknown) => void
  /** In-flight background work (envelope application, activation chains). */
  private pendingWork = 0
  private idleWaiters: Array<() => void> = []

  constructor(opts: ProjectionStreamManagerOptions) {
    this.projects = new Map()
    this.clientFactory = opts.clientFactory
    this.readModelFactory = opts.readModelFactory
    this.sessionClientFactory = opts.sessionClientFactory
    this.credentialResolver = opts.credentialResolver
    this.onChange = opts.onChange
    this.now = opts.now ?? Date.now
    this.scheduler = opts.scheduler ?? ((ms, fn) => setTimeout(fn, ms))
    this.cancelScheduled = opts.cancelScheduled
      ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>))
  }

  /**
   * Resolves when every background chain (envelope application, activation,
   * state persistence) has settled. Diagnostic/test hook: the manager's
   * reconnect timers are intentionally fire-and-forget, so observers that
   * need a quiescent manager await this.
   */
  async whenIdle(): Promise<void> {
    while (this.pendingWork > 0)
      await new Promise<void>(resolve => this.idleWaiters.push(resolve))
  }

  /** Track a fire-and-forget background chain for {@link whenIdle}. */
  private track<T>(work: Promise<T>): void {
    this.pendingWork += 1
    void work.finally(() => {
      this.pendingWork -= 1
      if (this.pendingWork === 0) {
        for (const resolve of this.idleWaiters.splice(0))
          resolve()
      }
    }).catch(() => {})
  }

  /**
   * Ensure exactly one stream is open for an enabled cloud project. Browser
   * mounts do NOT add streams (C-5, BR-1.6). A persisted terminal pause for
   * the same activation fingerprint registers the read model but performs no
   * session request and opens no transport (C-14, C-15).
   */
  start(opts: {
    localProjectId: string
    cloudProjectId: string
    serviceOrigin: string
    rootDir?: string
  }): Promise<void> {
    if (this.projects.has(opts.localProjectId)) {
      // Exactly one stream per project; reuse the existing client.
      return Promise.resolve()
    }
    const active = this.starting.get(opts.localProjectId)
    if (active)
      return active.promise

    const pending: PendingStart = {
      promise: Promise.resolve(),
      cancelled: false,
    }
    pending.promise = this.startProject(opts, pending).finally(() => {
      if (this.starting.get(opts.localProjectId) === pending)
        this.starting.delete(opts.localProjectId)
    })
    this.starting.set(opts.localProjectId, pending)
    return pending.promise
  }

  private async startProject(opts: {
    localProjectId: string
    cloudProjectId: string
    serviceOrigin: string
    rootDir?: string
  }, pending: PendingStart): Promise<void> {
    const readModel = this.readModelFactory(opts.localProjectId, opts.rootDir)
    await readModel.load(opts.cloudProjectId)
    if (pending.cancelled || this.projects.has(opts.localProjectId))
      return

    const store = new ProjectionStreamStateStore({
      rootDir: opts.rootDir,
      localProjectId: opts.localProjectId,
    })
    const persisted = await store.load()
    const session = this.sessionClientFactory(opts)

    const state: ProjectionStreamState = persisted?.cloudProjectId === opts.cloudProjectId
      ? { ...persisted }
      : {
          schemaVersion: 1,
          cloudProjectId: opts.cloudProjectId,
          activationFingerprint: '',
          phase: 'connecting',
          reasonCode: 'activation_starting',
          attemptCount: 0,
          lastTransitionAt: this.now(),
          lastLiveAt: 0,
          activationGeneration: 0,
        }

    const client = this.clientFactory({
      cloudProjectId: opts.cloudProjectId,
      serviceOrigin: opts.serviceOrigin,
      afterRevision: readModel.appliedCursor,
      grant: '',
      headers: {},
      tokenExpiry: 0,
    })
    const managed: ManagedProject = {
      localProjectId: opts.localProjectId,
      cloudProjectId: opts.cloudProjectId,
      serviceOrigin: opts.serviceOrigin,
      rootDir: opts.rootDir,
      client,
      readModel,
      session,
      state,
    }
    client.setHandlers({
      onEnvelope: envelope => this.track(this.applyEnvelope(opts.localProjectId, envelope)),
      onStale: () => readModel.markStale(),
      onServerError: (code) => {
        readModel.markStale()
        this.track(this.persistPhase(managed, 'paused_authorization', code))
      },
      onTerminated: () => this.handleTransportTerminated(managed),
    })
    readModel.setChangeListener(this.onChange)

    this.projects.set(opts.localProjectId, managed)

    // A persisted terminal state for an exhausted or paused activation does
    // not reactivate on its own (C-15). A terminal pause is re-armed only when
    // the activation fingerprint actually changed (credential/configuration/
    // protocol change); an unchanged fingerprint performs no session request.
    const exhausted = state.phase === 'stale_offline' && state.attemptCount >= MAX_TRANSIENT_ATTEMPTS
    const terminalPause = state.phase === 'paused_authorization' || state.phase === 'paused_incompatible' || exhausted
    if (terminalPause && state.activationFingerprint) {
      const auth = await this.credentialResolver(opts.serviceOrigin)
      if (auth) {
        const identity = credentialIdentityFromAuthorization(auth)
        const fingerprint = activationFingerprint({
          cloudProjectId: opts.cloudProjectId,
          serviceOrigin: opts.serviceOrigin,
          credentialKind: identity.kind,
          credentialIdentity: identity.identity,
          streamProtocol: PROJECTION_STREAM_PROTOCOL_VERSION,
          activationGeneration: state.activationGeneration,
        })
        if (fingerprint !== state.activationFingerprint)
          await this.activate(managed, store, auth)
      }
      return
    }

    await this.activate(managed, store)
  }

  /** Local-only diagnostic state; performs no cloud call of any kind. */
  getStatus(localProjectId: string): ProjectionStreamStatus | null {
    const managed = this.projects.get(localProjectId)
    if (managed)
      return statusFromState(managed.state)
    return this.statusCache.get(localProjectId) ?? null
  }

  private readonly statusCache = new Map<string, ProjectionStreamStatus>()

  /** Operator retry: an approved re-arm event for any terminal phase. */
  async retry(localProjectId: string): Promise<void> {
    const managed = this.projects.get(localProjectId)
    if (!managed)
      return
    const store = new ProjectionStreamStateStore({
      rootDir: managed.rootDir,
      localProjectId,
    })
    managed.state = {
      ...managed.state,
      activationGeneration: managed.state.activationGeneration + 1,
      attemptCount: 0,
      phase: 'connecting',
      reasonCode: 'operator_retry',
      lastTransitionAt: this.now(),
    }
    await store.save(managed.state)
    this.cacheStatus(localProjectId, managed.state)
    await this.activate(managed, store)
  }

  /**
   * Membership reconciliation: an approved re-arm that also invalidates the
   * server-side cached decision (the new generation changes the fingerprint,
   * so the hub performs a fresh D1 membership decision).
   */
  async reconcileMembership(localProjectId: string): Promise<void> {
    await this.retry(localProjectId)
  }

  /**
   * A successful explicit cloud operation after a transport-only failure
   * re-arms the bounded budget (approved re-arm event).
   */
  async notifyCloudOperationSuccess(localProjectId: string): Promise<void> {
    const managed = this.projects.get(localProjectId)
    if (!managed || managed.state.phase !== 'stale_offline')
      return
    await this.retry(localProjectId)
  }

  /**
   * A foreground operation resolved a credential for this service origin: the
   * documented owner action that makes a human Access token available to the
   * process broker. Re-arms `authentication_required` pauses (architecture
   * README § Local Integration Contract) and `stale_offline` activations —
   * the resolving operation exercises the same HTTPS control plane, so the
   * exhaustion was transport-side. Membership/protocol pauses are NOT re-armed
   * by credential availability.
   */
  async notifyCredentialResolved(serviceOrigin: string): Promise<void> {
    const targets: Array<ManagedProject> = []
    for (const managed of this.projects.values()) {
      if (managed.serviceOrigin !== serviceOrigin)
        continue
      const rearmable = (managed.state.phase === 'paused_authorization'
        && managed.state.reasonCode === 'authentication_required')
      || managed.state.phase === 'stale_offline'
      if (rearmable)
        targets.push(managed)
    }
    for (const managed of targets) {
      const store = new ProjectionStreamStateStore({
        rootDir: managed.rootDir,
        localProjectId: managed.localProjectId,
      })
      managed.state = { ...managed.state, attemptCount: 0 }
      await this.activate(managed, store)
    }
  }

  /** Stop the stream for one project and remove it. */
  stop(localProjectId: string): void {
    const pending = this.starting.get(localProjectId)
    if (pending)
      pending.cancelled = true
    const managed = this.projects.get(localProjectId)
    if (!managed)
      return
    this.cancelTimers(managed)
    managed.client.stop()
    this.projects.delete(localProjectId)
  }

  /** Stop all streams (graceful shutdown). */
  stopAll(): void {
    for (const pending of this.starting.values())
      pending.cancelled = true
    for (const managed of this.projects.values()) {
      this.cancelTimers(managed)
      managed.client.stop()
    }
    this.projects.clear()
  }

  /** Number of open streams (exactly one per enabled project). */
  get openStreamCount(): number {
    return this.projects.size
  }

  /** Whether a project has an open stream (for tab-independence tests). */
  hasStream(localProjectId: string): boolean {
    return this.projects.has(localProjectId)
  }

  /** Get the read model for a project (for the unified ticket API merge). */
  getReadModel(localProjectId: string): CloudProjectionReadModel | undefined {
    return this.projects.get(localProjectId)?.readModel
  }

  // ── Activation ──────────────────────────────────────────────────────────

  /**
   * One activation attempt: resolve a credential, compute the activation
   * fingerprint, run the typed session authorization, and open the transport
   * only on a valid grant (C-14, C-15). A still-valid held grant is reused —
   * reconnects perform zero membership reads.
   */
  private async activate(
    managed: ManagedProject,
    store: ProjectionStreamStateStore,
    preAuth?: { headers: Record<string, string>, tokenExpiry: number },
  ): Promise<void> {
    const auth = preAuth ?? await this.credentialResolver(managed.serviceOrigin)
    if (!auth) {
      // No cached human token or service credential: pause durably without a
      // session request (never launch an interactive login in the background).
      await this.persistPhase(managed, 'paused_authorization', 'authentication_required', store)
      return
    }

    const identity = credentialIdentityFromAuthorization(auth)
    const fingerprint = activationFingerprint({
      cloudProjectId: managed.cloudProjectId,
      serviceOrigin: managed.serviceOrigin,
      credentialKind: identity.kind,
      credentialIdentity: identity.identity,
      streamProtocol: PROJECTION_STREAM_PROTOCOL_VERSION,
      activationGeneration: managed.state.activationGeneration,
    })
    managed.state = { ...managed.state, activationFingerprint: fingerprint }
    await store.save(managed.state)
    this.cacheStatus(managed.localProjectId, managed.state)

    const held = managed.session.currentGrant
    let result: ProjectionStreamSessionResult
    try {
      result = managed.session.hasValidGrant() && held
        ? { kind: 'granted', grant: held.grant, grantExpiresAt: held.expiresAt }
        : await managed.session.authorize({
            headers: auth.headers,
            tokenExpiry: auth.tokenExpiry,
            activationId: fingerprint,
          })
    }
    catch (err) {
      // The session client may throw before any wire request (for example the
      // origin-allowlist fail-closed guard). Classify as a bounded transient
      // outcome — never crash the server over an authorization attempt.
      const message = err instanceof Error ? err.message : 'session client error'
      await this.handleTransientFailure(managed, `session_client_error: ${message.slice(0, 80)}`, store)
      return
    }

    switch (result.kind) {
      case 'granted':
        await this.openTransport(managed, result, store, auth)
        return
      case 'authentication_required':
      case 'authorization_required':
        managed.session.clearGrant()
        await this.persistPhase(managed, 'paused_authorization', result.reasonCode, store)
        return
      case 'incompatible':
        managed.session.clearGrant()
        await this.persistPhase(managed, 'paused_incompatible', result.reasonCode, store)
        return
      case 'transient_failure':
        await this.handleTransientFailure(managed, result.reasonCode, store)
    }
  }

  /** Open (or reopen) the transport with a valid grant and schedule rotation. */
  private async openTransport(
    managed: ManagedProject,
    grant: ProjectionStreamSessionGrant,
    store: ProjectionStreamStateStore,
    auth: { headers: Record<string, string>, tokenExpiry: number },
  ): Promise<void> {
    // The grant-bearing client is constructed through the factory each time so
    // the manager owns exactly one connection lane per project.
    const client = this.clientFactory({
      cloudProjectId: managed.cloudProjectId,
      serviceOrigin: managed.serviceOrigin,
      afterRevision: managed.readModel.appliedCursor,
      grant: grant.grant,
      headers: auth.headers,
      tokenExpiry: auth.tokenExpiry,
    })
    client.setHandlers({
      onEnvelope: envelope => this.track(this.applyEnvelope(managed.localProjectId, envelope)),
      onStale: () => managed.readModel.markStale(),
      onServerError: (code) => {
        managed.readModel.markStale()
        this.track(this.persistPhase(managed, 'paused_authorization', code, store))
      },
      onTerminated: () => this.handleTransportTerminated(managed),
    })
    this.cancelTimers(managed)
    managed.client.stop()
    managed.client = client
    await this.persistPhase(managed, 'connecting', 'stream_connecting', store)
    client.connect()

    // Reconnect no later than grant/credential expiry (C-10). This is
    // credential rotation for a healthy stream, not a failure retry; terminal
    // phases cancel it.
    const rotateAt = Math.min(
      grant.grantExpiresAt,
      auth.tokenExpiry > 0 ? auth.tokenExpiry : grant.grantExpiresAt,
    )
    const delay = Math.max(MIN_BACKOFF_MS, rotateAt - this.now() - GRANT_ROTATION_SKEW_MS)
    managed.rotationHandle = this.scheduler(delay, () => {
      managed.rotationHandle = undefined
      this.track(this.rotateGrant(managed))
    })
  }

  /** Grant/credential rotation for a healthy stream (no D1: cached decision). */
  private async rotateGrant(managed: ManagedProject): Promise<void> {
    if (!this.projects.has(managed.localProjectId))
      return
    if (TERMINAL_PHASEES.has(managed.state.phase))
      return
    const store = new ProjectionStreamStateStore({
      rootDir: managed.rootDir,
      localProjectId: managed.localProjectId,
    })
    await this.activate(managed, store)
  }

  /** One transient failure: bounded, backoff-spaced, persisted budget. */
  private async handleTransientFailure(
    managed: ManagedProject,
    reasonCode: string,
    store: ProjectionStreamStateStore,
  ): Promise<void> {
    const attempts = managed.state.attemptCount + 1
    managed.state = { ...managed.state, attemptCount: attempts }
    if (attempts > MAX_TRANSIENT_ATTEMPTS) {
      await this.persistPhase(managed, 'stale_offline', reasonCode, store)
      return
    }
    await this.persistPhase(managed, 'connecting', reasonCode, store)
    const base = Math.min(MAX_BACKOFF_MS, MIN_BACKOFF_MS * 2 ** (attempts - 1))
    managed.reconnectHandle = this.scheduler(base, () => {
      managed.reconnectHandle = undefined
      this.track(this.activate(managed, store))
    })
  }

  /** Transport termination: mark stale, then one bounded reconnect decision. */
  private handleTransportTerminated(managed: ManagedProject): void {
    managed.readModel.markStale()
    if (!this.projects.has(managed.localProjectId))
      return
    const store = new ProjectionStreamStateStore({
      rootDir: managed.rootDir,
      localProjectId: managed.localProjectId,
    })
    // A still-valid grant is reused: zero membership reads on reconnect (C-15).
    this.track(this.handleTransientFailure(managed, 'transport_closed', store))
  }

  // ── State persistence ───────────────────────────────────────────────────

  private async persistPhase(
    managed: ManagedProject,
    phase: ProjectionStreamPhase,
    reasonCode: string,
    store?: ProjectionStreamStateStore,
  ): Promise<void> {
    const now = this.now()
    managed.state = {
      ...managed.state,
      phase,
      reasonCode,
      lastTransitionAt: now,
      ...(phase === 'live' ? { lastLiveAt: now } : {}),
    }
    if (phase === 'live')
      managed.state.attemptCount = 0
    const target = store ?? new ProjectionStreamStateStore({
      rootDir: managed.rootDir,
      localProjectId: managed.localProjectId,
    })
    await target.save(managed.state)
    this.cacheStatus(managed.localProjectId, managed.state)
    if (TERMINAL_PHASEES.has(phase))
      this.cancelTimers(managed)
  }

  private cacheStatus(localProjectId: string, state: ProjectionStreamState): void {
    this.statusCache.set(localProjectId, statusFromState(state))
  }

  private cancelTimers(managed: ManagedProject): void {
    if (managed.reconnectHandle !== undefined) {
      this.cancelScheduled(managed.reconnectHandle)
      managed.reconnectHandle = undefined
    }
    if (managed.rotationHandle !== undefined) {
      this.cancelScheduled(managed.rotationHandle)
      managed.rotationHandle = undefined
    }
  }

  // ── Envelope application ────────────────────────────────────────────────

  /**
   * Apply a stream envelope to the read model. Acks only after atomic
   * state+cursor persistence (C-6, Edge-1).
   */
  private async applyEnvelope(localProjectId: string, envelope: StreamEnvelope): Promise<void> {
    const managed = this.projects.get(localProjectId)
    if (!managed)
      return
    const { readModel, client } = managed

    if (envelope.kind === 'ready') {
      // Catch-up complete: advance cursor, persist, ack the high-water revision.
      readModel.advanceCursor(envelope.projectRevision)
      await readModel.persist()
      client.sendAck(envelope.projectRevision)
      await this.persistPhase(managed, 'live', 'stream_live')
      return
    }

    // catchup or delta — a projection delta.
    if (envelope.kind === 'catchup' || envelope.kind === 'delta') {
      // Live gap during live delivery triggers one catch-up (Edge-2): pause live
      // application, reconnect with the current cursor so the server replays the
      // missing revisions before returning to live.
      if (envelope.kind === 'delta' && readModel.isLiveGap(envelope.projectRevision)) {
        readModel.markStale()
        client.reconnectForCatchup(readModel.appliedCursor)
        return
      }
      const changed = await readModel.applyPersistNotify({
        projectRevision: envelope.projectRevision,
        ticketNumber: envelope.ticketNumber,
        projectionVersion: envelope.projectionVersion,
        lifecycle: envelope.lifecycle,
        header: envelope.header,
      })
      if (changed) {
        // Ack only after state+cursor persistence (C-6).
        client.sendAck(envelope.projectRevision)
      }
    }
  }
}
