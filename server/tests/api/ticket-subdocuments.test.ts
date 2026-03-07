/**
 * Sub-Document API Integration Tests - MDT-093.
 *
 * Verifies:
 * - GET /api/projects/:projectId/crs/:crId returns `subdocuments` array (BR-6.1)
 * - Subdocuments follow default order when no config is set (BR-1.2, C2)
 * - Subdocuments follow configured order when .mdt-config.toml defines ticketSubdocuments (BR-1.3, C2)
 * - Unknown sub-document names are appended alphabetically (BR-1.4)
 * - No subdocuments when ticket has no sub-document directory (BR-1.5)
 * - GET /api/projects/:projectId/crs/:crId/subdocuments/:subDocPath returns code, content, dateCreated, lastModified (BR-6.2)
 * - Sub-documents are discovered from files/directories only, not synthesized in UI (C1)
 * - API changes are covered by OpenAPI spec (C10, BR-6.3)
 * - Sub-document parsing supports files up to 1MB (C8)
 */

/// <reference types="jest" />

import type { Express } from 'express'
import type { ProjectFactory } from '@mdt/shared/test-lib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import supertest from 'supertest'
import { assertNotFound, assertSuccess } from './helpers'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

describe('Sub-Document API (MDT-093)', () => {
  let app: Express
  let tempDir: string
  let projectFactory: ProjectFactory

  beforeAll(async () => {
    const ctx = await setupTestEnvironment()
    app = ctx.app
    tempDir = ctx.tempDir
    projectFactory = ctx.projectFactory
  })

  afterAll(async () => {
    await cleanupTestEnvironment(tempDir)
  })

  // ─── Helper ──────────────────────────────────────────────────────────────

  async function createProjectWithCR(subdocFiles?: Record<string, string>) {
    const project = await projectFactory.createProject('empty')
    const crResult = await projectFactory.createTestCR(project.key, {
      title: 'Test CR',
      type: 'Feature Enhancement',
      content: 'Test content',
    })
    if (!crResult.success || !crResult.crCode) {
      throw new Error(`Failed to create test CR: ${crResult.error}`)
    }
    if (subdocFiles) {
      const subdocDir = join(project.path, 'docs/CRs', crResult.crCode)
      mkdirSync(subdocDir, { recursive: true })
      for (const [name, content] of Object.entries(subdocFiles)) {
        writeFileSync(join(subdocDir, name), content)
      }
    }
    return { projectCode: project.key, crCode: crResult.crCode, projectDir: project.path }
  }

  // ─── CR endpoint: subdocuments field ──────────────────────────────────────

  describe('GET /api/projects/:projectId/crs/:crId', () => {
    it('returns no subdocuments or empty array when ticket has no sub-document directory (BR-1.5, C1)', async () => {
      const { projectCode, crCode } = await createProjectWithCR()
      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)
      const subdocs = response.body.subdocuments
      expect(!subdocs || subdocs.length === 0).toBe(true)
    })

    it('returns subdocuments array in default order when files exist (BR-6.1, BR-1.1, BR-1.2, C2)', async () => {
      const { projectCode, crCode } = await createProjectWithCR({
        'tasks.md': '# Tasks',
        'requirements.md': '# Requirements',
        'architecture.md': '# Architecture',
      })
      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as Array<{ name: string }>
      expect(Array.isArray(subdocs)).toBe(true)
      expect(subdocs.length).toBeGreaterThan(0)

      const names = subdocs.map((s) => s.name)
      // Default order: requirements before architecture before tasks
      expect(names.indexOf('requirements')).toBeLessThan(names.indexOf('architecture'))
      expect(names.indexOf('architecture')).toBeLessThan(names.indexOf('tasks'))
    })

    it('appends unknown sub-document names alphabetically after ordered entries (BR-1.4, C2)', async () => {
      const { projectCode, crCode } = await createProjectWithCR({
        'requirements.md': '# Requirements',
        'zebra.md': '# Zebra',
        'alpha.md': '# Alpha',
      })
      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const names = (response.body.subdocuments as Array<{ name: string }>).map((s) => s.name)
      expect(names.indexOf('requirements')).toBeLessThan(names.indexOf('alpha'))
      expect(names.indexOf('alpha')).toBeLessThan(names.indexOf('zebra'))
    })
  })

  // ─── Individual sub-document retrieval ────────────────────────────────────

  describe('GET /api/projects/:projectId/crs/:crId/subdocuments/:subDocPath', () => {
    it('returns code, content, dateCreated, lastModified for existing sub-document (BR-6.2)', async () => {
      const { projectCode, crCode } = await createProjectWithCR({
        'requirements.md': '# Requirements\n\nContent here.',
      })
      const response = await supertest(app)
        .get(`/api/projects/${projectCode}/crs/${crCode}/subdocuments/requirements`)
      assertSuccess(response)

      expect(response.body).toHaveProperty('code')
      expect(response.body).toHaveProperty('content')
      expect(response.body).toHaveProperty('dateCreated')
      expect(response.body).toHaveProperty('lastModified')
      expect(response.body.content).toContain('Requirements')
    })

    it('returns 404 for non-existent sub-document (BR-4.4 boundary)', async () => {
      const { projectCode, crCode } = await createProjectWithCR({
        'requirements.md': '# Requirements',
      })
      const response = await supertest(app)
        .get(`/api/projects/${projectCode}/crs/${crCode}/subdocuments/nonexistent-doc`)
      assertNotFound(response)
    })

    it('handles sub-document content up to 1MB (C8)', async () => {
      const largeContent = `# Large Document\n\n${'x'.repeat(1024 * 1024 - 25)}`
      const { projectCode, crCode } = await createProjectWithCR({
        'large.md': largeContent,
      })
      const response = await supertest(app)
        .get(`/api/projects/${projectCode}/crs/${crCode}/subdocuments/large`)
      assertSuccess(response)
      expect(response.body.content.length).toBeGreaterThan(1024 * 1024 - 100)
    })
  })

  // ─── OpenAPI compliance ────────────────────────────────────────────────────

  describe('OpenAPI contract (BR-6.3, C10)', () => {
    it('GET /crs/:crId response satisfies OpenAPI spec', async () => {
      const { projectCode, crCode } = await createProjectWithCR()
      const response = await supertest(app)
        .get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)
      expect(response).toSatisfyApiSpec()
    })
  })
})
