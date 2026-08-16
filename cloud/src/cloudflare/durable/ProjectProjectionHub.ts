/**
 * ProjectProjectionHub — one hibernating Durable Object per cloud project.
 *
 * Source: docs/CRs/MDT-226/architecture.md § Cloud project hub,
 *         § Mutation and delivery, § D1 cursor catch-up, § Security and Revocation.
 *
 * Owns:
 *   - accepted hibernating WebSockets and minimal socket attachments;
 *   - an explicit per-instance async operation queue for subscription,
 *     membership mutation, and projection mutation work;
 *   - race-free cursor catch-up followed by `ready`;
 *   - commit-triggered complete-delta broadcast (commit-before-broadcast);
 *   - per-socket acknowledged revisions and pre-armed alarm recovery.
 *
 * It does NOT own ticket bodies, projection authority, membership authority, or
 * a second mutation log. Its durable state is delivery metadata only.
 */

import type { D1Database } from '@cloudflare/workers-types'
import type {
  ClientAck,
  CloudPrincipal,
  CoordinatorErrorCode,
  LiveDelta,
  ProjectionDelta,
  ReadySignal,
  StreamEnvelope,
} from '@mdt/domain-contracts'
import type { PublishBody } from '../application/projection-usecase'
import type {
  StoredSessionDecision,
  StreamGrantPrincipal,
  StreamGrantRegistryState,
} from './projection-hub-helpers'
import { CoordinationError } from '@mdt/domain-contracts'
import { DurableObject } from 'cloudflare:workers'
import { publish as publishProjectionUseCase } from '../application/projection-usecase'
import {
  getProjectionByTicket,
  pollProjections,
} from '../d1/projection'
import {
  isProjectionStreamClientAck as isClientAck,
  recordToCatchup,
  StreamGrantRegistry,
} from './projection-hub-helpers'

// Re-export pure helpers for tests and the worker (MDT-226).
export {
  isProjectionStreamClientAck,
  recordToCatchup,
  StreamGrantRegistry,
} from './projection-hub-helpers'
export type {
  StoredSessionDecision,
  StoredStreamGrant,
  StreamGrantPrincipal,
  StreamGrantRegistryState,
} from './projection-hub-helpers'

/**
 * The Workers Hibernation WebSocket API extends the standard WebSocket with
 * `serializeAttachment` / `deserializeAttachment` for per-socket state. The
 * installed `@cloudflare/workers-types` does not yet declare these members, so
 * we narrow via this local interface. See
 * https://developers.cloudflare.com/durable-objects/api/state/
 */
interface HibernationWebSocket extends WebSocket {
  serializeAttachment: (attachment: unknown) => void
  deserializeAttachment: <T = unknown>() => T
}

/** Minimal socket attachment (delivery metadata only — never credentials/body). */
interface SocketAttachment {
  cloudProjectId: string
  /** Principal tag for post-hibernation reauthorization. */
  principalKind: string
  principalId: string
  /** Highest revision this socket has applied AND persisted (acknowledged). */
  acknowledgedRevision: number
  /** Token expiry epoch-ms; a stream reconnects no later than this. */
  tokenExpiry: number
  authorized: boolean
  /**
   * Bounded-replay bookkeeping: the acknowledged revision the previous alarm
   * pass saw, and how many passes made no progress. A client that stays
   * connected but never acknowledges must not turn the 5s recovery alarm
   * into an unbounded D1 polling loop (2026-08-15 follow-up).
   */
  lastAlarmAckRevision?: number
  alarmPassesWithoutProgress?: number
}

export interface ProjectProjectionHubEnv {
  DB: D1Database
  PROJECT_HUB: DurableObjectNamespace
}

/**
 * Serializable commit request routed from the Worker through the hub. The hub
 * arms its alarm BEFORE invoking the projection use case, so a crash after the
 * D1 commit still triggers bounded catch-up replay (OBL-commit-before-delivery).
 */
export interface CommitProjectionRequest {
  principal: CloudPrincipal
  body: PublishBody
  requestId: string
}

/**
 * Typed commit outcome: RPC-safe (no error classes cross the Durable Object
 * boundary). `currentVersion` rides along for version-conflict adoption.
 */
export type CommitProjectionOutcome
  = | { ok: true, projectionVersion: number, projectRevision: number }
    | { ok: false, code: CoordinatorErrorCode, currentVersion?: number }

/** Catch-up page size for bounded cursor reads. */
const CATCHUP_PAGE_SIZE = 500
/** Alarm lead time for replaying committed-but-unacknowledged revisions. */
const ALARM_DELAY_MS = 5_000
/**
 * Alarm passes a lagging socket may make without ANY ack progress before the
 * hub closes it. Rebounds the recovery alarm: a stuck client reconnects and
 * catches up fresh instead of keeping a 5s D1 read loop alive.
 */
const MAX_ALARM_PASSES_WITHOUT_PROGRESS = 3
/** DO storage key for the digest-only grant/decision registry. */
const GRANT_REGISTRY_STORAGE_KEY = 'stream-grant-registry'

export class ProjectProjectionHub extends DurableObject<ProjectProjectionHubEnv> {
  /** Explicit async operation queue serializes all hub work (C-6, Edge-2). */
  private queueTail: Promise<void> = Promise.resolve()
  /** Digest-only stream grants + bounded session decisions (C-10, C-15). */
  private grantRegistry = new StreamGrantRegistry()
  private grantRegistryLoaded = false

  /**
   * Accept a hibernating WebSocket on the DATA PLANE. The Worker validated the
   * Access assertion and preserved the upgrade headers; this hub validates the
   * stream grant against its digest registry WITHOUT any D1 membership query
   * and binds the grant's principal tag + token expiry to the socket (C-10,
   * C-15, Edge-8).
   */
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('upgrade')
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }
    const cloudProjectId = request.headers.get('x-mdt-cloud-project-id') ?? ''
    const grant = request.headers.get('x-mdt-stream-grant') ?? ''
    const afterRevision = Number.parseInt(request.headers.get('x-mdt-after-revision') ?? '0', 10)

    // Grant validation replaces the per-upgrade D1 membership decision. An
    // unknown, expired, or tampered grant fails closed (C-10).
    const grantRecord = await this.readGrantRegistry(registry => registry.validateGrant(grant))
    if (!grantRecord) {
      return new Response(
        JSON.stringify({
          error: {
            code: 'authentication_required',
            message: 'invalid stream grant',
            requestId: crypto.randomUUID(),
            retryable: false,
          },
        }),
        { status: 401, headers: { 'content-type': 'application/json' } },
      )
    }

    const pair = new WebSocketPair()
    const socket = pair[1] as HibernationWebSocket
    this.ctx.acceptWebSocket(socket)

    const attachment: SocketAttachment = {
      cloudProjectId,
      principalKind: grantRecord.principalKind,
      principalId: grantRecord.principalId,
      acknowledgedRevision: Number.isSafeInteger(afterRevision) ? afterRevision : 0,
      tokenExpiry: grantRecord.tokenExpiry,
      authorized: true,
    }
    socket.serializeAttachment(attachment)

    // Begin catch-up through the queue so it serializes with any mutation.
    this.enqueue(async () => {
      await this.runCatchup(socket, attachment)
    })

    return new Response(null, { status: 101, webSocket: pair[0] })
  }

  // ── Stream session control plane (C-14, C-15) ───────────────────────────

  /**
   * Report the cached session decision for one principal + activation
   * fingerprint, or null on a miss. Called by the Worker BEFORE any D1 work;
   * a cached terminal denial or cached allowance performs zero D1 statements.
   */
  async sessionDecision(req: {
    principal: StreamGrantPrincipal
    activationId: string
  }): Promise<StoredSessionDecision | null> {
    return this.enqueueResult(() =>
      this.withGrantRegistry(registry => registry.cachedDecision(req.principal, req.activationId)))
  }

  /**
   * Record the outcome of the ONE membership decision and, when allowed,
   * issue a fresh opaque grant. The raw grant is returned exactly once; only
   * its digest is persisted (C-10, C-15).
   */
  async recordSessionDecision(req: {
    principal: StreamGrantPrincipal
    activationId: string
    outcome: 'allowed' | 'denied'
    code?: CoordinatorErrorCode
    tokenExpiry: number
  }): Promise<
    | { kind: 'granted', grant: string, expiresAt: number }
    | { kind: 'denied', code: CoordinatorErrorCode }
  > {
    return this.enqueueResult(async () => {
      const { principal, activationId, outcome, code, tokenExpiry } = req
      await this.withGrantRegistry(async (registry) => {
        await registry.recordDecision(principal, activationId, outcome, { code, tokenExpiry })
      })
      if (outcome === 'denied') {
        return { kind: 'denied' as const, code: code ?? 'forbidden' }
      }
      const issued = await this.withGrantRegistry(registry =>
        registry.issueGrant(principal, activationId, tokenExpiry))
      return { kind: 'granted' as const, grant: issued.grant, expiresAt: issued.expiresAt }
    })
  }

  /** Hibernation WebSocket message handler. Processes client `ack` only. */
  async webSocketMessage(socket: WebSocket, message: ArrayBuffer | string): Promise<void> {
    const ws = socket as HibernationWebSocket
    const attachment = ws.deserializeAttachment<SocketAttachment | null>()
    if (!attachment) {
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message))
    }
    catch {
      return
    }
    if (!isClientAck(parsed)) {
      return
    }
    const ack = parsed as ClientAck
    // Record the acknowledged revision only if it advances.
    if (ack.projectRevision > attachment.acknowledgedRevision) {
      attachment.acknowledgedRevision = ack.projectRevision
      ws.serializeAttachment(attachment)
    }
    // After an ack, try to clear the alarm if all active sockets are caught
    // up. Coalesced: a catch-up burst of acks schedules ONE D1-reading check,
    // not one per envelope.
    this.queueMaybeClearAlarm()
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    const ws = socket as HibernationWebSocket
    // eslint-disable-next-line no-console -- diagnostic telemetry (MDT-226 I7)
    console.info(JSON.stringify({ event: 'hub_ws_close', acked: ws.deserializeAttachment<SocketAttachment | null>()?.acknowledgedRevision ?? null }))
    ws.serializeAttachment(null)
    this.queueMaybeClearAlarm()
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    const ws = socket as HibernationWebSocket
    // eslint-disable-next-line no-console -- diagnostic telemetry (MDT-226 I7)
    console.info(JSON.stringify({ event: 'hub_ws_error', acked: ws.deserializeAttachment<SocketAttachment | null>()?.acknowledgedRevision ?? null }))
    ws.serializeAttachment(null)
    this.queueMaybeClearAlarm()
  }

  /** Coalescing flag for {@link queueMaybeClearAlarm}. */
  private maybeClearQueued = false

  /**
   * Schedule at most one pending maybeClearAlarm: N acks arriving before the
   * queued check runs collapse into a single D1 read.
   */
  private queueMaybeClearAlarm(): void {
    if (this.maybeClearQueued)
      return
    this.maybeClearQueued = true
    this.enqueue(async () => {
      this.maybeClearQueued = false
      await this.maybeClearAlarm()
    })
  }

  /**
   * Pre-armed alarm replays bounded catch-up to each still-active lagging socket
   * (Edge-1). Disconnected servers recover from their persisted cursor on
   * reconnect. With no active lagging sockets, the alarm clears because D1
   * remains available for future catch-up.
   */
  async alarm(): Promise<void> {
    const sockets = this.ctx.getWebSockets() as HibernationWebSocket[]
    let stillLagging = false
    // eslint-disable-next-line no-console -- diagnostic telemetry (MDT-226 I7)
    console.info(JSON.stringify({ event: 'hub_alarm_pass', sockets: sockets.length }))
    for (const socket of sockets) {
      const attachment = socket.deserializeAttachment<SocketAttachment | null>()
      if (!attachment || !attachment.authorized) {
        continue
      }
      // Post-hibernation reauthorization before delivery (C-10).
      const authorized = await this.reauthorize(attachment)
      if (!authorized) {
        attachment.authorized = false
        socket.serializeAttachment(attachment)
        this.closeSocket(socket, 1008, 'authorization_revoked')
        continue
      }
      const currentRevision = await this.readCurrentRevision(attachment.cloudProjectId)
      if (currentRevision > attachment.acknowledgedRevision) {
        // Bounded replay: a socket that makes no ack progress across passes
        // is closed — it never turns the 5s alarm into an unbounded D1 read
        // loop. A healthy client acks within milliseconds.
        const madeProgress
          = attachment.acknowledgedRevision !== attachment.lastAlarmAckRevision
        attachment.lastAlarmAckRevision = attachment.acknowledgedRevision
        attachment.alarmPassesWithoutProgress = madeProgress
          ? 0
          : (attachment.alarmPassesWithoutProgress ?? 0) + 1
        socket.serializeAttachment(attachment)
        if (attachment.alarmPassesWithoutProgress > MAX_ALARM_PASSES_WITHOUT_PROGRESS) {
          this.closeSocket(socket, 1008, 'ack_timeout')
          continue
        }
        stillLagging = true
        // Reuse this pass's revision as the catch-up ceiling (no second read).
        await this.sendCatchup(socket, attachment.cloudProjectId, attachment.acknowledgedRevision, currentRevision)
      }
      else {
        attachment.lastAlarmAckRevision = undefined
        attachment.alarmPassesWithoutProgress = 0
        socket.serializeAttachment(attachment)
      }
    }
    if (stillLagging) {
      // Re-arm for another bounded replay pass.
      await this.ctx.storage.setAlarm(Date.now() + ALARM_DELAY_MS)
    }
  }

  /**
   * Commit a projection mutation through the hub (OBL-commit-before-delivery).
   * Arms the recovery alarm BEFORE invoking the projection use case, so a crash
   * after the D1 commit still triggers bounded catch-up replay. Only the
   * committed result becomes a stream delta (architecture §Failure Semantics).
   *
   * Serialized through the operation queue so it cannot interleave with
   * subscription or membership work across D1 awaits (C-6).
   *
   * Returns a TYPED outcome instead of throwing: Durable Object RPC rejections
   * lose the error class on the Worker side, which turned
   * `projection_version_conflict` into an untyped 503 and hid `currentVersion`
   * from the journal's adopt-and-retry recovery (found on the deployed
   * 2026-08-15 probe).
   */
  async commitAndDeliver(cloudProjectId: string, req: CommitProjectionRequest): Promise<CommitProjectionOutcome> {
    return this.enqueueResult(async () => {
      // Arm the alarm before the D1 commit so post-commit failure can replay.
      await this.armAlarmIfNotSet()
      // The projection use case authorizes, validates, and commits in D1.
      let committed: { projectionVersion: number, projectRevision: number }
      try {
        committed = await publishProjectionUseCase(
          this.env.DB,
          req.principal,
          cloudProjectId,
          req.body,
          req.requestId,
        )
      }
      catch (err) {
        if (err instanceof CoordinationError) {
          return {
            ok: false as const,
            code: err.code,
            ...(err.currentVersion !== undefined ? { currentVersion: err.currentVersion } : {}),
          }
        }
        throw err
      }
      // Commit-before-broadcast: build the delta from the committed D1 row, then
      // broadcast. The delta is never built from the request body (C-2, C-4).
      const ticketNumber = Number.parseInt(String(req.body.ticketNumber ?? ''), 10)
      const row = await getProjectionByTicket(this.env.DB, cloudProjectId, ticketNumber)
      if (row) {
        const delta = recordToCatchup(cloudProjectId, row)
        const liveDelta: LiveDelta = { ...delta, kind: 'delta' }
        await this.broadcastDelta(liveDelta)
      }
      return { ok: true as const, ...committed }
    })
  }

  /**
   * Broadcast a complete delta to every authorized active socket and arm the
   * alarm in case an ack is missed. Internal to the commit + alarm paths.
   */
  private async broadcastDelta(delta: ProjectionDelta): Promise<void> {
    const envelope: LiveDelta = { kind: 'delta', ...delta }
    const sockets = this.ctx.getWebSockets() as HibernationWebSocket[]
    let hasActive = false
    for (const socket of sockets) {
      const attachment = socket.deserializeAttachment<SocketAttachment | null>()
      if (!attachment || !attachment.authorized) {
        continue
      }
      hasActive = true
      // Skip sockets whose acknowledged cursor already covers this revision.
      if (delta.projectRevision <= attachment.acknowledgedRevision) {
        continue
      }
      this.sendEnvelope(socket, envelope)
    }
    if (hasActive) {
      // Arm recovery in case an active socket does not acknowledge (Edge-1).
      await this.armAlarmIfNotSet()
    }
  }

  /**
   * Exclude and close unauthorized sockets before delivering a later projection
   * (Edge-4). Called by the Worker after a membership mutation commits in D1.
   * The affected principal's grants and cached session decisions are revoked
   * in the same serialized operation, so a revoked member cannot reconnect
   * with a previously issued grant (C-10, C-15).
   */
  async revokeSockets(unauthorizedPrincipalId: string): Promise<void> {
    // Return the queued work so the caller's await resolves only after the
    // sockets are closed, matching commitAndDeliver's enqueueResult contract.
    // Without this, revocation completes before the close-before-deliver work
    // runs and Edge-4 becomes a timing assumption rather than a guarantee.
    return this.enqueueResult(async () => {
      await this.withGrantRegistry(registry =>
        registry.revokeByPrincipal(unauthorizedPrincipalId))
      const sockets = this.ctx.getWebSockets() as HibernationWebSocket[]
      for (const socket of sockets) {
        const attachment = socket.deserializeAttachment<SocketAttachment | null>()
        if (!attachment) {
          continue
        }
        if (attachment.principalId === unauthorizedPrincipalId) {
          attachment.authorized = false
          socket.serializeAttachment(attachment)
          this.closeSocket(socket, 1008, 'authorization_revoked')
        }
      }
    })
  }

  // ── Operation queue ────────────────────────────────────────────────────

  /**
   * Run one operation against the grant registry, lazily loading persisted
   * state on first use and persisting the (digest-only) state after. Registry
   * state is delivery metadata in the DO's SQLite storage — D1 remains the
   * only membership authority (C-2, C-10).
   */
  private async withGrantRegistry<T>(
    op: (registry: StreamGrantRegistry) => T | Promise<T>,
  ): Promise<T> {
    const result = await this.readGrantRegistry(op)
    await this.ctx.storage.put(GRANT_REGISTRY_STORAGE_KEY, this.grantRegistry.exportState())
    return result
  }

  /** Read-only registry access: no storage write for pure validations. */
  private async readGrantRegistry<T>(
    op: (registry: StreamGrantRegistry) => T | Promise<T>,
  ): Promise<T> {
    if (!this.grantRegistryLoaded) {
      const state = await this.ctx.storage.get<StreamGrantRegistryState>(GRANT_REGISTRY_STORAGE_KEY)
      if (state)
        this.grantRegistry.loadState(state)
      this.grantRegistryLoaded = true
    }
    return op(this.grantRegistry)
  }

  /**
   * Enqueue an operation. Operations run strictly in arrival order; an explicit
   * await chain prevents async handler interleaving across D1 calls (C-6).
   */
  private enqueue(op: () => Promise<void>): Promise<void> {
    const run = this.queueTail.then(op, op)
    this.queueTail = run.catch(() => {})
    return run
  }

  /**
   * Enqueue an operation that returns a value (e.g. commitAndDeliver). Same
   * serialization guarantee as {@link enqueue}; rejects propagate to the caller
   * without stalling the queue.
   */
  private enqueueResult<T>(op: () => Promise<T>): Promise<T> {
    const run = this.queueTail.then(op, op)
    this.queueTail = run.then(() => {}, () => {})
    return run
  }

  // ── Catch-up ───────────────────────────────────────────────────────────

  /**
   * Race-free cursor catch-up: capture the high-water revision, send sparse
   * catch-up rows, then send `ready(highWaterRevision)`. Catch-up revisions may
   * be sparse because D1 stores only the latest row per ticket (Edge-2).
   */
  private async runCatchup(socket: HibernationWebSocket, attachment: SocketAttachment): Promise<void> {
    if (!attachment.authorized) {
      return
    }
    const cloudProjectId = attachment.cloudProjectId
    const after = attachment.acknowledgedRevision
    const highWater = await this.readCurrentRevision(cloudProjectId)
    if (highWater > after) {
      await this.sendCatchup(socket, cloudProjectId, after, highWater)
    }
    const ready: ReadySignal = {
      kind: 'ready',
      cloudProjectId,
      projectRevision: highWater,
    }
    this.sendEnvelope(socket, ready)
  }

  /**
   * Send sparse catch-up rows for revisions in (after, highWater]. Accepts
   * sparse latest-row results; the read model applies all rows and advances to
   * the high-water as one completed batch.
   */
  private async sendCatchup(
    socket: HibernationWebSocket,
    cloudProjectId: string,
    after: number,
    highWater?: number,
  ): Promise<void> {
    const ceiling = highWater ?? await this.readCurrentRevision(cloudProjectId)
    let cursor = after
    while (cursor < ceiling) {
      const page = await pollProjections(this.env.DB, cloudProjectId, cursor, CATCHUP_PAGE_SIZE)
      for (const record of page.items) {
        if (record.projectRevision > ceiling) {
          break
        }
        this.sendEnvelope(socket, recordToCatchup(cloudProjectId, record))
      }
      if (!page.hasMore) {
        break
      }
      // Termination invariant: pollProjections advances nextCursor to the last
      // item's strictly-greater revision. Enforce it locally rather than trust
      // the repository contract — a stuck or regressing cursor would otherwise
      // re-read the same page forever.
      const previousCursor = cursor
      cursor = page.nextCursor ?? cursor
      if (cursor <= previousCursor) {
        break
      }
      if (page.items.length === 0) {
        break
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /** Read the current committed project revision (high-water mark). */
  private async readCurrentRevision(cloudProjectId: string): Promise<number> {
    const row = await this.env.DB.prepare(
      'SELECT projection_revision FROM cloud_projects WHERE id = ?',
    ).bind(cloudProjectId).first<{ projection_revision: number }>()
    return row?.projection_revision ?? 0
  }

  /**
   * Post-hibernation reauthorization: recheck the principal's membership in a
   * bounded batch (C-10). A stream reconnects no later than token expiry.
   */
  private async reauthorize(attachment: SocketAttachment): Promise<boolean> {
    if (attachment.tokenExpiry > 0 && Date.now() > attachment.tokenExpiry) {
      return false
    }
    const member = await this.env.DB.prepare(
      `SELECT 1 AS ok FROM memberships
       WHERE cloud_project_id = ? AND principal_kind = ? AND principal_id = ?`,
    ).bind(attachment.cloudProjectId, attachment.principalKind, attachment.principalId).first<{ ok: number }>()
    return Boolean(member)
  }

  private async armAlarmIfNotSet(): Promise<void> {
    const existing = await this.ctx.storage.getAlarm()
    if (!existing) {
      await this.ctx.storage.setAlarm(Date.now() + ALARM_DELAY_MS)
    }
  }

  private async maybeClearAlarm(): Promise<void> {
    const sockets = this.ctx.getWebSockets() as HibernationWebSocket[]
    for (const socket of sockets) {
      const attachment = socket.deserializeAttachment<SocketAttachment | null>()
      if (!attachment || !attachment.authorized) {
        continue
      }
      const currentRevision = await this.readCurrentRevision(attachment.cloudProjectId)
      if (currentRevision > attachment.acknowledgedRevision) {
        // An active authorized socket is still behind; keep the alarm armed.
        return
      }
    }
    await this.ctx.storage.deleteAlarm()
  }

  private sendEnvelope(socket: HibernationWebSocket, envelope: StreamEnvelope): void {
    // C-4: envelopes carry approved headers + delivery metadata only.
    socket.send(JSON.stringify(envelope))
  }

  private closeSocket(socket: HibernationWebSocket, code: number, reason: string): void {
    // Close/error reasons carry a non-secret code/reason only (C-3, C-10).
    // eslint-disable-next-line no-console -- diagnostic telemetry (MDT-226 I7)
    console.info(JSON.stringify({
      event: 'hub_socket_close',
      code,
      reason,
      acked: socket.deserializeAttachment<SocketAttachment | null>()?.acknowledgedRevision ?? null,
    }))
    try {
      socket.close(code, reason)
    }
    catch {
      // Already closed.
    }
  }
}
