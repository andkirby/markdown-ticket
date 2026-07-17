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
import { Router } from 'express'
import { getRuntimeConfig } from '../config/runtimeConfig.js'
import { ConfigController } from '../controllers/ConfigController.js'
import { GlobalConfigStorageAdapter } from '../services/config/adapters/GlobalConfigStorageAdapter.js'
import { ProjectConfigStorageAdapter } from '../services/config/adapters/ProjectConfigStorageAdapter.js'
import { UserConfigStorageAdapter } from '../services/config/adapters/UserConfigStorageAdapter.js'

/**
 * Resolve the storage adapter for a selector scope. Global/user adapters are
 * keyed by configDir; project adapters are keyed by a project path resolver
 * (project-scope selectors apply to the currently selected project).
 */
export interface ConfigRouteContext {
  /** Resolve the project path for a project/registry-scope selector. */
  resolveProjectPath?: (req: Request) => string | undefined
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

  const controller = new ConfigController({
    adapterResolver: {
      resolve: (selector: ConfigSelector) =>
        resolverIndirection.resolver(selector),
    },
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
