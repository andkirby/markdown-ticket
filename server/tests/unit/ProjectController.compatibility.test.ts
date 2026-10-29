import type { Response } from 'express'
import type { AuthenticatedRequest, ProjectServiceExtension } from '../../modules/projects/index.js'
import type { TicketService } from '../../services/TicketService.js'
import { TicketController } from '../../modules/tickets/index.js'
import { createMockProjectService, createMockReqRes } from '../utils/setupTests.js'

// Captured before boundary wiring. Accepted inputs must reach the same adapter.
export const acceptedWrites = [
  { method: 'createCR', params: { projectId: 'test-project' }, body: { title: '  title  ', type: 'Bug Fix' }, service: 'createCR' },
  { method: 'createCR', params: { projectId: 'test-project' }, body: { title: 'x'.repeat(250), type: 'Research', priority: 'High', level: 'epic', description: 'detail' }, service: 'createCR' },
  { method: 'patchCR', params: { projectId: 'test-project', crId: 'test-1' }, body: { status: 'In Progress', priority: 'High', assignee: 'plain-user', level: 'e', phaseEpic: 'P1', relatedTickets: ['TEST-2'], dependsOn: 'TEST-3', blocks: [] }, service: 'updateCRPartial' },
  { method: 'updateCR', params: { projectId: 'test-project', crId: '1' }, body: { assignee: 'plain-user', level: 't' }, service: 'updateCRPartial' },
  { method: 'patchCR', params: { projectId: 'test-project', crId: '1' }, body: { implementationNotes: 'ignored' }, service: 'updateCRPartial' },
  { method: 'deleteCR', params: { projectId: 'test-project', crId: 'test-1' }, service: 'deleteCR' },
] as const

describe('Phase 0 REST compatibility fixtures', () => {
  it.each(acceptedWrites)('$method preserves adapter arguments: $body', async (fixture) => {
    const service = { createCR: jest.fn(), updateCRPartial: jest.fn(), deleteCR: jest.fn() }
    const controller = new TicketController(createMockProjectService() as unknown as ProjectServiceExtension, service as unknown as TicketService)
    const { req, res } = createMockReqRes()
    req.params = { ...fixture.params }
    req.body = 'body' in fixture ? fixture.body : undefined
    await controller[fixture.method](req as AuthenticatedRequest, res as Response)
    const expected: unknown[] = [fixture.params.projectId]
    if ('crId' in fixture.params)
      expected.push(fixture.params.crId)
    if ('body' in fixture)
      expected.push(fixture.body)
    expect(service[fixture.service]).toHaveBeenCalledWith(...expected)
  })
})
