/**
 * TEST-stream-client-transport — covers C-6, C-10, C-13, Edge-6, C-3.
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream client.
 *
 * Verifies CloudProjectionStreamClient (incident-recovery contract):
 *   - attaches Access headers, the stream grant, and the afterRevision cursor
 *     on the upgrade (C-3, C-10);
 *   - validates envelopes and ignores malformed ones (C-6);
 *   - sends ack only when the manager calls sendAck (C-6);
 *   - error+close coalesces into ONE termination report; stale transport
 *     callbacks are ignored (Edge-6);
 *   - the transport schedules NO autonomous reconnect — after termination it
 *     stays idle until the manager acts (C-13, C-14, C-15);
 *   - a catch-up replacement reuses the same grant and ignores the replaced
 *     transport's close callback (Edge-2, Edge-6).
 */

import type { StreamEnvelope } from '@mdt/domain-contracts'

import type { StreamConnection, StreamTransport } from '../CloudProjectionStreamClient'
import { describe, expect, it } from '@jest/globals'
import { CloudProjectionStreamClient, streamWebSocketUrl } from '../CloudProjectionStreamClient'

const CLOUD_PROJECT_ID = 'cloud-uuid-1'
const SERVICE_ORIGIN = 'https://mdt-sync.example.com'
const GRANT = 'grant-opaque-1'

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
  function makeClient(transport: StreamTransport, handlers: {
    onEnvelope: (envelope: StreamEnvelope) => void
    onStale: (reason: string) => void
    onServerError: (code: string, retry: 'reconnect' | 'none') => void
    onTerminated: (kind: 'close' | 'error') => void
  }) {
    return new CloudProjectionStreamClient({
      cloudProjectId: CLOUD_PROJECT_ID,
      serviceOrigin: SERVICE_ORIGIN,
      afterRevision: 5,
      grant: GRANT,
      headers: { 'cf-access-token': 'token-xyz' },
      tokenExpiry: 120_000,
      transport,
    }, handlers)
  }

  it('derives the wss URL from the https origin', () => {
    expect(streamWebSocketUrl(SERVICE_ORIGIN, CLOUD_PROJECT_ID))
      .toBe('wss://mdt-sync.example.com/v1/projects/cloud-uuid-1/projection-stream')
  })

  it('attaches the Access token, grant, and afterRevision cursor on the upgrade (C-3, C-10)', async () => {
    const { transport, connection } = makeControllableTransport()
    const client = makeClient(transport, noOpHandlers())
    await client.connect()
    expect(connection.headers['cf-access-token']).toBe('token-xyz')
    expect(connection.headers['x-mdt-stream-grant']).toBe(GRANT)
    expect(connection.headers['x-mdt-token-expiry']).toBe('120000')
    expect(connection.headers['x-mdt-cloud-project-id']).toBe(CLOUD_PROJECT_ID)
    expect(connection.headers['x-mdt-after-revision']).toBe('5')
    expect(connection.url).toBe('wss://mdt-sync.example.com/v1/projects/cloud-uuid-1/projection-stream')
  })

  it('validates envelopes and forwards deltas to the handler (C-6)', async () => {
    const { transport, connection } = makeControllableTransport()
    const received: StreamEnvelope[] = []
    const client = makeClient(transport, {
      ...noOpHandlers(),
      onEnvelope: e => received.push(e),
    })
    await client.connect()

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

  it('sends an ack envelope only when sendAck is called (C-6)', async () => {
    const { transport, connection } = makeControllableTransport()
    const client = makeClient(transport, noOpHandlers())
    await client.connect()

    client.sendAck(6)
    expect(connection.sent).toEqual([JSON.stringify({
      kind: 'ack',
      cloudProjectId: CLOUD_PROJECT_ID,
      projectRevision: 6,
    })])
  })

  it('coalesces error plus close into one termination report (Edge-6)', async () => {
    const { transport, connection } = makeControllableTransport()
    const terminations: Array<'close' | 'error'> = []
    const client = makeClient(transport, {
      ...noOpHandlers(),
      onTerminated: kind => terminations.push(kind),
    })
    await client.connect()

    connection.simulateError()
    connection.simulateClose()
    expect(terminations).toEqual(['error'])
  })

  it('schedules no autonomous reconnect after termination (C-13, C-14, C-15)', async () => {
    const { transport, connections } = makeConnectionFactoryTransport()
    const terminations: Array<'close' | 'error'> = []
    const client = makeClient(transport, {
      ...noOpHandlers(),
      onTerminated: kind => terminations.push(kind),
    })
    await client.connect()

    connections[0]!.simulateClose(1006)
    expect(terminations).toEqual(['close'])

    // The transport stays idle: no timer exists in this client, and the
    // manager has not commanded another connection. Let the microtask queue
    // and timer queue settle to prove nothing was scheduled.
    await new Promise(resolve => setImmediate(resolve))
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(connections).toHaveLength(1)
    expect(terminations).toHaveLength(1)
  })

  it('ignores stale callbacks from a replaced transport (Edge-6)', async () => {
    const { transport, connections } = makeConnectionFactoryTransport()
    const terminations: Array<'close' | 'error'> = []
    const client = makeClient(transport, {
      ...noOpHandlers(),
      onTerminated: kind => terminations.push(kind),
    })
    await client.connect()

    const replaced = connections[0]!
    client.reconnectForCatchup(9)
    // The replaced transport's late close must not terminate the new lane.
    replaced.simulateClose()
    await new Promise(resolve => setImmediate(resolve))

    expect(connections).toHaveLength(2)
    expect(connections[1]!.headers['x-mdt-after-revision']).toBe('9')
    expect(connections[1]!.headers['x-mdt-stream-grant']).toBe(GRANT)
    expect(terminations).toHaveLength(0)
  })

  it('shares concurrent connect calls in one handshake (C-13)', async () => {
    const { transport, connections } = makeConnectionFactoryTransport()
    const client = makeClient(transport, noOpHandlers())

    const first = client.connect()
    const second = client.connect()
    await Promise.all([first, second])

    expect(connections).toHaveLength(1)
  })

  it('reports a server error envelope with its retry disposition (C-14)', async () => {
    const { transport, connection } = makeControllableTransport()
    const serverErrors: Array<{ code: string, retry: string }> = []
    const client = makeClient(transport, {
      ...noOpHandlers(),
      onServerError: (code, retry) => serverErrors.push({ code, retry }),
    })
    await client.connect()

    connection.emit(JSON.stringify({
      kind: 'error',
      cloudProjectId: CLOUD_PROJECT_ID,
      code: 'authorization_revoked',
      retry: 'none',
    }))

    expect(serverErrors).toEqual([{ code: 'authorization_revoked', retry: 'none' }])
  })

  it('does not terminate after stop()', async () => {
    const { transport, connection } = makeControllableTransport()
    const terminations: Array<'close' | 'error'> = []
    const client = makeClient(transport, {
      ...noOpHandlers(),
      onTerminated: kind => terminations.push(kind),
    })
    await client.connect()
    client.stop()
    connection.simulateClose()
    expect(terminations).toHaveLength(0)
  })

  it('a ready envelope is forwarded (catch-up complete)', async () => {
    const { transport, connection } = makeControllableTransport()
    const received: StreamEnvelope[] = []
    const client = makeClient(transport, {
      ...noOpHandlers(),
      onEnvelope: e => received.push(e),
    })
    await client.connect()
    connection.emit(JSON.stringify({ kind: 'ready', cloudProjectId: CLOUD_PROJECT_ID, projectRevision: 10 }))
    expect(received[0]!.kind).toBe('ready')
  })
})

function noOpHandlers(): {
  onEnvelope: (envelope: StreamEnvelope) => void
  onStale: (reason: string) => void
  onServerError: (code: string, retry: 'reconnect' | 'none') => void
  onTerminated: (kind: 'close' | 'error') => void
} {
  return {
    onEnvelope: () => {},
    onStale: () => {},
    onServerError: () => {},
    onTerminated: () => {},
  }
}
