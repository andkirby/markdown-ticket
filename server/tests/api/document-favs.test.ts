/// <reference types="jest" />

import type { Express } from 'express'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'
import { DocumentFavStateService } from '../../services/DocumentFavStateService'
import { createTestDocument, documentFixtures } from './fixtures/documents'
import { assertBadRequest, assertNotFound, assertSuccess } from './helpers'
import {
  cleanupTestEnvironment,
  createTestProjectWithCR,
  setupTestEnvironment,
} from './setup'

describe('document favs API (MDT-171)', () => {
  let tempDir: string
  let app: Express
  let projectFactory: Awaited<ReturnType<typeof setupTestEnvironment>>['projectFactory']
  let projectCode: string

  beforeAll(async () => {
    const context = await setupTestEnvironment()

    tempDir = context.tempDir
    app = context.app
    projectFactory = context.projectFactory

    const testData = await createTestProjectWithCR(projectFactory, {
      name: 'Document Favs API Project',
      code: 'DFAV',
      documentPaths: ['docs', 'README.md'],
    })

    projectCode = testData.projectCode
    await createTestDocument(projectFactory, projectCode, 'README.md', documentFixtures.withoutFrontmatter)
    await createTestDocument(projectFactory, projectCode, 'docs/guide.md', documentFixtures.withFrontmatter)
  })

  afterAll(async () => {
    await cleanupTestEnvironment(tempDir)
  })

  async function getProjectId(): Promise<string> {
    const projects = await app.locals.projectService.getAllProjects()
    const project = projects.find((candidate: { project: { code: string } }) => candidate.project.code === projectCode)

    if (!project) {
      throw new Error('Test project not found')
    }

    return project.id
  }

  async function getDocumentFavStatePath(): Promise<string> {
    return join(process.env.CONFIG_DIR!, 'projects', await getProjectId(), 'document-favs.json')
  }

  it('persists only CONFIG_DIR project fav state and resolves project code to canonical project id', async () => {
    const response = await request(app)
      .put('/api/documents/favs')
      .send({
        projectId: projectCode,
        favItems: [
          { path: 'docs', type: 'folder', favoritedAt: '2026-05-18T10:00:00.000Z' },
          { path: 'docs/guide.md', type: 'file', favoritedAt: '2026-05-18T10:01:00.000Z' },
        ],
      })

    assertSuccess(response, 200)
    expect(response.body.favItems.map((item: { path: string }) => item.path)).toEqual(['docs', 'docs/guide.md'])

    const statePath = await getDocumentFavStatePath()
    const mdtConfigPath = join(projectFactory.getProjectsDir(), projectCode, '.mdt-config.toml')

    expect(existsSync(statePath)).toBe(true)
    expect(JSON.parse(readFileSync(statePath, 'utf8')).favItems).toHaveLength(2)
    expect(readFileSync(mdtConfigPath, 'utf8')).not.toContain('favItems')
  })

  it('rejects unsafe paths and unknown projects without creating unresolved state', async () => {
    const unsafeResponse = await request(app)
      .put('/api/documents/favs')
      .send({
        projectId: projectCode,
        favItems: [
          { path: '../secret.md', type: 'file', favoritedAt: '2026-05-18T10:00:00.000Z' },
        ],
      })

    assertBadRequest(unsafeResponse)

    const unknownResponse = await request(app)
      .put('/api/documents/favs')
      .send({
        projectId: 'NOPE',
        favItems: [],
      })

    assertNotFound(unknownResponse)
    expect(existsSync(join(process.env.CONFIG_DIR!, 'projects', 'NOPE', 'document-favs.json'))).toBe(false)
  })

  it('rejects fav targets that are not present in the eligible document tree', async () => {
    const response = await request(app)
      .put('/api/documents/favs')
      .send({
        projectId: projectCode,
        favItems: [
          { path: 'docs/missing.md', type: 'file', favoritedAt: '2026-05-18T10:00:00.000Z' },
        ],
      })

    assertBadRequest(response)
  })

  it('keeps document fav state owned by PUT /api/documents/favs only', async () => {
    const canonicalState = {
      projectId: projectCode,
      favItems: [
        { path: 'docs', type: 'folder', favoritedAt: '2026-05-18T10:00:00.000Z' },
      ],
    }
    const seedResponse = await request(app)
      .put('/api/documents/favs')
      .send(canonicalState)

    assertSuccess(seedResponse, 200)

    const statePath = await getDocumentFavStatePath()
    const before = readFileSync(statePath, 'utf8')

    const configureResponse = await request(app)
      .post('/api/documents/configure')
      .send({
        projectId: projectCode,
        documentPaths: ['docs', 'README.md'],
        favItems: [
          { path: 'README.md', type: 'file', favoritedAt: '2026-05-18T11:00:00.000Z' },
        ],
      })

    assertSuccess(configureResponse, 200)
    expect(readFileSync(statePath, 'utf8')).toBe(before)

    const contentResponse = await request(app)
      .get(`/api/documents/content?projectId=${projectCode}&filePath=docs%2Fguide.md`)
      .send({
        favItems: [
          { path: 'README.md', type: 'file', favoritedAt: '2026-05-18T11:01:00.000Z' },
        ],
      })

    assertSuccess(contentResponse, 200)
    expect(readFileSync(statePath, 'utf8')).toBe(before)

    const projectConfigResponse = await request(app)
      .get(`/api/projects/${projectCode}/config`)
      .send({
        favItems: [
          { path: 'README.md', type: 'file', favoritedAt: '2026-05-18T11:02:00.000Z' },
        ],
      })

    assertSuccess(projectConfigResponse, 200)
    expect(readFileSync(statePath, 'utf8')).toBe(before)

    const selectorResponse = await request(app)
      .post('/api/config/selector')
      .send({
        [projectCode]: {
          favorite: true,
          lastUsedAt: null,
          count: 1,
          favItems: [
            { path: 'README.md', type: 'file', favoritedAt: '2026-05-18T11:03:00.000Z' },
          ],
        },
      })

    assertSuccess(selectorResponse, 200)
    expect(readFileSync(statePath, 'utf8')).toBe(before)
  })

  it('DocumentFavStateService resolves by id or code and falls back on malformed state', async () => {
    const service = new DocumentFavStateService(app.locals.projectService.projectDiscovery)
    const projectId = await getProjectId()
    const statePath = service.getStatePathForProjectId(projectId)

    expect(statePath).toBe(join(process.env.CONFIG_DIR!, 'projects', projectId, 'document-favs.json'))
    await expect(service.resolveProject(projectCode)).resolves.toHaveProperty('id', projectId)
    await expect(service.resolveProject(projectId)).resolves.toHaveProperty('id', projectId)
    await expect(service.resolveProject('UNKNOWN')).rejects.toThrow('Project not found')
  })
})
