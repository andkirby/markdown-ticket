import type { Request, Response } from 'express'
import type { AuthenticatedRequest, ProjectServiceExtension, TreeServiceInterface } from '../../controllers/ProjectController'
import type { TicketService } from '../../services/TicketService'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import express from 'express'
import request from 'supertest'
import { DocumentController } from '../../controllers/DocumentController'
import { ProjectController } from '../../controllers/ProjectController'
import { ConfigRepository } from '../../repositories/ConfigRepository'
import { createDevToolsRouter } from '../../routes/devtools'
import { ProjectConfigStorageAdapter } from '../../services/config/adapters/ProjectConfigStorageAdapter'
import { DocumentFavStateService } from '../../services/DocumentFavStateService'
import FileWatcherService from '../../services/fileWatcher'
import { PinStateService } from '../../services/PinStateService'
import { createMockProjectService, createMockReqRes, createMockTreeService } from '../utils/setupTests'

function setup() {
  const service = createMockProjectService()
  const tree = createMockTreeService()
  const tickets = { getCloudProjections: jest.fn().mockResolvedValue({ entries: [] }), getCR: jest.fn() }
  const controller = new ProjectController(service as unknown as ProjectServiceExtension, tree as unknown as TreeServiceInterface, {}, undefined, tickets as unknown as TicketService)
  return { service, tree, tickets, controller }
}
function rejected(res: Partial<Response>, source: string) {
  expect(res.status).toHaveBeenCalledWith(400)
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION_ERROR', source, issues: expect.any(Array) }))
}
describe('MDT-258 phase 5 scalar read boundaries', () => {
  it.each(['getProjectConfig', 'getProjectCRs', 'getUnifiedTickets', 'getCR', 'getTraceStore', 'getTraceStoreMetadata', 'getSubDocument', 'getCloudProjections'] as const)('%s rejects structured params before services', async (method) => {
    const { controller, service, tickets } = setup()
    const { req, res } = createMockReqRes()
    req.params = { projectId: ['bad'], crId: 'MDT-001', subDocName: 'notes.md' } as never
    await controller[method](req as AuthenticatedRequest, res as Response)
    rejected(res, 'params')
    expect(service.getAllProjects).not.toHaveBeenCalled()
    expect(tickets.getCR).not.toHaveBeenCalled()
    expect(tickets.getCloudProjections).not.toHaveBeenCalled()
  })
  it.each(['getAllProjects', 'getFileSystemTree', 'getSystemDirectories'] as const)('%s rejects structured queries', async (method) => {
    const { controller, service, tree } = setup()
    const { req, res } = createMockReqRes()
    req.query = { projectId: ['bad'], path: {}, bypassCache: ['true'] } as never
    await controller[method](req as AuthenticatedRequest, res as Response)
    rejected(res, 'query')
    expect(service.getAllProjects).not.toHaveBeenCalled()
    expect(tree.getPathSelectionTree).not.toHaveBeenCalled()
  })
  it.each([undefined, '', 'TRUE', 'false', 'true'])('keeps bypassCache equality for %s', async (bypassCache) => {
    const { controller, service } = setup()
    service.getAllProjects.mockResolvedValue([])
    const { req, res } = createMockReqRes()
    req.query = { bypassCache }
    await controller.getAllProjects(req as Request, res as Response)
    expect(service.getAllProjects).toHaveBeenCalledWith(bypassCache === 'true')
  })
  it.each([
    [{}, 0, 100],
    [{ after: '12tail', limit: '5.9' }, 12, 5],
    [{ after: ' 002 ', limit: '500' }, 2, 500],
    [{ after: '0x20', limit: '01' }, 0, 1],
  ])('retains projection parseInt/default behavior: %j', async (query, after, limit) => {
    const { controller, tickets } = setup()
    const { req, res } = createMockReqRes()
    req.params = { projectId: 'opaque' }
    req.query = query
    await controller.getCloudProjections(req as AuthenticatedRequest, res as Response)
    expect(tickets.getCloudProjections).toHaveBeenCalledWith('opaque', after, limit)
  })
  it.each([{ after: ['1'] }, { limit: {} }, { after: '-1' }, { limit: '501' }, { limit: '' }, { after: 'bad' }])('rejects bad cursor/limit without service calls: %j', async (query) => {
    const { controller, tickets } = setup()
    const { req, res } = createMockReqRes()
    req.params = { projectId: 'opaque' }
    req.query = query as never
    await controller.getCloudProjections(req as AuthenticatedRequest, res as Response)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(tickets.getCloudProjections).not.toHaveBeenCalled()
  })
  it.each(['getDocuments', 'getDocumentContent'] as const)('%s never forwards array/object query fields', async (method) => {
    const documents = { discoverDocuments: jest.fn(), getDocumentContent: jest.fn() }
    const controller = new DocumentController(documents as never, 'test-secret')
    const { req, res } = createMockReqRes()
    req.query = { projectId: ['p'], filePath: {} } as never
    await controller[method](req as never, res as Response)
    rejected(res, 'query')
    expect(documents.discoverDocuments).not.toHaveBeenCalled()
    expect(documents.getDocumentContent).not.toHaveBeenCalled()
  })
  it.each(['/logs?filter[x]=bad', '/frontend/logs?lines=1&lines=2', '/logs/stream?filter[]=bad'])('rejects structured log query %s', async (url) => {
    const app = express().use(createDevToolsRouter())
    const response = await request(app).get(url)
    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({ source: 'query', issues: expect.any(Array) })
  })
  it('preserves log parseInt, empty default, NaN, zero and upper clamp semantics', async () => {
    const app = express().use(express.json()).use(createDevToolsRouter())
    await request(app).post('/frontend/logs/start')
    await request(app).post('/frontend/logs').send({ logs: Array.from({ length: 25 }, (_, i) => ({ timestamp: i, level: 'info', message: `Entry ${i}` })) })
    for (const [lines, count] of [['', 20], ['2tail', 2], ['0x2', 2], ['0', 25], ['bad', 25], ['99999', 25]] as const) {
      const response = await request(app).get(`/frontend/logs?lines=${lines}`)
      expect(response.status).toBe(200)
      expect(response.body.logs).toHaveLength(count)
    }
    const filtered = await request(app).get('/frontend/logs?lines=1&filter=eNTRY%202')
    expect(filtered.body.total).toBe(6)
    expect(filtered.body.logs).toHaveLength(1)
    await request(app).delete('/frontend/logs')
    await request(app).post('/frontend/logs/stop')
  })
})

describe('MDT-258 phase 4 tolerant persisted adapters', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mdt258-adapters-'))
  })
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })
  it('extracts independent valid fields despite malformed siblings, retaining legacy tickets path and preview filtering', async () => {
    await writeFile(join(dir, '.mdt-config.toml'), '[project]\npath = " legacy "\nactive = "invalid-but-unrelated"\n[project.document]\npaths = ["docs", 2]\nexcludeFolders = ["custom", 3]\nmaxDepth = -2\n[project.document.preview]\nallowedExternalDomains = ["example.org", " ", 2]\nallowUnsafeEval = true\n')
    expect(await new ConfigRepository().getConfig(dir)).toMatchObject({ documentPaths: ['docs'], excludeFolders: ['custom', 'legacy'], ticketsPath: 'legacy', maxDepth: -2, preview: { allowedExternalDomains: ['example.org'], allowUnsafeEval: true } })
  })
  it('keeps display extensions and partial settings, with separate strict write reloads', async () => {
    const text = '[project]\nname = " Name "\ncode = "raw"\n[project.extension]\nkeep = true\n[project.document.preview]\n'
    await writeFile(join(dir, '.mdt-config.toml'), text)
    const adapter = new ProjectConfigStorageAdapter(dir)
    expect(await adapter.read()).toMatchObject({ project: { name: ' Name ', extension: { keep: true }, document: { preview: {} } } })
    expect(await readFile(adapter.filePath, 'utf8')).toBe(text)
    await writeFile(adapter.filePath, '[project\ninvalid')
    expect(await adapter.read()).toMatchObject({ project: { name: '', code: '' } })
    const mutate = jest.fn()
    await expect(adapter.write(mutate)).rejects.toThrow()
    expect(mutate).not.toHaveBeenCalled()
  })
  it('settings display retains raw malformed selector values for its existing consumer', async () => {
    await writeFile(join(dir, '.mdt-config.toml'), '[project]\nname = 42\n[project.document]\npaths = false\nmaxDepth = "legacy"\n')
    expect(await new ProjectConfigStorageAdapter(dir).read()).toMatchObject({ project: { name: 42, document: { paths: false, maxDepth: 'legacy' } } })
  })
  it.each(['{broken', '{"pins":42,"favItems":42}'])('pins/favorites reset on bad file without rewriting it: %s', async (text) => {
    const discovery = { getAllProjects: async () => [{ id: 'p', project: { code: 'P' } }] }
    const pins = new PinStateService(discovery as never)
    const favorites = new DocumentFavStateService(discovery as never)
    jest.spyOn(pins, 'getStatePath').mockReturnValue(join(dir, 'pins.json'))
    jest.spyOn(favorites, 'getStatePathForProjectId').mockReturnValue(join(dir, 'p/document-favs.json'))
    const favPath = favorites.getStatePathForProjectId('p')
    await mkdir(dirname(favPath), { recursive: true })
    await writeFile(pins.getStatePath(), text)
    await writeFile(favPath, text)
    expect(await pins.readState()).toEqual({ pins: [] })
    expect(await favorites.readReconciledState('p', [])).toEqual({ favItems: [] })
    expect(await readFile(favPath, 'utf8')).toBe(text)
    expect(await readFile(pins.getStatePath(), 'utf8')).toBe(text)
  })
  it('watcher projects only compatible frontmatter fields and ISO dates', async () => {
    const file = 'RAW-001.md'
    await writeFile(join(dir, file), '---\ncode: RAW-001\ntitle: Legacy title\nstatus: Proposed\ntype: Bug Fix\npriority: High\nlastModified: 2026-01-02\n---\n# H1\n')
    const watcher = new FileWatcherService()
    const internals = watcher as unknown as { pathWatcher: { getProjectPath: (id: string) => string }, handleFileChangeForSSE: (event: unknown) => void }
    jest.spyOn(internals.pathWatcher, 'getProjectPath').mockReturnValue(dir)
    const broadcast = new Promise<unknown>(resolve => watcher.once('broadcast', resolve))
    internals.handleFileChangeForSSE({ eventType: 'change', filename: file, projectId: 'raw', timestamp: 1 })
    expect(await broadcast).toMatchObject({ type: 'file-change', data: { ticketData: { code: 'RAW-001', title: 'Legacy title', lastModified: '2026-01-02T00:00:00.000Z' } } })
    watcher.stop()
  })
})
