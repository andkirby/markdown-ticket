/**
 * API Integration Tests - MDT-106.
 *
 * Comprehensive integration tests for server API endpoints.
 * Tests use Supertest for HTTP testing without starting actual servers.
 *
 * Test Coverage:
 * - GET /api/projects/:projectId/crs/:crId - Retrieve specific CR
 * - POST /api/projects/:projectId/crs - Create new CR
 * - PATCH /api/projects/:projectId/crs/:crId - Partial update CR
 * - PUT /api/projects/:projectId/crs/:crId - Full update CR
 * - DELETE /api/projects/:projectId/crs/:crId - Delete CR
 * - Error handling for all endpoints.
 */

/// <reference types="jest" />

import { crFixtures, crUpdateFixtures, errorFixtures } from '../api/fixtures/projects'
import { assertBadRequest, assertCRStructure, assertCRUDSuccess, assertErrorMessage, assertNotFound, assertSuccess, projectApi } from '../api/helpers'
import { cleanupTestEnvironment, createTestProjectWithCR, setupTestEnvironment } from '../api/setup'

describe('aPI Integration Tests - CRUD Endpoints (MDT-106)', () => {
  let tempDir: string
  let projectFactory: Awaited<ReturnType<typeof setupTestEnvironment>>['projectFactory']
  let app: Awaited<ReturnType<typeof setupTestEnvironment>>['app']
  let projectCode: string
  let crCode: string

  beforeAll(async () => {
    console.log('[TEST] Starting beforeAll hook...')

    try {
      // Setup isolated test environment with temporary directory
      const context = await setupTestEnvironment()

      console.log('[TEST] Setup complete, tempDir:', context.tempDir)

      tempDir = context.tempDir
      projectFactory = context.projectFactory
      app = context.app

      console.log('[TEST] Creating test project and CR...')
      // Create test project with CR for testing
      const testData = await createTestProjectWithCR(projectFactory, {
        name: 'API Integration Test Project',
        code: 'API',
      })

      projectCode = testData.projectCode
      crCode = testData.crCode

      console.log('[TEST] Project created:', projectCode, 'CR created:', crCode)
    }
    catch (error) {
      console.error('[TEST] Error in beforeAll:', error)
      throw error
    }
  })

  afterAll(async () => {
    // Cleanup test environment
    await cleanupTestEnvironment(tempDir)
  })

  describe('gET /api/projects/:projectId/crs/:crId', () => {
    it('should return 200 with CR data for valid request', async () => {
      const response = await projectApi.getCR(app, projectCode, crCode)

      assertSuccess(response, 200)
      assertCRStructure(response)
      expect(response.body.code).toBe(crCode)
      expect(response.body.title).toBe('Test CR for API Testing')
    })

    it('should return 404 when CR does not exist', async () => {
      const response = await projectApi.getCR(app, projectCode, 'NONEXISTENT-999')

      assertNotFound(response)
      assertErrorMessage(response, 'not found')
    })

    it('should return 404 when project does not exist', async () => {
      const response = await projectApi.getCR(app, 'NONEXISTENT', crCode)

      assertNotFound(response)
      assertErrorMessage(response, 'not found')
    })
  })

  describe('pOST /api/projects/:projectId/crs', () => {
    it('should create a new CR with valid data', async () => {
      const response = await projectApi.createCR(app, projectCode, crFixtures.feature)

      assertCRUDSuccess(response, 'create')
      expect(response.body.crCode).toMatch(/^API-\d+$/)
      expect(response.body.filename).toContain('.md')
    })

    it('should create CR with bug type', async () => {
      const response = await projectApi.createCR(app, projectCode, crFixtures.bug)

      assertCRUDSuccess(response, 'create')
      expect(response.body.message).toContain('created successfully')
    })

    it('should return 400 when title is missing', async () => {
      const response = await projectApi.createCR(app, projectCode, errorFixtures.missingTitle)

      assertBadRequest(response)
      assertErrorMessage(response, 'required')
    })

    it('should return 400 when type is missing', async () => {
      const response = await projectApi.createCR(app, projectCode, errorFixtures.missingType)

      assertBadRequest(response)
      assertErrorMessage(response, 'required')
    })

    it('should return 404 when project does not exist', async () => {
      const response = await projectApi.createCR(app, 'NONEXISTENT', crFixtures.feature)

      assertNotFound(response)
      assertErrorMessage(response, 'not found')
    })
  })

  describe('pATCH /api/projects/:projectId/crs/:crId', () => {
    it('should update CR status partially', async () => {
      const response = await projectApi.patchCR(app, projectCode, crCode, crUpdateFixtures.statusChange)

      assertCRUDSuccess(response, 'update')
      expect(response.body.updatedFields).toContain('status')
    })

    it('should update CR priority', async () => {
      const response = await projectApi.patchCR(app, projectCode, crCode, crUpdateFixtures.priorityChange)

      assertCRUDSuccess(response, 'update')
      expect(response.body.updatedFields).toContain('priority')
    })

    it('should update multiple fields at once', async () => {
      const response = await projectApi.patchCR(app, projectCode, crCode, crUpdateFixtures.multipleFields)

      assertCRUDSuccess(response, 'update')
      expect(response.body.updatedFields.length).toBeGreaterThan(1)
    })

    it('should return 400 for invalid status transition', async () => {
      const response = await projectApi.patchCR(app, projectCode, crCode, crUpdateFixtures.invalidStatus)

      assertBadRequest(response)
      assertErrorMessage(response, 'Invalid')
    })

    it('should return 400 when no update data provided', async () => {
      const response = await projectApi.patchCR(app, projectCode, crCode, crUpdateFixtures.empty)

      assertBadRequest(response)
      assertErrorMessage(response, 'No update data')
    })

    it('should return 404 when CR does not exist', async () => {
      const response = await projectApi.patchCR(app, projectCode, 'NONEXISTENT-999', crUpdateFixtures.statusChange)

      assertNotFound(response)
      assertErrorMessage(response, 'not found')
    })
  })

  describe('pUT /api/projects/:projectId/crs/:crId', () => {
    let putTestCRCode: string

    beforeAll(async () => {
      // Create a fresh CR for PUT tests to avoid conflicts with PATCH tests
      const crResult = await projectFactory.createTestCR(projectCode, {
        title: 'PUT Test CR',
        type: 'Feature Enhancement',
        content: 'Test CR for PUT endpoint',
      })

      if (!crResult.success) {
        throw new Error(`Failed to create CR for PUT tests: ${crResult.error}`)
      }
      putTestCRCode = crResult.crCode!
    })

    it('should update CR fully (delegates to updateCRPartial)', async () => {
      const response = await projectApi.updateCR(app, projectCode, putTestCRCode, {
        priority: 'Critical',
        status: 'Approved',
      })

      assertCRUDSuccess(response, 'update')
      expect(response.body.updatedFields).toContain('priority')
      expect(response.body.updatedFields).toContain('status')
    })

    it('should return 404 when CR does not exist', async () => {
      const response = await projectApi.updateCR(app, projectCode, 'NONEXISTENT-999', {
        status: 'In Progress',
      })

      assertNotFound(response)
      assertErrorMessage(response, 'not found')
    })
  })

  describe('dELETE /api/projects/:projectId/crs/:crId', () => {
    let crToDelete: string

    beforeAll(async () => {
      // Create a CR specifically for deletion tests
      const crResult = await projectFactory.createTestCR(projectCode, {
        title: 'CR To Be Deleted',
        type: 'Bug Fix',
        content: 'This CR will be deleted in tests',
      })

      if (!crResult.success) {
        throw new Error(`Failed to create CR for deletion: ${crResult.error}`)
      }
      crToDelete = crResult.crCode!
    })

    it('should delete CR successfully', async () => {
      const response = await projectApi.deleteCR(app, projectCode, crToDelete)

      assertCRUDSuccess(response, 'delete')
      expect(response.body.message).toContain('deleted')
    })

    it('should return 404 when trying to delete non-existent CR', async () => {
      const response = await projectApi.deleteCR(app, projectCode, 'ALREADY-DELETED-999')

      assertNotFound(response)
      assertErrorMessage(response, 'not found')
    })

    it('should return 404 when project does not exist', async () => {
      const response = await projectApi.deleteCR(app, 'NONEXISTENT', crToDelete)

      assertNotFound(response)
      assertErrorMessage(response, 'not found')
    })
  })

  describe('aPI Error Handling', () => {
    it('should handle malformed request body', async () => {
      const response = await projectApi.createCR(app, projectCode, errorFixtures.emptyCR)

      assertBadRequest(response)
    })

    it('should handle missing projectId parameter', async () => {
      const response = await projectApi.getCR(app, '', crCode)

      // Empty projectId results in 404 or 400 depending on routing
      expect([400, 404]).toContain(response.status)
    })

    it('should handle missing crId parameter', async () => {
      const response = await projectApi.getCR(app, projectCode, '')

      // Empty crId matches the listCRs route instead of getCR due to Express routing
      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })

  describe('gET /api/projects/:projectId/crs (List CRs)', () => {
    it('should return list of CRs for project', async () => {
      const response = await projectApi.listCRs(app, projectCode)

      assertSuccess(response, 200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)

      // Should contain our initial test CR
      // eslint-disable-next-line ts/no-explicit-any
      const testCR = response.body.find((cr: any) => cr.code === crCode)

      expect(testCR).toBeDefined()
    })

    it('should return empty array for project with no CRs', async () => {
      // Create a new project without any CRs
      const emptyProject = await projectFactory.createProject({
        name: 'Empty Test Project',
        code: 'EMPTY',
      })

      const response = await projectApi.listCRs(app, emptyProject.key)

      assertSuccess(response, 200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(0)
    })

    it('should support bypassCache query parameter', async () => {
      const response = await projectApi.listCRs(app, projectCode, true)

      assertSuccess(response, 200)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })

  describe('gET /api/projects (List Projects)', () => {
    it('should return list of all active projects', async () => {
      const response = await projectApi.listProjects(app)

      assertSuccess(response, 200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)

      // Should contain our test project
      // eslint-disable-next-line ts/no-explicit-any
      const testProject = response.body.find((p: any) => p.id === projectCode)

      expect(testProject).toBeDefined()
    })

    it('should support bypassCache query parameter', async () => {
      const response = await projectApi.listProjects(app, true)

      assertSuccess(response, 200)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })
})
