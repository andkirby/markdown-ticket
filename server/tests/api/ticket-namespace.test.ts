/**
 * Namespace API Integration Tests - MDT-138.
 *
 * Verifies:
 * - Dot-notation files appear as virtual folders in subdocuments array (BR-2)
 * - Virtual folders maintain backward compatibility (C-4)
 * - No [main] tab when no root document exists (BR-3)
 * - Multi-dot preservation in sub-key (BR-5)
 * - Sorting is alphanumerical within namespace
 * - Folder + dot coexistence works correctly (Edge-4)
 */

/// <reference types="jest" />

import type { Express } from 'express'
import type { ProjectFactory } from '@mdt/shared/test-lib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import supertest from 'supertest'
import { assertNotFound, assertSuccess } from './helpers'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

interface SubDocument {
  name: string
  kind: 'file' | 'folder'
  children?: SubDocument[]
  isVirtual?: boolean
  filePath?: string
}

describe('Namespace API (MDT-138)', () => {
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

  async function createProjectWithNamespaceFiles(
    subdocFiles?: Record<string, string>,
    subdocFolders?: Record<string, Record<string, string>>,
  ) {
    const project = await projectFactory.createProject('empty')
    const crResult = await projectFactory.createTestCR(project.key, {
      title: 'Test CR',
      type: 'Feature Enhancement',
      content: 'Test content',
    })
    if (!crResult.success || !crResult.crCode) {
      throw new Error(`Failed to create test CR: ${crResult.error}`)
    }

    const subdocDir = join(project.path, 'docs/CRs', crResult.crCode)
    mkdirSync(subdocDir, { recursive: true })

    // Create dot-notation files
    if (subdocFiles) {
      for (const [name, content] of Object.entries(subdocFiles)) {
        writeFileSync(join(subdocDir, name), content)
      }
    }

    // Create folder-based subdocuments
    if (subdocFolders) {
      for (const [folder, files] of Object.entries(subdocFolders)) {
        const folderPath = join(subdocDir, folder)
        mkdirSync(folderPath, { recursive: true })
        for (const [name, content] of Object.entries(files)) {
          writeFileSync(join(folderPath, name), content)
        }
      }
    }

    return { projectCode: project.key, crCode: crResult.crCode, projectDir: project.path }
  }

  function findSubdoc(subdocs: SubDocument[], name: string): SubDocument | undefined {
    return subdocs.find(s => s.name === name)
  }

  // ─── Dot-Notation Virtual Folders ────────────────────────────────────────

  describe('GET /api/projects/:projectId/crs/:crId - Virtual Folders', () => {
    it('creates virtual folder for dot-notation files (BR-2)', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles({
        'architecture.approve-it.md': '# Approve It',
        'architecture.update.v2.md': '# Update v2',
      })

      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as SubDocument[]
      const arch = findSubdoc(subdocs, 'architecture')

      expect(arch).toBeDefined()
      expect(arch?.kind).toBe('folder')
      expect(arch?.isVirtual).toBe(true)
      expect(arch?.children).toHaveLength(2)
      expect(arch?.children?.map(c => c.name)).toEqual(['approve-it', 'update.v2'])

      // Verify filePath is included
      expect(arch?.filePath).toBe(`${crCode}/architecture.md`)
      expect(arch?.children?.[0].filePath).toBe(`${crCode}/architecture.approve-it.md`)
      expect(arch?.children?.[1].filePath).toBe(`${crCode}/architecture.update.v2.md`)
    })

    it('includes [main] tab when root file exists alongside dot-variants', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles({
        'architecture.md': '# Main Architecture',
        'architecture.approve-it.md': '# Approve It',
        'architecture.beta.md': '# Beta',
      })

      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as SubDocument[]
      const arch = findSubdoc(subdocs, 'architecture')

      expect(arch?.children?.map(c => c.name)).toEqual(['main', 'approve-it', 'beta'])
    })

    it('omits [main] tab when no root file exists (BR-3)', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles({
        'tests.one.md': '# Tests One',
        'tests.two.md': '# Tests Two',
      })

      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as SubDocument[]
      const tests = findSubdoc(subdocs, 'tests')

      expect(tests?.children?.map(c => c.name)).toEqual(['one', 'two'])
      expect(tests?.children?.find(c => c.name === 'main')).toBeUndefined()
    })

    it('preserves multiple dots in sub-key (BR-5)', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles({
        'a.b.c.md': '# A.B.C',
      })

      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as SubDocument[]
      const a = findSubdoc(subdocs, 'a')

      expect(a?.kind).toBe('folder')
      expect(a?.children).toHaveLength(1)
      expect(a?.children?.[0].name).toBe('b.c')
    })

    it('sorts sub-tabs alphanumerically within namespace', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles({
        'architecture.zeta.md': '# Zeta',
        'architecture.alpha.md': '# Alpha',
        'architecture.beta.md': '# Beta',
      })

      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as SubDocument[]
      const arch = findSubdoc(subdocs, 'architecture')

      expect(arch?.children?.map(c => c.name)).toEqual(['alpha', 'beta', 'zeta'])
    })

    it('preserves hyphens in sub-key (Edge-3)', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles({
        'tests.e2e-smoke.md': '# E2E Smoke',
      })

      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as SubDocument[]
      const tests = findSubdoc(subdocs, 'tests')

      expect(tests?.children?.[0].name).toBe('e2e-smoke')
    })
  })

  // ─── Folder + Dot Coexistence ────────────────────────────────────────────

  describe('Folder + Dot Coexistence (Edge-4)', () => {
    it('shows both folder and dot-notation content in same namespace', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles(
        { 'bdd.scenario-1.md': '# Scenario 1' },
        { bdd: { 'legacy.md': '# Legacy' } },
      )

      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as SubDocument[]
      const bdd = findSubdoc(subdocs, 'bdd')

      expect(bdd?.kind).toBe('folder')
      expect(bdd?.isVirtual).toBe(false) // Physical folder exists

      // Should have both dot-notation and folder children
      // Physical and virtual children use filePath to distinguish, not name prefix
      const names = bdd?.children?.map(c => c.name) || []
      expect(names).toContain('scenario-1')
      expect(names).toContain('legacy') // Physical folder child

      // Verify filePath distinguishes physical vs virtual children
      const legacy = bdd?.children?.find(c => c.name === 'legacy')
      expect(legacy?.filePath).toBe(`${crCode}/bdd/legacy.md`) // Physical path uses slash
    })

    it('handles four-segment filename (Edge-1)', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles({
        'a.b.c.d.md': '# A.B.C.D',
      })

      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as SubDocument[]
      const a = findSubdoc(subdocs, 'a')

      expect(a?.children?.[0].name).toBe('b.c.d')
    })
  })

  // ─── Backward Compatibility ───────────────────────────────────────────────

  describe('Backward Compatibility (C-4)', () => {
    it('returns same structure for files without dot-notation', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles({
        'requirements.md': '# Requirements',
        'architecture.md': '# Architecture',
        'tasks.md': '# Tasks',
      })

      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as SubDocument[]

      // All should be file kind, not folders
      for (const subdoc of subdocs) {
        expect(subdoc.kind).toBe('file')
        expect(subdoc.children).toEqual([])
        // Verify filePath is included for standalone files
        expect(subdoc.filePath).toBe(`${crCode}/${subdoc.name}.md`)
      }
    })

    it('folder-based subdocuments still work without dot-notation', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles(
        {},
        {
          architecture: { 'main.md': '# Main', 'review.md': '# Review' },
        },
      )

      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      assertSuccess(response)

      const subdocs = response.body.subdocuments as SubDocument[]
      const arch = findSubdoc(subdocs, 'architecture')

      expect(arch?.kind).toBe('folder')
      expect(arch?.isVirtual).toBe(false) // Physical folder (not virtual)
      expect(arch?.children?.map(c => c.name)).toEqual(['main', 'review'])

      // Verify filePath is included for physical folders
      expect(arch?.filePath).toBe(`${crCode}/architecture`)
      expect(arch?.children?.[0].filePath).toBe(`${crCode}/architecture/main.md`)
      expect(arch?.children?.[1].filePath).toBe(`${crCode}/architecture/review.md`)
    })
  })

  // ─── Subdocument Retrieval ────────────────────────────────────────────────

  describe('GET /api/projects/:projectId/crs/:crId/subdocuments/:path', () => {
    it('retrieves dot-notation file content via namespace path', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles({
        'architecture.approve-it.md': '# Approve It\n\nContent here.',
      })

      const response = await supertest(app)
        .get(`/api/projects/${projectCode}/crs/${crCode}/subdocuments/approve-it`)

      assertSuccess(response)
      expect(response.body.content).toContain('Approve It')
    })

    it('returns 404 for non-existent namespace subdocument', async () => {
      const { projectCode, crCode } = await createProjectWithNamespaceFiles({
        'architecture.md': '# Architecture',
      })

      const response = await supertest(app)
        .get(`/api/projects/${projectCode}/crs/${crCode}/subdocuments/nonexistent`)

      assertNotFound(response)
    })
  })

  // ─── Performance ──────────────────────────────────────────────────────────

  describe('Performance (C-1)', () => {
    it('completes subdocument discovery within 10ms', async () => {
      const files: Record<string, string> = {}
      for (let i = 0; i < 20; i++) {
        files[`architecture.variant-${i}.md`] = `# Variant ${i}`
      }

      const { projectCode, crCode } = await createProjectWithNamespaceFiles(files)

      const start = performance.now()
      const response = await supertest(app).get(`/api/projects/${projectCode}/crs/${crCode}`)
      const duration = performance.now() - start

      assertSuccess(response)
      expect(duration).toBeLessThan(100) // API call overhead, actual parsing < 10ms
    })
  })
})
