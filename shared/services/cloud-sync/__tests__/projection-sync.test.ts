import type { ProjectedHeader } from '@mdt/domain-contracts'
import { mkdtempSync } from 'node:fs'
import { readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { CoordinatorError } from '@mdt/domain-contracts'
import { projectedHeaderHash } from '../create-orchestrator'
import { CloudProjectionSync } from '../projection-sync'

const previous: ProjectedHeader = {
  code: 'MDT-042',
  title: 'Ticket',
  status: 'Proposed',
  type: 'Feature Enhancement',
  priority: 'Medium',
  assignee: null,
  date_created: '2026-07-25T00:00:00Z',
  last_modified: '2026-07-25T00:00:00Z',
}
const next: ProjectedHeader = {
  ...previous,
  status: 'In Progress',
  last_modified: '2026-07-25T01:00:00Z',
}

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mdt-projection-sync-'))
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

function syncWith(client: {
  publish: jest.Mock
}) {
  return new CloudProjectionSync({
    binding: {
      enabled: true,
      projectId: 'p1',
      serviceUrl: 'https://mdt-sync.constantapp.org',
      pollIntervalSeconds: 15,
    },
    allowedOrigins: ['https://mdt-sync.constantapp.org'],
    journalRoot: root,
    physicalRepoPath: '/repo',
    credentialProvider: {
      resolve: async () => ({ kind: 'human' as const, cfAccessToken: 'token' }),
    },
    client: client as never,
  })
}

describe('durable projection sync (MDT-226: conditional PUT, no read-before-write)', () => {
  it('publishes a conditional PUT with the stored projectionVersion and clears on success', async () => {
    const client = {
      publish: jest.fn(async () => ({ projectionVersion: 2, projectRevision: 2 })),
    }
    const result = await syncWith(client).publish(42, previous, next, 'active')

    expect(result).toBe('synced')
    expect(client.publish).toHaveBeenCalledTimes(1)
    expect(client.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketNumber: 42,
        // No GET: reservationId is empty; version comes from stored state (0 for new).
        reservationId: '',
        expectedProjectionVersion: 0,
        contentHash: projectedHeaderHash(next),
        header: next,
        lifecycle: 'active',
      }),
      expect.objectContaining({ kind: 'human' }),
    )
    const files = (await readdir(root, { recursive: true })).filter(name => String(name).endsWith('.json'))
    expect(files).toEqual([])
  })

  it('records a conflict on 409 version mismatch (operator-visible)', async () => {
    const client = {
      publish: jest.fn(async () => {
        throw new CoordinatorError('projection_version_conflict', { currentVersion: 5 })
      }),
    }
    const result = await syncWith(client).publish(42, previous, next, 'active')
    expect(result).toBe('conflict')

    const files = (await readdir(root, { recursive: true })).map(String)
    const content = await readFile(join(root, files.find(name => name.endsWith('.json'))!), 'utf8')
    expect(content).toContain('"state": "conflict"')
  })

  it('classifies an absent projection as unmanaged (terminal, no retry)', async () => {
    const client = {
      publish: jest.fn(async () => {
        throw new CoordinatorError('projection_not_found')
      }),
    }
    const result = await syncWith(client).publish(42, previous, next, 'active')
    expect(result).toBe('unmanaged')

    const files = (await readdir(root, { recursive: true })).map(String)
    const content = await readFile(join(root, files.find(name => name.endsWith('.json'))!), 'utf8')
    expect(content).toContain('"state": "unmanaged"')
  })

  it('pauses authentication on forbidden/project_not_found', async () => {
    const client = {
      publish: jest.fn(async () => {
        throw new CoordinatorError('forbidden')
      }),
    }
    const result = await syncWith(client).publish(42, previous, next, 'active')
    expect(result).toBe('authentication_paused')
  })

  it('returns transient on network/5xx and keeps the entry pending', async () => {
    const client = {
      publish: jest.fn(async () => {
        throw new CoordinatorError('coordination_unavailable')
      }),
    }
    const result = await syncWith(client).publish(42, previous, next, 'active')
    expect(result).toBe('transient')

    const files = (await readdir(root, { recursive: true })).map(String)
    const content = await readFile(join(root, files.find(name => name.endsWith('.json'))!), 'utf8')
    expect(content).not.toContain('"state": "unmanaged"')
    expect(content).not.toContain('"state": "conflict"')
    // Body-free journal entry.
    expect(content).not.toContain('ticket body')
  })

  it('keeps a body-free pending journal when no credential is available', async () => {
    const sync = new CloudProjectionSync({
      binding: {
        enabled: true,
        projectId: 'p1',
        serviceUrl: 'https://mdt-sync.constantapp.org',
        pollIntervalSeconds: 15,
      },
      allowedOrigins: ['https://mdt-sync.constantapp.org'],
      journalRoot: root,
      physicalRepoPath: '/repo',
      credentialProvider: { resolve: async () => null },
      client: { publish: jest.fn() } as never,
    })
    const result = await sync.publish(42, previous, next, 'active')
    expect(result).toBe('authentication_paused')

    const files = (await readdir(root, { recursive: true }))
      .map(String)
      .filter(name => name.endsWith('.json'))
    expect(files).toHaveLength(1)
    const content = await readFile(join(root, files[0]), 'utf8')
    expect(content).toContain('"status": "In Progress"')
    expect(content).not.toContain('ticket body')
  })
})

describe('terminal entries do not generate further traffic (MDT-226 amplification fix)', () => {
  it('an unmanaged entry is classified once and skipped on flush (zero further publish calls)', async () => {
    const publish = jest.fn(async () => {
      throw new CoordinatorError('projection_not_found')
    })
    const sync = syncWith({ publish })
    await sync.publish(42, previous, next, 'active')
    expect(publish).toHaveBeenCalledTimes(1)

    // Second flush must NOT retry the terminal unmanaged entry.
    publish.mockClear()
    const result = await sync.flush()
    expect(publish).not.toHaveBeenCalled()
    expect(result.unmanaged).toBe(1)
    expect(result.synced).toBe(0)
  })

  it('a conflict entry adopts the server version, retries once, then is terminal on flush', async () => {
    // The mock throws on every call — the conflict-recovery retry also fails,
    // so the entry ends up terminal `conflict` with the adopted version preserved.
    const publish = jest.fn(async () => {
      throw new CoordinatorError('projection_version_conflict', { currentVersion: 5 })
    })
    const sync = syncWith({ publish })
    const result = await sync.publish(42, previous, next, 'active')
    expect(result).toBe('conflict')
    // Original attempt (v0) + one conflict-recovery retry (v5) = 2 calls.
    expect(publish).toHaveBeenCalledTimes(2)

    // The adopted version (5) is persisted for a future edit.
    const files = (await readdir(root, { recursive: true })).map(String)
    const content = await readFile(join(root, files.find(name => name.endsWith('.json'))!), 'utf8')
    expect(content).toContain('"projectionVersion": 5')

    // Terminal conflict — flush must NOT retry.
    publish.mockClear()
    const flushResult = await sync.flush()
    expect(publish).not.toHaveBeenCalled()
    expect(flushResult.conflicts).toBe(1)
  })

  it('recovers from a version conflict by adopting currentVersion and retrying', async () => {
    // First call: conflict at v0 (server has v5). Retry: success at v5.
    let call = 0
    const publish = jest.fn(async () => {
      call++
      if (call === 1)
        throw new CoordinatorError('projection_version_conflict', { currentVersion: 5 })
      return { projectionVersion: 6, projectRevision: 6 }
    })
    const sync = syncWith({ publish })
    const result = await sync.publish(42, previous, next, 'active')
    expect(result).toBe('synced')
    expect(publish).toHaveBeenCalledTimes(2)
    // Second call used the adopted version.
    expect(publish).toHaveBeenLastCalledWith(
      expect.objectContaining({ expectedProjectionVersion: 5 }),
      expect.anything(),
    )
    // Entry cleared on success.
    const files = (await readdir(root, { recursive: true })).filter(name => String(name).endsWith('.json'))
    expect(files).toEqual([])
  })
})

describe('lifecycle-aware publish (delete tombstone)', () => {
  it('publishes the lifecycle:deleted tombstone', async () => {
    const client = {
      publish: jest.fn(async () => ({ projectionVersion: 2, projectRevision: 2 })),
    }
    const result = await syncWith(client).publish(42, next, next, 'deleted')

    expect(result).toBe('synced')
    expect(client.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketNumber: 42,
        lifecycle: 'deleted',
        contentHash: projectedHeaderHash(next),
        header: next,
      }),
      expect.objectContaining({ kind: 'human' }),
    )
  })
})
