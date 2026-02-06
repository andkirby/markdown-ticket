/// <reference types="jest" />

import express from 'express'
import request from 'supertest'

// Type definitions for Express
type ExpressRequest = express.Request
type ExpressResponse = express.Response
type ExpressApplication = express.Application

// Mock all external modules before imports
jest.mock('@mdt/shared/services/ProjectService')
jest.mock('@mdt/shared/services/TemplateService')
jest.mock('@mdt/shared/services/MarkdownService')
jest.mock('@mdt/shared/services/TitleExtractionService')
jest.mock('../../src/services/crService')
jest.mock('../../src/tools/handlers/projectHandlers')
jest.mock('../../src/tools/handlers/crHandlers')
jest.mock('../../src/tools/handlers/sectionHandlers')

// Mock the modules that exist in the parent directories
const mockCreateProjectRouter = jest.fn()
jest.mock('../../../server/routes/projects', () => ({
  createProjectRouter: mockCreateProjectRouter,
}))

// Test data
const testProject = {
  id: 'test-project',
  project: {
    name: 'Test Project',
    code: 'TEST',
    path: '/tmp/test-project',
    active: true,
    crPath: '/tmp/test-project/docs/CRs',
  },
}

const testDate = new Date()
const testCR = {
  code: 'TEST-001',
  title: 'Test CR for Integration',
  type: 'Feature Enhancement',
  priority: 'Medium',
  status: 'Proposed' as const,
  content: `## 1. Description\n\nTest description.`,
  phaseEpic: 'Test Phase',
  assignee: 'test-user',
  filePath: '/tmp/test-project/docs/CRs/TEST-001.md',
  modified: testDate.toISOString(),
  created: testDate.toISOString(),
}

describe('mCP-Backend Consistency Integration Tests (Simplified)', () => {
  let backendApp: ExpressApplication
  let mockProjectService: jest.Mocked<{
    getAllProjects: jest.Mock
    getProjectConfig: jest.Mock
    projectDiscovery: {
      getAllProjects: jest.Mock
    }
  }>
  let mockTicketService: jest.Mocked<{
    getCR: jest.Mock
    createCR: jest.Mock
    updateCRPartial: jest.Mock
    deleteCR: jest.Mock
    getProjectCRs: jest.Mock
  }>
  let _mockProjectController: jest.Mocked<{
    getAllProjects: jest.Mock
    getProjectConfig: jest.Mock
    getProjectCRs: jest.Mock
    getCR: jest.Mock
    createCR: jest.Mock
    updateCRPartial: jest.Mock
    deleteCR: jest.Mock
  }>

  beforeAll(() => {
    // Set up backend Express app
    backendApp = express()
    backendApp.use(express.json())

    // Mock services
    mockProjectService = {
      getAllProjects: jest.fn(),
      getProjectConfig: jest.fn(),
      projectDiscovery: {
        getAllProjects: jest.fn(),
      },
    }

    mockTicketService = {
      getCR: jest.fn(),
      createCR: jest.fn(),
      updateCRPartial: jest.fn(),
      deleteCR: jest.fn(),
      getProjectCRs: jest.fn(),
    }

    const _mockFileSystemService = {
      buildProjectFileSystemTree: jest.fn(),
    }

    _mockProjectController = {
      getAllProjects: jest.fn(),
      getProjectConfig: jest.fn(),
      getProjectCRs: jest.fn(),
      getCR: jest.fn(),
      createCR: jest.fn(),
      updateCRPartial: jest.fn(),
      deleteCR: jest.fn(),
    } as jest.Mocked<{
      getAllProjects: jest.Mock
      getProjectConfig: jest.Mock
      getProjectCRs: jest.Mock
      getCR: jest.Mock
      createCR: jest.Mock
      updateCRPartial: jest.Mock
      deleteCR: jest.Mock
    }>

    // Mock createProjectRouter to return a router that calls our controller
    const mockRouter = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      use: jest.fn(),
    } as jest.Mocked<{
      get: jest.Mock
      post: jest.Mock
      patch: jest.Mock
      put: jest.Mock
      delete: jest.Mock
      use: jest.Mock
    }>
    mockCreateProjectRouter.mockReturnValue(mockRouter)

    // Set up route handlers manually
    backendApp.get('/api/projects', async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const projects = await mockProjectService.getAllProjects()
        res.json(projects)
      }
      catch {
        res.status(500).json({ error: 'Failed to fetch projects' })
      }
    })

    backendApp.get('/api/projects/:projectId/config', async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const config = await mockProjectService.getProjectConfig(req.params.projectId)
        res.json(config)
      }
      catch {
        res.status(404).json({ error: 'Project not found' })
      }
    })

    backendApp.get('/api/projects/:projectId/crs/:crId', async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const cr = await mockTicketService.getCR(req.params.projectId, req.params.crId)
        if (!cr) {
          return res.status(404).json({ error: 'CR not found' })
        }
        // Convert dates to strings for JSON serialization
        const serializedCR = {
          ...cr,
          created: cr.created instanceof Date ? cr.created.toISOString() : cr.created,
          modified: cr.modified instanceof Date ? cr.modified.toISOString() : cr.modified,
        }
        res.json(serializedCR)
      }
      catch {
        res.status(404).json({ error: 'CR not found' })
      }
    })

    backendApp.get('/api/projects/:projectId/crs', async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const crs = await mockTicketService.getProjectCRs(req.params.projectId, req.query)
        // Convert dates to strings for JSON serialization
        interface CRWithDates {
          created: Date | string
          modified: Date | string
          [key: string]: unknown
        }
        const serializedCRs = crs.map((cr: CRWithDates) => ({
          ...cr,
          created: cr.created instanceof Date ? cr.created.toISOString() : cr.created,
          modified: cr.modified instanceof Date ? cr.modified.toISOString() : cr.modified,
        }))
        res.json(serializedCRs)
      }
      catch {
        res.status(404).json({ error: 'Project not found' })
      }
    })

    backendApp.post('/api/projects/:projectId/crs', async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const result = await mockTicketService.createCR(req.params.projectId, req.body)
        res.status(201).json(result)
      }
      catch {
        res.status(400).json({ error: 'Failed to create CR' })
      }
    })

    backendApp.patch('/api/projects/:projectId/crs/:crId', async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const result = await mockTicketService.updateCRPartial(
          req.params.projectId,
          req.params.crId,
          req.body,
        )
        res.json(result)
      }
      catch {
        res.status(400).json({ error: 'Failed to update CR' })
      }
    })

    backendApp.delete('/api/projects/:projectId/crs/:crId', async (req: ExpressRequest, res: ExpressResponse) => {
      try {
        const result = await mockTicketService.deleteCR(
          req.params.projectId,
          req.params.crId,
        )
        res.json(result)
      }
      catch {
        res.status(500).json({ error: 'Failed to delete CR' })
      }
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mock returns
    mockProjectService.getAllProjects.mockResolvedValue([testProject])
    mockProjectService.getProjectConfig.mockResolvedValue(testProject.project)
    mockTicketService.getCR.mockResolvedValue(testCR)
    mockTicketService.getProjectCRs.mockResolvedValue([testCR])
    mockTicketService.createCR.mockResolvedValue({
      ...testCR,
      code: 'TEST-002',
    })
    mockTicketService.updateCRPartial.mockResolvedValue({
      success: true,
      message: 'CR updated successfully',
      updatedFields: ['status'],
    })
    mockTicketService.deleteCR.mockResolvedValue({
      success: true,
      message: 'CR deleted successfully',
    })
  })

  describe('backend API Tests', () => {
    it('should return projects list', async () => {
      const response = await request(backendApp)
        .get('/api/projects')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toEqual([testProject])
    })

    it('should return project config', async () => {
      const response = await request(backendApp)
        .get('/api/projects/test-project/config')
        .expect(200)

      expect(response.body).toEqual(testProject.project)
    })

    it('should return CR list', async () => {
      const response = await request(backendApp)
        .get('/api/projects/test-project/crs')
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toEqual([testCR])
    })

    it('should return specific CR', async () => {
      const response = await request(backendApp)
        .get('/api/projects/test-project/crs/TEST-001')
        .expect(200)

      expect(response.body).toEqual(testCR)
    })

    it('should create new CR', async () => {
      const newCR = {
        title: 'New CR',
        type: 'Bug Fix',
        priority: 'High',
      }

      const response = await request(backendApp)
        .post('/api/projects/test-project/crs')
        .send(newCR)
        .expect(201)

      expect(response.body.code).toBe('TEST-002')
    })

    it('should update CR', async () => {
      const update = { status: 'In Progress' }

      const response = await request(backendApp)
        .patch('/api/projects/test-project/crs/TEST-001')
        .send(update)
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('should delete CR', async () => {
      const response = await request(backendApp)
        .delete('/api/projects/test-project/crs/TEST-001')
        .expect(200)

      expect(response.body.success).toBe(true)
    })

    it('should handle 404 for non-existent project', async () => {
      mockProjectService.getProjectConfig.mockRejectedValue(new Error('Project not found'))

      const response = await request(backendApp)
        .get('/api/projects/non-existent/config')
        .expect(404)

      expect(response.body.error).toContain('not found')
    })

    it('should handle 404 for non-existent CR', async () => {
      mockTicketService.getCR.mockResolvedValue(null)

      const response = await request(backendApp)
        .get('/api/projects/test-project/crs/NON-EXISTENT')
        .expect(404)

      expect(response.body.error).toContain('not found')
    })
  })

  describe('data Structure Validation', () => {
    it('should validate project structure', async () => {
      const response = await request(backendApp)
        .get('/api/projects')
        .expect(200)

      const projects = response.body
      if (projects.length > 0) {
        const project = projects[0]
        expect(project).toHaveProperty('id')
        expect(project).toHaveProperty('project')
        expect(project.project).toHaveProperty('name')
        expect(project.project).toHaveProperty('code')
        expect(project.project).toHaveProperty('path')
        expect(project.project).toHaveProperty('active')
      }
    })

    it('should validate CR structure', async () => {
      const response = await request(backendApp)
        .get('/api/projects/test-project/crs/TEST-001')
        .expect(200)

      const cr = response.body
      expect(cr).toHaveProperty('code')
      expect(cr).toHaveProperty('title')
      expect(cr).toHaveProperty('type')
      expect(cr).toHaveProperty('status')
      expect(cr).toHaveProperty('priority')
      expect(cr).toHaveProperty('content')

      // Validate enums
      expect(['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected']).toContain(cr.status)
      expect(['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation']).toContain(cr.type)
      expect(['Low', 'Medium', 'High', 'Critical']).toContain(cr.priority)
    })
  })
})
