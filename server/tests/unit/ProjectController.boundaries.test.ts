import type { AuthenticatedRequest, ProjectServiceExtension, TreeServiceInterface } from '../../controllers/ProjectController.js'
import type { TicketService } from '../../services/TicketService.js'
import express from 'express'
import request from 'supertest'
import { ProjectController } from '../../controllers/ProjectController.js'
import { createMockProjectService, createMockTreeService } from '../utils/setupTests.js'

function setup() {
  const service = { createCR: jest.fn().mockResolvedValue({ success: true }), updateCRPartial: jest.fn().mockResolvedValue({ success: true }), deleteCR: jest.fn().mockResolvedValue({ success: true }) }
  const controller = new ProjectController(createMockProjectService() as unknown as ProjectServiceExtension, createMockTreeService() as unknown as TreeServiceInterface, {}, undefined, service as unknown as TicketService)
  const app = express()
  app.use(express.json({ strict: false }))
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
