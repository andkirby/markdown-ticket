import type { Request, Response } from 'express'
import type { AuthenticatedRequest, ProjectServiceExtension, TreeServiceInterface } from '../../controllers/ProjectController'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import express from 'express'
import request from 'supertest'
import { buildRuntimeConfig } from '../../config/runtimeConfig'
import { DocumentController } from '../../controllers/DocumentController'
import { PinController } from '../../controllers/PinController'
import { ProjectController } from '../../controllers/ProjectController'
import { createAuthRouter } from '../../routes/auth'
import { createDevToolsRouter } from '../../routes/devtools'
import { createReadTokensRouter } from '../../routes/readTokens'
import { createOriginPolicy } from '../../security/originPolicy'
import { createMockProjectService, createMockReqRes, createMockTreeService } from '../utils/setupTests'

// Recorded against the pre-wiring adapters. Keep these assertions unchanged.
describe('MDT-258 phase 2/3 accepted adapter fixtures', () => {
  it.each([
    { name: 'Alpha Project', path: '/tmp/alpha' },
    { name: 'Alpha Project', path: '/tmp/alpha', code: 'alp', ticketsPath: '', globalOnly: true, createProjectPath: false, documentPaths: ['docs', 'README.md'], maxDepth: 0 },
  ])('forwards the real project manager input: %j', async (body) => {
    const controller = new ProjectController(createMockProjectService() as unknown as ProjectServiceExtension, createMockTreeService() as unknown as TreeServiceInterface, {})
    const createProject = jest.fn().mockResolvedValue({ id: 'alpha' })
    Object.assign(controller, { projectManager: { createProject } })
    const { req, res } = createMockReqRes()
    req.body = body
    await controller.createProject(req as Request, res as Response)
    expect(createProject).toHaveBeenCalledWith(body)
    expect(res.json).toHaveBeenCalledWith({ id: 'alpha' })
  })

  it.each([{}, { ignored: true }, { name: ' Alpha Project ', description: '', repository: '', active: false }])('preserves project no-ops and existing normalization: %j', async (body) => {
    const controller = new ProjectController(createMockProjectService() as unknown as ProjectServiceExtension, createMockTreeService() as unknown as TreeServiceInterface, {})
    const updateProject = jest.fn()
    Object.assign(controller, { projectManager: { updateProject } })
    const { req, res } = createMockReqRes()
    req.params = { code: 'opaque-project-id' }
    req.body = body
    await controller.updateProject(req as AuthenticatedRequest, res as Response)
    expect(updateProject).toHaveBeenCalledWith('opaque-project-id', 'name' in body ? { name: 'Alpha Project', description: '', repository: '', active: false } : {})
  })

  it('forwards an empty document-path set', async () => {
    const service = createMockProjectService()
    const controller = new ProjectController(service as unknown as ProjectServiceExtension, createMockTreeService() as unknown as TreeServiceInterface, {})
    const { req, res } = createMockReqRes()
    req.body = { projectId: 'opaque-id', documentPaths: [] }
    await controller.configureDocuments(req as Request, res as Response)
    expect(service.configureDocuments).toHaveBeenCalledWith('opaque-id', [])
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('forwards empty pins and favorites', async () => {
    const writeState = jest.fn().mockResolvedValue({ pins: [] })
    const pinController = new PinController({ writeState } as never)
    const favs = jest.fn().mockResolvedValue({ favItems: [] })
    const docController = new DocumentController({ updateDocumentFavs: favs } as never, 'test-secret')
    const { req, res } = createMockReqRes()
    req.body = { pins: [] }
    await pinController.putPinState(req as never, res as Response)
    expect(writeState).toHaveBeenCalledWith({ pins: [] })
    req.body = { projectId: 'opaque-id', favItems: [], ignored: true }
    await docController.putDocumentFavs(req as never, res as Response)
    expect(favs).toHaveBeenCalledWith('opaque-id', { favItems: [] })
  })
})

describe('MDT-258 phase 3 accepted session/log fixtures', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mdt258-session-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  function app() {
    const app = express()
    app.use(express.json())
    app.locals.runtimeConfig = buildRuntimeConfig({ NODE_ENV: 'test', CONFIG_DIR: dir, API_SECURITY_AUTH: 'true', API_AUTH_TOKEN: 'test-owner-token', PUBLIC_ORIGIN: 'https://app.example.test' })
    app.use((req, _res, next) => {
      Object.assign(req, { mdtAccess: { canWrite: true, mode: 'owner', projectRefs: [], shareIds: [] } })
      next()
    })
    app.use('/auth', createAuthRouter())
    app.use('/tokens', createReadTokensRouter())
    app.use('/dev', createDevToolsRouter(createOriginPolicy(['https://app.example.test'])))
    return app
  }

  it.each([undefined, null, '', '2099-01-01'])('keeps expiry %j and bodyless invite/revoke requests', async (expiresAt) => {
    const server = app()
    const create = await request(server).post('/tokens').send({ name: ' Guest ', projectRefs: [' ALP ', 'ALP'], ...(expiresAt === undefined ? {} : { expiresAt }) })
    expect(create.status).toBe(201)
    expect(create.body).toMatchObject({ name: 'Guest', projectRefs: ['ALP'], expiresAt: expiresAt ? '2099-01-01T00:00:00.000Z' : null })
    const invite = await request(server).post(`/tokens/${create.body.id}/invites`)
    expect(invite.status).toBe(201)
    expect(invite.body.inviteUrl).toMatch(/\/invite\//)
    const revoke = await request(server).post(`/tokens/${create.body.id}/revoke`)
    expect(revoke.status).toBe(200)
    expect(revoke.body.status).toBe('revoked')
  })

  it('accepts owner credentials and rejects incorrect string credentials', async () => {
    const server = app()
    expect((await request(server).post('/auth/session').send({ token: 'test-owner-token', ignored: true })).status).toBe(200)
    expect((await request(server).post('/auth/session').send({ token: 'wrong' })).status).toBe(401)
    expect((await request(server).post('/auth/read-token').send({ token: 'wrong' })).status).toBe(401)
  })

  it('accepts empty batches and preserves log extension fields', async () => {
    const server = app()
    expect((await request(server).post('/dev/frontend/logs').send({})).body).toEqual({ received: 0 })
    const entry = { timestamp: 1, level: 'custom-level', message: 'compat-message', source: 'test', extra: { keep: true } }
    expect((await request(server).post('/dev/frontend/logs').send({ logs: [entry] })).body).toEqual({ received: 1 })
    const logs = await request(server).get('/dev/frontend/logs')
    expect(logs.body.logs).toContainEqual(entry)
    expect((await request(server).post('/dev/frontend/logs/stop')).status).toBe(200)
  })
})
