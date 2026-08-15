/**
 * CloudProjectionStreamClient — local WebSocket transport for the projection
 * stream (MDT-226).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream client.
 *
 * Owns ONE WebSocket created with a valid session grant. It preserves one
 * in-flight handshake, coalesces `error` plus `close` into one termination
 * report, ignores stale transport callbacks, validates envelopes, and requests
 * catch-up from the last applied cursor.
 *
 * It owns NO autonomous retry timer, credential acquisition, membership probe,
 * or terminal-failure policy — ProjectionStreamManager is the sole owner of
 * activation and reconnect policy (C-13, C-14, C-15, Edge-6).
 *
 * The transport is injectable so tests can use a controllable peer instead of a
 * real network WebSocket.
 */

import type {
  ClientAck,
  StreamEnvelope,
} from '@mdt/domain-contracts'
import { parseStreamEnvelope } from '@mdt/domain-contracts'

/**
 * One atomic authorization value (headers + expiry travel together). Produced
 * by the process-scoped credential broker; consumed by the manager when it
 * drives the session client and this transport.
 */
export interface StreamAuthorization {
  headers: Record<string, string>
  tokenExpiry: number
}

export interface StreamClientOptions {
  cloudProjectId: string
  serviceOrigin: string
  /** Last applied+persisted revision; sent as afterRevision on connect. */
  afterRevision: number
  /** Opaque stream grant from the session control plane (C-10). */
  grant: string
  /** Resolved Access credential headers for this connection (C-3). */
  headers: Record<string, string>
  /** Token expiry epoch-ms, forwarded to the hub for reauthorization. */
  tokenExpiry: number
  /** Injectable transport (tests); defaults to the runtime WebSocket. */
  transport?: StreamTransport
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

/**
 * Callbacks the manager wires to drive the read model and own every policy
 * decision. `onTerminated` fires at most once per connection (coalesced
 * error+close); the manager — never this client — schedules what happens next.
 */
export interface StreamClientHandlers {
  onEnvelope: (envelope: StreamEnvelope) => void
  onStale: (reason: string) => void
  onServerError: (code: string, retry: 'reconnect' | 'none') => void
  onTerminated: (kind: 'close' | 'error') => void
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
  private handlers?: StreamClientHandlers
  private connection?: StreamConnection
  private connectPromise?: Promise<void>
  private stopped = false

  constructor(opts: StreamClientOptions, handlers?: StreamClientHandlers) {
    this.opts = opts
    this.handlers = handlers
  }

  setHandlers(handlers: StreamClientHandlers): void {
    this.handlers = handlers
  }

  /**
   * Open the stream connection with the grant supplied at construction. The
   * handshake is single-flight; a termination makes the client idle until the
   * manager commands the next action.
   */
  connect(): Promise<void> {
    if (this.stopped || this.connection)
      return Promise.resolve()
    if (this.connectPromise)
      return this.connectPromise

    const pending = this.openConnection()
    this.connectPromise = pending
    void pending.finally(() => {
      if (this.connectPromise === pending)
        this.connectPromise = undefined
    })
    return pending
  }

  /** Permanently stop the client (no reconnect). */
  stop(): void {
    this.stopped = true
    const connection = this.connection
    this.connection = undefined
    connection?.close()
  }

  /**
   * Single-flight reconnect for a live-gap catch-up (Edge-2). Drops the current
   * connection, updates the afterRevision cursor, and reconnects ONCE with the
   * SAME grant so the server replays the missing revisions before returning to
   * live. The old transport's late callbacks are ignored.
   */
  reconnectForCatchup(afterRevision: number): void {
    if (this.stopped)
      return
    const connection = this.connection
    this.connection = undefined
    this.opts = { ...this.opts, afterRevision }
    connection?.close()
    void this.connect()
  }

  /** Send an ack for an applied+persisted revision (C-6). */
  sendAck(revision: number): void {
    if (revision > this.opts.afterRevision)
      this.opts = { ...this.opts, afterRevision: revision }
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
        this.handlers?.onEnvelope(envelope)
        break
      case 'stale':
        this.handlers?.onStale(envelope.reason)
        break
      case 'error':
        this.handlers?.onServerError(envelope.code, envelope.retry)
        // A server envelope that says "do not reconnect" is a terminal
        // instruction; stopping here is policy execution, not retry policy.
        if (envelope.retry === 'none') {
          this.stop()
        }
        break
    }
  }

  private async openConnection(): Promise<void> {
    if (this.stopped || this.connection)
      return

    const headers: Record<string, string> = {
      ...this.opts.headers,
      'x-mdt-cloud-project-id': this.opts.cloudProjectId,
      'x-mdt-after-revision': String(this.opts.afterRevision),
      'x-mdt-token-expiry': String(this.opts.tokenExpiry),
      'x-mdt-stream-grant': this.opts.grant,
    }

    let connection: StreamConnection
    try {
      const transport = this.opts.transport ?? getDefaultTransport()
      connection = transport.connect(
        streamWebSocketUrl(this.opts.serviceOrigin, this.opts.cloudProjectId),
        headers,
      )
    }
    catch {
      // Transport construction failed; report one termination. The manager
      // owns what happens next (no timer here).
      this.handlers?.onTerminated('error')
      return
    }

    if (this.stopped) {
      connection.close()
      return
    }

    this.connection = connection
    let terminated = false
    const terminate = (kind: 'close' | 'error') => {
      if (terminated || this.stopped || this.connection !== connection)
        return
      terminated = true
      this.connection = undefined
      this.handlers?.onTerminated(kind)
    }

    connection.onMessage((raw) => {
      if (this.connection !== connection)
        return
      const result = parseStreamEnvelope(raw)
      if (result.ok)
        this.handleEnvelope(result.value)
    })
    connection.onClose(() => terminate('close'))
    connection.onError(() => terminate('error'))
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
