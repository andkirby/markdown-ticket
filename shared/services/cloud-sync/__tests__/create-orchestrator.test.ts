import type {
  AcknowledgeReservationRequest,
  CloudCredential,
  CloudSyncCoordinator,
  Project,
  ReserveRequest,
} from '@mdt/domain-contracts'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'
import { CLOUD_SYNC_CONNECTION_VERSION, CoordinatorError } from '@mdt/domain-contracts'
import { TicketService } from '../../TicketService'
import { DISTRIBUTION_CLOUD_SYNC_ORIGINS } from '../config'
import { CloudOperationJournal } from '../operation-journal'
import { ProjectStateStore } from '../project-state-store'
import { resolveTrustedServiceProfile } from '../trusted-service-profile'

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
    version: CLOUD_SYNC_CONNECTION_VERSION,
    state: 'enabled',
    cloudProjectId: 'cloud-project-1',
    serviceOrigin: DISTRIBUTION_CLOUD_SYNC_ORIGINS[0],
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
  const reserve = jest.fn(async (request: ReserveRequest) => ({
    reservationId: 'reservation-42',
    ticketNumber: Math.max(42, Reflect.get(request, 'minimumTicketNumber') ?? 1),
    protocolVersion: Reflect.get(request, 'protocolVersion'),
    creationId: Reflect.get(request, 'creationId'),
    minimumTicketNumber: Reflect.get(request, 'minimumTicketNumber'),
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
  it('canonicalizes lowercase cloud project identity before writing and retry verification', async () => {
    await writeFile(join(projectPath, '.mdt-config.toml'), '[project]\nname="Lowercase"\ncode="mdt"\npath="."\nticketsPath="docs/CRs"\n')
    const p = project()
    p.project.code = 'mdt'
    const { service, reserve, acknowledge } = harness()
    acknowledge.mockRejectedValueOnce(new CoordinatorError('coordination_unavailable'))
    const input = { title: 'Canonical case', type: 'Bug Fix' }
    await expect(service.createCR(p, 'Bug Fix', input)).rejects.toMatchObject({ code: 'coordination_unavailable' })
    const created = await service.createCR(p, 'Bug Fix', input)
    expect(created.code).toBe('MDT-042')
    expect(reserve).toHaveBeenCalledTimes(1)
    expect(acknowledge).toHaveBeenCalledTimes(2)
    expect(acknowledge.mock.calls[1]?.[0].header).toMatchObject({ code: 'MDT-042', creationId: created.creationId })
    expect(await readdir(join(projectPath, 'docs/CRs'))).toEqual(['MDT-042-canonical-case.md'])
    expect(await readFile(join(projectPath, '.mdt-config.toml'), 'utf8')).toContain('code="mdt"')
  })
  it.each([false, true])('preserves configured absolute-root create/read/edit/delete (cloud=%s)', async (cloud) => {
    const external = join(root, 'external-tickets')
    await mkdir(external)
    await writeFile(join(projectPath, '.mdt-config.toml'), `[project]\nname="External"\ncode="MDT"\npath="."\nticketsPath="${external}"\n`)
    await writeFile(join(external, 'MDT-262-existing.md'), '---\ncode: MDT-262\n---\n# Existing\n')
    if (!cloud)
      await unlink(join(configDir, 'projects/local-project/cloud-sync.toml'))
    const p = project()
    p.project.ticketsPath = external
    const { service, reserve } = harness()
    const created = await service.createCR(p, 'Bug Fix', { title: 'External root', type: 'Bug Fix' })
    expect(created.code).toBe('MDT-263')
    expect(await readFile(join(external, 'MDT-263-external-root.md'), 'utf8')).toContain('code: MDT-263')
    expect((await service.getCR(p, 'MDT-263'))?.code).toBe('MDT-263')
    expect(await service.updateCRStatus(p, 'MDT-263', 'In Progress')).toBe(true)
    expect((await service.getCR(p, 'MDT-263'))?.status).toBe('In Progress')
    await service.deleteCR(p, 'MDT-263')
    await expect(readFile(join(external, 'MDT-263-external-root.md'))).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await readFile(join(external, 'MDT-262-existing.md'), 'utf8')).toContain('# Existing')
    if (cloud)
      expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ minimumTicketNumber: 263 }), expect.anything())
    else
      expect(reserve).not.toHaveBeenCalled()
  })
  it('preserves and blocks legacy project-root journals after Git common-dir routing changes', async () => {
    execFileSync('git', ['init', projectPath], { stdio: 'pipe' })
    const legacy = new CloudOperationJournal({ rootDir: journalRoot, physicalRepoPath: projectPath })
    await legacy.begin({ cloudProjectId: 'cloud-project-1', idempotencyKey: 'legacy-key', requestHash: 'legacy-hash' })
    const { service, reserve, acknowledge } = harness()
    await expect(service.createCR(project(), 'Bug Fix', { title: 'Must not bypass recovery', type: 'Bug Fix' })).rejects.toThrow('Legacy project-root')
    expect(reserve).not.toHaveBeenCalled()
    expect(acknowledge).not.toHaveBeenCalled()
    expect((await legacy.load('cloud-project-1'))?.idempotencyKey).toBe('legacy-key')
  })
  it('sends the local high-water minimum to the coordinator before allocating (BR-1.8)', async () => {
    await writeFile(join(projectPath, 'docs/CRs/MDT-262-existing.md'), '---\ncode: MDT-262\n---\n# Existing\n')
    const { service, reserve } = harness()
    const ticket = await service.createCR(project(), 'Feature Enhancement', { title: 'Above stale cloud counter', type: 'Feature Enhancement', content: 'Canonical body.' })
    expect(ticket.code).toBe('MDT-263')
    expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ protocolVersion: 2, minimumTicketNumber: 263, creationId: expect.any(String) }), expect.anything())
    expect(ticket).toHaveProperty('creationId', expect.any(String))
    expect(await service.getCR(project(), ticket.code)).toHaveProperty('creationId', Reflect.get(ticket, 'creationId'))
  })

  it('rejects a stale reservation occupied under another slug without acknowledgement (BR-1.1)', async () => {
    const { service, reserve, acknowledge } = harness()
    reserve.mockImplementationOnce(async request => ({ reservationId: 'stale-reservation', ticketNumber: 42, protocolVersion: Reflect.get(request, 'protocolVersion'), creationId: Reflect.get(request, 'creationId'), minimumTicketNumber: Reflect.get(request, 'minimumTicketNumber'), state: 'reserved', replayed: false }))
    await writeFile(join(projectPath, 'docs/CRs/MDT-042-unrelated.md'), '---\ncode: MDT-042\n---\n# Unrelated\n')
    await expect(service.createCR(project(), 'Feature Enhancement', { title: 'Cloud Bound', type: 'Feature Enhancement', content: 'Another body.' })).rejects.toBeDefined()
    expect(acknowledge).not.toHaveBeenCalled()
    expect(await readdir(join(projectPath, 'docs/CRs'))).toEqual(['MDT-042-unrelated.md'])
  })

  it.each(['MDT-042-manual.md', 'aaa.md', 'MDT-041-foreign.md'])('refuses ambiguous key lookup with %s instead of selecting a slug (BR-1.10)', async (manual) => {
    const { service } = harness()
    for (const name of ['MDT-042-original.md', manual]) {
      await writeFile(join(projectPath, 'docs/CRs', name), `---\ncode: MDT-042\n---\n# ${name}\n`)
    }
    await expect(service.getCR(project(), 'MDT-042')).rejects.toMatchObject({ code: 'ticket_key_ambiguous', status: 409 })
    await expect(service.updateCRStatus(project(), 'MDT-042', 'In Progress')).rejects.toBeDefined()
  })

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
    reserve.mockImplementationOnce(async (request) => {
      // The conflict arrives after the initial scan and reservation request.
      await writeFile(conflictingPath, 'different content')
      return { reservationId: 'reservation-42', ticketNumber: 42, protocolVersion: request.protocolVersion, creationId: request.creationId, minimumTicketNumber: request.minimumTicketNumber, state: 'reserved', replayed: false }
    })

    const input = {
      title: 'Cloud Bound',
      type: 'Feature Enhancement',
      content: 'Canonical body.',
    }
    await expect(service.createCR(project(), 'Feature Enhancement', input))
      .rejects
      .toMatchObject({ code: 'reservation_state_conflict' })
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
    // MDT-226: the journal sends a conditional PUT directly (no read-before-
    // write). When coordination is unavailable the publish fails transient, but
    // the local Markdown edit still succeeds and the entry stays for retry.
    projectionClient.publish.mockRejectedValueOnce(new CoordinatorError('coordination_unavailable'))

    await expect(service.updateCRStatus(project(), 'MDT-042', 'In Progress'))
      .resolves
      .toBe(true)
    const updated = await service.getCR(project(), 'MDT-042')
    expect(updated?.status).toBe('In Progress')
    // The publish was attempted (and failed); Markdown authority is unaffected.
    expect(projectionClient.publish).toHaveBeenCalled()
  })
})
