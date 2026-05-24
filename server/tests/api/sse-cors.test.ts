/// <reference types="jest" />

import type { Express } from 'express'
import type { Server } from 'node:http'
import { createServer, request as httpRequest } from 'node:http'
import express from 'express'
import { createSSERouter } from '../../routes/sse'
import { createOriginPolicy } from '../../security/originPolicy'
import FileWatcherService from '../../services/fileWatcher/index.js'

function createApp(): { app: Express, fileWatcher: FileWatcherService } {
  const app = express()
  const fileWatcher = new FileWatcherService()
  const originPolicy = createOriginPolicy(['https://app.example.com'])

  app.use('/api/events', createSSERouter(fileWatcher, originPolicy))

  return { app, fileWatcher }
}

function listen(server: Server): Promise<number> {
  return new Promise((resolve, reject) => {
    server.listen(0, () => {
      const address = server.address()

      if (!address || typeof address === 'string') {
        reject(new Error('Failed to bind test server'))
        return
      }

      resolve(address.port)
    })
    server.on('error', reject)
  })
}

function close(server: Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve())
  })
}

function getSseHeaders(url: string, origin?: string): Promise<{ statusCode: number | undefined, headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, { headers: origin ? { Origin: origin } : undefined }, (res) => {
      resolve({
        statusCode: res.statusCode,
        headers: res.headers,
      })
      res.destroy()
      req.destroy()
    })

    req.setTimeout(1000, () => {
      req.destroy(new Error('SSE response did not start within timeout'))
    })
    req.on('error', reject)
    req.end()
  })
}

describe('sSE CORS policy', () => {
  let fileWatcher: FileWatcherService
  let server: Server
  let baseUrl: string

  beforeEach(async () => {
    const context = createApp()

    fileWatcher = context.fileWatcher
    server = createServer(context.app)
    const port = await listen(server)

    baseUrl = `http://127.0.0.1:${port}`
  })

  afterEach(async () => {
    fileWatcher.stop()
    await close(server)
  })

  it('allows configured browser origins without wildcard CORS', async () => {
    const response = await getSseHeaders(`${baseUrl}/api/events`, 'https://app.example.com')

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBe('https://app.example.com')
    expect(response.headers['access-control-allow-origin']).not.toBe('*')
  })

  it('does not expose stream access to disallowed browser origins', async () => {
    const response = await getSseHeaders(`${baseUrl}/api/events`, 'https://disallowed.example.com')

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('preserves no-Origin clients without wildcard CORS', async () => {
    const response = await getSseHeaders(`${baseUrl}/api/events`)

    expect(response.statusCode).toBe(200)
    expect(response.headers['access-control-allow-origin']).toBeUndefined()
  })
})
