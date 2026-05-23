/// <reference types="jest" />

import type { ProjectFactory } from '@mdt/shared/test-lib'
import type { Express } from 'express'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import request from 'supertest'
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

const ownerToken = 'mdt-172-owner-token'
const readToken = 'public-read-token'

interface RegistryFile {
  metadata?: {
    sharing?: {
      mode?: string
      shareId?: string
    }
  }
  project?: Record<string, unknown>
}

describe('public read-only sharing - MDT-172', () => {
  let tempDir: string
  let configDir: string
  let app: Express
  let projectFactory: ProjectFactory
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    originalEnv = { ...process.env }
    process.env.NODE_ENV = 'test'
    process.env.API_SECURITY_AUTH = 'true'
    process.env.API_AUTH_TOKEN = ownerToken
    process.env.API_READ_TOKEN_HASHES = `${hashToken(readToken)}:PRI`

    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    configDir = context.testEnv.getConfigDirectory()
    app = context.app
    projectFactory = context.projectFactory

    await projectFactory.createProject('empty', { name: 'Private Project', code: 'PRI' })
    await projectFactory.createProject('empty', { name: 'Public Project', code: 'PUB' })
    await projectFactory.createProject('empty', { name: 'Unlisted Project', code: 'UNS' })

    await projectFactory.createTestCR('PUB', {
      title: 'Public ticket',
      type: 'Feature Enhancement',
      priority: 'High',
      content: 'Visible through public sharing.',
    })
    await projectFactory.createTestCR('UNS', {
      title: 'Unlisted ticket',
      type: 'Feature Enhancement',
      priority: 'High',
      content: 'Visible through share link.',
    })

    await setSharing('PUB', { mode: 'public-readonly', shareId: 'pub-share-id' })
    await setSharing('UNS', { mode: 'unlisted-readonly', shareId: 'uns-share-id' })
  })

  afterEach(async () => {
    await cleanupTestEnvironment(tempDir)
    process.env = originalEnv
  })

  it('returns only public-readonly projects to anonymous project listing', async () => {
    const res = await request(app).get('/api/projects')

    expect(res.status).toBe(200)
    expect(res.body.map((project: { id: string }) => project.id)).toEqual(['PUB'])
    expect(JSON.stringify(res.body)).not.toContain('Private Project')
    expect(JSON.stringify(res.body)).not.toContain('Unlisted Project')
  })

  it('opens an unlisted project through share session without listing it anonymously', async () => {
    const anonymousList = await request(app).get('/api/projects')
    expect(anonymousList.body.map((project: { id: string }) => project.id)).not.toContain('UNS')

    const exchange = await request(app).post('/api/share/uns-share-id/session')
    expect(exchange.status).toBe(200)
    expect(exchange.body.project.project.code).toBe('UNS')

    const cookie = exchange.headers['set-cookie']
    const scopedList = await request(app).get('/api/projects').set('Cookie', cookie)
    expect(scopedList.body.map((project: { id: string }) => project.id)).toContain('UNS')

    const tickets = await request(app).get('/api/projects/UNS/crs').set('Cookie', cookie)
    expect(tickets.status).toBe(200)
    expect(tickets.body[0].title).toBe('Unlisted ticket')
  })

  it('revokes existing unlisted share sessions when sharing is disabled', async () => {
    const exchange = await request(app).post('/api/share/uns-share-id/session')
    expect(exchange.status).toBe(200)
    const cookie = exchange.headers['set-cookie']

    const update = await request(app)
      .put('/api/projects/UNS/sharing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mode: 'private' })

    expect(update.status).toBe(200)

    const tickets = await request(app).get('/api/projects/UNS/crs').set('Cookie', cookie)
    expect(tickets.status).toBe(404)
  })

  it('denies read-only mutations for public projects', async () => {
    const create = await request(app)
      .post('/api/projects/PUB/crs')
      .send({ title: 'Illegal write', type: 'Feature Enhancement' })

    expect(create.status).toBe(403)

    const ownerCreate = await request(app)
      .post('/api/projects/PUB/crs')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ title: 'Owner write', type: 'Feature Enhancement' })

    expect(ownerCreate.status).toBe(201)
  })

  it('accepts hashed scoped read tokens without granting write access', async () => {
    const exchange = await request(app)
      .post('/api/auth/read-token')
      .send({ token: readToken })

    expect(exchange.status).toBe(200)
    const cookie = exchange.headers['set-cookie']

    const scopedList = await request(app).get('/api/projects').set('Cookie', cookie)
    expect(scopedList.body.map((project: { id: string }) => project.id)).toEqual(['PRI', 'PUB'])

    const mutation = await request(app)
      .patch('/api/projects/PRI/crs/PRI-001')
      .set('Cookie', cookie)
      .send({ status: 'In Progress' })

    expect(mutation.status).toBe(403)
  })

  it('lets owner/admin update sharing without storing it in project-local config', async () => {
    const update = await request(app)
      .put('/api/projects/PRI/sharing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mode: 'public-readonly' })

    expect(update.status).toBe(200)
    expect(update.body.metadata.sharing.mode).toBe('public-readonly')
    expect(update.body.metadata.sharing.shareId).toEqual(expect.any(String))

    const anonymousList = await request(app).get('/api/projects')
    expect(anonymousList.body.map((project: { id: string }) => project.id)).toContain('PRI')

    const localConfig = await fs.readFile(join(projectFactory.getProjectsDir(), 'PRI', '.mdt-config.toml'), 'utf8')
    expect(localConfig).not.toContain('public-readonly')
    expect(localConfig).not.toContain(update.body.metadata.sharing.shareId)
  })

  it('rejects caller-chosen share IDs', async () => {
    const update = await request(app)
      .put('/api/projects/PRI/sharing')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ mode: 'public-readonly', shareId: 'pri-public-share' })

    expect(update.status).toBe(400)
  })

  async function setSharing(projectId: string, sharing: { mode: string, shareId?: string }): Promise<void> {
    const registryPath = join(configDir, 'projects', `${projectId}.toml`)
    const registry = parseToml(await fs.readFile(registryPath, 'utf8')) as RegistryFile
    registry.metadata = {
      ...registry.metadata,
      sharing,
    }
    await fs.writeFile(registryPath, stringify(registry), 'utf8')
  }
})

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
