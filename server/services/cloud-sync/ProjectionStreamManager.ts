/**
 * ProjectionStreamManager — server-lifecycle owner of one upstream projection
 * stream per enabled local project (MDT-226).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream manager.
 *
 * Owns:
 *   - at most one CloudProjectionStreamClient per enabled cloud project;
 *   - coalescing concurrent starts before asynchronous read-model loading;
 *   - passing deltas to the CloudProjectionReadModel in order;
 *   - ack only after the read model confirms atomic state/cursor persistence;
 *   - requesting catch-up while the client owns connection/reconnect state;
 *   - browser mounts do not change upstream connection count.
 *
 * It does NOT own ticket-list presentation or browser state.
 */

import type { StreamEnvelope } from '@mdt/domain-contracts'
import type {
  CloudProjectionReadModel,
  ReadModelChangeCallback,
} from '@mdt/shared/services/cloud-sync/CloudProjectionReadModel.js'
import type {
  CloudProjectionStreamClient,
  StreamClientHandlers,
  StreamClientOptions,
} from '@mdt/shared/services/cloud-sync/CloudProjectionStreamClient.js'

/**
 * Factory that builds a stream client for a project. Injectable so the manager
 * test can pass a controllable transport. Production wires the credential
 * provider + transport here.
 */
export type StreamClientFactory = (opts: StreamClientOptions) => CloudProjectionStreamClient

/**
 * Factory that builds a read model for a project. Injectable so the manager test
 * can pass a temp root dir.
 */
export type ReadModelFactory = (localProjectId: string, rootDir?: string) => CloudProjectionReadModel

interface ManagedProject {
  localProjectId: string
  cloudProjectId: string
  client: CloudProjectionStreamClient
  readModel: CloudProjectionReadModel
}

interface PendingStart {
  promise: Promise<void>
  cancelled: boolean
}

export interface ProjectionStreamManagerOptions {
  /** Builds the stream client (production: credential + transport). */
  clientFactory: StreamClientFactory
  /** Builds the read model (production: CONFIG_DIR root). */
  readModelFactory: ReadModelFactory
  /** Invoked after a read-model change (drives SSE fan-out). */
  onChange: ReadModelChangeCallback
  /** Injectable for tests; defaults to the real set. */
  existing?: Map<string, ManagedProject>
}

export class ProjectionStreamManager {
  private readonly projects: Map<string, ManagedProject> // keyed by localProjectId
  private readonly starting = new Map<string, PendingStart>()
  private readonly clientFactory: StreamClientFactory
  private readonly readModelFactory: ReadModelFactory
  private readonly onChange: ReadModelChangeCallback

  constructor(opts: ProjectionStreamManagerOptions) {
    this.projects = opts.existing ?? new Map()
    this.clientFactory = opts.clientFactory
    this.readModelFactory = opts.readModelFactory
    this.onChange = opts.onChange
  }

  /**
   * Ensure exactly one stream is open for an enabled cloud project. Browser
   * mounts do NOT add streams (C-5, BR-1.6).
   */
  start(opts: {
    localProjectId: string
    cloudProjectId: string
    serviceOrigin: string
    headers: Record<string, string>
    tokenExpiry: number
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
    headers: Record<string, string>
    tokenExpiry: number
    rootDir?: string
  }, pending: PendingStart): Promise<void> {
    const readModel = this.readModelFactory(opts.localProjectId, opts.rootDir)
    await readModel.load(opts.cloudProjectId)
    if (pending.cancelled || this.projects.has(opts.localProjectId))
      return

    // AfterRevision is the read model's persisted cursor (catch-up request).
    const afterRevision = readModel.appliedCursor

    const client = this.clientFactory({
      cloudProjectId: opts.cloudProjectId,
      serviceOrigin: opts.serviceOrigin,
      afterRevision,
      tokenExpiry: opts.tokenExpiry,
      headers: opts.headers,
    })

    const handlers: StreamClientHandlers = {
      onEnvelope: envelope => this.applyEnvelope(opts.localProjectId, envelope),
      onStale: () => readModel.markStale(),
      onError: () => { /* client owns reconnect; nothing to persist on error */ },
    }
    client.setHandlers(handlers)
    readModel.setChangeListener(this.onChange)

    this.projects.set(opts.localProjectId, {
      localProjectId: opts.localProjectId,
      cloudProjectId: opts.cloudProjectId,
      client,
      readModel,
    })

    client.connect()
  }

  /** Stop the stream for one project and remove it. */
  stop(localProjectId: string): void {
    const pending = this.starting.get(localProjectId)
    if (pending)
      pending.cancelled = true
    const managed = this.projects.get(localProjectId)
    if (!managed)
      return
    managed.client.stop()
    this.projects.delete(localProjectId)
  }

  /** Stop all streams (graceful shutdown). */
  stopAll(): void {
    for (const pending of this.starting.values())
      pending.cancelled = true
    for (const managed of this.projects.values()) {
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
