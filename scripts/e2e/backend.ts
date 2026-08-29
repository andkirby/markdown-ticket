#!/usr/bin/env bun
/**
 * E2E Backend Launcher — MDT-239.
 *
 * Runs the test backend as ONE process per e2e run, out of any Playwright
 * worker, on the port chosen by the e2e wrapper (scripts/e2e/run.ts).
 *
 * Why out-of-process: Playwright workers are disposable and rotate after
 * failures. A backend living in a worker holds a fixed port, so every
 * rotation raced the port and cascaded EADDRINUSE failures (see
 * research/e2e-suite-audit-2026-08-28/report.md). This process is owned by
 * the wrapper, survives all worker rotations, and shuts down deterministically.
 *
 * Environment (set by scripts/e2e/run.ts):
 *   TEST_BACKEND_PORT — port to listen on (required)
 *   CONFIG_DIR        — run-scoped config directory (required)
 *
 * Admin seam (MDT-239): /_e2e/* routes mounted pre-auth, reachable only on
 * this process's localhost:ephemeral-port. They replace the old in-process
 * `e2eContext.fileWatcher.*` and `app.locals.runtimeConfig` mutations.
 */

import type { Express, Router } from 'express'
import type { Server } from 'node:http'
import type FileWatcherService from '../../server/services/fileWatcher/index.js'
import { createServer } from 'node:http'
import process from 'node:process'
import express from 'express'

const port = Number.parseInt(process.env.TEST_BACKEND_PORT ?? '', 10)
const configDir = process.env.CONFIG_DIR

if (!Number.isInteger(port) || port <= 0) {
  console.error('[e2e-backend] TEST_BACKEND_PORT must be set to a valid port (run via scripts/e2e/run.ts)')
  process.exit(1)
}
if (!configDir) {
  console.error('[e2e-backend] CONFIG_DIR must be set (run via scripts/e2e/run.ts)')
  process.exit(1)
}

/** Build the /_e2e admin router (closure over mutable deps, wired in main()). */
function createE2eAdminRouter(deps: { app?: Express, fileWatcher?: FileWatcherService }): Router {
  const router = express.Router()

  router.get('/_e2e/health', (_req, res) => {
    res.json({ ok: true, pid: process.pid, configDir })
  })

  // Replaces e2eContext.fileWatcher.initMultiProjectWatcher(projectPaths)
  router.post('/_e2e/watchers/multi-project', (req, res) => {
    const projects = req.body?.projects
    if (!Array.isArray(projects))
      return res.status(400).json({ error: 'body.projects must be an array of { id, path }' })
    try {
      deps.fileWatcher?.initMultiProjectWatcher(projects)
      res.json({ ok: true, count: projects.length })
    }
    catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
  })

  // Replaces e2eContext.fileWatcher.initDocumentWatchers(...)
  // Awaits the backend's 'document-ready' event (matching projectId, and
  // watcherId suffix when provided) up to 1500ms before responding — the
  // server-side equivalent of the old waitForDocumentWatcherReady helper.
  router.post('/_e2e/watchers/documents', (req, res) => {
    const { projectId, projectRoot, documentPaths, ticketsPath, watcherSuffix } = req.body ?? {}
    if (typeof projectId !== 'string' || typeof projectRoot !== 'string' || !Array.isArray(documentPaths))
      return res.status(400).json({ error: 'body must contain projectId, projectRoot, documentPaths[]' })
    try {
      const watcher = deps.fileWatcher
      if (!watcher)
        return res.status(503).json({ error: 'fileWatcher not wired' })

      let watchers = 0
      // `on` + explicit removal, NOT `once`: a `once` listener is consumed by
      // ANY document-ready event — a non-matching one (other project) would
      // silently guarantee the 1500ms timeout even when the matching event
      // fires later.
      const ready = new Promise<boolean>((resolve) => {
        // Forward-declared so onReady (which clears it) can be declared first.
        let timeout: ReturnType<typeof setTimeout> | undefined
        const onReady = (data: { projectId: string, watcherId: string }) => {
          if (data.projectId === projectId && (!watcherSuffix || data.watcherId.endsWith(watcherSuffix))) {
            clearTimeout(timeout)
            watcher.off('document-ready', onReady)
            resolve(true)
          }
        }
        timeout = setTimeout(() => {
          watcher.off('document-ready', onReady)
          resolve(false)
        }, 1500)
        watcher.on('document-ready', onReady)
        watchers = watcher.initDocumentWatchers(projectId, projectRoot, documentPaths, ticketsPath)
      })
      void ready.then(isReady => res.json({ ok: true, watchers, ready: isReady }))
    }
    catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
  })

  // Replaces e2eContext.app.locals.runtimeConfig overrides (read-access-journey spec)
  async function applyRuntimeConfig(res: import('express').Response, overrides: Record<string, string | undefined>) {
    try {
      const { buildRuntimeConfig } = await import('../../server/config/runtimeConfig.js')
      deps.app!.locals.runtimeConfig = buildRuntimeConfig({
        ...process.env,
        NODE_ENV: 'test',
        ...overrides,
      } as NodeJS.ProcessEnv)
      res.json({ ok: true })
    }
    catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
    }
  }

  router.put('/_e2e/runtime-config', (req, res) => {
    const overrides = req.body?.overrides
    if (!overrides || typeof overrides !== 'object')
      return res.status(400).json({ error: 'body.overrides must be an object' })
    void applyRuntimeConfig(res, overrides)
  })

  router.delete('/_e2e/runtime-config', (_req, res) => {
    void applyRuntimeConfig(res, {})
  })

  return router
}

async function main(): Promise<void> {
  // Mutable deps: the router must be constructed BEFORE createTestApp (so it
  // mounts pre-auth via options), but the app/watcher only exist after.
  // Requests cannot arrive before listen(), by which time deps are wired.
  const deps: { app?: Express, fileWatcher?: FileWatcherService } = {}
  const adminRouter = createE2eAdminRouter(deps)

  // Isolation contract: CONFIG_DIR is set (verified above) BEFORE the app
  // factory and its services are imported.
  const { createTestApp } = await import('../../server/tests/api/test-app-factory.js')
  const { app, fileWatcher } = createTestApp({ preAuthRouter: adminRouter })
  deps.app = app
  deps.fileWatcher = fileWatcher

  const server: Server = createServer(app)

  // Track sockets so shutdown can destroy open SSE connections —
  // server.close() alone hangs forever while any SSE stream is open.
  const sockets = new Set<import('node:net').Socket>()
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })

  let shuttingDown = false
  function shutdown(signal: string) {
    if (shuttingDown)
      return
    shuttingDown = true
    const forceExit = setTimeout(() => {
      console.error(`[e2e-backend] forced exit after timeout on ${signal}`)
      process.exit(0)
    }, 3000)
    forceExit.unref()
    try {
      fileWatcher.stop()
    }
    catch (error) {
      console.error('[e2e-backend] fileWatcher.stop() failed:', error)
    }
    server.close(() => {
      clearTimeout(forceExit)
      process.exit(0)
    })
    for (const socket of sockets)
      socket.destroy()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  await new Promise<void>((resolve, reject) => {
    server.listen(port, () => resolve())
    server.on('error', reject)
  })

  console.log(`[e2e-backend] listening on http://localhost:${port} (config: ${configDir}, pid ${process.pid})`)
}

main().catch((error) => {
  console.error('[e2e-backend] fatal:', error)
  process.exit(1)
})
