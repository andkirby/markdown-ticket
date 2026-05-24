/// <reference types="jest" />

import cors from 'cors'
import express from 'express'
import request from 'supertest'
import { createCorsOptions, createOriginPolicy, securityHeaders } from '../../security/originPolicy'

describe('reverse proxy compatibility', () => {
  function createApp() {
    const app = express()
    const originPolicy = createOriginPolicy(['https://app.example.com'])

    app.set('trust proxy', true)
    app.use(securityHeaders)
    app.use(cors(createCorsOptions(originPolicy)))
    app.get('/health', (_req, res) => res.json({ ok: true }))

    return app
  }

  it('keeps security headers and allowed CORS stable behind X-Forwarded headers', async () => {
    const response = await request(createApp())
      .get('/health')
      .set('Origin', 'https://app.example.com')
      .set('Host', 'internal:4001')
      .set('X-Forwarded-For', '203.0.113.10')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'app.example.com')

    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com')
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('DENY')
  })

  it('does not let forwarded host or proto bypass origin checks', async () => {
    const response = await request(createApp())
      .get('/health')
      .set('Origin', 'https://disallowed.example.com')
      .set('Host', 'internal:4001')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'app.example.com')

    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('preserves no-Origin clients behind reverse proxy headers', async () => {
    const response = await request(createApp())
      .get('/health')
      .set('Host', 'internal:4001')
      .set('X-Forwarded-For', '203.0.113.10')
      .set('X-Forwarded-Proto', 'https')
      .set('X-Forwarded-Host', 'app.example.com')

    expect(response.status).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })
})
