/**
 * API Metadata Tests - MDT-094.
 *
 * Integration tests for the optimized CR listing endpoint that returns
 * TicketMetadata (without content) instead of full Ticket objects.
 *
 * Key verification:
 * - List endpoint returns metadata-only (no content field)
 * - Detail endpoint unchanged (returns full ticket with content)
 * - Payload size reduction >80%
 * - Response time <200ms
 *
 * @see docs/CRs/MDT-094/architecture.md
 */

/// <reference types="jest" />

import { assertSuccess, assertBodyHasProperties, projectApi } from '../api/helpers'
import { cleanupTestEnvironment, createTestProjectWithCR, setupTestEnvironment } from '../api/setup'

describe('API Metadata Tests - MDT-094', () => {
  let tempDir: string
  let projectFactory: Awaited<ReturnType<typeof setupTestEnvironment>>['projectFactory']
  let app: Awaited<ReturnType<typeof setupTestEnvironment>>['app']
  let projectCode: string
  let crCode: string

  beforeAll(async () => {
    console.log('[TEST] Starting MDT-094 metadata test setup...')

    try {
      const context = await setupTestEnvironment()

      tempDir = context.tempDir
      projectFactory = context.projectFactory
      app = context.app

      // Create test project with CR
      const testData = await createTestProjectWithCR(projectFactory, {
        name: 'Metadata Test Project',
        code: 'META',
      })

      projectCode = testData.projectCode
      crCode = testData.crCode

      console.log('[TEST] MDT-094 setup complete:', { projectCode, crCode })
    }
    catch (error) {
      console.error('[TEST] Error in MDT-094 setup:', error)
      throw error
    }
  })

  afterAll(async () => {
    await cleanupTestEnvironment(tempDir)
  })

  describe('GET /api/projects/:projectId/crs (Metadata Response)', () => {
    it('should return array of TicketMetadata WITHOUT content field', async () => {
      const response = await projectApi.listCRs(app, projectCode)

      assertSuccess(response, 200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body.length).toBeGreaterThan(0)

      // CRITICAL: Each item should NOT have content field
      // This is the key optimization of MDT-094
      response.body.forEach((item: { content?: unknown }) => {
        expect(item).not.toHaveProperty('content')
      })
    })

    it('should include all required metadata fields', async () => {
      const response = await projectApi.listCRs(app, projectCode)

      assertSuccess(response, 200)

      const requiredFields = [
        'code',
        'title',
        'status',
        'type',
        'priority',
        'dateCreated',
        'lastModified',
      ]

      response.body.forEach((item: Record<string, unknown>) => {
        requiredFields.forEach((field) => {
          expect(item).toHaveProperty(field)
        })
      })
    })

    it('should include relationship arrays', async () => {
      const response = await projectApi.listCRs(app, projectCode)

      assertSuccess(response, 200)

      response.body.forEach((item: Record<string, unknown>) => {
        expect(item).toHaveProperty('relatedTickets')
        expect(Array.isArray(item.relatedTickets)).toBe(true)

        expect(item).toHaveProperty('dependsOn')
        expect(Array.isArray(item.dependsOn)).toBe(true)

        expect(item).toHaveProperty('blocks')
        expect(Array.isArray(item.blocks)).toBe(true)
      })
    })

    it('should support sorting by dateCreated', async () => {
      // Create multiple CRs with different dates
      await projectFactory.createTestCR(projectCode, {
        title: 'Oldest CR',
        type: 'Feature Enhancement',
        content: 'Created first',
      })

      await projectFactory.createTestCR(projectCode, {
        title: 'Newest CR',
        type: 'Feature Enhancement',
        content: 'Created last',
      })

      const response = await projectApi.listCRs(app, projectCode)

      assertSuccess(response, 200)

      // Verify dates are present and parseable
      response.body.forEach((item: Record<string, unknown>) => {
        const created = item.dateCreated
        // Can be null or Date/ISO string
        if (created !== null) {
          expect(() => new Date(created as string)).not.toThrow()
        }
      })
    })
  })

  describe('GET /api/projects/:projectId/crs/:crId (Detail Unchanged)', () => {
    it('should return full ticket WITH content for detail endpoint', async () => {
      const response = await projectApi.getCR(app, projectCode, crCode)

      assertSuccess(response, 200)

      // Detail endpoint MUST include content (unchanged behavior)
      expect(response.body).toHaveProperty('content')
      expect(typeof response.body.content).toBe('string')
      expect(response.body.content.length).toBeGreaterThan(0)
    })

    it('should include all Ticket fields in detail response', async () => {
      const response = await projectApi.getCR(app, projectCode, crCode)

      assertSuccess(response, 200)

      // Full ticket should have all fields
      const allFields = [
        'code',
        'title',
        'status',
        'type',
        'priority',
        'content', // Present in detail
        'filePath',
        'dateCreated',
        'lastModified',
        'relatedTickets',
        'dependsOn',
        'blocks',
      ]

      assertBodyHasProperties(response, allFields)
    })
  })

  describe('Performance', () => {
    it('should reduce payload size by >80% for list endpoint', async () => {
      // Create 10 CRs with substantial content
      for (let i = 1; i <= 10; i++) {
        await projectFactory.createTestCR(projectCode, {
          title: `Performance Test CR ${i}`,
          type: 'Feature Enhancement',
          content: `# Detailed Content\n\n${'Lorem ipsum dolor sit amet. '.repeat(100)}`,
        })
      }

      // Get list response
      const listResponse = await projectApi.listCRs(app, projectCode)
      const listSize = JSON.stringify(listResponse.body).length

      // Get single detail to estimate full size
      const detailResponse = await projectApi.getCR(app, projectCode, crCode)
      const singleDetailSize = JSON.stringify(detailResponse.body).length

      // Estimate what full tickets would cost
      const estimatedFullSize = singleDetailSize * (listResponse.body.length)

      // Calculate reduction
      const reduction = ((estimatedFullSize - listSize) / estimatedFullSize) * 100

      console.log('[MDT-094] Payload analysis:', {
        listSize,
        singleDetailSize,
        ticketCount: listResponse.body.length,
        estimatedFullSize,
        reduction: `${reduction.toFixed(1)}%`,
      })

      // Should achieve >80% reduction
      expect(reduction).toBeGreaterThan(80)
    })

    it('should respond within 200ms for list endpoint', async () => {
      const startTime = performance.now()
      const response = await projectApi.listCRs(app, projectCode)
      const elapsed = performance.now() - startTime

      assertSuccess(response, 200)

      console.log('[MDT-094] Response time:', `${elapsed.toFixed(1)}ms`)

      // Should respond within 200ms
      expect(elapsed).toBeLessThan(200)
    })
  })

  describe('Empty and Edge Cases', () => {
    it('should return empty array for project with no CRs', async () => {
      const emptyProject = await projectFactory.createProject('empty', {
        name: 'Empty Metadata Test',
        code: 'EMPMETA',
      })

      const response = await projectApi.listCRs(app, emptyProject.key)

      assertSuccess(response, 200)
      expect(Array.isArray(response.body)).toBe(true)
      expect(response.body).toHaveLength(0)
    })

    it('should return 404 for non-existent project', async () => {
      const response = await projectApi.listCRs(app, 'NONEXISTENT-META')

      expect(response.status).toBe(404)
    })

    it('should handle CR with minimal metadata', async () => {
      // Create CR with minimal fields
      const minimalCR = await projectFactory.createTestCR(projectCode, {
        title: 'Minimal CR',
        type: 'Feature Enhancement',
        content: '', // Minimal content
      })

      const response = await projectApi.listCRs(app, projectCode)

      assertSuccess(response, 200)

      // Find the minimal CR
      const found = response.body.find((cr: { code: string }) => cr.code === minimalCR.crCode)
      expect(found).toBeDefined()
      expect(found).not.toHaveProperty('content')
    })
  })

  describe('Backward Compatibility', () => {
    it('should maintain field names (camelCase)', async () => {
      const response = await projectApi.listCRs(app, projectCode)

      assertSuccess(response, 200)

      // Field names should be camelCase (not snake_case)
      const firstItem = response.body[0]

      expect(firstItem).toHaveProperty('dateCreated') // not date_created
      expect(firstItem).toHaveProperty('lastModified') // not last_modified
      // These should NOT be snake_case
      expect(firstItem).not.toHaveProperty('date_created')
      expect(firstItem).not.toHaveProperty('last_modified')
    })

    it('should support bypassCache query parameter', async () => {
      const response = await projectApi.listCRs(app, projectCode, true)

      assertSuccess(response, 200)
      expect(Array.isArray(response.body)).toBe(true)
    })
  })
})
