/**
 * TEST-no-fallback — covers BR-1.5, BR-4.2, BR-5.1.
 *
 * Verifies the live TicketService.createCR path against the MDT-201 CONFIG_DIR
 * connection model:
 *   - Absent connection → local highest+1 scan (BR-5.1, unchanged).
 *   - Enabled connection with no coordinator/credential → fail closed; NEVER
 *     falls back to local numbering (BR-1.5).
 *   - Disabled connection → fail closed; disable never resumes local (BR-4.2).
 *   - Malformed connection → fail closed.
 *
 * The legacy `[project.cloudSync]` repo binding is no longer read; connection
 * state is seeded under a temp CONFIG_DIR via ProjectStateStore.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  CLOUD_SYNC_CONNECTION_VERSION,
  CloudSyncConnectionState,
  CoordinatorError,
  type CloudSyncConnection,
} from '@mdt/domain-contracts'
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'

import {
  CloudTicketNumberAllocator,
  FailClosedCloudAllocator,
  LocalTicketNumberAllocator,
  bindingFromEnabledConnection,
} from '../allocator-strategy'
import { validateProjectBinding } from '../config'
import { TicketService } from '../../TicketService'
import type { Project } from '../../../models/Project'
import { ProjectStateStore } from '../project-state-store'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'
import { DISTRIBUTION_CLOUD_SYNC_ORIGINS } from '../config'

/* eslint-disable ts/no-explicit-any -- minimal fake project records for in-process tests */

const TRUSTED_ORIGIN = DISTRIBUTION_CLOUD_SYNC_ORIGINS[0]!

/** Minimal Project record sufficient for TicketService.createCR. */
function fakeProject(projectPath: string, code = 'MDT'): Project {
  return {
    id: 'test-project',
    project: {
      id: 'test-project',
      name: 'Test Project',
      code,
      path: projectPath,
      configFile: join(projectPath, '.mdt-config.toml'),
      active: true,
      description: '',
      repository: '',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2026-01-01',
      lastAccessed: '2026-01-01',
      version: '1',
    },
  } as any
}

/** Write a minimal .mdt-config.toml (project metadata only — NO cloud state). */
async function writeConfig(projectPath: string): Promise<void> {
  const toml = [
    '[project]',
    'name = "Test Project"',
    'code = "MDT"',
    'ticketsPath = "docs/CRs"',
    'startNumber = 1',
  ].join('\n')
  await writeFile(join(projectPath, '.mdt-config.toml'), toml, 'utf8')
}

/** Seed existing CR files so the local scan returns a deterministic highest. */
async function seedCRs(projectPath: string, numbers: number[], code = 'MDT'): Promise<void> {
  const crDir = join(projectPath, 'docs', 'CRs')
  for (const n of numbers) {
    await writeFile(join(crDir, `${code}-${String(n).padStart(3, '0')}-seed.md`), '# seed\n', 'utf8')
  }
}

/** Build a ProjectStateStore rooted at a temp CONFIG_DIR with the trusted profile. */
function makeStateStore(configDir: string): ProjectStateStore {
  return new ProjectStateStore({
    rootDir: configDir,
    profile: resolveTrustedServiceProfile({ operatorOrigins: [] }),
  })
}

function enabledConnection(overrides: Partial<CloudSyncConnection> = {}): CloudSyncConnection {
  return {
    version: CLOUD_SYNC_CONNECTION_VERSION,
    state: CloudSyncConnectionState.ENABLED,
    cloudProjectId: 'cloud-project-1',
    serviceOrigin: TRUSTED_ORIGIN,
    pollIntervalSeconds: 15,
    ...overrides,
  }
}

describe('isolated allocator strategies (regression guard)', () => {
  it('local allocator uses the scan and returns a local number', async () => {
    let called = false
    const local = new LocalTicketNumberAllocator(async () => {
      called = true
      return 42
    })
    const outcome = await local.allocate()
    expect(called).toBe(true)
    expect(outcome.kind).toBe('local')
    if (outcome.kind === 'local') {
      expect(outcome.ticketNumber).toBe(42)
    }
  })

  it('cloud allocator with no credential throws authentication_required (no fallback)', async () => {
    const coordinator = {
      reserve: async () => { throw new Error('should not be called') },
      acknowledge: async () => ({ acknowledged: true as const, projectionVersion: 1, projectRevision: 1, replayed: false }),
    }
    const allocator = new CloudTicketNumberAllocator(coordinator, null, {
      cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h',
    })
    await expect(allocator.allocate()).rejects.toThrow(CoordinatorError)
    try {
      await allocator.allocate()
    }
    catch (e) {
      expect((e as CoordinatorError).code).toBe('authentication_required')
    }
  })

  it('cloud allocator with coordinator_unavailable throws (no local fallback)', async () => {
    const coordinator = {
      reserve: async () => { throw new CoordinatorError('coordination_unavailable') },
      acknowledge: async () => ({ acknowledged: true as const, projectionVersion: 1, projectRevision: 1, replayed: false }),
    }
    const allocator = new CloudTicketNumberAllocator(
      coordinator, { kind: 'human', cfAccessToken: 'tok' }, { cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' },
    )
    await expect(allocator.allocate()).rejects.toThrow('coordination_unavailable')
  })

  it('cloud allocator with a successful reservation returns a cloud outcome', async () => {
    const coordinator = {
      reserve: async () => ({
        reservationId: 'res-1', ticketNumber: 201, state: 'reserved', replayed: false,
      }),
      acknowledge: async () => ({ acknowledged: true as const, projectionVersion: 1, projectRevision: 1, replayed: false }),
    }
    const allocator = new CloudTicketNumberAllocator(
      coordinator, { kind: 'human', cfAccessToken: 'tok' }, { cloudProjectId: 'p1', idempotencyKey: 'k', requestHash: 'h' },
    )
    const outcome = await allocator.allocate()
    expect(outcome.kind).toBe('cloud')
    if (outcome.kind === 'cloud') {
      expect(outcome.reservation.ticketNumber).toBe(201)
    }
  })

  it('bindingFromEnabledConnection maps the connection fields onto the legacy binding shape', () => {
    const binding = bindingFromEnabledConnection(enabledConnection({ cloudProjectId: 'uuid-9', pollIntervalSeconds: 30 }))
    expect(binding.enabled).toBe(true)
    expect(binding.projectId).toBe('uuid-9')
    expect(binding.serviceUrl).toBe(TRUSTED_ORIGIN)
    expect(binding.pollIntervalSeconds).toBe(30)
  })

  it('fail-closed allocator throws authentication_required and never returns a number', async () => {
    const binding = bindingFromEnabledConnection(enabledConnection())
    const allocator = new FailClosedCloudAllocator(binding)
    await expect(allocator.allocate()).rejects.toThrow(CoordinatorError)
    try {
      await allocator.allocate()
    }
    catch (e) {
      expect((e as CoordinatorError).code).toBe('authentication_required')
    }
  })

  it('validateProjectBinding still guards the legacy migration-input shape', () => {
    expect(() => validateProjectBinding({ enabled: true })).toThrow()
    expect(validateProjectBinding({
      enabled: true, projectId: 'p1', serviceUrl: TRUSTED_ORIGIN, pollIntervalSeconds: 15,
    }).projectId).toBe('p1')
  })
})

describe('TicketService.createCR: CONFIG_DIR connection selection end-to-end (BR-1.5 / BR-4.2 / BR-5.1)', () => {
  let projectPath: string
  let configDir: string

  beforeEach(async () => {
    projectPath = await mkdtemp(join(tmpdir(), 'mdt-nofallback-proj-'))
    configDir = await mkdtemp(join(tmpdir(), 'mdt-nofallback-cfg-'))
    await mkdir(join(projectPath, 'docs', 'CRs'), { recursive: true })
    await writeConfig(projectPath)
  })

  afterEach(async () => {
    await rm(projectPath, { recursive: true, force: true })
    await rm(configDir, { recursive: true, force: true })
  })

  it('absent connection: local highest+1 scan, unchanged (BR-5.1)', async () => {
    await seedCRs(projectPath, [1, 2, 5]) // highest = 5 -> next = 6

    const svc = new TicketService(true, { stateStoreRoot: configDir })
    const ticket = await svc.createCR(fakeProject(projectPath), 'Feature Enhancement', {
      title: 'New Thing',
      type: 'Feature Enhancement',
    })

    expect(ticket.code).toMatch(/MDT-006/)
    expect(ticket.code).not.toMatch(/MDT-007/)
  })

  it('enabled connection with no coordinator/credential fails closed — NEVER a local number (BR-1.5)', async () => {
    await seedCRs(projectPath, [2]) // a local number WOULD be 3 if it fell back
    await makeStateStore(configDir).write('test-project', enabledConnection())

    const svc = new TicketService(true, { stateStoreRoot: configDir })
    await expect(
      svc.createCR(fakeProject(projectPath), 'Feature Enhancement', {
        title: 'Cloud Bound',
        type: 'Feature Enhancement',
      }),
    ).rejects.toThrow(CoordinatorError)
  })

  it('disabled connection fails closed — disable never resumes local numbering (BR-4.2)', async () => {
    await seedCRs(projectPath, [3]) // a local number WOULD be 4 if it resumed
    await makeStateStore(configDir).write('test-project', { ...enabledConnection(), state: CloudSyncConnectionState.DISABLED })

    const svc = new TicketService(true, { stateStoreRoot: configDir })
    await expect(
      svc.createCR(fakeProject(projectPath), 'Feature Enhancement', {
        title: 'Disabled',
        type: 'Feature Enhancement',
      }),
    ).rejects.toThrow(CoordinatorError)
    // And no local ticket was written: the only file is the seed we planted.
    const { readdir } = await import('node:fs/promises')
    const files = await readdir(join(projectPath, 'docs', 'CRs'))
    expect(files).toEqual(['MDT-003-seed.md'])
  })

  it('malformed connection file fails closed (BR-4.2)', async () => {
    await seedCRs(projectPath, [10])
    // Hand-write a malformed connection file directly.
    await mkdir(join(configDir, 'projects', 'test-project'), { recursive: true })
    await writeFile(
      join(configDir, 'projects', 'test-project', 'cloud-sync.toml'),
      'version = 1\nstate = "enabled"\n', // missing cloudProjectId/serviceOrigin
    )

    const svc = new TicketService(true, { stateStoreRoot: configDir })
    await expect(
      svc.createCR(fakeProject(projectPath), 'Feature Enhancement', {
        title: 'Malformed',
        type: 'Feature Enhancement',
      }),
    ).rejects.toThrow(CoordinatorError)
  })
})
