/**
 * TEST-stream-manager-*, TEST-stream-handshake-failure-classification, and
 * TEST-stream-status-local-only — covers C-5, C-13, BR-1.6 (single-flight),
 * C-6/Edge-1 (ack after persistence), BR-1.5/SC-5 (stale), C-14/C-15
 * (terminal failure containment), C-11 (local-only status).
 *
 * Source: docs/CRs/MDT-226/architecture.md § Local stream manager.
 *
 * Uses a controllable stream transport (no real network), a fake session
 * client, an injectable clock/scheduler, and a temp read-model/state root.
 * Verifies:
 *   - exactly one client per enabled project; tab mounts do not add streams;
 *   - ack only after read-model+cursor persistence;
 *   - typed 401/403/404 persist authorization pause and 426/protocol mismatch
 *     persists incompatible pause; time, browser activity, and restart produce
 *     no request until an approved re-arm event;
 *   - status reads local state only — no credential, HTTP, WebSocket, or D1.
 */

import type { ProjectionStreamSessionResult } from '@mdt/domain-contracts'
import type { StreamConnection, StreamTransport } from '@mdt/shared/services/cloud-sync/CloudProjectionStreamClient.js'
import { Buffer } from 'node:buffer'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { CloudProjectionReadModel } from '@mdt/shared/services/cloud-sync/CloudProjectionReadModel.js'
import { CloudProjectionStreamClient } from '@mdt/shared/services/cloud-sync/CloudProjectionStreamClient.js'
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

const NOW = 1_000_000
const GRANT_EXPIRY = NOW + 600_000

/** Minimal unverified JWT so the manager's fingerprint can read a stable `sub`. */
function fakeJwt(sub: string, expiresAtMs: number): string {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  return `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({ sub, exp: Math.floor(expiresAtMs / 1000) })}.sig`
}

/** Outcome queued for the next session authorize() call (default: granted). */
interface SessionHarness {
  /** Counts every observable cloud interaction. */
  calls: { session: number, credential: number, transport: number }
  outcome: () => ProjectionStreamSessionResult
  setOutcome: (result: ProjectionStreamSessionResult) => void
  port: {
    authorize: (auth: { headers: Record<string, string>, tokenExpiry: number, activationId: string }) => Promise<ProjectionStreamSessionResult>
    hasValidGrant: () => boolean
    readonly currentGrant: { grant: string, expiresAt: number } | null
    clearGrant: () => void
  }
}

function makeSessionHarness(grantExpiry: () => number = () => GRANT_EXPIRY): SessionHarness {
  let outcome: ProjectionStreamSessionResult = {
    kind: 'granted',
    grant: 'grant-opaque-1',
    grantExpiresAt: GRANT_EXPIRY,
  }
  let held: { grant: string, expiresAt: number } | null = null
  const calls = { session: 0, credential: 0, transport: 0 }
  return {
    calls,
    outcome: () => outcome,
    setOutcome: (result) => {
      outcome = result
    },
    port: {
      authorize: async () => {
        calls.session += 1
        held = outcome.kind === 'granted'
          ? { grant: outcome.grant, expiresAt: grantExpiry() }
          : null
        return outcome
      },
      hasValidGrant: () => held !== null,
      get currentGrant() {
        return held
      },
      clearGrant: () => {
        held = null
      },
    },
  }
}

interface ManagerHarness {
  manager: ProjectionStreamManager
  connections: MockConnection[]
  changes: string[]
  session: SessionHarness
  timers: Array<{ ms: number, fn: () => void }>
  fireTimers: () => void
  advanceClockAndFire: (ms: number) => void
  credentialIdentity: () => string
  setCredentialIdentity: (identity: string) => void
  setCredentialAvailable: (available: boolean) => void
}

describe('ProjectionStreamManager', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-stream-mgr-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  /** Build a manager against the new session/state contract. */
  function makeManager(): ManagerHarness {
    const { transport, connections } = makeMockTransport()
    const session = makeSessionHarness()
    const changes: string[] = []
    const timers: Array<{ ms: number, fn: () => void }> = []
    let credentialIdentity = 'user@example.com'
    let clock = NOW
    let credentialAvailable = true
    const harness: ManagerHarness = {
      connections,
      changes,
      session,
      timers,
      fireTimers: () => {
        const pending = [...timers]
        timers.length = 0
        for (const t of pending) {
          clock += t.ms
          t.fn()
        }
      },
      advanceClockAndFire: (ms: number) => {
        clock += ms
        harness.fireTimers()
      },
      credentialIdentity: () => credentialIdentity,
      setCredentialIdentity: (identity: string) => {
        credentialIdentity = identity
      },
      setCredentialAvailable: (available: boolean) => {
        credentialAvailable = available
      },
      manager: undefined as unknown as ProjectionStreamManager,
    }
    harness.manager = new ProjectionStreamManager({
      clientFactory: (opts) => {
        harness.session.calls.transport += 1
        return new CloudProjectionStreamClient({ ...opts, transport })
      },
      readModelFactory: (localProjectId, rootDir) =>
        new CloudProjectionReadModel({ rootDir: rootDir ?? root, localProjectId }),
      onChange: cloudProjectId => changes.push(cloudProjectId),
      sessionClientFactory: () => session.port,
      credentialResolver: async () => {
        harness.session.calls.credential += 1
        if (!credentialAvailable)
          return null
        return {
          headers: { 'cf-access-token': fakeJwt(credentialIdentity, NOW + 3_600_000) },
          tokenExpiry: NOW + 3_600_000,
        }
      },
      now: () => clock,
      scheduler: (ms, fn) => {
        timers.push({ ms, fn })
        return timers.length - 1
      },
      cancelScheduled: () => {},
    })
    return harness
  }

  function startOpts(overrides: Partial<{ localProjectId: string, cloudProjectId: string, serviceOrigin: string }> = {}) {
    return {
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      rootDir: root,
      ...overrides,
    }
  }

  it('opens exactly one stream per enabled project (C-5, BR-1.6)', async () => {
    const harness = makeManager()
    await harness.manager.start(startOpts())
    expect(harness.manager.openStreamCount).toBe(1)
    expect(harness.manager.hasStream('project-a')).toBe(true)
    expect(harness.connections).toHaveLength(1)
  })

  it('additional browser-tab mounts do not add streams (BR-1.6, tab-independence)', async () => {
    const harness = makeManager()
    await harness.manager.start(startOpts())
    // A second "tab mount" calls start again for the same project.
    await harness.manager.start(startOpts())
    expect(harness.manager.openStreamCount).toBe(1)
    expect(harness.connections).toHaveLength(1)
    expect(harness.session.calls.session).toBe(1)
  })

  it('coalesces concurrent starts before read-model load completes (C-13)', async () => {
    const { transport, connections } = makeMockTransport()
    const session = makeSessionHarness()
    let releaseLoad!: () => void
    const loadGate = new Promise<void>((resolve) => {
      releaseLoad = resolve
    })
    const manager = new ProjectionStreamManager({
      clientFactory: opts => new CloudProjectionStreamClient({ ...opts, transport }),
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
      sessionClientFactory: () => session.port,
      credentialResolver: async () => ({
        headers: { 'cf-access-token': 'token-xyz' },
        tokenExpiry: NOW + 3_600_000,
      }),
      now: () => NOW,
      scheduler: () => 0,
      cancelScheduled: () => {},
    })

    const first = manager.start(startOpts())
    const second = manager.start(startOpts())
    releaseLoad()
    await Promise.all([first, second])

    expect(manager.openStreamCount).toBe(1)
    expect(connections).toHaveLength(1)
  })

  it('different projects open independent streams', async () => {
    const harness = makeManager()
    await harness.manager.start(startOpts())
    await harness.manager.start(startOpts({ localProjectId: 'project-b', cloudProjectId: 'cloud-b' }))
    expect(harness.manager.openStreamCount).toBe(2)
    expect(harness.connections).toHaveLength(2)
  })

  it('acks only after read-model state+cursor persistence (C-6, Edge-1)', async () => {
    const harness = makeManager()
    await harness.manager.start(startOpts())
    const conn = harness.connections[0]!
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
    await harness.manager.whenIdle()

    // An ack was sent only after persistence.
    expect(conn.sent).toHaveLength(1)
    const ack = JSON.parse(conn.sent[0]!)
    expect(ack).toEqual({ kind: 'ack', cloudProjectId: 'cloud-a', projectRevision: 6 })
  })

  it('ready advances the cursor and acks the high-water revision', async () => {
    const harness = makeManager()
    await harness.manager.start(startOpts())
    const conn = harness.connections[0]!
    conn.emit(JSON.stringify({ kind: 'ready', cloudProjectId: 'cloud-a', projectRevision: 10 }))
    await flushUntil(() => conn.sent.length > 0)
    await harness.manager.whenIdle()

    const readModel = harness.manager.getReadModel('project-a')!
    expect(readModel.appliedCursor).toBe(10)
    expect(readModel.live).toBe(true)
    expect(JSON.parse(conn.sent[0]!)).toEqual({ kind: 'ack', cloudProjectId: 'cloud-a', projectRevision: 10 })
  })

  it('marks stale on stream close and keeps entries (BR-1.5, SC-5)', async () => {
    const harness = makeManager()
    await harness.manager.start(startOpts())
    const conn = harness.connections[0]!
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
    await harness.manager.whenIdle()

    const readModel = harness.manager.getReadModel('project-a')!
    expect(readModel.entries()).toHaveLength(1)

    conn.simulateClose()
    expect(readModel.live).toBe(false)
    // Entries remain visible while stale.
    expect(readModel.entries()).toHaveLength(1)
  })

  it('stop removes the stream and stopAll clears all', async () => {
    const harness = makeManager()
    await harness.manager.start(startOpts())
    expect(harness.manager.openStreamCount).toBe(1)
    harness.manager.stop('project-a')
    expect(harness.manager.openStreamCount).toBe(0)
    expect(harness.manager.hasStream('project-a')).toBe(false)

    await harness.manager.start(startOpts())
    harness.manager.stopAll()
    expect(harness.manager.openStreamCount).toBe(0)
  })
})

describe('TEST-stream-handshake-failure-classification', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-stream-fail-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function startOpts() {
    return {
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      rootDir: root,
    }
  }

  it('a typed 404/403/401 denial persists an authorization pause and opens no transport (C-14)', async () => {
    const harness = makeFailureHarness(root)
    harness.session.setOutcome({ kind: 'authorization_required', reasonCode: 'project_not_found' })
    await harness.manager.start(startOpts())

    expect(harness.connections).toHaveLength(0)
    const status = harness.manager.getStatus('project-a')
    expect(status?.state).toBe('authorization_required')
    expect(status?.reasonCode).toBe('project_not_found')
    expect(status?.lastTransitionAt).toBeGreaterThan(0)
  })

  it('a 426/protocol mismatch persists an incompatible pause (C-14)', async () => {
    const harness = makeFailureHarness(root)
    harness.session.setOutcome({ kind: 'incompatible', reasonCode: 'incompatible_protocol' })
    await harness.manager.start(startOpts())

    expect(harness.connections).toHaveLength(0)
    const status = harness.manager.getStatus('project-a')
    expect(status?.state).toBe('incompatible')
    expect(status?.reasonCode).toBe('incompatible_protocol')
  })

  it('a missing credential persists an authentication pause without a session request (C-14, Edge-7)', async () => {
    const harness = makeFailureHarness(root, { credentialAvailable: false })
    await harness.manager.start(startOpts())

    expect(harness.session.calls.session).toBe(0)
    expect(harness.connections).toHaveLength(0)
    expect(harness.manager.getStatus('project-a')?.state).toBe('authentication_required')
  })

  it('elapsed time, browser activity, and restart create no new session or transport for a terminal pause (C-15)', async () => {
    const harness = makeFailureHarness(root)
    harness.session.setOutcome({ kind: 'authorization_required', reasonCode: 'project_not_found' })
    await harness.manager.start(startOpts())
    expect(harness.session.calls.session).toBe(1)

    // Time passes and every scheduled timer fires.
    harness.advanceClockAndFire(60_000)
    harness.advanceClockAndFire(3_600_000)
    // Browser activity: repeated tab mounts.
    await harness.manager.start(startOpts())
    await harness.manager.start(startOpts())
    // Repeated status reads.
    harness.manager.getStatus('project-a')
    harness.manager.getStatus('project-a')
    expect(harness.session.calls.session).toBe(1)
    expect(harness.session.calls.credential).toBe(1)
    expect(harness.connections).toHaveLength(0)

    // Server restart: a brand-new manager over the same persisted state.
    const restarted = makeFailureHarness(root, { reuseSession: harness.session })
    await restarted.manager.start(startOpts())
    expect(restarted.session.calls.session).toBe(1)
    expect(restarted.connections).toHaveLength(0)
    expect(restarted.manager.getStatus('project-a')?.state).toBe('authorization_required')
  })

  it('only an approved re-arm event retries: operator retry issues a new session call (C-14, C-15)', async () => {
    const harness = makeFailureHarness(root)
    harness.session.setOutcome({ kind: 'authorization_required', reasonCode: 'forbidden' })
    await harness.manager.start(startOpts())
    expect(harness.session.calls.session).toBe(1)

    harness.session.setOutcome({
      kind: 'granted',
      grant: 'grant-opaque-2',
      grantExpiresAt: NOW + 600_000,
    })
    await harness.manager.retry('project-a')

    expect(harness.session.calls.session).toBe(2)
    expect(harness.connections).toHaveLength(1)
    expect(harness.manager.getStatus('project-a')?.state).toBe('connecting')
  })

  it('a throwing session client is classified transient and never crashes activation', async () => {
    // Regression: the origin-allowlist fail-closed guard throws synchronously;
    // a fire-and-forget re-arm must settle inside the transient budget instead
    // of rejecting (which crashed the whole server on 2026-08-15).
    const { transport } = makeMockTransport()
    const throwingPort: SessionHarness['port'] = {
      authorize: async () => {
        throw new Error('cloud serviceUrl is not on the operator allowlist (empty_allowlist)')
      },
      hasValidGrant: () => false,
      get currentGrant() {
        return null
      },
      clearGrant: () => {},
    }
    const manager = new ProjectionStreamManager({
      clientFactory: opts => new CloudProjectionStreamClient({ ...opts, transport }),
      readModelFactory: (localProjectId, rootDir) =>
        new CloudProjectionReadModel({ rootDir: rootDir ?? root, localProjectId }),
      onChange: () => {},
      sessionClientFactory: () => throwingPort,
      credentialResolver: async () => ({
        headers: { 'cf-access-token': fakeJwt('user@example.com', NOW + 3_600_000) },
        tokenExpiry: NOW + 3_600_000,
      }),
      now: () => NOW,
      scheduler: () => 0,
      cancelScheduled: () => {},
    })

    await expect(manager.start(startOpts())).resolves.toBeUndefined()
    expect(manager.getStatus('project-a')?.state).toBe('connecting')
    expect(manager.getStatus('project-a')?.reasonCode).toContain('session_client_error')
  })

  it('a foreground credential resolution re-arms only authentication_required pauses (owner action)', async () => {
    const harness = makeFailureHarness(root, { credentialAvailable: false })
    await harness.manager.start(startOpts())
    expect(harness.manager.getStatus('project-a')?.state).toBe('authentication_required')
    expect(harness.session.calls.session).toBe(0)

    // The owner action: a foreground resolve makes the credential available.
    harness.setCredentialAvailable(true)
    harness.session.setOutcome({
      kind: 'granted',
      grant: 'grant-owner-action',
      grantExpiresAt: NOW + 600_000,
    })
    await harness.manager.notifyCredentialResolved('https://mdt-sync.example.com')

    expect(harness.session.calls.session).toBe(1)
    expect(harness.connections).toHaveLength(1)
    expect(harness.manager.getStatus('project-a')?.state).toBe('connecting')

    // A membership pause on the same origin is NOT re-armed by credentials.
    harness.session.setOutcome({ kind: 'authorization_required', reasonCode: 'forbidden' })
    await harness.manager.notifyCredentialResolved('https://mdt-sync.example.com')
    expect(harness.session.calls.session).toBe(1)
  })

  it('a foreground credential resolution re-arms a stale_offline activation (transport exhaustion)', async () => {
    const harness = makeFailureHarness(root)
    harness.session.setOutcome({ kind: 'transient_failure', reasonCode: 'coordination_unavailable' })
    await harness.manager.start(startOpts())
    for (let i = 0; i < 30; i++) {
      await flushUntil(() =>
        harness.timers.length > 0
        || harness.manager.getStatus('project-a')?.state === 'stale_offline')
      if (harness.timers.length === 0)
        break
      harness.fireTimers()
    }
    await harness.manager.whenIdle()
    expect(harness.manager.getStatus('project-a')?.state).toBe('stale_offline')

    harness.session.setOutcome({
      kind: 'granted',
      grant: 'grant-after-exhaustion',
      grantExpiresAt: NOW + 600_000,
    })
    await harness.manager.notifyCredentialResolved('https://mdt-sync.example.com')

    expect(harness.connections).toHaveLength(1)
    expect(harness.manager.getStatus('project-a')?.state).toBe('connecting')
  })

  it('a credential-source change re-arms automatically (fingerprint change)', async () => {
    const harness = makeFailureHarness(root)
    harness.session.setOutcome({ kind: 'authorization_required', reasonCode: 'forbidden' })
    await harness.manager.start(startOpts())
    expect(harness.session.calls.session).toBe(1)

    // New manager after a credential switch (different principal) + restart.
    harness.setCredentialIdentity('service-token-identity')
    harness.session.setOutcome({
      kind: 'granted',
      grant: 'grant-opaque-3',
      grantExpiresAt: NOW + 600_000,
    })
    const restarted = makeFailureHarness(root, { reuseSession: harness.session, credentialIdentity: 'service-token-identity' })
    await restarted.manager.start(startOpts())
    expect(restarted.session.calls.session).toBe(2)
    expect(restarted.connections).toHaveLength(1)
  })

  it('a transient failure consumes the persisted budget and then settles offline without timers (C-15)', async () => {
    const harness = makeFailureHarness(root)
    harness.session.setOutcome({ kind: 'transient_failure', reasonCode: 'coordination_unavailable' })
    await harness.manager.start(startOpts())
    // Burn the whole bounded budget through the fake scheduler, flushing the
    // async activation chain between rounds.
    for (let i = 0; i < 30; i++) {
      await flushUntil(() =>
        harness.timers.length > 0
        || harness.manager.getStatus('project-a')?.state === 'stale_offline')
      if (harness.timers.length === 0)
        break
      harness.fireTimers()
    }

    const status = harness.manager.getStatus('project-a')
    expect(status?.state).toBe('stale_offline')
    // Settled: no timer is pending anymore.
    expect(harness.timers).toHaveLength(0)

    // Restart does not reactivate an exhausted budget on its own: wait for
    // the activation chain to settle, as a real process exit would.
    await harness.manager.whenIdle()
    const callsBefore = harness.session.calls.session
    const restarted = makeFailureHarness(root, { reuseSession: harness.session })
    await restarted.manager.start(startOpts())
    await restarted.manager.whenIdle()
    expect(restarted.manager.getStatus('project-a')?.state).toBe('stale_offline')
    expect(harness.session.calls.session).toBe(callsBefore)
  })
})

describe('TEST-stream-status-local-only', () => {
  let root: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-stream-status-'))
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function startOpts() {
    return {
      localProjectId: 'project-a',
      cloudProjectId: 'cloud-a',
      serviceOrigin: 'https://mdt-sync.example.com',
      rootDir: root,
    }
  }

  it('repeated status reads return actionable local state and make no cloud call (BR-1.5, C-11, C-15)', async () => {
    const harness = makeFailureHarness(root)
    harness.session.setOutcome({ kind: 'authorization_required', reasonCode: 'project_not_found' })
    await harness.manager.start(startOpts())
    const before = { ...harness.session.calls }

    for (let i = 0; i < 5; i++) {
      const status = harness.manager.getStatus('project-a')
      expect(status).toBeDefined()
      expect(typeof status?.state).toBe('string')
      expect(typeof status?.reasonCode).toBe('string')
      expect(typeof status?.lastTransitionAt).toBe('number')
      expect(['none', 'await_reconnect', 'operator_retry', 'rearm']).toContain(status?.nextAction)
    }

    expect(harness.session.calls).toEqual(before)
  })

  it('status for an unknown project returns null without side effects', () => {
    const harness = makeFailureHarness(root)
    expect(harness.manager.getStatus('never-started')).toBeNull()
    expect(harness.session.calls.session).toBe(0)
  })

  it('status reflects live state and lastLiveAt after catch-up completes', async () => {
    const harness = makeFailureHarness(root)
    await harness.manager.start(startOpts())
    const conn = harness.connections[0]!
    conn.emit(JSON.stringify({ kind: 'ready', cloudProjectId: 'cloud-a', projectRevision: 10 }))
    await flushUntil(() => harness.manager.getStatus('project-a')?.state === 'live')
    await harness.manager.whenIdle()

    const status = harness.manager.getStatus('project-a')
    expect(status?.state).toBe('live')
    expect(status?.nextAction).toBe('none')
    expect(status?.lastLiveAt).toBeGreaterThan(0)
    expect(harness.session.calls.session).toBe(1)
  })
})

/** Failure-classification/status harness: shared shape with the main harness. */
function makeFailureHarness(
  root: string,
  opts: { credentialAvailable?: boolean, reuseSession?: SessionHarness, credentialIdentity?: string } = {},
): ManagerHarness {
  const { transport, connections } = makeMockTransport()
  const session = opts.reuseSession ?? makeSessionHarness()
  const changes: string[] = []
  const timers: Array<{ ms: number, fn: () => void }> = []
  let credentialIdentity = opts.credentialIdentity ?? 'user@example.com'
  let clock = NOW
  let credentialAvailable = opts.credentialAvailable !== false
  const harness: ManagerHarness = {
    connections,
    changes,
    session,
    timers,
    fireTimers: () => {
      const pending = [...timers]
      timers.length = 0
      for (const t of pending) {
        clock += t.ms
        t.fn()
      }
    },
    advanceClockAndFire: (ms: number) => {
      clock += ms
      harness.fireTimers()
    },
    credentialIdentity: () => credentialIdentity,
    setCredentialIdentity: (identity: string) => {
      credentialIdentity = identity
    },
    setCredentialAvailable: (available: boolean) => {
      credentialAvailable = available
    },
    manager: undefined as unknown as ProjectionStreamManager,
  }
  harness.manager = new ProjectionStreamManager({
    clientFactory: (clientOpts) => {
      session.calls.transport += 1
      return new CloudProjectionStreamClient({ ...clientOpts, transport })
    },
    readModelFactory: (localProjectId, rootDir) =>
      new CloudProjectionReadModel({ rootDir: rootDir ?? root, localProjectId }),
    onChange: cloudProjectId => changes.push(cloudProjectId),
    sessionClientFactory: () => session.port,
    credentialResolver: async () => {
      session.calls.credential += 1
      if (!credentialAvailable)
        return null
      return {
        headers: { 'cf-access-token': fakeJwt(credentialIdentity, NOW + 3_600_000) },
        tokenExpiry: NOW + 3_600_000,
      }
    },
    now: () => clock,
    scheduler: (ms, fn) => {
      timers.push({ ms, fn })
      return timers.length - 1
    },
    cancelScheduled: () => {},
  })
  return harness
}
