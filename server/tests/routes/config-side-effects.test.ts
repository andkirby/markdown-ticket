/// <reference types="jest" />
import { promises as fs } from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import express from 'express'
import request from 'supertest'
import { buildRuntimeConfig } from '../../config/runtimeConfig'
import { createConfigRouter } from '../../routes/config'

/**
 * Wired side-effect tests (MDT-168 AC: "Correct side effects fire after
 * successful... updates" and "explicit injected post-write effects"). Verifies
 * the route context hooks (clearDiscoveryCache, reconfigureDocumentWatchers)
 * are invoked after a successful write when the corresponding scope changes.
 */
function appWithConfigRouter(
  configDir: string,
  context: Parameters<typeof createConfigRouter>[0],
) {
  const app = express()
  app.use(express.json())
  app.locals.runtimeConfig = buildRuntimeConfig({
    ...process.env,
    CONFIG_DIR: configDir,
  })
  app.use('/api/config', createConfigRouter(context))
  return app
}

describe('config route wired side effects', () => {
  let configDir: string

  beforeEach(async () => {
    configDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'mdt168-sidefx-route-'),
    )
  })

  afterEach(async () => {
    await fs.rm(configDir, { recursive: true, force: true })
  })

  it('fires clearDiscoveryCache after a global-scope write', async () => {
    let cacheCleared = false
    const app = appWithConfigRouter(configDir, {
      clearDiscoveryCache: () => {
        cacheCleared = true
      },
    })
    const res = await request(app)
      .patch('/api/config')
      .send({ selector: 'links.enableTicketLinks', value: false })
    expect(res.status).toBe(200)
    expect(cacheCleared).toBe(true)
    // the side-effect result is reported in the response
    const refreshEffect = res.body.sideEffects.find(
      (s: { name: string }) => s.name === 'discovery-cache-refresh',
    )
    expect(refreshEffect).toBeDefined()
    expect(refreshEffect.ok).toBe(true)
  })

  it('does not fire clearDiscoveryCache for a non-global write', async () => {
    let cacheCleared = false
    const app = appWithConfigRouter(configDir, {
      clearDiscoveryCache: () => {
        cacheCleared = true
      },
    })
    // user-scope write should not trigger the global discovery cache effect
    const res = await request(app)
      .patch('/api/config')
      .send({ selector: 'ui.projectSelector.visibleCount', value: 9 })
    expect(res.status).toBe(200)
    expect(cacheCleared).toBe(false)
  })

  it('fires reconfigureDocumentWatchers after a project.document write', async () => {
    const watcherCalls: string[] = []
    const projectDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'mdt168-sidefx-proj-'),
    )
    await fs.writeFile(
      path.join(projectDir, '.mdt-config.toml'),
      '[project]\nname = "P"\ncode = "P"\nid = "p1"\n',
      'utf8',
    )
    const app = appWithConfigRouter(configDir, {
      resolveProjectPath: () => projectDir,
      resolveProjectId: () => 'p1',
      reconfigureDocumentWatchers: async (projectId, _paths) => {
        watcherCalls.push(projectId)
        return 1
      },
    })
    const res = await request(app)
      .patch('/api/config?projectId=p1')
      .send({ selector: 'project.document.maxDepth', value: 7 })
    expect(res.status).toBe(200)
    expect(watcherCalls).toContain('p1')
    const watcherEffect = res.body.sideEffects.find(
      (s: { name: string }) => s.name === 'document-watcher-refresh',
    )
    expect(watcherEffect).toBeDefined()
    expect(watcherEffect.ok).toBe(true)
    await fs.rm(projectDir, { recursive: true, force: true })
  })

  it('reports a side-effect failure distinctly from write success', async () => {
    const app = appWithConfigRouter(configDir, {
      clearDiscoveryCache: () => {
        throw new Error('cache backend down')
      },
    })
    const res = await request(app)
      .patch('/api/config')
      .send({ selector: 'links.enableTicketLinks', value: true })
    // write still succeeded
    expect(res.status).toBe(200)
    // but the effect failed and is reported
    const effect = res.body.sideEffects.find(
      (s: { name: string }) => s.name === 'discovery-cache-refresh',
    )
    expect(effect.ok).toBe(false)
    expect(effect.message).toContain('cache backend down')
  })
})
