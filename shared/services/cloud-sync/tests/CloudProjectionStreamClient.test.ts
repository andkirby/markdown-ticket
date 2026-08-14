/**
 * TEST-stream-client-transport — covers C-6, C-10, C-13, Edge-6, C-3.
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream client.
 *
 * Verifies CloudProjectionStreamClient:
 *   - attaches Access headers on the upgrade (C-3);
 *   - validates envelopes and ignores malformed ones (C-6);
 *   - one bounded reconnect/expiry lane across close/error/catch-up;
 *   - authorization headers and expiry refresh together;
 *   - sends ack only when the manager calls sendAck (C-6);
 *   - catch-up request carries the afterRevision cursor;
 *   - ping/reconnect does not wake the hub for an application request.
 */

import type { StreamEnvelope } from '@mdt/domain-contracts'

import type { StreamConnection, StreamTransport } from '../CloudProjectionStreamClient'
import { describe, expect, it, jest } from '@jest/globals'
import {
  CloudProjectionStreamClient,

  streamWebSocketUrl,
} from '../CloudProjectionStreamClient'

const CLOUD_PROJECT_ID = 'cloud-uuid-1'
const SERVICE_ORIGIN = 'https://mdt-sync.example.com'

function makeControllableTransport(): { transport: StreamTransport, connection: MockConnection } {
  const connection = new MockConnection()
  const transport: StreamTransport = {
    connect(url, headers) {
      connection.recordConnect(url, headers)
      return connection
    },
  }
  return { transport, connection }
}

function makeConnectionFactoryTransport(): {
  transport: StreamTransport
  connections: MockConnection[]
} {
  const connections: MockConnection[] = []
  return {
    connections,
    transport: {
      connect(url, headers) {
        const connection = new MockConnection()
        connection.recordConnect(url, headers)
        connections.push(connection)
        return connection
      },
    },
  }
}

class MockConnection implements StreamConnection {
  url = ''
  headers: Record<string, string> = {}
  sent: string[] = []
  private messageHandler?: (raw: string) => void
  private closeHandler?: (code: number, reason: string) => void
  private errorHandler?: (err: unknown) => void

  recordConnect(url: string, headers: Record<string, string>): void {
    this.url = url
    this.headers = headers
  }

  onMessage(handler: (raw: string) => void): void { this.messageHandler = handler }
  onClose(handler: (code: number, reason: string) => void): void { this.closeHandler = handler }
  onError(handler: (err: unknown) => void): void { this.errorHandler = handler }

  send(raw: string): void { this.sent.push(raw) }
  close(): void {}

  // Test drivers:
  emit(raw: string): void { this.messageHandler?.(raw) }
  simulateClose(code = 1006, reason = ''): void { this.closeHandler?.(code, reason) }
  simulateError(): void { this.errorHandler?.(new Error('boom')) }
}

describe('CloudProjectionStreamClient (TEST-stream-client-transport)', () => {
  function makeClient(transport: StreamTransport) {
    const timers: Array<{ ms: number, fn: () => void }> = []
    return {
      timers,
      client: new CloudProjectionStreamClient({
        cloudProjectId: CLOUD_PROJECT_ID,
        serviceOrigin: SERVICE_ORIGIN,
        afterRevision: 5,
        tokenExpiry: 0,
        headers: { 'cf-access-token': 'token-xyz' },
        transport,
        scheduler: (ms, fn) => { timers.push({ ms, fn }) },
        now: () => 1_000_000,
      }),
    }
  }

  it('derives the wss URL from the https origin', () => {
    expect(streamWebSocketUrl(SERVICE_ORIGIN, CLOUD_PROJECT_ID))
      .toBe('wss://mdt-sync.example.com/v1/projects/cloud-uuid-1/projection-stream')
  })

  it('attaches the Access token and afterRevision cursor on the upgrade (C-3, C-6)', () => {
    const { transport, connection } = makeControllableTransport()
    const { client } = makeClient(transport)
    client.connect()
    expect(connection.headers['cf-access-token']).toBe('token-xyz')
    expect(connection.headers['x-mdt-cloud-project-id']).toBe(CLOUD_PROJECT_ID)
    expect(connection.headers['x-mdt-after-revision']).toBe('5')
    expect(connection.url).toBe('wss://mdt-sync.example.com/v1/projects/cloud-uuid-1/projection-stream')
  })

  it('validates envelopes and forwards deltas to the handler (C-6)', () => {
    const { transport, connection } = makeControllableTransport()
    const { client } = makeClient(transport)
    const received: StreamEnvelope[] = []
    client.setHandlers({
      onEnvelope: e => received.push(e),
      onStale: () => {},
      onError: () => {},
    })
    client.connect()

    const delta = {
      kind: 'delta',
      cloudProjectId: CLOUD_PROJECT_ID,
      projectRevision: 6,
      ticketNumber: 1,
      projectionVersion: 1,
      lifecycle: 'active',
      header: {
        code: 'MDT-1',
        title: 'T',
        status: 'Open',
        type: null,
        priority: null,
        assignee: null,
        date_created: null,
        last_modified: '2026-08-08T00:00:00Z',
      },
    }
    connection.emit(JSON.stringify(delta))
    // Malformed envelope is ignored.
    connection.emit('{ "kind": "nope" }')
    connection.emit('not json')

    expect(received).toHaveLength(1)
    expect(received[0]!.kind).toBe('delta')
  })

  it('sends an ack envelope only when sendAck is called (C-6)', () => {
    const { transport, connection } = makeControllableTransport()
    const { client } = makeClient(transport)
    client.setHandlers({ onEnvelope: () => {}, onStale: () => {}, onError: () => {} })
    client.connect()

    client.sendAck(6)
    expect(connection.sent).toEqual([JSON.stringify({
      kind: 'ack',
      cloudProjectId: CLOUD_PROJECT_ID,
      projectRevision: 6,
    })])
  })

  it('marks stale and schedules a bounded reconnect on close (C-6)', () => {
    const { transport, connection } = makeControllableTransport()
    const { timers, client } = makeClient(transport)
    const stale: string[] = []
    client.setHandlers({ onEnvelope: () => {}, onStale: r => stale.push(r), onError: () => {} })
    client.connect()

    connection.simulateClose(1006)
    expect(stale).toEqual(['stream_closed'])
    expect(timers).toHaveLength(1)
    expect(timers[0]!.ms).toBeGreaterThanOrEqual(1000)
  })

  it('coalesces error plus close into one reconnect lane (C-13, Edge-6)', async () => {
    const { transport, connections } = makeConnectionFactoryTransport()
    const timers: Array<{ ms: number, fn: () => void }> = []
    const client = new CloudProjectionStreamClient({
      cloudProjectId: CLOUD_PROJECT_ID,
      serviceOrigin: SERVICE_ORIGIN,
      afterRevision: 5,
      tokenExpiry: 0,
      headers: { 'cf-access-token': 'token-xyz' },
      transport,
      scheduler: (ms, fn) => { timers.push({ ms, fn }) },
    })

    await client.connect()
    client.sendAck(8)
    connections[0]!.simulateError()
    connections[0]!.simulateClose()

    expect(timers).toHaveLength(1)
    timers[0]!.fn()
    await Promise.resolve()
    expect(connections).toHaveLength(2)
    expect(connections[1]!.headers['x-mdt-after-revision']).toBe('8')
  })

  it('replaces a catch-up connection once and ignores its close callback (C-13, Edge-6)', async () => {
    const { transport, connections } = makeConnectionFactoryTransport()
    const timers: Array<{ ms: number, fn: () => void }> = []
    const client = new CloudProjectionStreamClient({
      cloudProjectId: CLOUD_PROJECT_ID,
      serviceOrigin: SERVICE_ORIGIN,
      afterRevision: 5,
      tokenExpiry: 0,
      headers: { 'cf-access-token': 'token-xyz' },
      transport,
      scheduler: (ms, fn) => { timers.push({ ms, fn }) },
    })

    await client.connect()
    const replaced = connections[0]!
    client.reconnectForCatchup(9)
    replaced.simulateClose()
    await Promise.resolve()

    expect(connections).toHaveLength(2)
    expect(connections[1]!.headers['x-mdt-after-revision']).toBe('9')
    expect(timers).toHaveLength(0)
  })

  it('shares concurrent connect calls and refreshes token plus expiry together (C-10, C-13)', async () => {
    const { transport, connections } = makeConnectionFactoryTransport()
    let completeRefresh!: (value: {
      headers: Record<string, string>
      tokenExpiry: number
    }) => void
    const refreshAuthorization = jest.fn(() => new Promise<{
      headers: Record<string, string>
      tokenExpiry: number
    }>((resolve) => {
      completeRefresh = resolve
    }))
    const client = new CloudProjectionStreamClient({
      cloudProjectId: CLOUD_PROJECT_ID,
      serviceOrigin: SERVICE_ORIGIN,
      afterRevision: 5,
      tokenExpiry: 1_000,
      headers: { 'cf-access-token': 'old-token' },
      refreshAuthorization,
      transport,
      scheduler: () => undefined,
      now: () => 10_000,
    })

    const first = client.connect()
    const second = client.connect()
    expect(refreshAuthorization).toHaveBeenCalledTimes(1)

    completeRefresh({
      headers: { 'cf-access-token': 'new-token' },
      tokenExpiry: 120_000,
    })
    await Promise.all([first, second])

    expect(connections).toHaveLength(1)
    expect(connections[0]!.headers['cf-access-token']).toBe('new-token')
    expect(connections[0]!.headers['x-mdt-token-expiry']).toBe('120000')
  })

  it('reconnects once before refreshed token expiry (C-10, C-13)', async () => {
    const { transport, connections } = makeConnectionFactoryTransport()
    const timers: Array<{ ms: number, fn: () => void }> = []
    const client = new CloudProjectionStreamClient({
      cloudProjectId: CLOUD_PROJECT_ID,
      serviceOrigin: SERVICE_ORIGIN,
      afterRevision: 5,
      tokenExpiry: 120_000,
      headers: { 'cf-access-token': 'token-xyz' },
      refreshAuthorization: async () => ({
        headers: { 'cf-access-token': 'token-xyz' },
        tokenExpiry: 120_000,
      }),
      transport,
      scheduler: (ms, fn) => {
        timers.push({ ms, fn })
        return timers.length - 1
      },
      cancelScheduled: () => {},
      now: () => 10_000,
      tokenRefreshSkewMs: 10_000,
    })

    await client.connect()
    expect(timers).toHaveLength(1)
    expect(timers[0]!.ms).toBe(100_000)

    timers[0]!.fn()
    await Promise.resolve()
    await Promise.resolve()
    expect(connections).toHaveLength(2)
  })

  it('bounded backoff caps at MAX_RECONNECT_SECONDS', () => {
    const { transport } = makeControllableTransport()
    const { client } = makeClient(transport)
    const delays: number[] = []
    for (let i = 0; i < 20; i++) {
      delays.push(client.backoffDelayMs())
    }
    expect(Math.max(...delays)).toBeLessThanOrEqual(30_000)
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(1000)
  })

  it('does not schedule a reconnect after stop()', () => {
    const { transport, connection } = makeControllableTransport()
    const { timers, client } = makeClient(transport)
    client.setHandlers({ onEnvelope: () => {}, onStale: () => {}, onError: () => {} })
    client.connect()
    client.stop()
    connection.simulateClose()
    expect(timers).toHaveLength(0)
  })

  it('a ready envelope is forwarded (catch-up complete)', () => {
    const { transport, connection } = makeControllableTransport()
    const { client } = makeClient(transport)
    const received: StreamEnvelope[] = []
    client.setHandlers({
      onEnvelope: e => received.push(e),
      onStale: () => {},
      onError: () => {},
    })
    client.connect()
    connection.emit(JSON.stringify({ kind: 'ready', cloudProjectId: CLOUD_PROJECT_ID, projectRevision: 10 }))
    expect(received[0]!.kind).toBe('ready')
  })
})
