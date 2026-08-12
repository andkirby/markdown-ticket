/**
 * CloudProjectionStreamClient — local WebSocket transport for the projection
 * stream (MDT-226).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream client.
 *
 * Uses the existing credential provider to attach Access headers during the
 * WebSocket handshake. Validates envelopes, performs bounded exponential
 * reconnect with jitter, refreshes credentials, and requests catch-up from the
 * last applied cursor. Transport ping uses protocol behavior that does not wake
 * the hub for an application request.
 *
 * The transport is injectable so tests can use a controllable peer instead of a
 * real network WebSocket.
 */

import type {
  ClientAck,
  StreamEnvelope,
} from '@mdt/domain-contracts'
import { parseStreamEnvelope } from '@mdt/domain-contracts'

/** Bounded exponential backoff bounds (seconds). */
export const MIN_RECONNECT_SECONDS = 1
export const MAX_RECONNECT_SECONDS = 30

export interface StreamClientOptions {
  cloudProjectId: string
  serviceOrigin: string
  /** Last applied+persisted revision; sent as afterRevision on connect. */
  afterRevision: number
  /** Token expiry epoch-ms, forwarded to the hub for reauthorization. */
  tokenExpiry: number
  /** Resolved Access credential, attached to the handshake headers. */
  headers: Record<string, string>
  /**
   * Optional credential refresh invoked before each handshake (connect +
   * reconnect), so a long-lived client reconnects with a fresh Access token
   * rather than the static construction-time headers (C-10, §Local stream
   * client). When omitted, the construction-time headers are reused.
   */
  refreshHeaders?: () => Promise<Record<string, string>>
  /** Injectable transport (tests); defaults to the runtime WebSocket. */
  transport?: StreamTransport
  /** Injectable scheduler (tests); defaults to setTimeout. */
  scheduler?: (ms: number, fn: () => void) => void
  /** Clock for jitter/backoff (tests); defaults to Date.now. */
  now?: () => number
}

/**
 * Injectable WebSocket-like transport. A real implementation opens a WebSocket;
 * tests provide a controllable peer that emits envelopes and records sends.
 */
export interface StreamTransport {
  connect: (url: string, headers: Record<string, string>) => StreamConnection
}

export interface StreamConnection {
  onMessage: (handler: (raw: string) => void) => void
  onClose: (handler: (code: number, reason: string) => void) => void
  onError: (handler: (err: unknown) => void) => void
  send: (raw: string) => void
  close: () => void
}

/** Callbacks the manager wires to drive the read model. */
export interface StreamClientHandlers {
  onEnvelope: (envelope: StreamEnvelope) => void
  onStale: (reason: string) => void
  onError: (code: string) => void
}

/**
 * Compute the WebSocket URL from a service origin (https → wss).
 */
export function streamWebSocketUrl(serviceOrigin: string, cloudProjectId: string): string {
  const wsOrigin = serviceOrigin.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://')
  return `${wsOrigin}/v1/projects/${cloudProjectId}/projection-stream`
}

export class CloudProjectionStreamClient {
  /** Mutable so reconnectForCatchup can advance the afterRevision cursor. */
  private opts: StreamClientOptions
  private readonly scheduler: (ms: number, fn: () => void) => void
  private readonly now: () => number
  private handlers?: StreamClientHandlers
  private connection?: StreamConnection
  private attempt = 0
  private stopped = false

  constructor(opts: StreamClientOptions) {
    this.opts = opts
    this.scheduler = opts.scheduler ?? ((ms, fn) => setTimeout(fn, ms))
    this.now = opts.now ?? Date.now
  }

  setHandlers(handlers: StreamClientHandlers): void {
    this.handlers = handlers
  }

  /** Open the stream connection. Refreshes credentials before each handshake. */
  async connect(): Promise<void> {
    if (this.stopped)
      return
    // Refresh credentials on every connect/reconnect so a long-lived client
    // reconnects with a fresh Access token, not the static construction headers
    // (C-10, §Local stream client "refreshes credentials").
    const baseHeaders = this.opts.refreshHeaders
      ? await this.opts.refreshHeaders().catch(() => this.opts.headers)
      : this.opts.headers
    const url = streamWebSocketUrl(this.opts.serviceOrigin, this.opts.cloudProjectId)
    const headers: Record<string, string> = {
      ...baseHeaders,
      'x-mdt-cloud-project-id': this.opts.cloudProjectId,
      'x-mdt-after-revision': String(this.opts.afterRevision),
      'x-mdt-token-expiry': String(this.opts.tokenExpiry),
    }
    const transport = this.opts.transport ?? getDefaultTransport()
    const conn = transport.connect(url, headers)
    this.connection = conn

    conn.onMessage((raw) => {
      const result = parseStreamEnvelope(raw)
      if (!result.ok) {
        // Malformed envelope — ignore rather than crash the stream.
        return
      }
      this.handleEnvelope(result.value)
    })

    conn.onClose((_code, _reason) => {
      this.connection = undefined
      this.handlers?.onStale('stream_closed')
      this.scheduleReconnect()
    })

    conn.onError((_err) => {
      this.connection = undefined
      this.handlers?.onError('transport_error')
      this.scheduleReconnect()
    })
  }

  /** Permanently stop the client (no reconnect). */
  stop(): void {
    this.stopped = true
    this.connection?.close()
    this.connection = undefined
  }

  /**
   * Single-flight reconnect for a live-gap catch-up (Edge-2). Drops the current
   * connection, updates the afterRevision cursor, and reconnects so the server
   * replays the missing revisions before returning to live.
   */
  reconnectForCatchup(afterRevision: number): void {
    if (this.stopped)
      return
    this.connection?.close()
    this.connection = undefined
    this.opts = { ...this.opts, afterRevision }
    this.attempt = 0
    void this.connect()
  }

  /** Send an ack for an applied+persisted revision (C-6). */
  sendAck(revision: number): void {
    const ack: ClientAck = {
      kind: 'ack',
      cloudProjectId: this.opts.cloudProjectId,
      projectRevision: revision,
    }
    this.connection?.send(JSON.stringify(ack))
  }

  private handleEnvelope(envelope: StreamEnvelope): void {
    switch (envelope.kind) {
      case 'catchup':
      case 'delta':
        this.handlers?.onEnvelope(envelope)
        break
      case 'ready':
        // Catch-up complete; the manager advances the cursor then acks.
        this.handlers?.onEnvelope(envelope)
        break
      case 'stale':
        this.handlers?.onStale(envelope.reason)
        break
      case 'error':
        this.handlers?.onError(envelope.code)
        if (envelope.retry === 'none') {
          this.stop()
        }
        break
    }
  }

  /** Bounded exponential backoff with jitter (C-6). */
  backoffDelayMs(): number {
    const base = Math.min(
      MAX_RECONNECT_SECONDS,
      MIN_RECONNECT_SECONDS * 2 ** this.attempt,
    )
    this.attempt += 1
    // Full jitter: random in [0, base] seconds.
    const jitter = Math.floor(Math.random() * base * 1000)
    return Math.max(MIN_RECONNECT_SECONDS * 1000, jitter)
  }

  private scheduleReconnect(): void {
    if (this.stopped)
      return
    this.scheduler(this.backoffDelayMs(), () => this.connect())
  }
}

/**
 * Default transport using the runtime WebSocket. Bun's WebSocket accepts
 * handshake headers as a Bun-specific extension: the SECOND constructor
 * argument is an options object with a `headers` field. (The `ws`-module
 * convention of a third argument is a silent no-op in Bun — the headers are
 * dropped and the CF Access handshake fails.) Verified by round-trip POC.
 */
const defaultTransport: StreamTransport = {
  connect(url, headers) {
    type BunHeaderedWebSocketCtor = new (
      url: string,
      opts?: { headers?: Record<string, string> },
    ) => WebSocket
    const WS = (globalThis as unknown as { WebSocket: BunHeaderedWebSocketCtor }).WebSocket
    const ws = new WS(url, { headers })
    const conn: StreamConnection = {
      onMessage(handler) { ws.addEventListener('message', e => handler(String(e.data))) },
      onClose(handler) { ws.addEventListener('close', e => handler(e.code, e.reason)) },
      onError(handler) { ws.addEventListener('error', () => handler(new Error('ws error'))) },
      send(raw) { ws.send(raw) },
      close() { ws.close() },
    }
    return conn
  },
}

/** Resolve the runtime WebSocket transport (function form avoids use-before-define). */
function getDefaultTransport(): StreamTransport {
  return defaultTransport
}
