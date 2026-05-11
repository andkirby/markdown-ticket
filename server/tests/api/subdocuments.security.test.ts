/**
 * Subdocument API Security Integration Tests - MDT-151
 *
 * Verifies path traversal, encoding attacks, and symlink containment
 * at the HTTP API level. RED tests — will fail until implementation exists.
 */

/// <reference types="jest" />

import type { ProjectConfig } from '@mdt/domain-contracts'
import type { ProjectFactory } from '@mdt/shared/test-lib'
import type { Express } from 'express'
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import supertest from 'supertest'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

describe('Subdocument Security API (MDT-151)', () => {
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

  async function createProjectWithSubdoc() {
    const project = await projectFactory.createProject('empty')
    const crResult = await projectFactory.createTestCR(project.key, {
      title: 'Security Test CR',
      type: 'Feature Enhancement',
      content: 'Test content',
    })
    if (!crResult.success || !crResult.crCode) {
      throw new Error(`Failed to create test CR: ${crResult.error}`)
    }

    const subdocDir = join(project.path, 'docs/CRs', crResult.crCode)
    mkdirSync(subdocDir, { recursive: true })
    writeFileSync(join(subdocDir, 'architecture.md'), '# Architecture\n\nTest content\n')

    return { project, crCode: crResult.crCode }
  }

  // ─── Path Traversal ──────────────────────────────────────────────────────

  describe('path traversal rejection', () => {
    it('shall return 404 for literal ../ in subDocName', async () => {
      const { project, crCode } = await createProjectWithSubdoc()

      const res = await supertest(app)
        .get(`/api/projects/${project.key}/crs/${crCode}/subdocuments/../etc/passwd`)

      expect(res.status).toBe(404)
      // Body parity: same as legitimate not-found
      expect(res.body).toEqual({ error: 'Not Found', message: 'SubDocument not found' })
    })

    it('shall return 404 for URL-encoded traversal', async () => {
      const { project, crCode } = await createProjectWithSubdoc()

      // Express will decode %2F to / before handler
      const res = await supertest(app)
        .get(`/api/projects/${project.key}/crs/${crCode}/subdocuments/..%2Fsomething`)

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'Not Found', message: 'SubDocument not found' })
    })

    it('shall return 200 for valid subdocument', async () => {
      const { project, crCode } = await createProjectWithSubdoc()

      const res = await supertest(app)
        .get(`/api/projects/${project.key}/crs/${crCode}/subdocuments/architecture`)

      expect(res.status).toBe(200)
      expect(res.body.code).toBe('architecture')
      expect(res.body.content).toContain('Test content')
    })

    it('shall return same 404 body for traversal as for legitimate not-found', async () => {
      const { project, crCode } = await createProjectWithSubdoc()

      const traversalRes = await supertest(app)
        .get(`/api/projects/${project.key}/crs/${crCode}/subdocuments/..%2Fetc`)

      const notFoundRes = await supertest(app)
        .get(`/api/projects/${project.key}/crs/${crCode}/subdocuments/nonexistent`)

      // Both must have same status
      expect(traversalRes.status).toBe(notFoundRes.status)
      // Both must have same body structure (no information leakage)
      expect(traversalRes.body).toEqual(notFoundRes.body)
    })
  })

  // ─── Edge Cases via API ──────────────────────────────────────────────────

  describe('input validation edge cases', () => {
    it('shall return 404 for whitespace-only subDocName', async () => {
      const { project, crCode } = await createProjectWithSubdoc()

      const res = await supertest(app)
        .get(`/api/projects/${project.key}/crs/${crCode}/subdocuments/%20%20%20`)

      expect(res.status).toBe(404)
    })

    it('shall return 404 for very long subDocName (>255 chars)', async () => {
      const { project, crCode } = await createProjectWithSubdoc()
      const longName = 'a'.repeat(300)

      const res = await supertest(app)
        .get(`/api/projects/${project.key}/crs/${crCode}/subdocuments/${longName}`)

      expect(res.status).toBe(404)
    })
  })

  // ─── Symlink Containment ─────────────────────────────────────────────────

  describe('symlink containment', () => {
    it('shall not follow symlinks by default', async () => {
      const project = await projectFactory.createProject('empty')
      const crResult = await projectFactory.createTestCR(project.key, {
        title: 'Symlink Test CR',
        type: 'Feature Enhancement',
        content: 'Test',
      })
      if (!crResult.success || !crResult.crCode)
        throw new Error('CR creation failed')

      const subdocDir = join(project.path, 'docs/CRs', crResult.crCode)
      mkdirSync(subdocDir, { recursive: true })

      // Create external file
      const externalDir = join(project.path, 'external')
      mkdirSync(externalDir, { recursive: true })
      writeFileSync(join(externalDir, 'secret.md'), '# Secret\n')

      // Symlink inside ticketDir → external file
      symlinkSync(join(externalDir, 'secret.md'), join(subdocDir, 'linked.md'))

      const res = await supertest(app)
        .get(`/api/projects/${project.key}/crs/${crResult.crCode}/subdocuments/linked`)

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'Not Found', message: 'SubDocument not found' })
    })

    it('BR-3.2: shall follow symlink when allowSymlinks=true and target is inside ticketDir', async () => {
      const project = await projectFactory.createProject('empty')
      const crResult = await projectFactory.createTestCR(project.key, {
        title: 'Symlink Allow Test CR',
        type: 'Feature Enhancement',
        content: 'Test',
      })
      if (!crResult.success || !crResult.crCode)
        throw new Error('CR creation failed')

      const subdocDir = join(project.path, 'docs/CRs', crResult.crCode)
      mkdirSync(subdocDir, { recursive: true })

      // Create a file INSIDE ticketDir (in a subfolder)
      const internalDir = join(subdocDir, 'internal')
      mkdirSync(internalDir, { recursive: true })
      writeFileSync(join(internalDir, 'linked-target.md'), '# Linked\n\nInternal content\n')

      // Create symlink inside ticketDir pointing to the internal file
      symlinkSync(join(internalDir, 'linked-target.md'), join(subdocDir, 'linked.md'))

      // Enable allowSymlinks in project config
      const configPath = join(project.path, '.mdt-config.toml')
      const { parseToml, stringify } = await import('@mdt/shared/utils/toml.js')
      const config = parseToml(await import('node:fs').then(fs => fs.readFileSync(configPath, 'utf-8'))) as ProjectConfig
      config.project.allowSymlinks = true
      await import('node:fs').then(fs => fs.writeFileSync(configPath, stringify(config)))

      const res = await supertest(app)
        .get(`/api/projects/${project.key}/crs/${crResult.crCode}/subdocuments/linked`)

      expect(res.status).toBe(200)
      expect(res.body.code).toBe('linked')
      expect(res.body.content).toContain('Internal content')
    })

    it('BR-3.3: shall reject symlink when allowSymlinks=true but target is outside ticketDir', async () => {
      const project = await projectFactory.createProject('empty')
      const crResult = await projectFactory.createTestCR(project.key, {
        title: 'Symlink Reject Test CR',
        type: 'Feature Enhancement',
        content: 'Test',
      })
      if (!crResult.success || !crResult.crCode)
        throw new Error('CR creation failed')

      const subdocDir = join(project.path, 'docs/CRs', crResult.crCode)
      mkdirSync(subdocDir, { recursive: true })

      // Create external file OUTSIDE ticketDir
      const externalDir = join(project.path, 'external')
      mkdirSync(externalDir, { recursive: true })
      writeFileSync(join(externalDir, 'secret.md'), '# Secret\n\nExternal content\n')

      // Symlink inside ticketDir → external file
      symlinkSync(join(externalDir, 'secret.md'), join(subdocDir, 'linked.md'))

      // Enable allowSymlinks in project config
      const configPath = join(project.path, '.mdt-config.toml')
      const { parseToml, stringify } = await import('@mdt/shared/utils/toml.js')
      const config = parseToml(await import('node:fs').then(fs => fs.readFileSync(configPath, 'utf-8'))) as ProjectConfig
      config.project.allowSymlinks = true
      await import('node:fs').then(fs => fs.writeFileSync(configPath, stringify(config)))

      const res = await supertest(app)
        .get(`/api/projects/${project.key}/crs/${crResult.crCode}/subdocuments/linked`)

      expect(res.status).toBe(404)
      // Same body as legitimate not-found — no information leakage
      expect(res.body).toEqual({ error: 'Not Found', message: 'SubDocument not found' })
    })
  })
})
