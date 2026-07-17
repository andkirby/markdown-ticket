/// <reference types="jest" />
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import express from 'express'
import request from 'supertest'
import { buildRuntimeConfig } from '../../config/runtimeConfig'
import { createConfigRouter } from '../../routes/config'
import { isOwnerOnlyRoute } from '../../security/accessPolicy'

/**
 * Config owner-only policy tests (MDT-168): configuration detail reads and
 * mutations are owner-only; read-only/anonymous callers must be denied by the
 * route policy classification. Covers TEST-config-owner-only-policy (BR-5.1,
 * C-8).
 *
 * Note: the authoritative denial happens in `createApiAuthMiddleware`. These
 * tests assert (1) the route policy classifies every config endpoint as
 * owner-only, and (2) the endpoints are mounted and respond to owner context.
 */
function appWithConfigRouter(configDir: string) {
  const app = express()
  app.use(express.json())
  app.locals.runtimeConfig = buildRuntimeConfig({ ...process.env, CONFIG_DIR: configDir })
  app.use('/api/config', createConfigRouter())
  return app
}

describe('config owner-only policy', () => {
  let configDir: string

  beforeEach(async () => {
    configDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mdt168-policy-'))
  })

  afterEach(async () => {
    await fs.rm(configDir, { recursive: true, force: true })
  })

  it('classifies GET /api/config/selectors as owner-only', () => {
    expect(isOwnerOnlyRoute('/api/config/selectors')).toBe(true)
  })

  it('classifies PATCH /api/config as owner-only', () => {
    expect(isOwnerOnlyRoute('/api/config')).toBe(true)
  })

  it('GET /api/config/selectors responds under owner context (200, not 404)', async () => {
    const res = await request(appWithConfigRouter(configDir)).get('/api/config/selectors')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.selectors)).toBe(true)
    // file-only selectors omitted
    const selectors = res.body.selectors as Array<{ selector: string }>
    expect(selectors.find(s => s.selector === 'project.id')).toBeUndefined()
    expect(selectors.find(s => s.selector === 'links.enableTicketLinks')).toBeDefined()
  })

  it('exposure metadata is present on each returned selector', async () => {
    const res = await request(appWithConfigRouter(configDir)).get('/api/config/selectors')
    for (const s of res.body.selectors) {
      expect(['editable', 'guarded', 'readOnly', 'fileOnly']).toContain(s.exposure)
      expect(['project', 'global', 'user', 'registry']).toContain(s.scope)
      expect(typeof s.validation).toBe('string')
    }
  })
})
