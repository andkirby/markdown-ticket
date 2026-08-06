/// <reference types="jest" />

import type { Express } from 'express'
import request from 'supertest'
import { createReadSessionCookie, getReadSessionSecret } from '../../security/readSession'
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
    // MDT-157 UAT 2026-08-06: this test rebuilds the app twice and runs 50
    // supertest requests; under --runInBand with the pre-existing open-handle
    // leak it flirts with the 10s default. Explicit timeout keeps the 5ms
    // assertion meaningful without flaking on slow CI.
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
    // MDT-157 UAT 2026-08-06: the no-auth baseline must opt into the loopback
    // bypass to measure an owner-capable no-auth path (the test runs on
    // loopback, and bypass now defaults off in test env). Without this the
    // owner-only /api/config route returns 403 instead of the 200 baseline.
    process.env.API_LOCAL_HOST_BYPASS = 'true'
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
  }, 30000)
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

  it('keeps read-session visitors read-only even when owner auth is disabled locally', async () => {
    const secret = getReadSessionSecret(undefined, process.env)
    if (!secret) {
      throw new Error('Expected local read-session secret in test mode')
    }
    const readOnlyCookie = cookiePair(createReadSessionCookie(secret, { projectRefs: ['MDT'] }, { secure: false }))

    const config = await request(app)
      .get('/api/config')
      .set('Cookie', readOnlyCookie)
    expect(config.status).toBe(403)

    const mutation = await request(app)
      .post('/api/projects/MDT/crs')
      .set('Cookie', readOnlyCookie)
      .send({ title: 'Blocked write', type: 'Feature Enhancement' })
    expect(mutation.status).toBe(403)
  })
})

// MDT-157 UAT 2026-08-06 — loopback-host no-auth carve-out truth table.
describe('backend loopback-host local bypass - MDT-157 UAT 2026-08-06', () => {
  let tempDir: string
  let app: Express
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    originalEnv = { ...process.env }
    process.env.NODE_ENV = 'test'
  })

  afterEach(async () => {
    await cleanupTestEnvironment(tempDir)
    process.env = originalEnv
  })

  it('grants owner on loopback Host with auth ENABLED and no token (bypass on)', async () => {
    process.env.API_SECURITY_AUTH = 'true'
    process.env.API_AUTH_TOKEN = adminToken
    process.env.API_LOCAL_HOST_BYPASS = 'true'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    const res = await request(app).get('/api/config').set('Host', 'localhost:3075')
    expect(res.status).toBe(200)
  })

  it('denies owner on tunnel Host with auth ENABLED and no token', async () => {
    process.env.API_SECURITY_AUTH = 'true'
    process.env.API_AUTH_TOKEN = adminToken
    process.env.API_LOCAL_HOST_BYPASS = 'true'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    // /api/config is owner-only → non-exempt unauthenticated request is 403.
    const res = await request(app).get('/api/config').set('Host', 'tunnel.trycloudflare.com')
    expect(res.status).toBe(403)
  })

  it('grants owner on loopback Host with auth DISABLED', async () => {
    delete process.env.API_SECURITY_AUTH
    delete process.env.API_AUTH_TOKEN
    process.env.API_LOCAL_HOST_BYPASS = 'true'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    const res = await request(app).get('/api/config').set('Host', 'localhost:3075')
    expect(res.status).toBe(200)
  })

  it('does NOT grant owner on tunnel Host with auth DISABLED (BR-1.8)', async () => {
    // Pre-UAT this returned 200/owner because disabled-auth granted owner to
    // every host. Now a non-loopback host must authenticate even with auth off.
    delete process.env.API_SECURITY_AUTH
    delete process.env.API_AUTH_TOKEN
    process.env.API_LOCAL_HOST_BYPASS = 'true'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    // /api/config is owner-only → a non-exempt, unauthenticated request is 403.
    const res = await request(app).get('/api/config').set('Host', 'tunnel.trycloudflare.com')
    expect(res.status).toBe(403)
  })

  it('does not grant bypass when API_LOCAL_HOST_BYPASS=false even on loopback Host', async () => {
    process.env.API_SECURITY_AUTH = 'true'
    process.env.API_AUTH_TOKEN = adminToken
    process.env.API_LOCAL_HOST_BYPASS = 'false'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    // /api/config is owner-only → without bypass, loopback Host must auth → 403.
    const res = await request(app).get('/api/config').set('Host', 'localhost:3075')
    expect(res.status).toBe(403)
  })

  it('rejects Host lookalike localhost.evil even with bypass on (Edge-5)', async () => {
    delete process.env.API_SECURITY_AUTH
    delete process.env.API_AUTH_TOKEN
    process.env.API_LOCAL_HOST_BYPASS = 'true'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    const res = await request(app).get('/api/config').set('Host', 'localhost.evil')
    expect(res.status).toBe(403)
  })

  it('ignores forged X-Forwarded-Host when Host is non-loopback (C4)', async () => {
    delete process.env.API_SECURITY_AUTH
    delete process.env.API_AUTH_TOKEN
    process.env.API_LOCAL_HOST_BYPASS = 'true'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    const res = await request(app)
      .get('/api/config')
      .set('Host', 'tunnel.trycloudflare.com')
      .set('X-Forwarded-Host', 'localhost')
    expect(res.status).toBe(403)
  })

  it('reports localExempt on GET /api/auth/session for loopback Host (session/gate consistency)', async () => {
    process.env.API_SECURITY_AUTH = 'true'
    process.env.API_AUTH_TOKEN = adminToken
    process.env.API_LOCAL_HOST_BYPASS = 'true'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    const local = await request(app).get('/api/auth/session').set('Host', 'localhost:3075')
    expect(local.status).toBe(200)
    expect(local.body.localExempt).toBe(true)
    expect(local.body.authEnabled).toBe(true)

    const tunnel = await request(app).get('/api/auth/session').set('Host', 'tunnel.trycloudflare.com')
    expect(tunnel.status).toBe(200)
    expect(tunnel.body.localExempt).toBe(false)
  })

  it('reports authEnabled=true for tunnel Host even with auth DISABLED (UI must not enter no-auth-dev)', async () => {
    // P1 fix: a disabled-auth backend reached on a non-loopback Host must tell
    // the UI that auth is effectively required (authEnabled: true), otherwise
    // AuthSessionProvider maps authEnabled===false -> no-auth-dev and shows
    // owner-capable controls that then fail on writes.
    delete process.env.API_SECURITY_AUTH
    delete process.env.API_AUTH_TOKEN
    process.env.API_LOCAL_HOST_BYPASS = 'true'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    const tunnel = await request(app).get('/api/auth/session').set('Host', 'tunnel.trycloudflare.com')
    expect(tunnel.status).toBe(200)
    expect(tunnel.body.localExempt).toBe(false)
    expect(tunnel.body.authEnabled).toBe(true)

    // Loopback on the same disabled-auth instance: genuinely local, no-auth-dev.
    const local = await request(app).get('/api/auth/session').set('Host', 'localhost:3075')
    expect(local.status).toBe(200)
    expect(local.body.localExempt).toBe(true)
    expect(local.body.authEnabled).toBe(false)
  })

  it('does not escalate an existing read-only session to owner on a loopback Host (C12)', async () => {
    delete process.env.API_SECURITY_AUTH
    delete process.env.API_AUTH_TOKEN
    process.env.API_LOCAL_HOST_BYPASS = 'true'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    const secret = getReadSessionSecret(undefined, process.env)
    if (!secret) {
      throw new Error('Expected local read-session secret in test mode')
    }
    const readOnlyCookie = cookiePair(createReadSessionCookie(secret, { projectRefs: ['MDT'] }, { secure: false }))

    // Owner-only route with a read-only session on a loopback Host: bypass
    // must NOT promote to owner. Read-only policy → 403 for owner-only route.
    const config = await request(app)
      .get('/api/config')
      .set('Host', 'localhost:3075')
      .set('Cookie', readOnlyCookie)
    expect(config.status).toBe(403)

    // Session endpoint must report read-only precedence over localExempt.
    const session = await request(app)
      .get('/api/auth/session')
      .set('Host', 'localhost:3075')
      .set('Cookie', readOnlyCookie)
    expect(session.status).toBe(200)
    expect(session.body.localExempt).toBe(false)
    expect(session.body.readAuthenticated).toBe(true)
  })

  it('blocks localExempt for an authenticated read session even with empty scopes (gate/session parity, review P2)', async () => {
    // Regression: the session endpoint previously gated localExempt on
    // readAuthenticated = authenticated && (projectRefs.length || shareIds.length),
    // while the /api gate keyed on authenticated alone. A valid-but-empty/revoked
    // read session made the UI enter no-auth-dev while the gate denied owner.
    // Both must now use the shared isLoopbackBypassEligible (authenticated only).
    delete process.env.API_SECURITY_AUTH
    delete process.env.API_AUTH_TOKEN
    process.env.API_LOCAL_HOST_BYPASS = 'true'
    const context = await setupTestEnvironment()
    tempDir = context.tempDir
    app = context.app

    const secret = getReadSessionSecret(undefined, process.env)
    if (!secret) {
      throw new Error('Expected local read-session secret in test mode')
    }
    // Authenticated read session with EMPTY scopes.
    const emptyScopeCookie = cookiePair(createReadSessionCookie(secret, { projectRefs: [], shareIds: [] }, { secure: false }))

    const session = await request(app)
      .get('/api/auth/session')
      .set('Host', 'localhost:3075')
      .set('Cookie', emptyScopeCookie)
    expect(session.status).toBe(200)
    // readAuthenticated is false (empty scopes), but localExempt must STILL be
    // false — the session is authenticated, so the gate would deny owner and the
    // UI must not claim no-auth-dev.
    expect(session.body.localExempt).toBe(false)
  })
})

function cookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0] ?? ''
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}
