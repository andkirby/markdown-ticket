/// <reference types="jest" />

import express from 'express'
import request from 'supertest'
import { securityHeaders } from '../../security/originPolicy'

describe('backend security headers', () => {
  it('sets nosniff and DENY frame headers on Express responses', async () => {
    const app = express()

    app.use(securityHeaders)
    app.get('/health', (_req, res) => res.json({ ok: true }))

    const response = await request(app).get('/health')

    expect(response.status).toBe(200)
    expect(response.headers['x-content-type-options']).toBe('nosniff')
    expect(response.headers['x-frame-options']).toBe('DENY')
  })
})
