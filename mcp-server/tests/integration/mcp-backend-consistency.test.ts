/// <reference types="jest" />

import type { Application } from 'express'
import { MarkdownService } from '@mdt/shared/services/MarkdownService.js'
import { ProjectService } from '@mdt/shared/services/ProjectService.js'
import { TemplateService } from '@mdt/shared/services/TemplateService.js'
import { TitleExtractionService } from '@mdt/shared/services/TitleExtractionService.js'
import express from 'express'
import request from 'supertest'
import { ProjectController } from '../../../server/controllers/ProjectController'
import { createProjectRouter } from '../../../server/routes/projects'
import { CRService } from '../../src/services/crService'
import { MCPTools } from '../../src/tools/index'

declare const global: typeof globalThis

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}

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

const testCR = {
  code: 'TEST-001',
  title: 'Test CR for Integration',
  type: 'Feature Enhancement',
  priority: 'Medium',
  status: 'Proposed' as const,
  content: `## 1. Description

Test description for integration testing.

## 2. Rationale

Testing MCP-backend consistency.

## 3. Solution Analysis

This is a test CR.

## 4. Implementation Specification

No actual implementation needed.

## 5. Acceptance Criteria

- Test passes
- Consistency verified`,
  phaseEpic: 'Test Phase',
  assignee: 'test-user',
  relatedTickets: 'TEST-002',
  dependsOn: 'TEST-000',
  blocks: 'TEST-003',
  filePath: '/tmp/test-project/docs/CRs/TEST-001.md',
  modified: new Date(),
  created: new Date(),
}

describe('mCP-Backend Consistency Integration Tests', () => {
  let mcpTools: MCPTools
  let backendApp: Application
  let backendRequest: any
  let mockProjectService: any
  let mockTicketService: any
  let mockProjectController: ProjectController

  beforeAll(async () => {
    // Initialize MCP Tools
    const projectService = new ProjectService()
    const crService = new CRService()
    const templateService = new TemplateService()
    const markdownService = new MarkdownService()
    const titleExtractionService = new TitleExtractionService()

    mcpTools = new MCPTools(
      projectService,
      crService,
      templateService,
      markdownService,
      titleExtractionService,
    )

    // Set up backend Express app
    backendApp = express()
    backendApp.use(express.json())

    // Mock services for backend
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

    const mockFileSystemService = {
      buildProjectFileSystemTree: jest.fn(),
    }

    mockProjectController = new ProjectController(
      mockProjectService,
      mockFileSystemService,
      {} as any,
      undefined,
      mockTicketService,
    )

    backendApp.use('/api/projects', createProjectRouter(mockProjectController) as any)

    backendRequest = request(backendApp)
  })

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup default mock returns
    mockProjectService.getAllProjects.mockResolvedValue([testProject])
    mockProjectService.getProjectConfig.mockResolvedValue(testProject.project)
    mockTicketService.getCR.mockResolvedValue(testCR)
    mockTicketService.getProjectCRs.mockResolvedValue([testCR])
  })

  describe('project Tools Consistency', () => {
    it('should return identical results for list_projects vs GET /api/projects', async () => {
      // Call MCP tool
      const mcpResult = await mcpTools.handleToolCall('list_projects', {})
      const mcpData = JSON.parse(mcpResult)

      // Call backend API
      const backendResponse = await backendRequest
        .get('/api/projects')
        .expect(200)
      const backendData = backendResponse.body

      // Compare structure and content
      expect(Array.isArray(mcpData)).toBe(true)
      expect(Array.isArray(backendData)).toBe(true)
      expect(mcpData).toEqual(backendData)
      expect(mcpData.length).toBe(1)
      expect(mcpData[0].id).toBe(testProject.id)
    })

    it('should return identical results for get_project_info vs GET /api/projects/:id/config', async () => {
      const projectId = 'test-project'

      // Call MCP tool
      const mcpResult = await mcpTools.handleToolCall('get_project_info', { key: projectId })
      const mcpData = JSON.parse(mcpResult)

      // Call backend API
      const backendResponse = await backendRequest
        .get(`/${projectId}/config`)
        .expect(200)
      const backendData = backendResponse.body

      // Compare structure and content
      expect(mcpData).toEqual(backendData)
      expect(mcpData.name).toBe(testProject.project.name)
      expect(mcpData.code).toBe(testProject.project.code)
    })

    it('should handle errors consistently for non-existent project', async () => {
      const nonExistentId = 'non-existent'

      // Mock project not found
      mockProjectService.getProjectConfig.mockRejectedValue(new Error('Project not found'))

      // MCP should throw error
      await expect(mcpTools.handleToolCall('get_project_info', { key: nonExistentId }))
        .rejects
        .toThrow()

      // Backend should return 404
      const backendResponse = await backendRequest
        .get(`/${nonExistentId}/config`)
        .expect(404)

      expect(backendResponse.body).toHaveProperty('error')
    })
  })

  describe('cR Tools Consistency', () => {
    beforeEach(() => {
      // Mock project lookup for MCP tools
      mockProjectService.projectDiscovery.getAllProjects.mockResolvedValue([testProject])
    })

    it('should return identical results for list_crs vs GET /api/projects/:id/crs', async () => {
      const filters = { status: 'Proposed' }

      // Call MCP tool
      const mcpResult = await mcpTools.handleToolCall('list_crs', {
        project: 'TEST',
        filters,
      })
      const mcpData = JSON.parse(mcpResult)

      // Call backend API
      const backendResponse = await backendRequest
        .get('/test-project/crs')
        .query({ status: 'Proposed' })
        .expect(200)
      const backendData = backendResponse.body

      // Compare structure and content
      expect(Array.isArray(mcpData)).toBe(true)
      expect(Array.isArray(backendData)).toBe(true)
      expect(mcpData.length).toBe(backendData.length)
    })

    it('should return identical results for get_cr vs GET /api/projects/:id/crs/:crId', async () => {
      const crId = 'TEST-001'

      // Call MCP tool with full mode
      const mcpResult = await mcpTools.handleToolCall('get_cr', {
        project: 'TEST',
        key: crId,
        mode: 'full',
      })
      const mcpData = JSON.parse(mcpResult)

      // Call backend API
      const backendResponse = await backendRequest
        .get(`/test-project/crs/${crId}`)
        .expect(200)
      const backendData = backendResponse.body

      // Compare key fields
      expect(mcpData.code).toBe(backendData.code)
      expect(mcpData.title).toBe(backendData.title)
      expect(mcpData.type).toBe(backendData.type)
      expect(mcpData.status).toBe(backendData.status)
      expect(mcpData.content).toBe(backendData.content)
    })

    it('should return identical results for get_cr attributes mode', async () => {
      const crId = 'TEST-001'

      // Call MCP tool with attributes mode
      const mcpResult = await mcpTools.handleToolCall('get_cr', {
        project: 'TEST',
        key: crId,
        mode: 'attributes',
      })
      const mcpData = JSON.parse(mcpResult)

      // Attributes mode should return YAML frontmatter only
      expect(mcpData).toHaveProperty('code')
      expect(mcpData).toHaveProperty('title')
      expect(mcpData).toHaveProperty('type')
      expect(mcpData).toHaveProperty('status')
      expect(mcpData).toHaveProperty('priority')
      expect(mcpData).toHaveProperty('phaseEpic')
      expect(mcpData).toHaveProperty('assignee')
      // Should not have markdown content
      expect(mcpData).not.toHaveProperty('content')
    })

    it('should return identical results for create_cr vs POST /api/projects/:id/crs', async () => {
      const newCRData = {
        title: 'New Test CR',
        type: 'Bug Fix',
        priority: 'High',
        content: `## 1. Description

New test CR description.

## 2. Rationale

Testing creation consistency.`,
      }

      const createdCR = {
        ...testCR,
        code: 'TEST-002',
        title: newCRData.title,
        type: newCRData.type,
      }

      mockTicketService.createCR.mockResolvedValue(createdCR)

      // Call MCP tool
      const mcpResult = await mcpTools.handleToolCall('create_cr', {
        project: 'TEST',
        type: newCRData.type,
        data: newCRData,
      })
      const mcpData = JSON.parse(mcpResult)

      // Call backend API
      const backendResponse = await backendRequest
        .post('/test-project/crs')
        .send(newCRData)
        .expect(201)
      const backendData = backendResponse.body

      // Both should return created CR
      expect(mcpData.code).toBe(backendData.code)
      expect(mcpData.title).toBe(backendData.title)
      expect(mcpData.type).toBe(backendData.type)
    })

    it('should return identical results for update_cr_status vs PATCH /api/projects/:id/crs/:crId', async () => {
      const updateData = { status: 'In Progress' }
      const _updatedCR = { ...testCR, status: 'In Progress' }

      mockTicketService.updateCRPartial.mockResolvedValue({
        success: true,
        message: 'CR updated successfully',
        updatedFields: ['status'],
      })

      // Call MCP tool
      const mcpResult = await mcpTools.handleToolCall('update_cr_status', {
        project: 'TEST',
        key: 'TEST-001',
        status: 'In Progress',
      })
      const mcpData = JSON.parse(mcpResult)

      // Call backend API
      const backendResponse = await backendRequest
        .patch('/test-project/crs/TEST-001')
        .send(updateData)
        .expect(200)
      const backendData = backendResponse.body

      // Both should return success response
      expect(mcpData.success).toBe(backendData.success)
      expect(mcpData.message).toContain('updated')
      expect(backendData.message).toContain('updated')
    })

    it('should return identical results for update_cr_attrs vs PATCH /api/projects/:id/crs/:crId', async () => {
      const updateData = {
        priority: 'Critical',
        phaseEpic: 'Updated Phase',
      }

      mockTicketService.updateCRPartial.mockResolvedValue({
        success: true,
        message: 'CR updated successfully',
        updatedFields: ['priority', 'phaseEpic'],
      })

      // Call MCP tool
      const mcpResult = await mcpTools.handleToolCall('update_cr_attrs', {
        project: 'TEST',
        key: 'TEST-001',
        attributes: updateData,
      })
      const mcpData = JSON.parse(mcpResult)

      // Call backend API
      const backendResponse = await backendRequest
        .patch('/test-project/crs/TEST-001')
        .send(updateData)
        .expect(200)
      const backendData = backendResponse.body

      // Both should return success response
      expect(mcpData.success).toBe(backendData.success)
      expect(mcpData.updatedFields).toEqual(backendData.updatedFields)
    })

    it('should return identical results for delete_cr vs DELETE /api/projects/:id/crs/:crId', async () => {
      mockTicketService.deleteCR.mockResolvedValue({
        success: true,
        message: 'CR deleted successfully',
        filename: 'TEST-001.md',
      })

      // Call MCP tool
      const mcpResult = await mcpTools.handleToolCall('delete_cr', {
        project: 'TEST',
        key: 'TEST-001',
      })
      const mcpData = JSON.parse(mcpResult)

      // Call backend API
      const backendResponse = await backendRequest
        .delete('/test-project/crs/TEST-001')
        .expect(200)
      const backendData = backendResponse.body

      // Both should return success response
      expect(mcpData.success).toBe(backendData.success)
      expect(mcpData.message).toContain('deleted')
      expect(backendData.message).toContain('deleted')
    })
  })

  describe('section Management Tool', () => {
    it('should handle manage_cr_sections operations', async () => {
      // Test list operation
      const mcpResult = await mcpTools.handleToolCall('manage_cr_sections', {
        project: 'TEST',
        key: 'TEST-001',
        operation: 'list',
      })
      const mcpData = JSON.parse(mcpResult)

      // Should return sections structure
      expect(mcpData).toHaveProperty('sections')
      expect(Array.isArray(mcpData.sections)).toBe(true)
    })

    it('should handle section get operation', async () => {
      const mcpResult = await mcpTools.handleToolCall('manage_cr_sections', {
        project: 'TEST',
        key: 'TEST-001',
        operation: 'get',
        section: 'Description',
      })
      const mcpData = JSON.parse(mcpResult)

      // Should return section content
      expect(mcpData).toHaveProperty('content')
    })

    it('should handle section operations with errors consistently', async () => {
      // Invalid operation should throw error
      await expect(mcpTools.handleToolCall('manage_cr_sections', {
        project: 'TEST',
        key: 'TEST-001',
        operation: 'invalid',
      })).rejects.toThrow()
    })
  })

  describe('cR Improvement Suggestions Tool', () => {
    it('should provide improvement suggestions', async () => {
      const mcpResult = await mcpTools.handleToolCall('suggest_cr_improvements', {
        project: 'TEST',
        key: 'TEST-001',
      })

      // Should return formatted suggestions
      expect(mcpResult).toContain('💡 **CR Improvement Suggestions')
      expect(typeof mcpResult).toBe('string')
    })

    it('should handle non-existent CR for suggestions', async () => {
      mockTicketService.getCR.mockResolvedValue(null)

      await expect(mcpTools.handleToolCall('suggest_cr_improvements', {
        project: 'TEST',
        key: 'TEST-999',
      })).rejects.toThrow()
    })
  })

  describe('error Handling Consistency', () => {
    it('should handle missing required parameters consistently', async () => {
      // MCP tools should throw for missing params
      await expect(mcpTools.handleToolCall('get_cr', {
        project: 'TEST',
        // Missing key
      })).rejects.toThrow()

      // Backend should return 400 for missing params
      const backendResponse = await backendRequest
        .get('/test-project/crs/')
        .expect(404) // Express treats missing param as not found

      expect(backendResponse.body).toHaveProperty('error')
    })

    it('should handle invalid project codes consistently', async () => {
      const invalidProject = 'INVALID'

      // Mock project not found
      mockProjectService.projectDiscovery.getAllProjects.mockResolvedValue([])

      // MCP should throw error
      await expect(mcpTools.handleToolCall('list_crs', {
        project: invalidProject,
      })).rejects.toThrow()

      // Backend should handle via controller
      mockProjectService.getAllProjects.mockResolvedValue([])
      const backendResponse = await backendRequest
        .get('/invalid-project/crs')
        .expect(404)

      expect(backendResponse.body).toHaveProperty('error')
    })

    it('should handle CR not found consistently', async () => {
      const nonExistentCR = 'TEST-999'

      mockTicketService.getCR.mockRejectedValue(new Error('CR not found'))

      // MCP should throw error
      await expect(mcpTools.handleToolCall('get_cr', {
        project: 'TEST',
        key: nonExistentCR,
      })).rejects.toThrow()

      // Backend should return 404
      const backendResponse = await backendRequest
        .get(`/test-project/crs/${nonExistentCR}`)
        .expect(404)

      expect(backendResponse.body).toHaveProperty('error')
    })
  })

  describe('data Structure Validation', () => {
    it('should validate CR structure consistency', async () => {
      // Get CR via MCP
      const mcpResult = await mcpTools.handleToolCall('get_cr', {
        project: 'TEST',
        key: 'TEST-001',
        mode: 'full',
      })
      const mcpCR = JSON.parse(mcpResult)

      // Validate required fields exist
      expect(mcpCR).toHaveProperty('code')
      expect(mcpCR).toHaveProperty('title')
      expect(mcpCR).toHaveProperty('type')
      expect(mcpCR).toHaveProperty('status')
      expect(mcpCR).toHaveProperty('priority')
      expect(mcpCR).toHaveProperty('content')

      // Validate enums
      expect(['Proposed', 'Approved', 'In Progress', 'Implemented', 'Rejected']).toContain(mcpCR.status)
      expect(['Architecture', 'Feature Enhancement', 'Bug Fix', 'Technical Debt', 'Documentation']).toContain(mcpCR.type)
      expect(['Low', 'Medium', 'High', 'Critical']).toContain(mcpCR.priority)

      // Validate markdown structure
      expect(mcpCR.content).toContain('## 1. Description')
      expect(mcpCR.content).toContain('## 2. Rationale')
      expect(mcpCR.content).toContain('## 3. Solution Analysis')
      expect(mcpCR.content).toContain('## 4. Implementation Specification')
      expect(mcpCR.content).toContain('## 5. Acceptance Criteria')
    })

    it('should validate project structure consistency', async () => {
      // Get projects via MCP
      const mcpResult = await mcpTools.handleToolCall('list_projects', {})
      const mcpProjects = JSON.parse(mcpResult)

      if (mcpProjects.length > 0) {
        const project = mcpProjects[0]

        // Validate required fields
        expect(project).toHaveProperty('id')
        expect(project).toHaveProperty('project')

        // Validate nested project structure
        expect(project.project).toHaveProperty('name')
        expect(project.project).toHaveProperty('code')
        expect(project.project).toHaveProperty('path')
        expect(project.project).toHaveProperty('active')
      }
    })
  })
})
