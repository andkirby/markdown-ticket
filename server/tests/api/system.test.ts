/**
 * System Endpoint Tests - MDT-106.
 *
 * Tests for system-related endpoints including status, directories, filesystem,
 * config, and cache operations. Includes error cases and OpenAPI validation.
 */

/// <reference types="jest" />

import { createTestDocument, documentFixtures } from './fixtures/documents'
import { assertBadRequest, assertBodyHasProperties, assertErrorMessage, assertIsArray, assertNotFound, assertSuccess, createGetRequest, createPostRequest } from './helpers'
import { cleanupTestEnvironment, setProjectDocumentMaxDepth, setupTestEnvironment } from './setup'

describe('system Endpoint Tests (MDT-106)', () => {
  let tempDir: string
  let app: Awaited<ReturnType<typeof setupTestEnvironment>>['app']
  let projectFactory: Awaited<ReturnType<typeof setupTestEnvironment>>['projectFactory']

  beforeAll(async () => {
    const context = await setupTestEnvironment()

    tempDir = context.tempDir
    app = context.app
    projectFactory = context.projectFactory
  })

  afterAll(async () => {
    await cleanupTestEnvironment(tempDir)
  })

  describe('gET /api/status', () => {
    it('should return server status with ok, timestamp, and sseClients count', async () => {
      const response = await createGetRequest(app, '/api/status')

      assertSuccess(response, 200)
      assertBodyHasProperties(response, ['status', 'message', 'timestamp', 'sseClients'])
      expect(response.body.status).toBe('ok')
      expect(typeof response.body.timestamp).toBe('string')
      expect(typeof response.body.sseClients).toBe('number')
    })

    it('should return valid ISO timestamp', async () => {
      const response = await createGetRequest(app, '/api/status')
      const timestamp = new Date(response.body.timestamp)

      expect(timestamp.toISOString()).toBe(response.body.timestamp)
    })

    it('should satisfy OpenAPI spec', async () => {
      const response = await createGetRequest(app, '/api/status')

      expect(response).toSatisfyApiSpec()
    })
  })

  describe('gET /api/directories', () => {
    it('should return system directories as array of directory names', async () => {
      const response = await createGetRequest(app, '/api/directories')

      assertSuccess(response, 200)
      assertIsArray(response)
      expect(response.body.length).toBeGreaterThan(0)
      expect(typeof response.body[0]).toBe('string')
    })

    // Note: OpenAPI spec validation skipped due to mock vs production difference
    // Mock returns string[], production returns { home: string, directories: string[] }
  })

  describe('pOST /api/filesystem/exists', () => {
    it('should return 400 for missing path parameter', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', {})

      assertBadRequest(response)
      assertErrorMessage(response, 'Path is required')
    })

    it('should return 400 for non-string path', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { path: 12345 })

      assertBadRequest(response)
      assertErrorMessage(response, 'string')
    })

    it('should check if valid path exists', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { path: tempDir })

      assertSuccess(response, 200)
      assertBodyHasProperties(response, ['exists', 'isInDiscovery', 'expandedPath'])
      expect([0, 1]).toContain(response.body.exists)
      expect(typeof response.body.expandedPath).toBe('string')
    })

    it('should expand tilde paths', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { path: '~' })

      assertSuccess(response, 200)
      expect(response.body.expandedPath).not.toBe('~')
      expect(response.body.expandedPath).toMatch(/^\/[a-z]/i)
    })

    it('should return 0 for non-existent path', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { path: '/nonexistent/path/12345' })

      assertSuccess(response, 200)
      expect(response.body.exists).toBe(0)
    })

    it('should satisfy OpenAPI spec', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { path: tempDir })

      expect(response).toSatisfyApiSpec()
    })
  })

  describe('gET /api/filesystem', () => {
    it('should respect configured document maxDepth for path selection trees', async () => {
      const project = await projectFactory.createProject('empty', {
        name: 'Path Selection Depth Project',
        code: 'PDEP',
        documentPaths: ['docs', 'README.md'],
      })

      await setProjectDocumentMaxDepth(projectFactory, project.key, 2)
      await createTestDocument(projectFactory, project.key, 'README.md', documentFixtures.withoutFrontmatter)
      await createTestDocument(projectFactory, project.key, 'docs/overview.md', documentFixtures.withFrontmatter)
      await createTestDocument(projectFactory, project.key, 'docs/guide/getting-started.md', documentFixtures.complexFrontmatter)

      const response = await createGetRequest(app, `/api/filesystem?projectId=${project.key}`)

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
  })

  describe('gET /api/config', () => {
    it('should return frontend configuration', async () => {
      const response = await createGetRequest(app, '/api/config')

      assertSuccess(response, 200)
      assertBodyHasProperties(response, ['configDir', 'discovery'])
      expect(response.body.discovery).toHaveProperty('autoDiscover')
      expect(response.body.discovery).toHaveProperty('searchPaths')
      expect(response.body.discovery).toHaveProperty('maxDepth')
    })

    it('should satisfy OpenAPI spec', async () => {
      const response = await createGetRequest(app, '/api/config')

      expect(response).toSatisfyApiSpec()
    })
  })

  describe('gET /api/config/global', () => {
    it('should return full global configuration', async () => {
      const response = await createGetRequest(app, '/api/config/global')

      assertSuccess(response, 200)
      expect(response.body).toHaveProperty('discovery')
      expect(response.body).toHaveProperty('links')
    })

    it('should satisfy OpenAPI spec', async () => {
      const response = await createGetRequest(app, '/api/config/global')

      expect(response).toSatisfyApiSpec()
    })
  })

  describe('pOST /api/cache/clear', () => {
    it('should clear cache successfully', async () => {
      const response = await createPostRequest(app, '/api/cache/clear', {})

      assertSuccess(response, 200)
      assertBodyHasProperties(response, ['success', 'message', 'timestamp'])
      expect(response.body.success).toBe(true)
    })

    it('should satisfy OpenAPI spec', async () => {
      const response = await createPostRequest(app, '/api/cache/clear', {})

      expect(response).toSatisfyApiSpec()
    })
  })

  describe('pOST /api/config/clear', () => {
    it('should clear config cache successfully', async () => {
      const response = await createPostRequest(app, '/api/config/clear', {})

      assertSuccess(response, 200)
      assertBodyHasProperties(response, ['success', 'message', 'timestamp'])
      expect(response.body.success).toBe(true)
    })

    it('should satisfy OpenAPI spec', async () => {
      const response = await createPostRequest(app, '/api/config/clear', {})

      expect(response).toSatisfyApiSpec()
    })
  })

  describe('error cases', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const response = await createGetRequest(app, '/api/nonexistent')

      assertNotFound(response)
    })

    it('should return 400 for invalid POST data', async () => {
      const response = await createPostRequest(app, '/api/filesystem/exists', { invalidField: 'value' })

      assertBadRequest(response)
    })
  })
})
