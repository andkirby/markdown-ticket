/**
 * TEST-ticketservice-config-dir-cutover — proves the MDT-201 CONFIG_DIR
 * connection model is actually reachable from the live TicketService.createCR
 * path (the gap left open when the new model was built but unwired).
 *
 * Drives the REAL TicketService (no mock at the service boundary) with an
 * injected coordinator/credential and a temp CONFIG_DIR seeded via
 * ProjectStateStore:
 *   - absent connection  → local highest+1 number.
 *   - enabled connection → cloud-reserved number (from the injected coordinator).
 *   - disabled connection → CoordinatorError, no local number (BR-4.2).
 *
 * This is the test that fails the moment the cutover regresses (e.g. someone
 * re-adds a `[project.cloudSync]` read, or the stateStoreRoot injection breaks).
 */

import type {
  AcknowledgeReservationRequest,
  CloudCredential,
  CloudSyncCoordinator,
  Project,
} from '@mdt/domain-contracts'
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { CoordinatorError } from '@mdt/domain-contracts'

import { TicketService } from '../../TicketService'
import { DISTRIBUTION_CLOUD_SYNC_ORIGINS } from '../config'
import { ProjectStateStore } from '../project-state-store'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'

const TRUSTED_ORIGIN = DISTRIBUTION_CLOUD_SYNC_ORIGINS[0]!
const PROJECT_ID = 'cutover-project'

describe('TicketService CONFIG_DIR cutover (TEST-ticketservice-config-dir-cutover)', () => {
  let root: string
  let projectPath: string
  let configDir: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mdt-cutover-'))
    projectPath = join(root, 'project')
    configDir = join(root, 'configdir')
    await mkdir(join(projectPath, 'docs', 'CRs'), { recursive: true })
    await mkdir(configDir, { recursive: true })
    await writeFile(
      join(projectPath, '.mdt-config.toml'),
      '[project]\nname = "Cutover"\ncode = "MDT"\npath = "."\nticketsPath = "docs/CRs"\nstartNumber = 1\n',
    )
  })

  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  function fakeProject(): Project {
    return {
      id: PROJECT_ID,
      project: {
        id: PROJECT_ID,
        name: 'Cutover',
        code: 'MDT',
        path: projectPath,
        configFile: join(projectPath, '.mdt-config.toml'),
        active: true,
        description: '',
        repository: '',
        ticketsPath: 'docs/CRs',
        startNumber: 1,
      },
      metadata: {
        dateRegistered: '2026-01-01',
        lastAccessed: '2026-01-01',
        version: '1',
      },
    } as Project
  }

  async function seedConnection(state: 'enabled' | 'disabled'): Promise<void> {
    const store = new ProjectStateStore({
      rootDir: configDir,
      profile: resolveTrustedServiceProfile({ operatorOrigins: [] }),
    })
    await store.write(PROJECT_ID, {
      version: 1,
      state,
      cloudProjectId: 'cloud-uuid-1',
      serviceOrigin: TRUSTED_ORIGIN,
      pollIntervalSeconds: 15,
    })
  }

  /** Build a TicketService whose coordinator reserves a fixed cloud number. */
  function serviceWithCloudNumber(cloudNumber: number) {
    const reserve = jest.fn(async () => ({
      reservationId: `res-${cloudNumber}`,
      ticketNumber: cloudNumber,
      state: 'reserved',
      replayed: false,
    }))
    const acknowledge = jest.fn(async (_req: AcknowledgeReservationRequest) => ({
      acknowledged: true as const,
      projectionVersion: 1,
      projectRevision: 1,
      replayed: false,
    }))
    const coordinator: CloudSyncCoordinator = { reserve, acknowledge }
    const credential: CloudCredential = { kind: 'human', cfAccessToken: 'tok' }
    const service = new TicketService(true, {
      stateStoreRoot: configDir,
      journalRoot: join(root, 'journals'),
      credentialProvider: { resolve: async () => credential },
      coordinatorFactory: () => coordinator,
    })
    return { service, reserve, acknowledge }
  }

  it('absent connection: createCR uses the local highest+1 scan', async () => {
    // Seed local CRs so highest = 5 → next local = 6.
    for (const n of [1, 2, 5]) {
      await writeFile(join(projectPath, 'docs', 'CRs', `MDT-${String(n).padStart(3, '0')}-seed.md`), '# seed\n')
    }
    // No CONFIG_DIR connection seeded → absent.

    const { service, reserve } = serviceWithCloudNumber(999)
    const ticket = await service.createCR(fakeProject(), 'Feature Enhancement', {
      title: 'Local',
      type: 'Feature Enhancement',
    })

    expect(ticket.code).toBe('MDT-006') // local scan, NOT the cloud 999
    expect(reserve).not.toHaveBeenCalled()
  })

  it('enabled connection: createCR reserves through the cloud coordinator and writes the cloud number', async () => {
    await seedConnection('enabled')
    const { service, reserve, acknowledge } = serviceWithCloudNumber(42)

    const ticket = await service.createCR(fakeProject(), 'Feature Enhancement', {
      title: 'Cloud',
      type: 'Feature Enhancement',
    })

    expect(ticket.code).toBe('MDT-042') // the cloud-reserved number
    expect(reserve).toHaveBeenCalledTimes(1)
    // The reserve request carries the CONFIG_DIR connection's cloudProjectId.
    expect(reserve).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudProjectId: 'cloud-uuid-1',
        idempotencyKey: expect.any(String),
        requestHash: expect.any(String),
      }),
      expect.objectContaining({ kind: 'human' }),
    )
    expect(acknowledge).toHaveBeenCalledTimes(1)
  })

  it('disabled connection: createCR fails closed and writes no local ticket (BR-4.2)', async () => {
    await seedConnection('disabled')
    // Seed a local CR so a fallback WOULD produce MDT-002 if it regressed.
    await writeFile(join(projectPath, 'docs', 'CRs', 'MDT-001-seed.md'), '# seed\n')
    const { service, reserve } = serviceWithCloudNumber(42)

    await expect(
      service.createCR(fakeProject(), 'Feature Enhancement', {
        title: 'Disabled',
        type: 'Feature Enhancement',
      }),
    ).rejects.toThrow(CoordinatorError)

    // The cloud coordinator was never reached, and no local ticket was written.
    expect(reserve).not.toHaveBeenCalled()
    const files = await readdir(join(projectPath, 'docs', 'CRs'))
    expect(files).toEqual(['MDT-001-seed.md'])
  })

  it('an absent connection does not lie about cloud being enabled (pollCloudProjections)', async () => {
    const { service } = serviceWithCloudNumber(42)
    const result = await service.pollCloudProjections(fakeProject())
    expect(result.enabled).toBe(false)
    expect(result.items).toEqual([])
  })

  it('a disabled connection reports honestly as enabled-but-suspended, not local (pollCloudProjections)', async () => {
    await seedConnection('disabled')
    const { service } = serviceWithCloudNumber(42)
    const result = await service.pollCloudProjections(fakeProject())
    // Honest fail-closed: cloud IS configured (enabled:true) but suspended, with
    // no silent fallback to local polling.
    expect(result.enabled).toBe(true)
    expect(result.stale).toBe(true)
    expect(result.error).toBe('coordination_suspended')
  })
})
