/// <reference types="jest" />

import type { Express } from 'express'
import request from 'supertest'
import { cleanupTestEnvironment, setupTestEnvironment } from './setup'

const adminToken = 'mdt-176-admin-token'
const badToken = 'mdt-176-bad-token'
const allowedOrigin = 'http://localhost:6173'
const disallowedOrigin = 'https://disallowed.example.test'

function firstSetCookie(response: request.Response): string {
  const raw = response.headers['set-cookie']
  if (Array.isArray(raw)) {
    return raw[0] ?? ''
  }
  return raw ?? ''
}

function cookiePair(setCookieHeader: string): string {
  return setCookieHeader.split(';')[0]
}

function ownerSessionMaxAgeSeconds(app: Express): number {
  return (app.locals.runtimeConfig as { ownerSessions: { maxAgeSeconds: number } }).ownerSessions.maxAgeSeconds
}

describe('backend browser auth session contract - MDT-176', () => {
  let tempDir: string
  let app: Express
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(async () => {
    originalEnv = { ...process.env }
    process.env.NODE_ENV = 'production'
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

  it('exchanges a valid owner token for a server-managed HttpOnly Secure SameSite session cookie', async () => {
    const response = await request(app)
      .post('/api/auth/session')
      .set('Origin', allowedOrigin)
      .set('X-Forwarded-Proto', 'https')
      .send({ token: adminToken })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ authenticated: true })
    expect(JSON.stringify(response.body)).not.toContain(adminToken)

    const setCookie = firstSetCookie(response)
    expect(setCookie).toMatch(/HttpOnly/i)
    expect(setCookie).toMatch(/Secure/i)
    expect(setCookie).toMatch(/SameSite=Strict/i)
    expect(setCookie).toMatch(/Path=\/api/i)
    expect(setCookie).toContain(`Max-Age=${ownerSessionMaxAgeSeconds(app)}`)
    expect(setCookie).not.toContain(adminToken)
  })

  it('authenticates protected backend routes with the owner session cookie', async () => {
    const unlock = await request(app)
      .post('/api/auth/session')
      .set('Origin', allowedOrigin)
      .set('X-Forwarded-Proto', 'https')
      .send({ token: adminToken })

    const cookie = cookiePair(firstSetCookie(unlock))
    expect(cookie).toContain('=')

    const config = await request(app)
      .get('/api/config')
      .set('Cookie', cookie)

    expect(config.status).toBe(200)
    expect(JSON.stringify(config.body)).not.toContain(adminToken)
  })

  it('rejects invalid session exchange tokens with a generic response and no token echo or logs', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const response = await request(app)
        .post('/api/auth/session')
        .set('Origin', allowedOrigin)
        .send({ token: badToken })

      expect(response.status).toBe(401)
      expect(JSON.stringify(response.body)).toMatch(/auth/i)
      expect(JSON.stringify(response.body)).not.toContain(badToken)

      const consoleOutput = JSON.stringify([
        ...logSpy.mock.calls,
        ...warnSpy.mock.calls,
        ...errorSpy.mock.calls,
      ])
      expect(consoleOutput).not.toContain(badToken)
    }
    finally {
      logSpy.mockRestore()
      warnSpy.mockRestore()
      errorSpy.mockRestore()
    }
  })

  it('clears the session cookie on logout and rejects the old cookie on subsequent protected requests', async () => {
    const unlock = await request(app)
      .post('/api/auth/session')
      .set('Origin', allowedOrigin)
      .set('X-Forwarded-Proto', 'https')
      .send({ token: adminToken })
    const cookie = cookiePair(firstSetCookie(unlock))

    const logout = await request(app)
      .delete('/api/auth/session')
      .set('Cookie', cookie)
      .set('Origin', allowedOrigin)
      .set('X-MDT-Owner-Intent', '1')

    expect(logout.status).toBe(204)
    const clearCookie = firstSetCookie(logout)
    expect(clearCookie).toMatch(/Max-Age=0|Expires=/i)
    expect(clearCookie).toMatch(/HttpOnly/i)
    expect(clearCookie).toMatch(/SameSite=Strict/i)

    const config = await request(app)
      .get('/api/config')
      .set('Cookie', cookie)

    expect(config.status).toBe(403)
  })

  it('does not globally invalidate owner sessions when logout has no concrete Origin', async () => {
    const firstUnlock = await request(app)
      .post('/api/auth/session')
      .set('Origin', allowedOrigin)
      .set('X-Forwarded-Proto', 'https')
      .send({ token: adminToken })
    const firstCookie = cookiePair(firstSetCookie(firstUnlock))

    const secondUnlock = await request(app)
      .post('/api/auth/session')
      .set('Origin', allowedOrigin)
      .set('X-Forwarded-Proto', 'https')
      .send({ token: adminToken })
    const secondCookie = cookiePair(firstSetCookie(secondUnlock))

    const logout = await request(app)
      .delete('/api/auth/session')
      .set('Cookie', firstCookie)
      .set('X-MDT-Owner-Intent', '1')

    expect(logout.status).toBe(204)

    const config = await request(app)
      .get('/api/config')
      .set('Cookie', secondCookie)

    expect(config.status).toBe(200)
  })

  it('requires Origin and X-MDT-Owner-Intent for cookie-authenticated API mutations', async () => {
    const unlock = await request(app)
      .post('/api/auth/session')
      .set('Origin', allowedOrigin)
      .set('X-Forwarded-Proto', 'https')
      .send({ token: adminToken })
    const cookie = cookiePair(firstSetCookie(unlock))

    const missingOrigin = await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .set('X-MDT-Owner-Intent', '1')
      .send({ name: 'CSRF Probe', code: 'CSRF' })
    expect(missingOrigin.status).toBe(403)

    const missingIntent = await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .set('Origin', allowedOrigin)
      .send({ name: 'CSRF Probe', code: 'CSRF' })
    expect(missingIntent.status).toBe(403)

    const disallowedOriginRequest = await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .set('Origin', disallowedOrigin)
      .set('X-MDT-Owner-Intent', '1')
      .send({ name: 'CSRF Probe', code: 'CSRF' })
    expect(disallowedOriginRequest.status).toBe(403)

    const withCsrfSignals = await request(app)
      .post('/api/projects')
      .set('Cookie', cookie)
      .set('Origin', allowedOrigin)
      .set('X-MDT-Owner-Intent', '1')
      .send({ name: 'CSRF Probe', code: 'CSRF' })
    expect(withCsrfSignals.status).not.toBe(401)
    expect(withCsrfSignals.status).not.toBe(403)
  })

  it('keeps header-token authentication and health/status exemptions working beside session cookies', async () => {
    const bearer = await request(app)
      .get('/api/config')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(bearer.status).toBe(200)

    const apiKey = await request(app)
      .get('/api/config')
      .set('X-API-Key', adminToken)
    expect(apiKey.status).toBe(200)

    for (const path of ['/api/status', '/api/health']) {
      const response = await request(app).get(path)
      expect(response.status).toBe(200)
      expect(JSON.stringify(response.body)).not.toContain(adminToken)
    }
  })

  it('does not require browser CSRF intent headers for header-token API mutation clients', async () => {
    const bearerMutation = await request(app)
      .post('/api/projects/test/crs')
      .unset('Origin')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Bearer mutation without browser CSRF headers' })

    expect(bearerMutation.status).not.toBe(401)
    expect(bearerMutation.status).not.toBe(403)

    const apiKeyMutation = await request(app)
      .post('/api/projects/test/crs')
      .unset('Origin')
      .set('X-API-Key', adminToken)
      .send({ title: 'API key mutation without browser CSRF headers' })

    expect(apiKeyMutation.status).not.toBe(401)
    expect(apiKeyMutation.status).not.toBe(403)
  })
})
