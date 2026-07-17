/// <reference types="jest" />
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import express from 'express'
import request from 'supertest'
import { buildRuntimeConfig } from '../../config/runtimeConfig'
import { createConfigRouter } from '../../routes/config'

/**
 * Config API validation tests (MDT-168): field-level errors for disallowed and
 * invalid selectors. Covers TEST-config-api-validation-errors (BR-2.2, BR-2.3,
 * C-9).
 */
function appWithConfigRouter(configDir: string) {
  const app = express()
  app.use(express.json())
  app.locals.runtimeConfig = buildRuntimeConfig({ ...process.env, CONFIG_DIR: configDir })
  app.use('/api/config', createConfigRouter())
  return app
}

describe('config API — validation errors', () => {
  let configDir: string

  beforeEach(async () => {
    configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdt168-api-'))
  })

  afterEach(async () => {
    await fs.rm(configDir, { recursive: true, force: true })
  })

  it('rejects an unknown selector with a field-level error before any write', async () => {
    const res = await request(appWithConfigRouter(configDir))
      .patch('/api/config')
      .send({ selector: 'totally.unknown', value: true })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation Error')
    expect(res.body.selector).toBe('totally.unknown')
    expect(res.body.field).toBe('totally.unknown')
    // no config file written
    await expect(fs.readFile(path.join(configDir, 'config.toml'), 'utf8')).rejects.toThrow()
  })

  it('rejects a guarded selector routed through the scalar patcher', async () => {
    const res = await request(appWithConfigRouter(configDir))
      .patch('/api/config')
      .send({ selector: 'discovery.maxDepth', value: 5 })
    expect(res.status).toBe(400)
    expect(res.body.selector).toBe('discovery.maxDepth')
    expect(String(res.body.message)).toMatch(/guarded/i)
  })

  it('rejects an invalid value with a field-level error and never defaults it', async () => {
    const res = await request(appWithConfigRouter(configDir))
      .patch('/api/config')
      .send({ selector: 'links.enableTicketLinks', value: 'not-a-boolean' })
    expect(res.status).toBe(400)
    expect(res.body.selector).toBe('links.enableTicketLinks')
  })

  it('rejects a request missing the selector field', async () => {
    const res = await request(appWithConfigRouter(configDir))
      .patch('/api/config')
      .send({ value: true })
    expect(res.status).toBe(400)
    expect(res.body.field).toBe('selector')
  })

  it('accepts a valid editable selector and returns the effective value', async () => {
    const res = await request(appWithConfigRouter(configDir))
      .patch('/api/config')
      .send({ selector: 'links.enableTicketLinks', value: false })
    expect(res.status).toBe(200)
    expect(res.body.selector).toBe('links.enableTicketLinks')
    expect(res.body.effective).toBe(false)
    expect(typeof res.body.filePath).toBe('string')
  })
})
