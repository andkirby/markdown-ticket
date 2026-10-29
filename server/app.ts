import type { Express, Router } from 'express'
/* eslint-disable ts/no-unsafe-type-assertion -- MDT-258 transferred composition casts; retained adapter surface */
import type { RuntimeOptions } from './bootstrap/types.js'
import { logger } from '@mdt/shared/utils/server-logger.js'
import cors from 'cors'
import express from 'express'
import { createRuntime } from './bootstrap/createRuntime.js'
import { buildRuntimeConfig } from './config/runtimeConfig.js'
import { createProjectAccess } from './http/projectAccess.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { createAuthRouter, createPublicReadTokensRouter, createReadTokensRouter, createShareRouter } from './modules/access/index.js'
import { createConfigRouter } from './modules/config/index.js'
import { createDocumentRouter, DocumentConfigurationController, DocumentController } from './modules/documents/index.js'
import { createProjectRouter, ProjectController } from './modules/projects/index.js'
import { createSSERouter } from './modules/realtime/index.js'
import { createSearchRouter, SearchController } from './modules/search/index.js'
import { createDevToolsRouter, createSystemRouter, SystemController } from './modules/system/index.js'
import { createCloudCreationRecoveryRouter, createCloudStatusRouter, createPinRouter, createTicketIdentityRouter, createTicketRouter, PinController, TicketController } from './modules/tickets/index.js'
import { createApiAuthMiddleware } from './security/apiAuth.js'
import { createCorsOptions, createOriginPolicy, securityHeaders } from './security/originPolicy.js'
import { findProjectByRef } from './security/projectSharing.js'

interface FileInvokerAdapter {
  readFile: (filePath: string) => Promise<string>
  clearCache: () => void
  invalidateFile: (filePath: string) => void
}
export interface ApplicationOptions extends Omit<RuntimeOptions, 'runtimeConfig'> {
  runtimeConfig?: RuntimeOptions['runtimeConfig']
  preAuthRouter?: Router
  docsRouter?: Router
}

/** Construct the common HTTP graph. No listeners, watchers or timers are started. */
export function createApplication(options: ApplicationOptions = {}) {
  const app: Express = express()
  const runtimeConfig = options.runtimeConfig ?? buildRuntimeConfig()
  app.locals.runtimeConfig = runtimeConfig
  app.locals.configDir = runtimeConfig.configDir

  // =============================================================================
  // Middleware
  // =============================================================================

  const originPolicy = createOriginPolicy(runtimeConfig.origins.allowedOrigins)

  if (runtimeConfig.origins.publicOrigin) {
    logger.info(`🌐 Public origin: ${runtimeConfig.origins.publicOrigin}`)
  }

  app.use(securityHeaders)
  app.use(cors(createCorsOptions(originPolicy, logger)))
  app.use(express.json())

  if (options.preAuthRouter)
    app.use(options.preAuthRouter)
  const runtime = createRuntime({ ...options, runtimeConfig })
  const { fileWatcher, projectDiscovery, ticketService, documentService, treeService, pinStateService, ticketIdentityObservation, projectionStreamManager, projectionStreamRolloutEnabled } = runtime
  app.locals.projectService = projectDiscovery
  const projectController = new ProjectController(projectDiscovery, fileWatcher)
  const ticketController = new TicketController(projectDiscovery, ticketService)
  const systemController = new SystemController(projectDiscovery, treeService)
  const documentConfiguration = new DocumentConfigurationController(projectDiscovery, fileWatcher)
  const projectAccess = createProjectAccess(projectDiscovery)
  const documentController = new DocumentController(documentService, runtimeConfig.previewTokenSecret)

  // MDT-197: Pin rail — cross-project pinned tickets, user-global persistence.
  const pinController = new PinController(pinStateService)

  // Browser auth session routes are intentionally mounted before the protected API auth gate.
  app.use('/api/auth', createAuthRouter())
  app.use('/api/share', createShareRouter(projectDiscovery))
  app.use('/api/read-tokens', createPublicReadTokensRouter())

  // Backend API auth gate: after generic middleware and auth session routes, before protected /api routers.
  app.use('/api', createApiAuthMiddleware(runtimeConfig.auth, {
    allowLocalReadSessionFallback: runtimeConfig.readSessions.allowLocalFallback,
    configDir: runtimeConfig.configDir,
    originPolicy,
    readSessionSecret: runtimeConfig.readSessions.secret,
  }))

  // Multi-Project API routes
  const searchController = new SearchController(ticketService.searchService)
  app.post('/api/projects/search', searchController.searchLegacy.bind(searchController))
  app.use('/api/projects', createProjectRouter(projectController))
  app.use('/api/projects', createTicketRouter(ticketController))
  app.use('/api/projects', createTicketIdentityRouter(ticketIdentityObservation))
  app.use('/api/projects', createCloudCreationRecoveryRouter(ticketService))

  app.use('/api/projects', createCloudStatusRouter(projectionStreamManager, projectionStreamRolloutEnabled))

  // MDT-179: Unified search endpoint
  app.use('/api/search', createSearchRouter(searchController))
  app.use('/api/read-tokens', createReadTokensRouter())

  // Document routes
  app.use('/api/documents', createDocumentRouter(documentController, { ...projectAccess, configureDocuments: (req, res) => documentConfiguration.configureDocuments(req, res) }))

  // Pin rail routes (MDT-197): cross-project pinned tickets, user-global state.
  app.use('/api/pins', createPinRouter(pinController))

  // SSE routes
  app.use('/api/events', createSSERouter(fileWatcher, originPolicy, projectDiscovery))

  // System routes (status, directories, filesystem, config)
  app.use('/api', createSystemRouter(fileWatcher, systemController, projectDiscovery, documentService.fileInvoker as FileInvokerAdapter))

  // Configuration management routes (MDT-168): thin extracted config endpoints.
  // Owner-only via the /api/config prefix in accessPolicy.ts. Real post-write side
  // effects (discovery cache + document watcher refresh) are injected here.
  app.use(
    '/api/config',
    createConfigRouter({
      resolveProject: async (projectRef) => {
        const project = findProjectByRef(await projectDiscovery.getAllProjects(), projectRef)
        return project ? { id: project.id, path: project.project.path } : undefined
      },
      clearDiscoveryCache: () => projectDiscovery.clearCache(),
      reconfigureDocumentWatchers: async (projectId, _documentPaths) => {
      // Re-read effective document config and reconfigure watchers. The watcher
      // service re-reads paths/ticketsPath from the project config.
        const project = (await projectDiscovery.getAllProjects()).find(p => p.id === projectId)
        if (!project) {
          return 0
        }
        const config = projectDiscovery.getProjectConfig(project.project.path)
        const documentPaths = config?.project?.document?.paths ?? config?.document?.paths ?? []
        const ticketsPath = config?.project?.ticketsPath ?? undefined
        if (fileWatcher.reconfigureDocumentWatchers) {
          return fileWatcher.reconfigureDocumentWatchers(project.id, project.project.path, documentPaths, ticketsPath)
        }
        return 0
      },
    }),
  )

  // Dev tools routes (logging)
  app.use('/api/devtools', createDevToolsRouter(originPolicy, runtimeConfig.system.devtoolsEnabled))

  // API Documentation routes (Redoc UI)
  if (options.docsRouter)
    app.use('/api-docs', options.docsRouter)

  // =============================================================================
  // Error Handling
  // =============================================================================

  // 404 handler
  app.use(notFoundHandler)

  // Error handler middleware
  app.use(errorHandler)

  return { app, fileWatcher, projectDiscovery, ticketService, runtime }
}
