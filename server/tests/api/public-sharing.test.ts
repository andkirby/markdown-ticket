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

  it('denies all protected project, ticket, and document mutations for scoped read-only sessions', async () => {
    const cr = await projectFactory.createTestCR('PRI', {
      title: 'Private baseline ticket',
      type: 'Feature Enhancement',
      priority: 'High',
      content: 'This ticket must not be mutated by read-only access.',
    })
    expect(cr.success).toBe(true)
    expect(cr.crCode).toEqual(expect.any(String))
    const crId = cr.crCode!

    const exchange = await request(app)
      .post('/api/auth/read-token')
      .send({ token: readToken })

    expect(exchange.status).toBe(200)
    const readOnlyCookie = cookiePair(firstSetCookie(exchange))

    const projectConfigPath = join(projectFactory.getProjectsDir(), 'PRI', '.mdt-config.toml')
    const projectConfigBefore = await fs.readFile(projectConfigPath, 'utf8')
    const documentFavStatePath = join(configDir, 'projects', 'PRI', 'document-favs.json')

    const deniedMutations = [
      {
        label: 'POST /api/projects/create',
        send: () => request(app)
          .post('/api/projects/create')
          .set('Cookie', readOnlyCookie)
          .send({ name: 'Rogue Project', code: 'ROG', path: join(tempDir, 'rogue-project') }),
      },
      {
        label: 'PUT /api/projects/:code/update',
        send: () => request(app)
          .put('/api/projects/PRI/update')
          .set('Cookie', readOnlyCookie)
          .send({ name: 'Mutated Private Project' }),
      },
      {
        label: 'PUT /api/projects/:code/sharing',
        send: () => request(app)
          .put('/api/projects/PRI/sharing')
          .set('Cookie', readOnlyCookie)
          .send({ mode: 'public-readonly' }),
      },
      {
        label: 'PUT /api/projects/:code/enable',
        send: () => request(app)
          .put('/api/projects/PRI/enable')
          .set('Cookie', readOnlyCookie)
          .send({}),
      },
      {
        label: 'PUT /api/projects/:code/disable',
        send: () => request(app)
          .put('/api/projects/PRI/disable')
          .set('Cookie', readOnlyCookie)
          .send({}),
      },
      {
        label: 'POST /api/projects/:projectId/crs',
        send: () => request(app)
          .post('/api/projects/PRI/crs')
          .set('Cookie', readOnlyCookie)
          .send({ title: 'Illegal write', type: 'Feature Enhancement' }),
      },
      {
        label: 'PATCH /api/projects/:projectId/crs/:crId',
        send: () => request(app)
          .patch(`/api/projects/PRI/crs/${crId}`)
          .set('Cookie', readOnlyCookie)
          .send({ status: 'In Progress' }),
      },
      {
        label: 'PUT /api/projects/:projectId/crs/:crId',
        send: () => request(app)
          .put(`/api/projects/PRI/crs/${crId}`)
          .set('Cookie', readOnlyCookie)
          .send({ title: 'Illegal replacement', type: 'Bug Fix' }),
      },
      {
        label: 'DELETE /api/projects/:projectId/crs/:crId',
        send: () => request(app)
          .delete(`/api/projects/PRI/crs/${crId}`)
          .set('Cookie', readOnlyCookie),
      },
      {
        label: 'PUT /api/documents/favs',
        send: () => request(app)
          .put('/api/documents/favs')
          .set('Cookie', readOnlyCookie)
          .send({
            projectId: 'PRI',
            favItems: [
              { path: 'README.md', type: 'file', favoritedAt: '2026-05-23T00:00:00.000Z' },
            ],
          }),
      },
      {
        label: 'POST /api/documents/configure',
        send: () => request(app)
          .post('/api/documents/configure')
          .set('Cookie', readOnlyCookie)
          .send({ projectId: 'PRI', documentPaths: ['docs', 'README.md'] }),
      },
    ]

    for (const mutation of deniedMutations) {
      const response = await mutation.send()
      expect(response.body).toEqual({ error: 'Forbidden' })
      expect(response.status).toBe(403)
    }

    const projects = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${ownerToken}`)
      .query({ bypassCache: 'true' })

    expect(projects.status).toBe(200)
    expect(projects.body.map((project: { id: string }) => project.id)).toEqual(['PRI', 'PUB', 'UNS'])
    const privateProject = projects.body.find((project: { id: string }) => project.id === 'PRI')
    expect(privateProject.project.name).toBe('Private Project')
    expect(privateProject.project.active).toBe(true)
    expect(privateProject.metadata?.sharing).toBeUndefined()

    const ticket = await request(app)
      .get(`/api/projects/PRI/crs/${crId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(ticket.status).toBe(200)
    expect(ticket.body.title).toBe('Private baseline ticket')
    expect(ticket.body.status).toBe('Proposed')

    const tickets = await request(app)
      .get('/api/projects/PRI/crs')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(tickets.status).toBe(200)
    expect(tickets.body.map((item: { code: string }) => item.code)).toEqual([crId])

    expect(await fs.readFile(projectConfigPath, 'utf8')).toBe(projectConfigBefore)
    expect(await pathExists(documentFavStatePath)).toBe(false)
  })

  it('merges an unlisted share session into an existing read-token session without dropping token projects', async () => {
    const readExchange = await request(app)
      .post('/api/auth/read-token')
      .send({ token: readToken })

    expect(readExchange.status).toBe(200)
    const readCookie = readExchange.headers['set-cookie']

    const shareExchange = await request(app)
      .post('/api/share/uns-share-id/session')
      .set('Cookie', readCookie)

    expect(shareExchange.status).toBe(200)
    const mergedCookie = shareExchange.headers['set-cookie']

    const scopedList = await request(app)
      .get('/api/projects')
      .set('Cookie', mergedCookie)

    expect(scopedList.body.map((project: { id: string }) => project.id)).toEqual(['PRI', 'PUB', 'UNS'])
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

function firstSetCookie(response: request.Response): string {
  const raw = response.headers['set-cookie']
  if (Array.isArray(raw)) {
    return raw[0] ?? ''
  }
  return raw ?? ''
}

function cookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0] ?? ''
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  }
  catch {
    return false
  }
}
