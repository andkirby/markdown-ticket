/// <reference types="jest" />

import express from 'express'
import request from 'supertest'
import { buildRuntimeConfig } from '../../config/runtimeConfig'
import { createSystemRouter } from '../../routes/system'

function appWithSystemRouter() {
  const app = express()
  app.use(express.json())

  // Build runtimeConfig from current env (test sets NODE_ENV before calling this)
  app.locals.runtimeConfig = buildRuntimeConfig(process.env)

  app.use('/api', createSystemRouter(
    { getClientCount: () => 0 } as any,
    { getSystemDirectories: jest.fn() } as any,
    { clearCache: jest.fn() },
    { clearCache: jest.fn(), invalidateFile: jest.fn() },
  ))
  return app
}

describe('config maintenance policy', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousMaintenance = process.env.MAINTENANCE_ENDPOINTS_ENABLED

  afterEach(() => {
    process.env.NODE_ENV = previousNodeEnv
    if (previousMaintenance === undefined)
      delete process.env.MAINTENANCE_ENDPOINTS_ENABLED
    else
      process.env.MAINTENANCE_ENDPOINTS_ENABLED = previousMaintenance
  })

  it('hides production maintenance mutation endpoints by default', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.MAINTENANCE_ENDPOINTS_ENABLED

    expect((await request(appWithSystemRouter()).post('/api/cache/clear')).status).toBe(404)
    expect((await request(appWithSystemRouter()).post('/api/config/clear')).status).toBe(404)
  })

  it('allows production maintenance mutation endpoints with explicit opt-in', async () => {
    process.env.NODE_ENV = 'production'
    process.env.MAINTENANCE_ENDPOINTS_ENABLED = 'true'

    expect((await request(appWithSystemRouter()).post('/api/cache/clear')).status).toBe(200)
  })
})
