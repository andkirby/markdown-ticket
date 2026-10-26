import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CLOUD_SYNC_CONNECTION_VERSION, CoordinatorError } from '@mdt/domain-contracts'
import { TicketService as SharedTicketService } from '@mdt/shared/services/TicketService.js'
import express from 'express'
import request from 'supertest'
import { ProjectController } from '../../controllers/ProjectController.js'
import { createCloudCreationRecoveryRouter } from '../../routes/cloudCreationRecovery.js'
import { TicketService } from '../../services/TicketService.js'
import { createMockProjectService, createMockTreeService, mockCR, mockProject } from '../utils/setupTests.js'

// This acceptance test deliberately bypasses the server Jest shared-service mock.
jest.mock('@mdt/shared/services/TicketService.js', () => jest.requireActual('../../../shared/services/TicketService.ts'))
const { DISTRIBUTION_CLOUD_SYNC_ORIGINS } = jest.requireActual<typeof import('@mdt/shared/services/cloud-sync/config.js')>('../../../shared/services/cloud-sync/config.ts')
const { ProjectStateStore } = jest.requireActual<typeof import('@mdt/shared/services/cloud-sync/project-state-store.js')>('../../../shared/services/cloud-sync/project-state-store.ts')
const { resolveTrustedServiceProfile } = jest.requireActual<typeof import('@mdt/shared/services/cloud-sync/trusted-service-profile.js')>('../../../shared/services/cloud-sync/trusted-service-profile.ts')

const project = {
  ...mockProject,
  project: { ...mockProject.project, id: mockProject.id, configFile: 'fixture/.mdt-config.toml', ticketsPath: 'docs/CRs', description: '', repository: '' },
  metadata: { dateRegistered: '2026-01-01', lastAccessed: '2026-01-01', version: '1.0.0' },
}
const ticket = { ...mockCR, dateCreated: null, lastModified: null, relatedTickets: [], dependsOn: [], blocks: [] }

describe('REST create adapter compatibility', () => {
  afterEach(() => jest.restoreAllMocks())
  it('missing priority still defaults Medium and ignored fields cannot acquire effects', async () => {
    const create = jest.spyOn(SharedTicketService.prototype, 'createCRWithDiagnostics').mockResolvedValue({ ticket, diagnostics: [] })
    const service = new TicketService({ getAllProjects: async () => [project] })
    await service.createCR(project.id, { title: '  title  ', type: 'Research' })
    expect(create).toHaveBeenCalledWith(project, 'Research', { title: '  title  ', type: 'Research', priority: 'Medium', level: undefined, content: undefined })
  })
})

describe('MDT-200 actual shared-service ambiguity through HTTP', () => {
  it('returns 409 for duplicate-key reads and mutations and preserves both files', async () => {
    const root = mkdtempSync(join(tmpdir(), 'mdt200-http-identity-'))
    const dir = join(root, 'docs/CRs')
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(root, '.mdt-config.toml'), '[project]\nname = "Identity fixture"\ncode = "TEST"\nticketsPath = "docs/CRs"\n[worktree]\nenabled = false\n')
    const content = (title: string) => `---\ncode: TEST-258\nstatus: Proposed\ntype: Research\npriority: Medium\n---\n# ${title}\n`
    const first = join(dir, 'TEST-258-original.md')
    const second = join(dir, 'TEST-258-manual.md')
    writeFileSync(first, content('Original'))
    writeFileSync(second, content('Manual'))
    const fixtureProject = {
      ...project,
      id: 'identity-http',
      project: { ...project.project, code: 'TEST', path: root, active: true },
    }
    const service = new TicketService({ getAllProjects: async () => [fixtureProject] })
    const discovery = {
      ...createMockProjectService(),
      getProjectCRsMetadata: jest.fn(),
      projectDiscovery: { getAllProjects: jest.fn(), autoDiscoverProjects: jest.fn(), getRegisteredProjects: jest.fn(), registerProject: jest.fn() },
    }
    discovery.getAllProjects.mockResolvedValue([fixtureProject])
    const controller = new ProjectController(discovery, createMockTreeService(), {}, undefined, service)
    const app = express()
    app.use(express.json())
    app.use((req, _res, next) => {
      Object.assign(req, { mdtAccess: { canWrite: true, mode: 'owner-admin', projectRefs: [], shareIds: [] } })
      next()
    })
    app.get('/:projectId/crs/:crId', (req, res) => controller.getCR(req, res))
    app.patch('/:projectId/crs/:crId', (req, res) => controller.patchCR(req, res))
    app.delete('/:projectId/crs/:crId', (req, res) => controller.deleteCR(req, res))
    try {
      await expect(service.getCR('identity-http', 'TEST-258')).rejects.toMatchObject({ code: 'ticket_key_ambiguous', status: 409 })
      for (const method of ['get', 'patch', 'delete'] as const) {
        const operation = request(app)[method]('/identity-http/crs/TEST-258')
        const response = await (method === 'patch' ? operation.send({ status: 'In Progress' }) : operation)
        expect(response.status).toBe(409)
        expect(response.body).toMatchObject({ code: 'ticket_key_ambiguous', paths: expect.arrayContaining(['docs/CRs/TEST-258-original.md', 'docs/CRs/TEST-258-manual.md']) })
        expect(JSON.stringify(response.body)).not.toContain(root)
      }
      expect(readFileSync(first, 'utf8')).toBe(content('Original'))
      expect(readFileSync(second, 'utf8')).toBe(content('Manual'))
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('MDT-200 owner recovery through the real shared service', () => {
  it.each([false, true])('retains an acknowledged journal for verified terminal reconciliation (missing receipt=%s)', async (missingReceipt) => {
    const root = mkdtempSync(join(tmpdir(), 'mdt200-http-terminal-'))
    const repo = join(root, 'repo')
    mkdirSync(join(repo, 'docs/CRs'), { recursive: true })
    writeFileSync(join(repo, '.mdt-config.toml'), '[project]\nname="Terminal fixture"\ncode="TEST"\nticketsPath="docs/CRs"\n[worktree]\nenabled=false\n')
    const fixture = { ...project, id: 'terminal-http', project: { ...project.project, code: 'TEST', path: repo, active: true } }
    const stateRoot = join(root, 'config')
    const journals = join(root, 'journals')
    await new ProjectStateStore({ rootDir: stateRoot, profile: resolveTrustedServiceProfile({ operatorOrigins: [] }) }).write(fixture.id, {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: 'enabled',
      cloudProjectId: 'cloud-terminal',
      serviceOrigin: DISTRIBUTION_CLOUD_SYNC_ORIGINS[0],
    })
    const reserve = jest.fn(async (input: { protocolVersion?: number, creationId?: string, minimumTicketNumber?: number }) => ({ ...input, reservationId: 'terminal-receipt', ticketNumber: 263, state: 'reserved', replayed: false }))
    const acknowledge = jest.fn(async () => {
      throw new CoordinatorError('coordination_unavailable')
    })
    const service = new TicketService({ getAllProjects: async () => [fixture] }, { journalRoot: journals, stateStoreRoot: stateRoot, credentialProvider: { resolve: async () => ({ kind: 'human', cfAccessToken: 'fixture' }) }, coordinatorFactory: () => ({ reserve, acknowledge }) })
    const app = express()
    app.use(express.json())
    app.use((req, _res, next) => {
      Object.assign(req, { mdtAccess: { canWrite: true, mode: 'owner-admin', projectRefs: [], shareIds: [] } })
      next()
    })
    app.use('/api/projects', createCloudCreationRecoveryRouter(service))
    const endpoint = `/api/projects/${fixture.id}/cloud-sync/creation-recovery`
    try {
      await expect(service.createCR(fixture.id, { title: 'Retained terminal intent', type: 'Research' })).rejects.toMatchObject({ code: 'coordination_unavailable' })
      const journalFile = join(journals, readdirSync(journals)[0], 'cloud-terminal.json')
      const op = JSON.parse(readFileSync(journalFile, 'utf8'))
      op.state = 'acknowledged'
      if (missingReceipt) {
        delete op.reservationId
        delete op.ticketNumber
        delete op.acknowledgement
      }
      const bytes = JSON.stringify(op)
      writeFileSync(journalFile, bytes)
      const inspected = await request(app).get(endpoint)
      expect(inspected.status).toBe(200)
      const entry = inspected.body.entries[0]
      const resumed = await request(app).post(`${endpoint}/resume`).send({ journalId: entry.journalId, expectedDigest: entry.digest })
      expect(resumed.status).toBe(200)
      expect(resumed.body.status).toBe('manual-review-required')
      expect(readFileSync(journalFile, 'utf8')).toBe(bytes)
      expect(entry.nextAction).toBe(missingReceipt ? 'manual-review-required' : 'archive-terminal')
      expect(reserve).toHaveBeenCalledTimes(1)
      expect(acknowledge).toHaveBeenCalledTimes(1)
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
  it('inspects without credentials, rejects stale input and resumes the stored draft and held receipt', async () => {
    const root = mkdtempSync(join(tmpdir(), 'mdt200-http-recovery-'))
    const repo = join(root, 'repo')
    mkdirSync(join(repo, 'docs/CRs'), { recursive: true })
    writeFileSync(join(repo, '.mdt-config.toml'), '[project]\nname="Recovery fixture"\ncode="test"\nticketsPath="docs/CRs"\n[worktree]\nenabled=false\n')
    const fixture = { ...project, id: 'recovery-http', project: { ...project.project, code: 'test', path: repo, active: true } }
    const stateRoot = join(root, 'config')
    await new ProjectStateStore({ rootDir: stateRoot, profile: resolveTrustedServiceProfile({ operatorOrigins: [] }) }).write(fixture.id, {
      version: CLOUD_SYNC_CONNECTION_VERSION,
      state: 'enabled',
      cloudProjectId: 'cloud-recovery',
      serviceOrigin: DISTRIBUTION_CLOUD_SYNC_ORIGINS[0],
    })
    const credentials = jest.fn(async () => ({ kind: 'human' as const, cfAccessToken: 'isolated-fixture' }))
    const reserve = jest.fn(async (input: { protocolVersion?: number, creationId?: string, minimumTicketNumber?: number }) => ({ ...input, reservationId: 'held-receipt', ticketNumber: 263, state: 'reserved', replayed: false }))
    const acknowledge = jest.fn(async () => ({ acknowledged: true as const, projectionVersion: 1, projectRevision: 1, replayed: false }))
    acknowledge.mockRejectedValueOnce(new CoordinatorError('coordination_unavailable'))
    const service = new TicketService({ getAllProjects: async () => [fixture] }, {
      journalRoot: join(root, 'journals'),
      stateStoreRoot: stateRoot,
      credentialProvider: { resolve: credentials },
      coordinatorFactory: () => ({ reserve, acknowledge }),
    })
    const app = express()
    app.use(express.json())
    app.use((req, _res, next) => {
      Object.assign(req, { mdtAccess: { canWrite: true, mode: 'owner-admin', projectRefs: [], shareIds: [] } })
      next()
    })
    app.use('/api/projects', createCloudCreationRecoveryRouter(service))
    const endpoint = `/api/projects/${fixture.id}/cloud-sync/creation-recovery`
    try {
      await expect(service.createCR(fixture.id, { title: 'Original saved draft', type: 'Research' })).rejects.toMatchObject({ code: 'coordination_unavailable' })
      credentials.mockClear()
      const inspection = await request(app).get(endpoint)
      expect(inspection.status).toBe(200)
      expect(credentials).not.toHaveBeenCalled()
      expect(inspection.body.entries).toHaveLength(1)
      const entry = inspection.body.entries[0]
      expect(entry).toMatchObject({ state: 'written', ticketNumber: 263, reservationId: 'held-receipt', draftTitle: 'Original saved draft' })
      const file = join(repo, 'docs/CRs/TEST-263-original-saved-draft.md')
      const bytes = readFileSync(file, 'utf8')
      const stale = await request(app).post(`${endpoint}/resume`).send({ journalId: entry.journalId, expectedDigest: '0'.repeat(64) })
      expect(stale.status).toBe(409)
      expect(acknowledge).toHaveBeenCalledTimes(1)
      const resumed = await request(app).post(`${endpoint}/resume`).send({ journalId: entry.journalId, expectedDigest: entry.digest })
      expect(resumed.status).toBe(200)
      expect(resumed.body).toEqual({ status: 'resumed', journalId: entry.journalId })
      expect(reserve).toHaveBeenCalledTimes(1)
      expect(acknowledge).toHaveBeenCalledTimes(2)
      expect(readFileSync(file, 'utf8')).toBe(bytes)
      expect((await request(app).get(endpoint)).body.entries).toEqual([])
      expect(JSON.stringify(inspection.body)).not.toContain(root)
      expect(JSON.stringify(inspection.body)).not.toContain('isolated-fixture')
    }
    finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
