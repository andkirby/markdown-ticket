/**
 * E2E Context Manager — thin client (MDT-239)
 *
 * The test backend now runs as ONE out-of-process server per run, started by
 * the Playwright webServer config (`scripts/e2e/backend.ts`) on a port chosen
 * by the wrapper (`scripts/e2e/run.ts`). Playwright workers own NO ports and
 * NO servers, so worker rotation after failures can no longer race the
 * backend port (the EADDRINUSE cascade is structurally eliminated).
 *
 * This module now only:
 *   - adopts the run-scoped CONFIG_DIR (created by the wrapper, shared with
 *     the backend process) for ProjectFactory's filesystem writes
 *   - exposes backend/frontend URLs
 *   - exposes an HTTP-backed admin adapter (`fileWatcher`) and runtime-config
 *     override helpers that replace the old in-process fileWatcher/app access
 *
 * Requires the wrapper env: CONFIG_DIR + TEST_BACKEND_PORT (+ optionally
 * TEST_FRONTEND_PORT/TEST_FRONTEND_URL). Run tests via `bun run test:e2e`.
 */

import type { PortConfig, ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'

/** Duck-type-compatible, HTTP-backed replacement for the in-process FileWatcherService seam */
export interface E2EFileWatcherAdmin {
  /** Initializes multi-project watchers in the backend process; resolves after the backend ran it */
  initMultiProjectWatcher(projectPaths: Array<{ id: string, path: string, projectRoot?: string, projectCode?: string }>): Promise<void>
  /** Initializes document watchers; resolves after the backend reports them ready (document-ready event or timeout) */
  initDocumentWatchers(projectId: string, projectRoot: string, documentPaths: string[], ticketsPath?: string, watcherSuffix?: string): Promise<{ watchers: number, ready: boolean }>
}

/**
 * E2E Context containing the client-side test infrastructure
 */
export interface E2EContext {
  /** Test environment (adopts the wrapper's run-scoped directories) */
  testEnv: TestEnvironment
  /** Project factory for creating projects/CRs (filesystem, shared with backend via CONFIG_DIR) */
  projectFactory: ProjectFactory
  /** Port configuration (from wrapper env) */
  ports: PortConfig
  /** Backend URL for API calls */
  backendUrl: string
  /** Frontend URL for browser tests */
  frontendUrl: string
  /** HTTP-backed admin adapter replacing in-process fileWatcher access */
  fileWatcher: E2EFileWatcherAdmin
  /** Replaces app.locals.runtimeConfig overrides (read-access-journey spec) */
  setRuntimeConfigOverride(overrides: Record<string, string | undefined>): Promise<void>
  /** Clears runtime-config overrides */
  clearRuntimeConfigOverride(): Promise<void>
}

/** Singleton E2E context */
let _e2eContext: E2EContext | null = null

async function adminFetch<T>(backendUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`e2e admin call failed: ${path} -> ${response.status} ${body}`)
  }
  return response.json() as Promise<T>
}

function createFileWatcherAdmin(backendUrl: string): E2EFileWatcherAdmin {
  return {
    async initMultiProjectWatcher(projectPaths) {
      await adminFetch(backendUrl, '/_e2e/watchers/multi-project', {
        method: 'POST',
        body: JSON.stringify({ projects: projectPaths }),
      })
    },
    async initDocumentWatchers(projectId, projectRoot, documentPaths, ticketsPath, watcherSuffix) {
      const result = await adminFetch<{ watchers: number, ready: boolean }>(backendUrl, '/_e2e/watchers/documents', {
        method: 'POST',
        body: JSON.stringify({ projectId, projectRoot, documentPaths, ticketsPath, watcherSuffix }),
      })
      return result
    },
  }
}

/**
 * Get or create the E2E context singleton (per worker process)
 */
export async function getE2EContext(): Promise<E2EContext> {
  if (_e2eContext)
    return _e2eContext

  const configDir = process.env.CONFIG_DIR
  const backendPort = process.env.TEST_BACKEND_PORT
  if (!configDir || !backendPort) {
    throw new Error(
      'E2E infrastructure env is missing (CONFIG_DIR / TEST_BACKEND_PORT). '
      + 'Run tests via `bun run test:e2e` (scripts/e2e/run.ts) so the out-of-process '
      + 'backend and run-scoped config dir are provisioned. See MDT-239.',
    )
  }

  const { TestEnvironment, ProjectFactory, getPortConfig } = await import('@mdt/shared/test-lib')

  // 1. Adopt the wrapper-owned config dir (never created/deleted here)
  const testEnv = new TestEnvironment({ configDir })
  await testEnv.setup()

  // 2. Project factory writes into the shared temp dir; the backend reads it
  const projectFactory = new ProjectFactory(testEnv)

  // 3. URLs from wrapper env
  const ports = getPortConfig()
  const backendUrl = `http://localhost:${ports.backend}`
  const frontendUrl = process.env.TEST_FRONTEND_URL ?? `http://localhost:${ports.frontend}`

  _e2eContext = {
    testEnv,
    projectFactory,
    ports,
    backendUrl,
    frontendUrl,
    fileWatcher: createFileWatcherAdmin(backendUrl),
    async setRuntimeConfigOverride(overrides) {
      await adminFetch(backendUrl, '/_e2e/runtime-config', {
        method: 'PUT',
        body: JSON.stringify({ overrides }),
      })
    },
    async clearRuntimeConfigOverride() {
      await adminFetch(backendUrl, '/_e2e/runtime-config', { method: 'DELETE' })
    },
  }

  return _e2eContext
}
