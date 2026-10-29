import type { Request, Response } from 'express'
import type { ProjectServiceExtension } from '../../modules/projects/index.js'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'
import express from 'express'
import request from 'supertest'
import { buildRuntimeConfig } from '../../config/runtimeConfig'
import { createAuthRouter, createPublicReadTokensRouter, createReadTokensRouter, createShareRouter } from '../../modules/access/index.js'
import { DocumentConfigurationController, DocumentController } from '../../modules/documents/index.js'
import { ProjectController } from '../../modules/projects/index.js'
import { createDevToolsRouter, createSystemRouter } from '../../modules/system/index.js'
import { PinController } from '../../modules/tickets/index.js'
import { createOriginPolicy } from '../../security/originPolicy'
import { updateProjectSharing } from '../../security/projectSharing'
import { ProjectConfigStorageAdapter } from '../../services/config/adapters/ProjectConfigStorageAdapter'
import { createMockProjectService, createMockReqRes } from '../utils/setupTests'

function structured(response: request.Response, source = 'body') {
  expect(response.status).toBe(400)
  expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR', source, issues: expect.any(Array) })
  expect(response.body.issues.length).toBeGreaterThan(0)
}

describe('MDT-258 project/controller shape rejection', () => {
  function setup() {
    const service = { ...createMockProjectService(), updateProject: jest.fn(), updateProjectByPath: jest.fn() }
    const controller = new ProjectController(service as unknown as ProjectServiceExtension, {})
    const manager = { createProject: jest.fn(), enableProject: jest.fn(), disableProject: jest.fn() }
    Object.assign(controller, { projectManager: manager })
    const app = express()
    app.use(express.json({ strict: false }))
    app.post('/create', (req, res) => controller.createProject(req, res))
    app.patch('/update/:code', (req, res) => controller.updateProject(req, res))
    app.patch('/sharing/:code', (req, res) => controller.updateProjectSharing(req, res))
    const documents = new DocumentConfigurationController(service as unknown as ProjectServiceExtension, {})
    app.post('/documents', (req, res) => documents.configureDocuments(req, res))
    return { app, controller, service, manager }
  }
  it.each([null, [], false, {}, { name: 'Alpha', path: [] }, { name: 'Alpha', path: '/tmp/a', globalOnly: 'yes' }, { name: 'Alpha', path: '/tmp/a', documentPaths: [{}] }])('rejects create %j before manager/filesystem calls', async (body) => {
    const { app, manager } = setup()
    structured(await request(app).post('/create').set('Content-Type', 'application/json').send(JSON.stringify(body)))
    expect(manager.createProject).not.toHaveBeenCalled()
  })
  it.each([null, [], { active: 'false' }, { name: {} }, { description: [] }, { repository: 2 }, { name: 'Valid', active: {} }])('rejects update %j before resolution or mutation', async (body) => {
    const { app, service } = setup()
    structured(await request(app).patch('/update/opaque-id').set('Content-Type', 'application/json').send(JSON.stringify(body)))
    expect(service.getAllProjects).not.toHaveBeenCalled()
    expect(service.updateProject).not.toHaveBeenCalled()
    expect(service.updateProjectByPath).not.toHaveBeenCalled()
  })
  it.each([{ mode: 'public-readonly', shareId: 'client-id' }, { mode: 'private', rotateShareId: 'yes' }, { mode: 'invalid' }, null])('rejects sharing %j before resolution/write', async (body) => {
    const { app, service } = setup()
    structured(await request(app).patch('/sharing/opaque-id').set('Content-Type', 'application/json').send(JSON.stringify(body)))
    expect(service.getAllProjects).not.toHaveBeenCalled()
  })
  it.each([{ projectId: [], documentPaths: [] }, { projectId: 'p', documentPaths: [1] }, { projectId: 'p', documentPaths: ['../escape'] }])('rejects configure-documents %j before writes', async (body) => {
    const { app, service } = setup()
    structured(await request(app).post('/documents').send(body))
    expect(service.configureDocuments).not.toHaveBeenCalled()
  })
  it.each(['enableProject', 'disableProject', 'updateProject', 'updateProjectSharing'] as const)('%s validates opaque params', async (method) => {
    const { controller, manager, service } = setup()
    const { req, res } = createMockReqRes()
    req.params = { code: ['opaque'] } as never
    await controller[method](req as Request, res as Response)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ source: 'params', issues: expect.any(Array) }))
    expect(manager.enableProject).not.toHaveBeenCalled()
    expect(manager.disableProject).not.toHaveBeenCalled()
    expect(service.getAllProjects).not.toHaveBeenCalled()
  })
  it('does not fall back to local writes after registry validation failure', async () => {
    const { app, service } = setup()
    service.getAllProjects.mockResolvedValue([{ id: 'opaque-id', project: { path: '/tmp/a', code: 'ALP' } }])
    service.updateProject.mockImplementation(() => {
      throw new Error('Invalid reload')
    })
    expect((await request(app).patch('/update/opaque-id').send({ active: false })).status).toBe(500)
    expect(service.updateProjectByPath).not.toHaveBeenCalled()
  })
  it.each([{ name: ' ' }, { repository: 'invalid repository' }])('retains text-policy rejection: %j', async (body) => {
    const { app, service } = setup()
    expect((await request(app).patch('/update/opaque-id').send(body)).status).toBe(400)
    expect(service.updateProject).not.toHaveBeenCalled()
  })
})

describe('MDT-258 session, preferences and transient boundaries', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mdt258-boundary-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })
  function setup(canWrite = true) {
    const app = express()
    app.use(express.json({ strict: false }))
    app.locals.runtimeConfig = buildRuntimeConfig({ NODE_ENV: 'test', CONFIG_DIR: dir, API_SECURITY_AUTH: 'true', API_AUTH_TOKEN: 'owner-fixture', PUBLIC_ORIGIN: 'https://app.example.test' })
    app.use((req, _res, next) => {
      Object.assign(req, { mdtAccess: { canWrite, mode: canWrite ? 'owner' : 'read-only', projectRefs: [], shareIds: [] } })
      next()
    })
    app.use('/auth', createAuthRouter())
    app.use('/tokens', createReadTokensRouter())
    app.use('/public', createPublicReadTokensRouter())
    app.use('/dev', createDevToolsRouter(createOriginPolicy(['https://app.example.test'])))
    app.use('/system', createSystemRouter({} as never, { getSystemDirectories: () => {}, getFileSystemTree: () => {} } as never, {}, {} as never))
    const writeState = jest.fn().mockResolvedValue({ pins: [] })
    const updateDocumentFavs = jest.fn().mockResolvedValue({ favItems: [] })
    const pins = new PinController({ writeState } as never)
    const docs = new DocumentController({ updateDocumentFavs } as never, 'preview-secret')
    app.put('/pins', (req, res) => pins.putPinState(req, res))
    app.put('/favs', (req, res) => docs.putDocumentFavs(req, res))
    app.post('/preview', (req, res) => docs.mintPreviewToken(req, res))
    return { app, writeState, updateDocumentFavs }
  }
  it.each(['/auth/session', '/auth/read-token'])('separates %s malformed shapes from credential rejections', async (url) => {
    const { app } = setup()
    for (const body of [null, [], {}, { token: { secret: 'never-echo' } }]) {
      const response = await request(app).post(url).set('Content-Type', 'application/json').send(JSON.stringify(body))
      structured(response)
      expect(JSON.stringify(response.body)).not.toContain('never-echo')
      expect(response.headers['set-cookie']).toBeUndefined()
    }
    expect((await request(app).post(url).send({ token: 'wrong' })).status).toBe(401)
    expect((await request(app).post(url).send({ token: '' })).status).toBe(401)
  })
  it('validates token creation before storage, preserving business rejection separately', async () => {
    const { app } = setup()
    for (const body of [{}, { name: 'Guest', projectRefs: [1] }, { name: 'Guest', projectRefs: ['P'], expiresAt: {} }]) {
      structured(await request(app).post('/tokens').send(body))
      await expect(readFile(join(dir, 'auth', 'read-access-tokens.json'))).rejects.toThrow()
    }
    const business = await request(app).post('/tokens').send({ name: ' ', projectRefs: [] })
    expect(business.status).toBe(400)
    expect(business.body.code).toBeUndefined()
  })
  it('keeps permission denials ahead of body validation', async () => {
    const { app } = setup(false)
    for (const url of ['/tokens', '/tokens/opaque-id/invites', '/tokens/opaque-id/revoke', '/preview']) {
      expect((await request(app).post(url).send({ malformed: true })).status).toBe(403)
    }
  })
  it('validates invite origin shape without consuming/mutating a token, and accepts opaque token IDs', async () => {
    const { app } = setup()
    const created = await request(app).post('/tokens').send({ name: 'Guest', projectRefs: ['P'] })
    const storePath = join(dir, 'auth', 'read-access-tokens.json')
    const before = await readFile(storePath, 'utf8')
    structured(await request(app).post(`/tokens/${created.body.id}/invites`).send({ origin: [] }))
    expect(await readFile(storePath, 'utf8')).toBe(before)
    const policy = await request(app).post(`/tokens/${created.body.id}/invites`).send({ origin: 'https://denied.example.test' })
    expect(policy.status).toBe(400)
    expect(policy.body.code).toBeUndefined()
    expect(await readFile(storePath, 'utf8')).toBe(before)
    const unknown = await request(app).post('/tokens/arbitrary%3Aidentifier/revoke')
    expect(unknown.status).toBe(400)
    expect(unknown.body.code).toBeUndefined()
    expect((await request(app).post('/public/invites/wrong-but-shaped/session')).status).toBe(401)
  })
  it('validates share params while preserving unknown-share lookup semantics', async () => {
    const { app } = setup()
    const getAllProjects = jest.fn().mockResolvedValue([])
    app.use('/share', createShareRouter({ getAllProjects } as never))
    expect((await request(app).post('/share/arbitrary%3Aidentifier/session')).status).toBe(404)
    expect(getAllProjects).toHaveBeenCalledTimes(1)
  })
  it('validates pins/favorites at adapters before services, retaining business errors', async () => {
    const { app, writeState, updateDocumentFavs } = setup()
    structured(await request(app).put('/pins').send({ pins: [{}] }))
    structured(await request(app).put('/favs').send({ projectId: 'p', favItems: [{}] }))
    expect(writeState).not.toHaveBeenCalled()
    expect(updateDocumentFavs).not.toHaveBeenCalled()
    writeState.mockRejectedValue(new Error('Unknown project in pin set'))
    const unknown = await request(app).put('/pins').send({ pins: [] })
    expect(unknown.status).toBe(400)
    expect(unknown.body.message).toBe('Unknown project in pin set')
    updateDocumentFavs.mockRejectedValue(new Error('Invalid document fav target'))
    const ineligible = await request(app).put('/favs').send({ projectId: 'p', favItems: [] })
    expect(ineligible.status).toBe(400)
    expect(ineligible.body.message).toBe('Invalid document fav target')
  })
  it('validates preview shape separately from HTML eligibility', async () => {
    const { app } = setup()
    structured(await request(app).post('/preview').send({ projectId: 'p', filePath: {} }))
    expect((await request(app).post('/preview').send({ projectId: 'p', filePath: 'README.md' })).status).toBe(400)
    const valid = await request(app).post('/preview').send({ projectId: 'p', filePath: 'docs/index.html' })
    expect(valid.status).toBe(200)
    expect(valid.body.token).toEqual(expect.any(String))
  })
  it('keeps selector defaults and leaves existing state unchanged after shape errors', async () => {
    const { app } = setup()
    const url = '/system/config/selector'
    expect((await request(app).post(url).send({ ALP: {} })).status).toBe(200)
    const statePath = join(dir, 'project-selector.json')
    expect((await request(app).post(url).send({ ALP: { favorite: 'yes', count: -1 } })).status).toBe(200)
    const before = await readFile(statePath, 'utf8')
    expect(JSON.parse(before)).toEqual({ ALP: { favorite: false, lastUsedAt: null, count: 0 } })
    structured(await request(app).post(url).send({ ALP: { accent: 'bad' } }))
    expect(await readFile(statePath, 'utf8')).toBe(before)
  })
  it('rejects whole malformed batches before buffer writes, leaving active/rate gates intact', async () => {
    const { app } = setup()
    const valid = { timestamp: 1, level: 'info', message: 'mdt258-buffer-sentinel' }
    await request(app).post('/dev/frontend/logs/start')
    expect((await request(app).post('/dev/frontend/logs').send({ logs: [valid] })).status).toBe(200)
    const before = (await request(app).get('/dev/frontend/logs')).body
    for (const bad of [null, 'bad', {}, { ...valid, message: 3 }, { ...valid, column: [] }]) {
      structured(await request(app).post('/dev/frontend/logs').send({ logs: [valid, bad] }))
      expect((await request(app).get('/dev/frontend/logs')).body).toEqual(before)
    }
    const dev = await request(app).post('/dev/frontend/dev-logs').send({ logs: [null] })
    expect(dev.status).toBe(403)
    expect(dev.body.error).toBe('DEV mode not active')
    expect((await request(app).get('/dev/frontend/dev-logs/status')).body.rateLimit.current).toBe(0)
    await request(app).post('/dev/frontend/logs/stop')
  })
  it.each(['[project]\nactive = "yes"', '[project\nbroken'])('config writes cannot replace an invalid project reload: %s', async (invalid) => {
    const file = join(dir, '.mdt-config.toml')
    await writeFile(file, invalid)
    const adapter = new ProjectConfigStorageAdapter(dir)
    const mutate = jest.fn(current => current)
    await expect(adapter.write(mutate)).rejects.toThrow()
    expect(mutate).not.toHaveBeenCalled()
    expect(await readFile(file, 'utf8')).toBe(invalid)
  })
  it('preserves extensions and empty preview settings during a config adapter write', async () => {
    const file = join(dir, '.mdt-config.toml')
    await writeFile(file, stringify({ project: { name: ' Legacy ', code: 'legacy', startNumber: '0042', document: { preview: {}, custom: true }, custom: true }, custom: { keep: true } }))
    await new ProjectConfigStorageAdapter(dir).write(current => ({ ...current, project: { ...current.project, active: false } }))
    expect(parseToml(await readFile(file, 'utf8'))).toEqual({ project: { name: ' Legacy ', code: 'legacy', startNumber: '0042', active: false, document: { preview: {}, custom: true }, custom: true }, custom: { keep: true } })
  })
  function sharingProject() {
    return { id: 'project', project: { path: dir, active: true }, registryFile: join(dir, 'project.toml'), metadata: { dateRegistered: '2000-01-01', version: '1' } } as never
  }
  it.each(['[project]\npath = false', '[project]\npath = "/p"\n[metadata]\nsharing = false', '[project\nbroken'])('sharing cannot overwrite a corrupt registry: %s', async (invalid) => {
    const file = join(dir, 'project.toml')
    await writeFile(file, invalid)
    await expect(updateProjectSharing(sharingProject(), { mode: 'public-readonly' })).rejects.toThrow()
    expect(await readFile(file, 'utf8')).toBe(invalid)
  })
  it('generates and rotates share IDs, preserving unrelated registry extensions', async () => {
    const file = join(dir, 'project.toml')
    await writeFile(file, stringify({ project: { path: dir, custom: 1 }, metadata: { custom: 2 }, custom: 3 }))
    const shared = await updateProjectSharing(sharingProject(), { mode: 'public-readonly' })
    const firstId = shared.metadata.sharing?.shareId
    expect(firstId).toMatch(/^[\w-]{32}$/)
    const unchanged = await updateProjectSharing(sharingProject(), { mode: 'unlisted-readonly' })
    expect(unchanged.metadata.sharing?.shareId).toBe(firstId)
    const rotated = await updateProjectSharing(sharingProject(), { mode: 'unlisted-readonly', rotateShareId: true })
    expect(rotated.metadata.sharing?.shareId).not.toBe(firstId)
    expect(parseToml(await readFile(file, 'utf8'))).toMatchObject({ project: { custom: 1 }, metadata: { custom: 2 }, custom: 3 })
  })
})
