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
  LiveDelta,
  ProjectionDelta,
  ReadySignal,
  StreamEnvelope,
} from '@mdt/domain-contracts'
import type { PublishBody } from '../application/projection-usecase'
import { DurableObject } from 'cloudflare:workers'
import { publish as publishProjectionUseCase } from '../application/projection-usecase'
import {
  getProjectionByTicket,
  pollProjections,
} from '../d1/projection'
import {
  isProjectionStreamClientAck as isClientAck,
  recordToCatchup,
} from './projection-hub-helpers'

// Re-export pure helpers for tests and the worker (MDT-226).
export { isProjectionStreamClientAck, recordToCatchup } from './projection-hub-helpers'

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

/** Catch-up page size for bounded cursor reads. */
const CATCHUP_PAGE_SIZE = 500
/** Alarm lead time for replaying committed-but-unacknowledged revisions. */
const ALARM_DELAY_MS = 5_000

export class ProjectProjectionHub extends DurableObject<ProjectProjectionHubEnv> {
  /** Explicit async operation queue serializes all hub work (C-6, Edge-2). */
  private queueTail: Promise<void> = Promise.resolve()

  /**
   * Accept a hibernating WebSocket. The Worker has already validated the Access
   * assertion and current membership; the attachment records the principal tag
   * and token expiry for post-hibernation reauthorization.
   */
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('upgrade')
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }
    const cloudProjectId = request.headers.get('x-mdt-cloud-project-id') ?? ''
    const principalKind = request.headers.get('x-mdt-principal-kind') ?? 'unknown'
    const principalId = request.headers.get('x-mdt-principal-id') ?? ''
    const tokenExpiry = Number.parseInt(request.headers.get('x-mdt-token-expiry') ?? '0', 10)
    const afterRevision = Number.parseInt(request.headers.get('x-mdt-after-revision') ?? '0', 10)

    const pair = new WebSocketPair()
    const socket = pair[1] as HibernationWebSocket
    this.ctx.acceptWebSocket(socket)

    const attachment: SocketAttachment = {
      cloudProjectId,
      principalKind,
      principalId,
      acknowledgedRevision: afterRevision,
      tokenExpiry: Number.isSafeInteger(tokenExpiry) ? tokenExpiry : 0,
      authorized: true,
    }
    socket.serializeAttachment(attachment)

    // Begin catch-up through the queue so it serializes with any mutation.
    this.enqueue(async () => {
      await this.runCatchup(socket, attachment)
    })

    return new Response(null, { status: 101, webSocket: pair[0] })
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
    // After an ack, try to clear the alarm if all active sockets are caught up.
    this.enqueue(async () => this.maybeClearAlarm())
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    const ws = socket as HibernationWebSocket
    ws.serializeAttachment(null)
    this.enqueue(async () => this.maybeClearAlarm())
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    const ws = socket as HibernationWebSocket
    ws.serializeAttachment(null)
    this.enqueue(async () => this.maybeClearAlarm())
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
        stillLagging = true
        await this.sendCatchup(socket, attachment.cloudProjectId, attachment.acknowledgedRevision)
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
   * committed result becomes a stream delta; a mutation conflict throws the
   * typed error without broadcasting anything (architecture §Failure Semantics).
   *
   * Serialized through the operation queue so it cannot interleave with
   * subscription or membership work across D1 awaits (C-6).
   *
   * Returns the committed `{ projectionVersion, projectRevision }` to the Worker.
   */
  async commitAndDeliver(cloudProjectId: string, req: CommitProjectionRequest): Promise<{ projectionVersion: number, projectRevision: number }> {
    return this.enqueueResult(async () => {
      // Arm the alarm before the D1 commit so post-commit failure can replay.
      await this.armAlarmIfNotSet()
      // The projection use case authorizes, validates, and commits in D1.
      const committed = await publishProjectionUseCase(
        this.env.DB,
        req.principal,
        cloudProjectId,
        req.body,
        req.requestId,
      )
      // Commit-before-broadcast: build the delta from the committed D1 row, then
      // broadcast. The delta is never built from the request body (C-2, C-4).
      const ticketNumber = Number.parseInt(String(req.body.ticketNumber ?? ''), 10)
      const row = await getProjectionByTicket(this.env.DB, cloudProjectId, ticketNumber)
      if (row) {
        const delta = recordToCatchup(cloudProjectId, row)
        const liveDelta: LiveDelta = { ...delta, kind: 'delta' }
        await this.broadcastDelta(liveDelta)
      }
      return committed
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
   */
  async revokeSockets(unauthorizedPrincipalId: string): Promise<void> {
    this.enqueue(async () => {
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
      cursor = page.nextCursor ?? cursor
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
    try {
      socket.close(code, reason)
    }
    catch {
      // Already closed.
    }
  }
}
