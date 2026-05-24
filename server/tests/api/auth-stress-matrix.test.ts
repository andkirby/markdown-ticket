/// <reference types="jest" />

import type { ProjectFactory } from '@mdt/shared/test-lib'
import type { Express } from 'express'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'
import request from 'supertest'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

const ownerToken = 'mdt-stress-owner-token'
const readToken = 'mdt-stress-read-token'
const allowedOrigin = 'http://localhost:6173'
const disallowedOrigin = 'https://disallowed.example.test'

interface RegistryFile {
  metadata?: {
    sharing?: {
      mode?: string
      shareId?: string
    }
  }
}

describe('auth and sharing stress matrix', () => {
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

    await projectFactory.createProject('empty', { name: 'Private Stress Target', code: 'PRI' })
    await projectFactory.createProject('empty', { name: 'Public Stress Target', code: 'PUB' })
    await projectFactory.createProject('empty', { name: 'Unlisted Stress Target', code: 'UNS' })

    await setSharing('PUB', { mode: 'public-readonly', shareId: 'pub-stress-share' })
    await setSharing('UNS', { mode: 'unlisted-readonly', shareId: 'uns-stress-share' })
  })

  afterEach(async () => {
    await cleanupTestEnvironment(tempDir)
    process.env = originalEnv
  })

  it('does not treat spoofable browser and proxy headers as owner credentials', async () => {
    const response = await request(app)
      .get('/api/config')
      .set('Origin', allowedOrigin)
      .set('Referer', `${allowedOrigin}/prj/PRI`)
      .set('X-Forwarded-For', '203.0.113.44')
      .set('X-Forwarded-Host', 'localhost:6173')
      .set('X-Forwarded-Proto', 'https')
      .set('X-MDT-Owner-Intent', '1')

    expect(response.status).toBe(403)
    expect(JSON.stringify(response.body)).not.toContain(ownerToken)
    expect(JSON.stringify(response.body)).not.toContain(configDir)
    expect(JSON.stringify(response.body)).not.toContain('Private Stress Target')
  })

  it('keeps read-only cookies read-only even with owner-intent and proxy spoofing headers', async () => {
    const exchange = await request(app)
      .post('/api/auth/read-token')
      .send({ token: readToken })
    expect(exchange.status).toBe(200)
    const readOnlyCookie = cookiePair(firstSetCookie(exchange))

    const mutation = await request(app)
      .post('/api/projects/PRI/crs')
      .set('Cookie', readOnlyCookie)
      .set('Origin', allowedOrigin)
      .set('X-MDT-Owner-Intent', '1')
      .set('X-Forwarded-Host', 'localhost:6173')
      .set('X-Forwarded-Proto', 'https')
      .send({ title: 'Read-only escalation attempt', type: 'Feature Enhancement' })

    expect(mutation.status).toBe(403)
    expect(mutation.body).toEqual({ error: 'Forbidden' })

    const tickets = await request(app)
      .get('/api/projects/PRI/crs')
      .set('Authorization', `Bearer ${ownerToken}`)
    expect(tickets.status).toBe(200)
    expect(tickets.body).toEqual([])
  })

  it('rejects owner-cookie mutations when forwarded headers try to fake same-origin intent', async () => {
    const unlock = await request(app)
      .post('/api/auth/session')
      .set('Origin', allowedOrigin)
      .set('X-Forwarded-Proto', 'https')
      .send({ token: ownerToken })
    expect(unlock.status).toBe(200)
    const ownerCookie = cookiePair(firstSetCookie(unlock))

    const missingOrigin = await request(app)
      .post('/api/projects/create')
      .set('Cookie', ownerCookie)
      .set('X-MDT-Owner-Intent', '1')
      .set('X-Forwarded-Host', 'localhost:6173')
      .set('X-Forwarded-Proto', 'https')
      .send({ name: 'Forged Origin Project', code: 'FORG', path: join(tempDir, 'forged-origin-project') })

    expect(missingOrigin.status).toBe(403)

    const disallowedOriginResponse = await request(app)
      .post('/api/projects/create')
      .set('Cookie', ownerCookie)
      .set('Origin', disallowedOrigin)
      .set('X-MDT-Owner-Intent', '1')
      .set('X-Forwarded-Host', 'localhost:6173')
      .set('X-Forwarded-Proto', 'https')
      .send({ name: 'Forged Origin Project', code: 'FORG', path: join(tempDir, 'forged-origin-project') })

    expect(disallowedOriginResponse.status).toBe(403)
  })

  it('does not leak private paths, config files, or share IDs through public and share responses', async () => {
    const anonymousList = await request(app).get('/api/projects')

    expect(anonymousList.status).toBe(200)
    expect(anonymousList.body.map((project: { id: string }) => project.id)).toEqual(['PUB'])
    expect(JSON.stringify(anonymousList.body)).not.toContain(tempDir)
    expect(JSON.stringify(anonymousList.body)).not.toContain(configDir)
    expect(JSON.stringify(anonymousList.body)).not.toContain('Private Stress Target')
    expect(JSON.stringify(anonymousList.body)).not.toContain('Unlisted Stress Target')
    expect(JSON.stringify(anonymousList.body)).not.toContain('pub-stress-share')
    expect(anonymousList.body[0].project.path).toBe('')
    expect(anonymousList.body[0].project.configFile).toBe('')

    const shareExchange = await request(app).post('/api/share/uns-stress-share/session')

    expect(shareExchange.status).toBe(200)
    expect(shareExchange.body.project.project.code).toBe('UNS')
    expect(shareExchange.body.project.project.path).toBe('')
    expect(shareExchange.body.project.project.configFile).toBe('')
    expect(JSON.stringify(shareExchange.body)).not.toContain(tempDir)
    expect(JSON.stringify(shareExchange.body)).not.toContain(configDir)
    expect(JSON.stringify(shareExchange.body)).not.toContain('uns-stress-share')
  })

  it('returns generic not-found responses for private and unlisted direct probes', async () => {
    const probes = [
      '/api/projects/PRI/config',
      '/api/projects/PRI/crs',
      '/api/projects/UNS/config',
      '/api/projects/UNS/crs',
    ]

    for (const path of probes) {
      const response = await request(app).get(path)

      expect(response.status).toBe(404)
      expect(JSON.stringify(response.body)).not.toContain('Private Stress Target')
      expect(JSON.stringify(response.body)).not.toContain('Unlisted Stress Target')
      expect(JSON.stringify(response.body)).not.toContain(tempDir)
      expect(JSON.stringify(response.body)).not.toContain(configDir)
    }
  })

  it('keeps owner-only system surfaces unavailable to read-only sessions', async () => {
    const exchange = await request(app)
      .post('/api/auth/read-token')
      .send({ token: readToken })
    expect(exchange.status).toBe(200)
    const readOnlyCookie = cookiePair(firstSetCookie(exchange))

    const responses = [
      await request(app)
        .get('/api/config')
        .set('Cookie', readOnlyCookie),
      await request(app)
        .get('/api/directories')
        .query({ path: projectFactory.getProjectsDir() })
        .set('Cookie', readOnlyCookie),
      await request(app)
        .post('/api/filesystem/exists')
        .set('Cookie', readOnlyCookie)
        .set('Origin', allowedOrigin)
        .set('X-MDT-Owner-Intent', '1')
        .send({ path: join(projectFactory.getProjectsDir(), 'PRI') }),
    ]

    for (const response of responses) {
      expect(response.status).toBe(403)
      expect(response.body).toEqual({ error: 'Forbidden' })
    }
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
