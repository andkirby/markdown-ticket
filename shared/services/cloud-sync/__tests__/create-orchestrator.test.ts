import type {
  AcknowledgeReservationRequest,
  CloudCredential,
  CloudSyncCoordinator,
  Project,
} from '@mdt/domain-contracts'
import { mkdir, readdir, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { CoordinatorError } from '@mdt/domain-contracts'
import { TicketService } from '../../TicketService'
import { ProjectStateStore } from '../project-state-store'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'
import { DISTRIBUTION_CLOUD_SYNC_ORIGINS } from '../config'

let root: string
let projectPath: string
let journalRoot: string
let configDir: string

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'mdt-cloud-create-'))
  projectPath = join(root, 'project')
  journalRoot = join(root, 'journals')
  configDir = join(root, 'configdir')
  await mkdir(join(projectPath, 'docs', 'CRs'), { recursive: true })
  await mkdir(configDir, { recursive: true })
  await writeFile(join(projectPath, '.mdt-config.toml'), `
[project]
name = "Cloud project"
code = "MDT"
path = "."
ticketsPath = "docs/CRs"
startNumber = 1
`.trim())
  // Seed the MDT-201 CONFIG_DIR connection (replaces the legacy
  // [project.cloudSync] repo block). The project id 'local-project' is the
  // localProjectId key; the distribution origin is trusted by default.
  const store = new ProjectStateStore({
    rootDir: configDir,
    profile: resolveTrustedServiceProfile({ operatorOrigins: [] }),
  })
  await store.write('local-project', {
    version: 1,
    state: 'enabled',
    cloudProjectId: 'cloud-project-1',
    serviceOrigin: DISTRIBUTION_CLOUD_SYNC_ORIGINS[0],
    pollIntervalSeconds: 15,
  })
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

function project(): Project {
  return {
    id: 'local-project',
    project: {
      id: 'local-project',
      name: 'Cloud project',
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
      dateRegistered: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      version: '1',
    },
  }
}

function harness() {
  const reserve = jest.fn(async () => ({
    reservationId: 'reservation-42',
    ticketNumber: 42,
    state: 'reserved',
    replayed: false,
  }))
  const acknowledge = jest.fn(async (_request: AcknowledgeReservationRequest) => ({
    acknowledged: true as const,
    projectionVersion: 1,
    projectRevision: 1,
    replayed: false,
  }))
  const coordinator: CloudSyncCoordinator = { reserve, acknowledge }
  const projectionClient = {
    get: jest.fn(async () => {
      const request = acknowledge.mock.calls.at(-1)?.[0]
      if (!request) {
        throw new Error('acknowledgement is required before projection update')
      }
      return {
        ...request.header,
        ticketNumber: 42,
        reservationId: 'reservation-42',
        lifecycle: 'active',
        projectRevision: 1,
        projectionVersion: 1,
        contentHash: request.contentHash,
      }
    }),
    poll: jest.fn(async () => ({ items: [], nextCursor: null, hasMore: false })),
    publish: jest.fn(async () => ({ projectionVersion: 2, projectRevision: 2 })),
  }
  const credential: CloudCredential = { kind: 'human', cfAccessToken: 'token' }
  const service = new TicketService(true, {
    journalRoot,
    stateStoreRoot: configDir,
    credentialProvider: { resolve: async () => credential },
    coordinatorFactory: () => coordinator,
    projectionClientFactory: () => projectionClient,
  })
  return { service, reserve, acknowledge, projectionClient }
}

describe('TicketService cloud-bound create orchestration', () => {
  it('reserves, writes the canonical Markdown, acknowledges its header, then clears the journal', async () => {
    const { service, reserve, acknowledge } = harness()
    const ticket = await service.createCR(project(), 'Feature Enhancement', {
      title: 'Cloud Bound',
      type: 'Feature Enhancement',
      content: 'Body remains local.',
    })

    expect(ticket.code).toBe('MDT-042')
    expect(reserve).toHaveBeenCalledTimes(1)
    expect(acknowledge).toHaveBeenCalledWith(
      expect.objectContaining({
        cloudProjectId: 'cloud-project-1',
        reservationId: 'reservation-42',
        contentHash: expect.any(String),
        header: expect.objectContaining({
          code: 'MDT-042',
          title: 'Cloud Bound',
          status: 'Proposed',
        }),
      }),
      expect.objectContaining({ kind: 'human' }),
    )
    expect(JSON.stringify(acknowledge.mock.calls)).not.toContain('Body remains local.')

    const journalFiles = await readdir(journalRoot, { recursive: true })
    expect(journalFiles.filter(file => String(file).endsWith('.json'))).toEqual([])
  })

  it('reuses the reservation after a local write conflict is fixed', async () => {
    const { service, reserve, acknowledge } = harness()
    const conflictingPath = join(projectPath, 'docs', 'CRs', 'MDT-042-cloud-bound.md')
    await writeFile(conflictingPath, 'different content')

    const input = {
      title: 'Cloud Bound',
      type: 'Feature Enhancement',
      content: 'Canonical body.',
    }
    await expect(service.createCR(project(), 'Feature Enhancement', input))
      .rejects.toMatchObject({ code: 'reservation_state_conflict' })
    expect(reserve).toHaveBeenCalledTimes(1)
    expect(acknowledge).not.toHaveBeenCalled()

    await unlink(conflictingPath)
    const recovered = await service.createCR(project(), 'Feature Enhancement', input)
    expect(recovered.code).toBe('MDT-042')
    expect(reserve).toHaveBeenCalledTimes(1)
    expect(acknowledge).toHaveBeenCalledTimes(1)
  })

  it('publishes a header-only projection after a local status update', async () => {
    const { service, projectionClient } = harness()
    await service.createCR(project(), 'Feature Enhancement', {
      title: 'Cloud Bound',
      type: 'Feature Enhancement',
      content: 'Body remains local.',
    })

    await service.updateCRStatus(project(), 'MDT-042', 'In Progress')

    expect(projectionClient.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketNumber: 42,
        lifecycle: 'active',
        header: expect.objectContaining({
          code: 'MDT-042',
          status: 'In Progress',
        }),
      }),
      expect.objectContaining({ kind: 'human' }),
    )
    expect(JSON.stringify(projectionClient.publish.mock.calls)).not.toContain('Body remains local.')
  })

  it('keeps an existing Markdown ticket editable while projection coordination is unavailable', async () => {
    const { service, projectionClient } = harness()
    await service.createCR(project(), 'Feature Enhancement', {
      title: 'Cloud Bound',
      type: 'Feature Enhancement',
      content: 'Body remains local.',
    })
    projectionClient.get.mockRejectedValueOnce(new CoordinatorError('coordination_unavailable'))

    await expect(service.updateCRStatus(project(), 'MDT-042', 'In Progress'))
      .resolves
      .toBe(true)
    const updated = await service.getCR(project(), 'MDT-042')
    expect(updated?.status).toBe('In Progress')
    expect(projectionClient.publish).not.toHaveBeenCalled()
  })
})
