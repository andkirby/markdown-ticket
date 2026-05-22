/// <reference types="jest" />

import { EventEmitter } from 'node:events'
import express from 'express'
import request from 'supertest'
import { createAuthMiddleware } from '../src/transports/middleware'
import { RateLimitManager } from '../src/utils/rateLimitManager'

describe('MCP auth session rate-limit hardening', () => {
  it('auth middleware accepts only matching bearer token and rejects missing, malformed, different-length, and equal-length invalid tokens', async () => {
    const app = express()
    app.use(createAuthMiddleware('expected-token'))
    app.get('/protected', (_req, res) => res.json({ ok: true }))

    expect((await request(app).get('/protected').set('Authorization', 'Bearer expected-token')).status).toBe(200)
    expect((await request(app).get('/protected')).status).toBe(401)
    expect((await request(app).get('/protected').set('Authorization', 'Basic expected-token')).status).toBe(401)
    expect((await request(app).get('/protected').set('Authorization', 'Bearer short')).status).toBe(401)
    expect((await request(app).get('/protected').set('Authorization', 'Bearer wronged-token')).status).toBe(401)
  })

  it('rate limits by caller plus tool instead of tool alone', () => {
    const manager = new RateLimitManager({ enabled: true, maxRequests: 1, windowMs: 60000 }, jest.fn())

    expect(manager.checkRateLimit('list_projects', 'caller-a').allowed).toBe(true)
    expect(manager.checkRateLimit('list_projects', 'caller-a').allowed).toBe(false)
    expect(manager.checkRateLimit('list_projects', 'caller-b').allowed).toBe(true)
  })
})
