/// <reference types="jest" />

import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import express from 'express'
import request from 'supertest'
import { createSystemRouter } from '../../routes/system'
import { ProjectController } from '../../controllers/ProjectController'

function createApp(projectRoot: string) {
  const app = express()
  app.use(express.json())
  const projectService = {
    getAllProjects: jest.fn(async () => [{ id: 'p', project: { path: projectRoot, code: 'P' } }]),
    getSystemDirectories: jest.fn(async (targetPath: string) => ({ currentPath: targetPath, parentPath: '', directories: [] })),
  }
  const controller = new ProjectController(projectService as any, {} as any, {} as any)

  app.use('/api', createSystemRouter(
    { getClientCount: () => 0 } as any,
    controller,
    projectService,
    { clearCache: jest.fn(), invalidateFile: jest.fn() },
  ))

  return app
}

describe('filesystem boundary API', () => {
  let projectRoot: string
  let outsideRoot: string

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mdt-project-'))
    outsideRoot = '/etc'
  })

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true })
  })

  it('denies directory browsing outside allowed roots', async () => {
    const response = await request(createApp(projectRoot)).get('/api/directories').query({ path: outsideRoot })

    expect(response.status).toBe(403)
    expect(response.body.directories).toBeUndefined()
  })

  it('allows directory browsing inside configured project roots', async () => {
    const response = await request(createApp(projectRoot)).get('/api/directories').query({ path: projectRoot })

    expect(response.status).toBe(200)
    expect(response.body.currentPath).toBe(await fs.realpath(projectRoot))
  })

  it('denies filesystem existence checks outside allowed roots without leaking existence', async () => {
    const response = await request(createApp(projectRoot)).post('/api/filesystem/exists').send({ path: outsideRoot })

    expect(response.status).toBe(403)
    expect(response.body.exists).toBeUndefined()
    expect(response.body.expandedPath).toBeUndefined()
  })
})
