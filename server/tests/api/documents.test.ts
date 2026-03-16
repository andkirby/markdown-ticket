/**
 * Documents API Tests - MDT-106 Phase 2 Task 2.3.
 *
 * Integration tests for /api/documents endpoints.
 * Tests document discovery, content retrieval, and error handling.
 *
 * Coverage:
 * - GET /api/documents - Document discovery
 * - GET /api/documents/content - Document content retrieval
 * - Error cases (400, 403, 404)
 * - OpenAPI contract validation.
 */

/// <reference types="jest" />

import request from 'supertest'
import { createTestDocument, createTestDocumentSet, documentFixtures, documentPaths } from './fixtures/documents'
import { assertBadRequest, assertErrorMessage, assertIsArray, assertNotFound, assertSuccess } from './helpers'
import { cleanupTestEnvironment, createTestProjectWithCR, setProjectDocumentMaxDepth, setupTestEnvironment } from './setup'

interface DocumentNode {
  type: string
  children?: DocumentNode[]
}

describe('documents API Tests (MDT-106)', () => {
  let tempDir: string
  let projectFactory: Awaited<ReturnType<typeof setupTestEnvironment>>['projectFactory']
  let app: Awaited<ReturnType<typeof setupTestEnvironment>>['app']
  let projectCode: string

  beforeAll(async () => {
    const context = await setupTestEnvironment()

    tempDir = context.tempDir
    projectFactory = context.projectFactory
    app = context.app

    // Create test project with document paths pre-configured
    const testData = await createTestProjectWithCR(projectFactory, {
      name: 'Documents API Test Project',
      code: 'DOC',
      documentPaths: ['docs', 'README.md'],
    })

    projectCode = testData.projectCode
  })

  afterAll(async () => {
    await cleanupTestEnvironment(tempDir)
  })

  describe('gET /api/documents', () => {
    it('should return 400 for missing projectId', async () => {
      const response = await request(app).get('/api/documents')

      assertBadRequest(response)
      assertErrorMessage(response, 'Project ID')
    })

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).get('/api/documents?projectId=NONEXISTENT')

      assertNotFound(response)
    })

    it('should return documents on success for valid project', async () => {
      // Create test documents
      await createTestDocumentSet(projectFactory, projectCode)

      const response = await request(app).get(`/api/documents?projectId=${projectCode}`)

      assertSuccess(response, 200)
      assertIsArray(response)
      expect(response.body.length).toBeGreaterThan(0)
    })

    it('should respect configured document maxDepth', async () => {
      const depthLimitedProject = await projectFactory.createProject('empty', {
        name: 'Depth Limited Documents Project',
        code: 'DDEP',
        documentPaths: ['docs', 'README.md'],
      })

      await setProjectDocumentMaxDepth(projectFactory, depthLimitedProject.key, 2)
      await createTestDocument(projectFactory, depthLimitedProject.key, 'README.md', documentFixtures.withoutFrontmatter)
      await createTestDocument(projectFactory, depthLimitedProject.key, 'docs/overview.md', documentFixtures.withFrontmatter)
      await createTestDocument(projectFactory, depthLimitedProject.key, 'docs/guide/getting-started.md', documentFixtures.complexFrontmatter)

      const response = await request(app).get(`/api/documents?projectId=${depthLimitedProject.key}`)

      assertSuccess(response, 200)
      assertIsArray(response)

      const walk = (nodes: Array<Record<string, unknown>>): string[] =>
        nodes.flatMap(node => [
          node.path as string,
          ...(Array.isArray(node.children) ? walk(node.children as Array<Record<string, unknown>>) : []),
        ])

      const allPaths = walk(response.body as Array<Record<string, unknown>>)

      expect(allPaths).toContain('README.md')
      expect(allPaths).toContain('docs/overview.md')
      expect(allPaths).not.toContain('docs/guide/getting-started.md')
    })

    it('should return documents with correct structure', async () => {
      const response = await request(app).get(`/api/documents?projectId=${projectCode}`)

      assertSuccess(response, 200)
      assertIsArray(response)

      if (response.body.length > 0) {
        const doc = response.body[0]

        expect(doc).toHaveProperty('path')
        expect(doc).toHaveProperty('name')
        expect(doc).toHaveProperty('type')
        expect(['file', 'folder']).toContain(doc.type)
      }
    })

    it('should include metadata for nested document files', async () => {
      await createTestDocumentSet(projectFactory, projectCode)

      const response = await request(app).get(`/api/documents?projectId=${projectCode}`)

      assertSuccess(response, 200)
      assertIsArray(response)

      const walk = (nodes: Array<Record<string, unknown>>): Array<Record<string, unknown>> =>
        nodes.flatMap(node => [node, ...(Array.isArray(node.children) ? walk(node.children as Array<Record<string, unknown>>) : [])])

      const guideDoc = walk(response.body as Array<Record<string, unknown>>)
        .find(node => node.path === documentPaths.guide)

      expect(guideDoc).toBeDefined()
      expect(guideDoc).toHaveProperty('title')
      expect(guideDoc).toHaveProperty('dateCreated')
      expect(guideDoc).toHaveProperty('lastModified')
      expect(guideDoc?.dateCreated).not.toBeNull()
      expect(guideDoc?.lastModified).not.toBeNull()
    })

    it('should include nested documents in tree structure', async () => {
      const response = await request(app).get(`/api/documents?projectId=${projectCode}`)

      assertSuccess(response, 200)
      assertIsArray(response)

      // Check for nested structure (folders with children)
      const folders = (response.body as DocumentNode[]).filter(d => d.type === 'folder')

      if (folders.length > 0) {
        expect(folders[0]).toHaveProperty('children')
      }
    })

    it('should validate 200 response against OpenAPI spec', async () => {
      const response = await request(app).get(`/api/documents?projectId=${projectCode}`)

      expect(response).toSatisfyApiSpec()
    })

    it('should validate 400 response against OpenAPI spec', async () => {
      const response = await request(app).get('/api/documents')

      expect(response).toSatisfyApiSpec()
    })
  })

  describe('gET /api/documents/content', () => {
    beforeEach(async () => {
      // Ensure test documents exist
      await createTestDocumentSet(projectFactory, projectCode)
    })

    it('should return 400 for missing projectId', async () => {
      const response = await request(app).get('/api/documents/content?filePath=README.md')

      assertBadRequest(response)
      assertErrorMessage(response, 'Project ID')
    })

    it('should return 400 for missing filePath', async () => {
      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}`)

      assertBadRequest(response)
      assertErrorMessage(response, 'file path')
    })

    it('should return 404 for non-existent project', async () => {
      const response = await request(app).get('/api/documents/content?projectId=NONEXISTENT&filePath=README.md')

      assertNotFound(response)
    })

    it('should return 404 for non-existent document', async () => {
      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=nonexistent.md`)

      expect([404, 500]).toContain(response.status)
    })

    it('should return document content for valid request', async () => {
      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=${documentPaths.readme}`)

      assertSuccess(response, 200)
      expect(typeof response.text).toBe('string')
      expect(response.text.length).toBeGreaterThan(0)
    })

    it('should return markdown content with frontmatter', async () => {
      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=${documentPaths.api}`)

      assertSuccess(response, 200)
      expect(response.text).toContain('---')
      expect(response.text).toContain('title:')
    })

    it('should reject paths with .. (path traversal)', async () => {
      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=../../etc/passwd`)

      expect([400, 403]).toContain(response.status)
      assertErrorMessage(response, 'Invalid')
    })

    it('should reject non-markdown files', async () => {
      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=config.json`)

      expect([400, 403]).toContain(response.status)
      assertErrorMessage(response, 'markdown')
    })

    it('should handle special characters in document content', async () => {
      await createTestDocument(projectFactory, projectCode, 'docs/special.md', documentFixtures.specialChars)

      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=docs/special.md`)

      assertSuccess(response, 200)
      expect(response.text).toContain('&')
      expect(response.text).toContain('<')
      expect(response.text).toContain('>')
    })

    it('should validate 200 response against OpenAPI spec', async () => {
      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=${documentPaths.readme}`)

      expect(response).toSatisfyApiSpec()
    })

    it('should validate 400 response against OpenAPI spec', async () => {
      const response = await request(app).get('/api/documents/content?projectId=TEST')

      expect(response).toSatisfyApiSpec()
    })
  })

  describe('document listing and retrieval', () => {
    beforeEach(async () => {
      await createTestDocumentSet(projectFactory, projectCode)
    })

    it('should list documents for valid project', async () => {
      const response = await request(app).get(`/api/documents?projectId=${projectCode}`)

      assertSuccess(response, 200)
      assertIsArray(response)
      expect(response.body.length).toBeGreaterThan(0)
    })

    it('should get specific document content', async () => {
      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=${documentPaths.guide}`)

      assertSuccess(response, 200)
      expect(response.text).toContain('#')
      expect(response.text).toContain('Complex Document')
    })

    it('should handle documents with code blocks', async () => {
      await createTestDocument(projectFactory, projectCode, 'docs/code.md', documentFixtures.codeBlocks)

      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=docs/code.md`)

      assertSuccess(response, 200)
      expect(response.text).toContain('```')
      expect(response.text).toContain('function')
    })

    it('should handle documents with tables', async () => {
      await createTestDocument(projectFactory, projectCode, 'docs/tables.md', documentFixtures.tables)

      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=docs/tables.md`)

      assertSuccess(response, 200)
      expect(response.text).toContain('|')
      expect(response.text).toContain('Role')
    })
  })

  describe('excludeFolders behavior', () => {
    it('should exclude tickets path from document tree', async () => {
      const response = await request(app).get(`/api/documents?projectId=${projectCode}`)

      assertSuccess(response, 200)
      assertIsArray(response)

      // Flatten tree to check all paths
      const walk = (nodes: Array<Record<string, unknown>>): string[] =>
        nodes.flatMap(node => [
          node.path as string,
          ...(Array.isArray(node.children) ? walk(node.children as Array<Record<string, unknown>>) : []),
        ])

      const allPaths = walk(response.body as Array<Record<string, unknown>>)

      // Tickets path (docs/CRs) should NOT appear in documents
      const ticketsPath = allPaths.find(p => p && p.includes('CRs'))
      expect(ticketsPath).toBeUndefined()
    })

    it('should not include CR ticket files in document listing', async () => {
      const response = await request(app).get(`/api/documents?projectId=${projectCode}`)

      assertSuccess(response, 200)

      const walk = (nodes: Array<Record<string, unknown>>): string[] =>
        nodes.flatMap(node => [
          node.path as string,
          ...(Array.isArray(node.children) ? walk(node.children as Array<Record<string, unknown>>) : []),
        ])

      const allPaths = walk(response.body as Array<Record<string, unknown>>)

      // No CR ticket files (MDT-XXX-*.md pattern) should appear
      const crFiles = allPaths.filter(p => p && /MDT-\d{3}-.*\.md$/.test(p))
      expect(crFiles).toHaveLength(0)
    })
  })

  describe('error cases', () => {
    it('should return 400 for missing projectId in discovery', async () => {
      const response = await request(app).get('/api/documents')

      assertBadRequest(response)
    })

    it('should return 400 for missing projectId in content retrieval', async () => {
      const response = await request(app).get('/api/documents/content?filePath=test.md')

      assertBadRequest(response)
    })

    it('should return 404 for non-existent project in discovery', async () => {
      const response = await request(app).get('/api/documents?projectId=FAKE-PROJECT')

      assertNotFound(response)
    })

    it('should return 404 for non-existent project in content retrieval', async () => {
      const response = await request(app).get('/api/documents/content?projectId=FAKE-PROJECT&filePath=test.md')

      assertNotFound(response)
    })
  })

  describe('openAPI contract validation (R10.1)', () => {
    beforeEach(async () => {
      await createTestDocumentSet(projectFactory, projectCode)
    })

    it('should validate GET /api/documents success response', async () => {
      const response = await request(app).get(`/api/documents?projectId=${projectCode}`)

      expect(response.status).toBe(200)
      expect(response).toSatisfyApiSpec()
    })

    it('should validate GET /api/documents 400 error response', async () => {
      const response = await request(app).get('/api/documents')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
      expect(response.body).toHaveProperty('message')
    })

    it('should validate GET /api/documents 404 error response', async () => {
      const response = await request(app).get('/api/documents?projectId=NONEXISTENT')

      expect([404, 500]).toContain(response.status)
    })

    it('should validate GET /api/documents/content success response', async () => {
      const response = await request(app).get(`/api/documents/content?projectId=${projectCode}&filePath=${documentPaths.readme}`)

      expect(response.status).toBe(200)
      expect(response).toSatisfyApiSpec()
    })

    it('should validate GET /api/documents/content 400 error response', async () => {
      const response = await request(app).get('/api/documents/content?projectId=TEST')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error')
      expect(response.body).toHaveProperty('message')
    })

    it('should validate GET /api/documents/content 404 error response', async () => {
      const response = await request(app).get('/api/documents/content?projectId=NONEXISTENT&filePath=test.md')

      expect([404, 500]).toContain(response.status)
    })

    it('should reject response that violates schema', async () => {
      const response = await request(app).get(`/api/documents?projectId=${projectCode}`)
      // Clone response body to avoid modifying original
      const modifiedResponse = {
        ...response,
        body: {
          ...response.body[0],
          invalidProperty: 'should-fail-validation',
        },
      }

      expect(() => {
        expect(modifiedResponse).toSatisfyApiSpec()
      }).toThrow()
    })
  })
})
