/// <reference types="jest" />

import type { Express } from 'express'
import request from 'supertest'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

const adminToken = 'mdt-157-admin-token'

describe('backend API auth contract - MDT-157', () => {
  let tempDir: string
  let app: Express
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    originalEnv = { ...process.env }
    process.env.NODE_ENV = 'test'
    process.env.API_SECURITY_AUTH = 'true'
    process.env.API_AUTH_TOKEN = adminToken

    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app
  })

  afterEach(async () => {
    await cleanupTestEnvironment(tempDir)
    process.env = originalEnv
  })

  it('returns 403 for owner-only and mutation routes without credentials', async () => {
    const config = await request(app).get('/api/config')
    expect(config.status).toBe(403)
    expect(JSON.stringify(config.body)).not.toContain('mdt-157-admin-token')

    const createCr = await request(app).post('/api/projects/test/crs').send({ title: 'No auth' })
    expect(createCr.status).toBe(403)
  })

  it('accepts valid Authorization Bearer credentials for protected routes', async () => {
    const res = await request(app)
      .get('/api/config')
      .set('Authorization', `Bearer ${adminToken}`)

    expect(res.status).toBe(200)
  })

  it('accepts valid X-API-Key credentials for protected routes', async () => {
    const res = await request(app)
      .get('/api/config')
      .set('X-API-Key', adminToken)

    expect(res.status).toBe(200)
  })

  it('keeps /api/status and /api/health unauthenticated and minimal', async () => {
    for (const path of ['/api/status', '/api/health']) {
      const res = await request(app).get(path)

      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('status')
      expect(res.body).not.toHaveProperty('tasksDir')
      expect(JSON.stringify(res.body)).not.toContain(adminToken)
      expect(JSON.stringify(res.body)).not.toContain(process.env.CONFIG_DIR)
    }
  })

  it('applies identical token rules to no-Origin curl/server-to-server requests', async () => {
    const missing = await request(app).get('/api/config').unset('Origin')
    expect(missing.status).toBe(403)

    const valid = await request(app)
      .get('/api/config')
      .unset('Origin')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(valid.status).toBe(200)
  })

  it('fails closed when reverse proxy strips credential headers', async () => {
    const res = await request(app)
      .get('/api/config')
      .set('X-Forwarded-For', '203.0.113.10')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'mdt.example.test')

    expect(res.status).toBe(403)
  })

  it('authenticates when reverse proxy forwards Authorization or X-API-Key unchanged', async () => {
    const forwardedBearer = await request(app)
      .get('/api/config')
      .set('X-Forwarded-For', '203.0.113.10')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'mdt.example.test')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(forwardedBearer.status).toBe(200)

    const forwardedApiKey = await request(app)
      .get('/api/config')
      .set('X-Forwarded-For', '203.0.113.10')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'mdt.example.test')
      .set('X-API-Key', adminToken)
    expect(forwardedApiKey.status).toBe(200)
  })

  it('adds less than 5ms median latency on an authenticated protected route versus the same route with auth disabled', async () => {
    const iterations = 25
    const protectedRoute = '/api/config'
    const authenticatedSamples: number[] = []

    for (let index = 0; index < iterations; index += 1) {
      const started = performance.now()
      const res = await request(app).get(protectedRoute).set('Authorization', `Bearer ${adminToken}`)
      expect(res.status).toBe(200)
      authenticatedSamples.push(performance.now() - started)
    }

    await cleanupTestEnvironment(tempDir)
    process.env.NODE_ENV = 'test'
    delete process.env.API_SECURITY_AUTH
    delete process.env.API_AUTH_TOKEN
    const baselineContext = await setupTestEnvironment()
    tempDir = baselineContext.tempDir
    app = baselineContext.app

    const noAuthBaselineSamples: number[] = []
    for (let index = 0; index < iterations; index += 1) {
      const started = performance.now()
      const res = await request(app).get(protectedRoute)
      expect(res.status).toBe(200)
      noAuthBaselineSamples.push(performance.now() - started)
    }

    expect(median(authenticatedSamples) - median(noAuthBaselineSamples)).toBeLessThan(5)
  })
})

describe('backend no-auth migration warning - MDT-157', () => {
  let tempDir: string
  let app: Express
  let originalEnv: NodeJS.ProcessEnv
  let warnSpy: jest.SpyInstance

  beforeEach(async () => {
    originalEnv = { ...process.env }
    process.env.NODE_ENV = 'production'
    delete process.env.API_SECURITY_AUTH
    delete process.env.API_AUTH_TOKEN
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)

    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app
  })

  afterEach(async () => {
    warnSpy.mockRestore()
    await cleanupTestEnvironment(tempDir)
    process.env = originalEnv
  })

  it('continues serving existing protected routes and emits observable auth migration guidance', async () => {
    const res = await request(app).get('/api/projects')

    expect(res.status).toBe(200)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/auth|API_SECURITY_AUTH|API_AUTH_TOKEN|migration/i))
  })
})

describe('backend local/test no-auth compatibility - MDT-157', () => {
  let tempDir: string
  let app: Express
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    originalEnv = { ...process.env }
    process.env.NODE_ENV = 'test'
    delete process.env.API_SECURITY_AUTH
    delete process.env.API_AUTH_TOKEN

    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app
  })

  afterEach(async () => {
    await cleanupTestEnvironment(tempDir)
    process.env = originalEnv
  })

  it('preserves existing no-auth API behavior when auth config is absent in test mode', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
  })
})

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}
