import type { AuthenticatedRequest, ProjectServiceExtension } from '../../modules/projects/index.js'
import type { TicketService } from '../../services/TicketService.js'
import express from 'express'
import request from 'supertest'
import { TicketController } from '../../modules/tickets/index.js'
import { createMockProjectService } from '../utils/setupTests.js'

function setup() {
  const service = { getCR: jest.fn().mockResolvedValue({ code: 'TEST-258' }), createCR: jest.fn().mockResolvedValue({ success: true }), updateCRPartial: jest.fn().mockResolvedValue({ success: true }), deleteCR: jest.fn().mockResolvedValue({ success: true }) }
  const projectService = createMockProjectService()
  projectService.getAllProjects.mockResolvedValue([{ id: 'test', project: { code: 'TEST', path: '/fixture', active: true } }])
  const controller = new TicketController(projectService as unknown as ProjectServiceExtension, service as unknown as TicketService)
  const app = express()
  app.use(express.json({ strict: false }))
  app.use((req, _res, next) => {
    Object.assign(req, { mdtAccess: { canWrite: true, mode: 'owner-admin', projectRefs: [], shareIds: [] } })
    next()
  })
  app.get('/:projectId/crs/:crId', (req, res) => controller.getCR(req as AuthenticatedRequest, res))
  app.post('/:projectId/crs', (req, res) => controller.createCR(req as AuthenticatedRequest, res))
  app.patch('/:projectId/crs/:crId', (req, res) => controller.patchCR(req as AuthenticatedRequest, res))
  app.put('/:projectId/crs/:crId', (req, res) => controller.updateCR(req as AuthenticatedRequest, res))
  app.delete('/:projectId/crs/:crId', (req, res) => controller.deleteCR(req as AuthenticatedRequest, res))
  return { app, service }
}

describe('CR write boundary rejection before services', () => {
  it.each(['patch', 'put'] as const)('%s mixed valid status and malformed priority makes zero mutation calls', async (method) => {
    const { app, service } = setup()
    const response = await request(app)[method]('/test/crs/TEST-1').send({ status: 'In Progress', priority: { bad: true } })
    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({ code: 'VALIDATION_ERROR', source: 'body', issues: [{ code: 'invalid_type', path: ['priority'], message: expect.any(String) }] })
    for (const spy of Object.values(service)) expect(spy).not.toHaveBeenCalled()
  })
  it.each([null, [], 'text', 42, { blocks: [1] }, { assignee: {} }, { status: 'wrong' }, { level: {} }].map(body => ({ body })))('rejects malformed PATCH $body', async ({ body }) => {
    const { app, service } = setup()
    const response = await request(app).patch('/test/crs/TEST-1').set('Content-Type', 'application/json').send(JSON.stringify(body))
    expect(response.status).toBe(400)
    expect(response.body.issues.length).toBeGreaterThan(0)
    expect(service.updateCRPartial).not.toHaveBeenCalled()
  })
  it.each([null, [], { title: {}, type: 'Bug Fix' }, { title: 'title', type: 'Bug Fix', priority: {} }].map(body => ({ body })))('rejects malformed create $body', async ({ body }) => {
    const { app, service } = setup()
    const response = await request(app).post('/test/crs').set('Content-Type', 'application/json').send(JSON.stringify(body))
    expect(response.status).toBe(400)
    expect(response.body.issues.length).toBeGreaterThan(0)
    expect(service.createCR).not.toHaveBeenCalled()
  })
  it('REST projection cannot enable ignored fields', async () => {
    const { app, service } = setup()
    await request(app).post('/test/crs').send({ title: 'title', type: 'Research', implementationNotes: 'ignored', content: 'ignored' }).expect(201)
    expect(service.createCR).toHaveBeenCalledWith('test', { title: 'title', type: 'Research' })
  })
})

describe('MDT-200 ambiguous ticket identity HTTP boundary', () => {
  it.each(['get', 'patch', 'put', 'delete'] as const)('%s returns typed conflict rather than selecting a ticket', async (method) => {
    const { app, service } = setup()
    const paths = ['docs/CRs/TEST-258-original.md', 'docs/CRs/TEST-258-manual.md']
    const error = Object.assign(new Error('Ambiguous ticket key TEST-258'), {
      code: 'ticket_key_ambiguous',
      status: 409,
      key: 'TEST-258',
      paths,
    })
    service.getCR.mockRejectedValue(error)
    service.updateCRPartial.mockRejectedValue(error)
    service.deleteCR.mockRejectedValue(error)
    const req = request(app)[method]('/test/crs/TEST-258')
    const response = await (method === 'patch' || method === 'put' ? req.send({ status: 'In Progress' }) : req)
    expect(response.status).toBe(409)
    expect(response.body).toMatchObject({ code: 'ticket_key_ambiguous', paths })
    expect(response.body).not.toHaveProperty('stack')
  })
})
