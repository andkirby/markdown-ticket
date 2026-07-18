import type { ConfigSelector } from '@mdt/domain-contracts'
/**
 * Configuration management routes (MDT-168).
 *
 * Extracted from the broad system router so config endpoints are thin,
 * transport-only delegates to `ConfigController`/`ConfigApplicationService`
 * (constraint C-7). All `/api/config/*` routes remain owner-only via the
 * `/api/config` prefix in `accessPolicy.ts` (constraint C-8).
 */
import type { Request, Response } from 'express'
import type { ConfigStorageAdapter } from '../services/config/types.js'
import { logger } from '@mdt/shared/utils/server-logger.js'
import { Router } from 'express'
import { getRuntimeConfig } from '../config/runtimeConfig.js'
import { ConfigController } from '../controllers/ConfigController.js'
import { GlobalConfigStorageAdapter } from '../services/config/adapters/GlobalConfigStorageAdapter.js'
import { ProjectConfigStorageAdapter } from '../services/config/adapters/ProjectConfigStorageAdapter.js'
import { UserConfigStorageAdapter } from '../services/config/adapters/UserConfigStorageAdapter.js'
import { ConfigSideEffectRegistry } from '../services/config/ConfigSideEffectRegistry.js'

/**
 * Resolve the storage adapter for a selector scope. Global/user adapters are
 * keyed by configDir; project adapters are keyed by a project path resolver
 * (project-scope selectors apply to the currently selected project).
 */
export interface ConfigRouteContext {
  /** Resolve the project path for a project/registry-scope selector. */
  resolveProjectPath?: (req: Request) => string | undefined
  /** Resolve the project id for project-scope selectors (for watcher refresh). */
  resolveProjectId?: (req: Request) => string | undefined
  /** Clear the project discovery cache (fires after global discovery changes). */
  clearDiscoveryCache?: () => void
  /**
   * Reconfigure document watchers after a project.document.* change.
   * Returns the number of watchers registered.
   */
  reconfigureDocumentWatchers?: (
    projectId: string,
    documentPaths: string[],
  ) => Promise<number>
}

export function createConfigRouter(context: ConfigRouteContext = {}): Router {
  const router = Router()

  // We construct a controller whose resolver is replaced per-request below via
  // a request-scoped wrapper. Because the application service holds the resolver
  // by reference, we use an indirection object that we mutate per request.
  const resolverIndirection: {
    resolver: (selector: ConfigSelector) => ConfigStorageAdapter<unknown>
  } = {
    resolver: () => {
      throw new Error('Config route resolver not initialized for this request')
    },
  }

  // Build the post-write side-effect registry. Effects are explicit and
  // injected (constraint C-5); a failing effect is reported but does not roll
  // back the persisted write. The request-scoped project id is captured per
  // request in bindAdapters below.
  let currentProjectId: string | undefined
  const sideEffects = buildSideEffectRegistry(context, () => currentProjectId)

  const controller = new ConfigController({
    adapterResolver: {
      resolve: (selector: ConfigSelector) =>
        resolverIndirection.resolver(selector),
    },
    sideEffects,
  })

  /**
   * Per-request middleware that binds the correct adapters based on configDir
   * (from runtime config) and the project path (from context).
   */
  function bindAdapters(req: Request, _res: Response, next: () => void): void {
    const configDir = getRuntimeConfig(req).configDir
    const globalAdapter = new GlobalConfigStorageAdapter(configDir)
    const userAdapter = new UserConfigStorageAdapter(configDir)
    const projectPath = context.resolveProjectPath?.(req)
    // Capture the request-scoped project id so document-watcher side effects
    // (which fire after a successful project.document.* write) can target it.
    currentProjectId = context.resolveProjectId?.(req)

    resolverIndirection.resolver = (
      selector: ConfigSelector,
    ): ConfigStorageAdapter<unknown> => {
      switch (selector.scope) {
        case 'global':
          return globalAdapter as unknown as ConfigStorageAdapter<unknown>
        case 'user':
          return userAdapter as unknown as ConfigStorageAdapter<unknown>
        case 'project':
        case 'registry': {
          if (!projectPath) {
            throw new Error(
              `Cannot resolve project-scope selector "${selector.selector}" without a project path.`,
            )
          }
          return new ProjectConfigStorageAdapter(
            projectPath,
          ) as unknown as ConfigStorageAdapter<unknown>
        }
        default:
          throw new Error(`Unknown selector scope: ${selector.scope}`)
      }
    }
    next()
  }

  router.use(bindAdapters)

  /**
   * @openapi
   * /api/config/selectors:
   *   get:
   *     tags: [Config]
   *     summary: Read configuration selectors with exposure metadata
   *     description: Returns every allowlisted, readable selector with its scope, exposure classification, owner surface, validation constraints, and current effective value. File-only selectors are omitted. Owner/admin only.
   *     responses:
   *       200:
   *         description: Selector descriptors with effective values
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 selectors:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       selector: { type: string, example: "project.document.maxDepth" }
   *                       scope: { type: string, enum: [project, global, user, registry] }
   *                       exposure: { type: string, enum: [editable, guarded, readOnly, fileOnly] }
   *                       ownerSurface: { type: string }
   *                       validation: { type: string }
   *                       value: {}
   *       403: { description: Read-only or anonymous denied }
   *       500: { $ref: '#/components/schemas/Error500' }
   */
  router.get('/selectors', (req, res) => controller.getSelectors(req, res))

  /**
   * @openapi
   * /api/config:
   *   patch:
   *     tags: [Config]
   *     summary: Apply a configuration selector mutation
   *     description: Validates the full candidate change against strict patch schemas (never converts invalid input to a default), writes exactly one atomic write to the target config file, preserves unrelated fields, runs injected post-write side effects, and returns the effective saved value. Default-deny; unknown/guarded/read-only/file-only selectors are rejected with a field-level error before any write. Owner/admin only.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [selector, value]
   *             properties:
   *               selector: { type: string, example: "links.enableTicketLinks" }
   *               value: { description: "Strictly validated per selector" }
   *     responses:
   *       200:
   *         description: Effective saved value and side-effect report
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 selector: { type: string }
   *                 effective: {}
   *                 filePath: { type: string }
   *                 sideEffects:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       name: { type: string }
   *                       ok: { type: boolean }
   *                       message: { type: string }
   *       400:
   *         description: Field-level validation error naming the offending selector
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error: { type: string, example: "Validation Error" }
   *                 selector: { type: string }
   *                 field: { type: string }
   *                 message: { type: string }
   *       403: { description: Read-only or anonymous denied }
   *       500: { $ref: '#/components/schemas/Error500' }
   */
  router.patch('/', (req, res) => controller.patchConfig(req, res))

  return router
}

/**
 * Build the post-write side-effect registry from route context (MDT-168 C-5).
 *
 * Effects are explicit and injected; each defines its own failure behavior and
 * is idempotent. A failing effect is reported in the response but does not roll
 * back the persisted write. When the context provides no effect hooks, the
 * registry is empty (effects are best-effort and degrade gracefully).
 */
function buildSideEffectRegistry(
  context: ConfigRouteContext,
  getProjectId: () => string | undefined,
): ConfigSideEffectRegistry {
  const effects = []

  // Global discovery change -> invalidate the project discovery cache so the
  // next read observes the new search paths / maxDepth / autoDiscover.
  if (context.clearDiscoveryCache) {
    effects.push({
      name: 'discovery-cache-refresh',
      triggers: ['global'],
      run: async () => {
        try {
          context.clearDiscoveryCache!()
          return { name: 'discovery-cache-refresh', ok: true }
        }
        catch (error) {
          logger.warn('discovery-cache-refresh side effect failed:', error)
          return {
            name: 'discovery-cache-refresh',
            ok: false,
            message: error instanceof Error ? error.message : String(error),
          }
        }
      },
    })
  }

  // Project document config change -> reconfigure document watchers so the
  // document tree/watchers converge to the new effective configuration.
  if (context.reconfigureDocumentWatchers) {
    effects.push({
      name: 'document-watcher-refresh',
      triggers: ['project'],
      run: async () => {
        const projectId = getProjectId()
        if (!projectId) {
          return {
            name: 'document-watcher-refresh',
            ok: false,
            message: 'No project id in request scope; watcher refresh skipped.',
          }
        }
        try {
          // Pass empty paths to force the watcher to re-read effective config;
          // the watcher service re-reads paths from the persisted config.
          await context.reconfigureDocumentWatchers!(projectId, [])
          return { name: 'document-watcher-refresh', ok: true }
        }
        catch (error) {
          logger.warn('document-watcher-refresh side effect failed:', error)
          return {
            name: 'document-watcher-refresh',
            ok: false,
            message: error instanceof Error ? error.message : String(error),
          }
        }
      },
    })
  }

  return new ConfigSideEffectRegistry(effects)
}
