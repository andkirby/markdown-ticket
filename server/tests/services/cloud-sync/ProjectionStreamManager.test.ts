/**
 * TEST-stream-manager-* — covers C-5, C-13, BR-1.6 (single-flight), C-6/Edge-1
 * (ack after persistence), BR-1.5/SC-5 (stale).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream manager.
 *
 * Uses a controllable stream transport (no real network) and a temp read-model
 * root. Verifies:
 *   - exactly one client per enabled project;
 *   - tab mounts do not add streams;
 *   - single-flight reconnect (start is idempotent);
 *   - ack only after read-model+cursor persistence;
 *   - stop is clean.
 */

import type { StreamConnection, StreamTransport } from '@mdt/shared/services/cloud-sync/CloudProjectionStreamClient.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { CloudProjectionReadModel } from '@mdt/shared/services/cloud-sync/CloudProjectionReadModel.js'
import {
  CloudProjectionStreamClient,

} from '@mdt/shared/services/cloud-sync/CloudProjectionStreamClient.js'
import { ProjectionStreamManager } from '../../../services/cloud-sync/ProjectionStreamManager'

/** Flush the async apply-persist-ack chain by polling for an expected condition. */
async function flushUntil(predicate: () => boolean, timeoutMs = 500): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!predicate() && Date.now() < deadline) {
    await new Promise(r => setImmediate(r))
  }
}

class MockConnection implements StreamConnection {
  sent: string[] = []
  closed = false
  private messageHandler?: (raw: string) => void
  private closeHandler?: (code: number, reason: string) => void
  private errorHandler?: (err: unknown) => void

  onMessage(handler: (raw: string) => void): void { this.messageHandler = handler }
  onClose(handler: (code: number, reason: string) => void): void { this.closeHandler = handler }
  onError(handler: (err: unknown) => void): void { this.errorHandler = handler }
  send(raw: string): void { this.sent.push(raw) }
  close(): void { this.closed = true }

  emit(raw: string): void { this.messageHandler?.(raw) }
  simulateClose(): void { this.closeHandler?.(1006, '') }
}

function makeMockTransport(): { transport: StreamTransport, connections: MockConnection[] } {
  const connections: MockConnection[] = []
  const transport: StreamTransport = {
    connect() {
      const conn = new MockConnection()
      connections.push(conn)
      return conn
    },
  }
  return { transport, connections }
}

describe('ProjectionStreamManager', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-stream-mgr-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function makeManager() {
    const { transport, connections } = makeMockTransport()
    const changes: string[] = []
    const manager = new ProjectionStreamManager({
      clientFactory: opts => new CloudProjectionStreamClient({
        ...opts,
        transport,
        scheduler: () => {},
        now: () => 1_000_000,
      }),
      readModelFactory: (localProjectId, rootDir) =>
        new CloudProjectionReadModel({ rootDir: rootDir ?? root, localProjectId }),
      onChange: cloudProjectId => changes.push(cloudProjectId),
    })
    return { manager, connections, changes }
  }

  it('opens exactly one stream per enabled project (C-5, BR-1.6)', async () => {
    const { manager, connections } = makeManager()
    await manager.start({
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      headers: {},
      tokenExpiry: 0,
      rootDir: root,
    })
    expect(manager.openStreamCount).toBe(1)
    expect(manager.hasStream('project-a')).toBe(true)
    expect(connections).toHaveLength(1)
  })

  it('additional browser-tab mounts do not add streams (BR-1.6, tab-independence)', async () => {
    const { manager, connections } = makeManager()
    const startOpts = {
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      headers: {},
      tokenExpiry: 0,
      root,
    }
    await manager.start(startOpts)
    // A second "tab mount" calls start again for the same project.
    await manager.start(startOpts)
    expect(manager.openStreamCount).toBe(1)
    expect(connections).toHaveLength(1)
  })

  it('coalesces concurrent starts before read-model load completes (C-13)', async () => {
    const { transport, connections } = makeMockTransport()
    let releaseLoad!: () => void
    const loadGate = new Promise<void>((resolve) => {
      releaseLoad = resolve
    })
    const manager = new ProjectionStreamManager({
      clientFactory: opts => new CloudProjectionStreamClient({
        ...opts,
        transport,
        scheduler: () => {},
      }),
      readModelFactory: (localProjectId, rootDir) => {
        const readModel = new CloudProjectionReadModel({
          rootDir: rootDir ?? root,
          localProjectId,
        })
        const load = readModel.load.bind(readModel)
        readModel.load = async (cloudProjectId: string) => {
          await loadGate
          await load(cloudProjectId)
        }
        return readModel
      },
      onChange: () => {},
    })
    const startOpts = {
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      headers: {},
      tokenExpiry: 0,
      root,
    }

    const first = manager.start(startOpts)
    const second = manager.start(startOpts)
    releaseLoad()
    await Promise.all([first, second])

    expect(manager.openStreamCount).toBe(1)
    expect(connections).toHaveLength(1)
  })

  it('different projects open independent streams', async () => {
    const { manager, connections } = makeManager()
    await manager.start({
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      headers: {},
      tokenExpiry: 0,
      rootDir: root,
    })
    await manager.start({
      localProjectId: 'project-b',
      cloudProjectId: 'cloud-b',
      serviceOrigin: 'https://mdt-sync.example.com',
      headers: {},
      tokenExpiry: 0,
      rootDir: root,
    })
    expect(manager.openStreamCount).toBe(2)
    expect(connections).toHaveLength(2)
  })

  it('acks only after read-model state+cursor persistence (C-6, Edge-1)', async () => {
    const { manager, connections } = makeManager()
    await manager.start({
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      headers: {},
      tokenExpiry: 0,
      rootDir: root,
    })
    const conn = connections[0]!
    expect(conn.sent).toEqual([]) // no ack before any envelope

    const delta = {
      kind: 'delta',
      cloudProjectId: 'cloud-a',
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
    conn.emit(JSON.stringify(delta))
    // Allow the async applyPersistNotify to flush.
    await flushUntil(() => conn.sent.length > 0)

    // An ack was sent only after persistence.
    expect(conn.sent).toHaveLength(1)
    const ack = JSON.parse(conn.sent[0]!)
    expect(ack).toEqual({ kind: 'ack', cloudProjectId: 'cloud-a', projectRevision: 6 })
  })

  it('ready advances the cursor and acks the high-water revision', async () => {
    const { manager, connections } = makeManager()
    await manager.start({
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      headers: {},
      tokenExpiry: 0,
      rootDir: root,
    })
    const conn = connections[0]!
    conn.emit(JSON.stringify({ kind: 'ready', cloudProjectId: 'cloud-a', projectRevision: 10 }))
    await flushUntil(() => conn.sent.length > 0)

    const readModel = manager.getReadModel('project-a')!
    expect(readModel.appliedCursor).toBe(10)
    expect(readModel.live).toBe(true)
    expect(JSON.parse(conn.sent[0]!)).toEqual({ kind: 'ack', cloudProjectId: 'cloud-a', projectRevision: 10 })
  })

  it('marks stale on stream close and keeps entries (BR-1.5, SC-5)', async () => {
    const { manager, connections } = makeManager()
    await manager.start({
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      headers: {},
      tokenExpiry: 0,
      rootDir: root,
    })
    const conn = connections[0]!
    conn.emit(JSON.stringify({
      kind: 'delta',
      cloudProjectId: 'cloud-a',
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
    }))
    // Wait for the ack (sent only after persist completes) so the file I/O is
    // settled before the test ends.
    await flushUntil(() => conn.sent.length > 0)

    const readModel = manager.getReadModel('project-a')!
    expect(readModel.entries()).toHaveLength(1)

    conn.simulateClose()
    expect(readModel.live).toBe(false)
    // Entries remain visible while stale.
    expect(readModel.entries()).toHaveLength(1)
  })

  it('stop removes the stream and stopAll clears all', async () => {
    const { manager } = makeManager()
    await manager.start({
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      headers: {},
      tokenExpiry: 0,
      rootDir: root,
    })
    expect(manager.openStreamCount).toBe(1)
    manager.stop('project-a')
    expect(manager.openStreamCount).toBe(0)
    expect(manager.hasStream('project-a')).toBe(false)

    await manager.start({
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      headers: {},
      tokenExpiry: 0,
      rootDir: root,
    })
    manager.stopAll()
    expect(manager.openStreamCount).toBe(0)
  })
})
