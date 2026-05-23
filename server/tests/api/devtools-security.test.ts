/// <reference types="jest" />

import type { Express } from 'express'
import type { Server } from 'node:http'
import { createServer, request as httpRequest } from 'node:http'
import express from 'express'
import request from 'supertest'
import { buildRuntimeConfig } from '../../config/runtimeConfig'
import { createDevToolsRouter } from '../../routes/devtools'
import { createOriginPolicy } from '../../security/originPolicy'

function withEnv<T>(updates: Record<string, string | undefined>, run: () => T): T {
  const previous = Object.fromEntries(Object.keys(updates).map(key => [key, process.env[key]]))

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined)
      delete process.env[key]
    else
      process.env[key] = value
  }

  try {
    return run()
  }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined)
        delete process.env[key]
      else
        process.env[key] = value
    }
  }
}

function createApp(): Express {
  const app = express()
  const originPolicy = createOriginPolicy(['https://app.example.com'])
  const runtimeConfig = buildRuntimeConfig()

  app.use('/api/devtools', createDevToolsRouter(originPolicy, runtimeConfig.system.devtoolsEnabled))
  return app
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error('No port'))
        return
      }
      resolve(address.port)
    })
    server.on('error', reject)
  })
}

function getSseHeaders(url: string, origin: string): Promise<Record<string, string | string[] | undefined>> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, { headers: { Origin: origin } }, (res) => {
      resolve(res.headers)
      res.destroy()
      req.destroy()
    })

    req.setTimeout(1000, () => req.destroy(new Error('SSE response did not start')))
    req.on('error', reject)
    req.end()
  })
}

describe('devtools security policy', () => {
  it('hides devtools in production unless explicitly enabled', async () => {
    const app = withEnv({ NODE_ENV: 'production', DEVTOOLS_ENABLED: undefined }, createApp)

    expect((await request(app).get('/api/devtools/logs')).status).toBe(404)
  })

  it('applies shared CORS policy to devtools streams', async () => {
    const app = withEnv({ NODE_ENV: 'development' }, createApp)
    const server = createServer(app)
    const port = await listen(server)

    try {
      const headers = await getSseHeaders(`http://127.0.0.1:${port}/api/devtools/logs/stream`, 'https://app.example.com')

      expect(headers['access-control-allow-origin']).toBe('https://app.example.com')
      expect(headers['access-control-allow-origin']).not.toBe('*')
    }
    finally {
      await new Promise<void>(resolve => server.close(() => resolve()))
    }
  })
})
