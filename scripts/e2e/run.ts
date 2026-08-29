#!/usr/bin/env bun
/**
 * E2E Run Wrapper — MDT-239.
 *
 * Owns the run lifecycle so Playwright workers own nothing:
 *   1. Allocates ephemeral frontend/backend ports (concurrent-run safe)
 *   2. Creates the run-scoped CONFIG_DIR (shared by backend + workers)
 *   3. Exports the port/config env to Playwright and its webServers
 *      (webServer[0] = scripts/e2e/backend.ts, webServer[1] = vite proxy)
 *   4. Always tears down: kills leaked listeners on OUR ports, removes the
 *      temp dir, and fails loudly if anything survives
 *
 * Usage: bun run test:e2e [-- <playwright args>]
 * PWTEST_SKIP_WEB_SERVER=1 skips allocation/cleanup entirely (orchestrator
 * env must already provide TEST_*_PORT/URL and CONFIG_DIR).
 */

import type { ChildProcess } from 'node:child_process'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

const SKIP_WEB_SERVER = process.env.PWTEST_SKIP_WEB_SERVER === '1'

/**
 * Pick a free TCP port by binding :0. The socket is returned still-open;
 *  callers close it right before the children that will rebind it start.
 */
function reservePort(): Promise<{ port: number, release: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address !== 'object')
        return reject(new Error('unexpected listen address'))
      const port = address.port
      resolve({
        port,
        release: () => new Promise<void>((res, rej) => {
          server.close(() => res())
          server.on('error', rej)
        }),
      })
    })
  })
}

/**
 * Best-effort kill of whatever listens on a port WE allocated. Silently
 *  no-ops where lsof is unavailable (e.g. some CI images).
 */
function killPortListeners(port: number): number[] {
  const probed = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' })
  if (probed.error || probed.status !== 0 || !probed.stdout.trim())
    return []
  const pids = probed.stdout.split('\n').map(p => Number.parseInt(p, 10)).filter(p => Number.isInteger(p) && p > 0 && p !== process.pid)
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGKILL')
    }
    catch { /* already gone */ }
  }
  return pids
}

interface RunState {
  ports: { backend: number, frontend: number }
  tempDir: string | null
}

let state: RunState | null = null

async function teardown(): Promise<void> {
  if (!state)
    return
  const { ports, tempDir } = state
  state = null

  const killedBackend = killPortListeners(ports.backend)
  const killedFrontend = killPortListeners(ports.frontend)
  if (killedBackend.length > 0)
    console.log(`[e2e-run] safety-net kill on backend port ${ports.backend}: pids ${killedBackend.join(', ')}`)
  if (killedFrontend.length > 0)
    console.log(`[e2e-run] safety-net kill on frontend port ${ports.frontend}: pids ${killedFrontend.join(', ')}`)

  if (tempDir) {
    try {
      if (tempDir.startsWith(tmpdir()))
        rmSync(tempDir, { recursive: true, force: true, maxRetries: 3 })
      if (existsSync(tempDir))
        console.warn(`[e2e-run] WARN: temp dir survived cleanup: ${tempDir}`)
    }
    catch (error) {
      console.error('[e2e-run] temp dir cleanup failed:', error)
    }
  }
}

async function main(): Promise<number> {
  // Strip a leading "--" (e.g. from `bun run test:e2e:headed -- --ui`):
  // forwarded to Playwright it would end option parsing and turn --ui into
  // a test-file filter instead of the flag.
  const passthroughArgs = process.argv.slice(2).filter(
    (arg, index) => !(arg === '--' && index === 0),
  )

  if (SKIP_WEB_SERVER) {
    console.log('[e2e-run] PWTEST_SKIP_WEB_SERVER=1 — skipping port/config orchestration; using current env')
    const child = spawn('bunx', ['playwright', 'test', ...passthroughArgs], {
      stdio: 'inherit',
      env: { ...process.env },
    })
    return await waitFor(child)
  }

  // 1. Ephemeral ports (held open until just before spawn to shrink the race)
  const backend = await reservePort()
  let frontendPort = backend.port
  while (frontendPort === backend.port) {
    const candidate = await reservePort()
    frontendPort = candidate.port
    await candidate.release()
  }

  // 2. Run-scoped config dir, layout compatible with TestEnvironment
  const tempDir = mkdtempSync(join(tmpdir(), 'mdt-e2e-'))
  const configDir = join(tempDir, 'config')
  mkdirSync(configDir, { recursive: true })

  state = { ports: { backend: backend.port, frontend: frontendPort }, tempDir }

  // 3. Env for playwright + webServers + workers
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CONFIG_DIR: configDir,
    TEST_BACKEND_PORT: String(backend.port),
    TEST_FRONTEND_PORT: String(frontendPort),
    TEST_FRONTEND_URL: `http://localhost:${frontendPort}`,
    VITE_BACKEND_URL: `http://localhost:${backend.port}`,
    // The ephemeral frontend origin is not in the backend's default local
    // origins list (only fixed dev/test ports are). MDT_ALLOWED_ORIGINS
    // registers it for SSE/origin policy independently of PUBLIC_ORIGIN —
    // tests that override PUBLIC_ORIGIN (invite-link origin) must not evict
    // the test frontend's own origin from the allowlist.
    MDT_ALLOWED_ORIGINS: `http://localhost:${frontendPort}`,
    PUBLIC_ORIGIN: `http://localhost:${frontendPort}`,
  }

  console.log(`[e2e-run] backend :${backend.port} | frontend :${frontendPort} | config ${configDir}`)

  // 4. Spawn playwright (ports released immediately before children rebind them)
  await backend.release()
  const child = spawn('bunx', ['playwright', 'test', ...passthroughArgs], {
    stdio: 'inherit',
    env,
  })

  const forward = (signal: NodeJS.Signals) => {
    child.kill(signal)
  }
  process.on('SIGINT', () => forward('SIGINT'))
  process.on('SIGTERM', () => forward('SIGTERM'))

  const code = await waitFor(child)

  await teardown()

  return code
}

function waitFor(child: ChildProcess): Promise<number> {
  return new Promise((resolve) => {
    child.on('exit', (code, signal) => {
      if (signal)
        return resolve(signal === 'SIGINT' ? 130 : 143)
      resolve(code ?? 1)
    })
    child.on('error', (error) => {
      console.error('[e2e-run] failed to start playwright:', error)
      resolve(1)
    })
  })
}

main()
  .then((code) => {
    process.exit(code)
  })
  .catch((error) => {
    console.error('[e2e-run] fatal:', error)
    void teardown().finally(() => process.exit(1))
  })
