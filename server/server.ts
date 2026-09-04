import type { Express } from 'express'
import type { ProjectServiceExtension } from './controllers/ProjectController.js'
import * as path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import {
  AccessCredentialBroker,
  streamAuthorizationFromCredential,
} from '@mdt/shared/services/cloud-sync/access-credential-broker.js'
import { bindingFromEnabledConnection } from '@mdt/shared/services/cloud-sync/allocator-strategy.js'
import { CloudProjectionReadModel } from '@mdt/shared/services/cloud-sync/CloudProjectionReadModel.js'
import { CloudProjectionSessionClient } from '@mdt/shared/services/cloud-sync/CloudProjectionSessionClient.js'
import { CloudProjectionStreamClient } from '@mdt/shared/services/cloud-sync/CloudProjectionStreamClient.js'
import { buildEffectiveCloudSyncConfig } from '@mdt/shared/services/cloud-sync/config.js'
import { RuntimeCloudCredentialProvider } from '@mdt/shared/services/cloud-sync/credential-providers.js'
import { ProjectStateStore } from '@mdt/shared/services/cloud-sync/project-state-store.js'
import { CloudProjectionSync } from '@mdt/shared/services/cloud-sync/projection-sync.js'
import { resolveTrustedServiceProfile } from '@mdt/shared/services/cloud-sync/trusted-service-profile.js'
// Services
import { ProjectService as SharedProjectService } from '@mdt/shared/services/ProjectService.js'
import { ProjectManager } from '@mdt/shared/tools/ProjectManager.js'
import { DEFAULT_PORTS, getDefaultPaths } from '@mdt/shared/utils/constants.js'
import { parsePortEnv } from '@mdt/shared/utils/env.js'
import { logger } from '@mdt/shared/utils/server-logger.js'
import cors from 'cors'
// Load environment variables from root .env.local.
import { config } from 'dotenv'
import express from 'express'
import { buildRuntimeConfig } from './config/runtimeConfig.js'
// Controllers
import { DocumentController } from './controllers/DocumentController.js'
import { PinController } from './controllers/PinController.js'
import { ProjectController } from './controllers/ProjectController.js'
import { SearchController } from './controllers/SearchController.js'
// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { createAuthRouter } from './routes/auth.js'
import { createConfigRouter } from './routes/config.js'
import { createDevToolsRouter, setupLogInterception } from './routes/devtools.js'
import { createDocsRouter } from './routes/docs.js'
import { createDocumentRouter } from './routes/documents.js'
import { createPinRouter } from './routes/pins.js'
// Routes
import { createProjectRouter } from './routes/projects.js'
import { createPublicReadTokensRouter, createReadTokensRouter } from './routes/readTokens.js'
import { createSearchRouter } from './routes/search.js'
import { createShareRouter } from './routes/share.js'
import { createSSERouter } from './routes/sse.js'
import { createSystemRouter } from './routes/system.js'
import { createApiAuthMiddleware } from './security/apiAuth.js'
import { createCorsOptions, createOriginPolicy, securityHeaders } from './security/originPolicy.js'
import { ProjectionStreamManager } from './services/cloud-sync/ProjectionStreamManager.js'
import { DocumentService } from './services/DocumentService.js'
import FileWatcherService from './services/fileWatcher/index.js'
import { initializeProjectWatcherIntegration } from './services/fileWatcher/projectRegistrationIntegration.js'
import { PinStateService } from './services/PinStateService.js'
import { TicketService } from './services/TicketService.js'
import { TreeService } from './services/TreeService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Load environment variables. dotenv does not override by default, so load
// .env.local first (it claims values and wins over .env), then .env (fills
// remaining gaps). Real process.env — e.g. Docker compose `environment:` —
// always takes precedence. This makes .env authoritative for shared defaults
// while .env.local remains the per-dev override (never committed). (MDT-117)
const rootDir = path.resolve(__dirname, '..')
config({ path: path.resolve(rootDir, '.env.local') })
config({ path: path.resolve(rootDir, '.env') })

interface FileInvokerAdapter {
  readFile: (filePath: string) => Promise<string>
  clearCache: () => void
  invalidateFile: (filePath: string) => void
}

// Adapter to make SharedProjectService compatible with server's ProjectController expectations
class ProjectServiceAdapter {
  private projectService: SharedProjectService
  private projectManager: ProjectManager

  constructor(projectService: SharedProjectService) {
    this.projectService = projectService
    this.projectManager = new ProjectManager(true) // Quiet mode for server
  }

  /**
   * Methods from SharedProjectService.
   */
  async getAllProjects(bypassCache = false) {
    return this.projectService.getAllProjects(bypassCache)
  }

  getProjectConfig(path: string) {
    return this.projectService.getProjectConfig(path)
  }

  async getProjectCRs(path: string) {
    return this.projectService.getProjectCRs(path)
  }

  /**
   * MDT-094: Get CR metadata only (without content) for list operations.
   */
  async getProjectCRsMetadata(path: string) {
    return this.projectService.getProjectCRsMetadata(path)
  }

  /**
   * Additional methods needed by ProjectController.
   */
  async getSystemDirectories(path?: string) {
    return this.projectService.getSystemDirectories(path)
  }

  async configureDocuments(projectId: string, documentPaths: string[]) {
    return this.projectService.configureDocuments(projectId, documentPaths)
  }

  updateProject(projectId: string, updates: Parameters<SharedProjectService['updateProject']>[1]) {
    return this.projectService.updateProject(projectId, updates)
  }

  updateProjectByPath(projectId: string, projectPath: string, updates: Parameters<SharedProjectService['updateProject']>[1]) {
    return this.projectService.updateProjectByPath(projectId, projectPath, updates)
  }

  updateVisibleProject(project: Parameters<SharedProjectService['updateVisibleProject']>[0], updates: Parameters<SharedProjectService['updateProject']>[1]) {
    return this.projectService.updateVisibleProject(project, updates)
  }

  async checkDirectoryExists(dirPath: string) {
    return this.projectService.checkDirectoryExists(dirPath)
  }

  get projectDiscovery() {
    return this.projectService
  }
}

// =============================================================================
// Configuration & Setup
// =============================================================================

const app: Express = express()
const runtimeConfig = buildRuntimeConfig()
const PORT: number = parsePortEnv('BACKEND_PORT', 'PORT', DEFAULT_PORTS.BACKEND)
// MDT-157 UAT 2026-08-06: bind loopback by default so a disabled-auth or
// local-bypass backend is unreachable from the LAN/internet. Docker compose
// sets API_BIND_ADDRESS=0.0.0.0 so the frontend/nginx container can reach it.
// Mirrors the existing MCP_BIND_ADDRESS pattern.
const HOST: string = process.env.API_BIND_ADDRESS?.trim() || '127.0.0.1'
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

// Setup log interception for dev tools
setupLogInterception()

// =============================================================================
// Initialize Services
// =============================================================================

// Core services
const fileWatcher = new FileWatcherService()
const projectDiscovery = new SharedProjectService()
const cloudConfigDir = getDefaultPaths().CONFIG_DIR
/**
 * Process-scoped credential broker. A successful FOREGROUND resolution (an
 * explicit cloud operation such as a journaled ticket edit) makes a human
 * Access token available to the process — the documented owner action that
 * re-arms `authentication_required` stream pauses. Background
 * (non-interactive) resolution never spawns `cloudflared` (C-13, Edge-7).
 */
// Late-bound stream re-arm listeners: the manager is constructed after the
// broker but resolves its credentials through it.
const credentialResolvedListeners: Array<(serviceOrigin: string) => void> = []
const cloudCredentialProvider = new (class extends AccessCredentialBroker {
  override async resolve(serviceUrl: string) {
    const credential = await super.resolve(serviceUrl)
    if (credential) {
      for (const notify of credentialResolvedListeners)
        notify(serviceUrl)
    }
    return credential
  }
})({
  provider: new RuntimeCloudCredentialProvider(),
})

// Business logic services
const projectServiceAdapter = new ProjectServiceAdapter(projectDiscovery)
const ticketService = new TicketService(projectDiscovery, {
  credentialProvider: cloudCredentialProvider,
})

// =============================================================================
// MDT-226: Cloud projection stream — one backend-owned WebSocket per enabled
// cloud project. The browser never opens a cloud socket; it consumes the
// unified ticket API and ordinary SSE events.
// =============================================================================

/** Reverse map: cloudProjectId → localProjectId (for SSE fan-out lookup). */
const cloudToLocalProject = new Map<string, string>()
/** Persistent projection-write-journal instances (one per enabled project). */
const projectionSyncs: CloudProjectionSync[] = []

/**
 * MDT-226 incident recovery: automatic projection streams stay behind a
 * per-installation rollout flag until the deployed grant/handshake and
 * 30-minute zero-idle-D1 gates pass (TEST-deployed-stream-handshake,
 * TEST-idle-zero-d1). Default OFF.
 */
const projectionStreamRolloutEnabled = process.env.MDT_PROJECTION_STREAM_ROLLOUT === 'true'

const projectionStreamManager = new ProjectionStreamManager({
  clientFactory: opts => new CloudProjectionStreamClient(opts),
  readModelFactory: (localProjectId, rootDir) =>
    new CloudProjectionReadModel({ localProjectId, rootDir: rootDir ?? cloudConfigDir }),
  sessionClientFactory: ({ serviceOrigin, cloudProjectId }) =>
    new CloudProjectionSessionClient({
      serviceUrl: serviceOrigin,
      // Effective trust = distribution origins + operator extensions (the
      // raw operator list alone would reject the distribution origin).
      globalConfig: buildEffectiveCloudSyncConfig({
        allowedOrigins: projectDiscovery.getGlobalConfig().cloudSync?.allowedOrigins ?? [],
      }),
    }, cloudProjectId),
  // Non-interactive only: a cached human token or a service credential; the
  // background path never launches an interactive login (C-13, Edge-7).
  credentialResolver: async (serviceOrigin) => {
    const cred = await cloudCredentialProvider.resolveNonInteractive(serviceOrigin)
    return cred ? streamAuthorizationFromCredential(cred) : null
  },
  onChange: (cloudProjectId) => {
    const localProjectId = cloudToLocalProject.get(cloudProjectId)
    if (!localProjectId)
      return
    // Fan out as an ordinary file-change so browsers refetch unified tickets.
    fileWatcher.broadcastProjectionChange(localProjectId)
  },
})

// A foreground credential resolution is the documented owner action that
// re-arms authentication-paused and transport-exhausted streams.
credentialResolvedListeners.push((serviceOrigin) => {
  projectionStreamManager.notifyCredentialResolved(serviceOrigin)
    .catch((err: unknown) => logger.warn(`[MDT-226] credential re-arm failed: ${err instanceof Error ? err.message : String(err)}`))
})

// Wire the read-model provider so /tickets/unified merges cloud projections
// with canonical local tickets (local wins on duplicate code, BR-1.9).
ticketService.setProjectionReadModelProvider((localProjectId: string) => {
  const rm = projectionStreamManager.getReadModel(localProjectId)
  if (!rm)
    return undefined
  return {
    entries: (localCodes: Set<string>) => rm.unifiedView(localCodes),
    stale: rm.stale,
  }
})

/**
 * Type cast for compatibility.
 */

const documentService = new DocumentService(projectDiscovery)
const treeService = new TreeService(projectDiscovery)
const pinStateService = new PinStateService(projectDiscovery)

// Connect file watcher to document service for cache invalidation
fileWatcher.setFileInvoker(documentService.fileInvoker as FileInvokerAdapter)

// =============================================================================
// Initialize Controllers
// =============================================================================

const projectController = new ProjectController(

  projectServiceAdapter as ProjectServiceExtension, // Use the adapter which provides the expected interface
  treeService,
  fileWatcher,
  undefined, // ticketController (not needed)
  ticketService, // Pass the ticketService for CR operations
)

const documentController = new DocumentController(documentService, runtimeConfig.previewTokenSecret)

// MDT-197: Pin rail — cross-project pinned tickets, user-global persistence.
const pinController = new PinController(pinStateService)

// =============================================================================
// Initialize Multi-Project File Watchers
// =============================================================================

async function initializeMultiProjectWatchers(): Promise<void> {
  // MDT-183 (+ UAT 2026-09-02, BR-7): boot metadata registration + registry
  // watcher + runtime registration wiring live in the shared integration so
  // the e2e/test app factory exercises the identical production path.
  await initializeProjectWatcherIntegration(fileWatcher, projectDiscovery)
}

/**
 * MDT-226: Start one projection stream per enabled cloud-sync project. Mirrors
 * the per-project connection resolution used by the poll path (resolveTrusted
 * profile → ProjectStateStore.read → filter enabled). Each stream is a backend-
 * owned WebSocket; the browser never opens one.
 */
async function startProjectionStreams(): Promise<void> {
  try {
    // Rollout gate: automatic streams remain disabled until the deployed
    // handshake and idle-D1 gates pass (MDT-226 incident recovery).
    if (!projectionStreamRolloutEnabled) {
      logger.info('[MDT-226] Projection stream rollout flag is OFF — automatic streams disabled (set MDT_PROJECTION_STREAM_ROLLOUT=true only after the deployed gates pass)')
      return
    }

    const projects = await projectDiscovery.getAllProjects()
    const globalConfig = projectDiscovery.getGlobalConfig()
    const profile = resolveTrustedServiceProfile({
      operatorOrigins: globalConfig.cloudSync?.allowedOrigins ?? [],
    })
    const stateStore = new ProjectStateStore({ rootDir: cloudConfigDir, profile })

    for (const project of projects) {
      try {
        const connection = await stateStore.read(project.id)
        if (connection.kind !== 'enabled')
          continue

        const { cloudProjectId, serviceOrigin } = connection.connection
        cloudToLocalProject.set(cloudProjectId, project.id)

        // Register the read model and reconnect owner even when authentication
        // is currently unavailable. Background attempts never launch login;
        // they reuse a cached human token or resolve a service credential.
        await projectionStreamManager.start({
          localProjectId: project.id,
          cloudProjectId,
          serviceOrigin,
          rootDir: cloudConfigDir,
        })
        logger.info(`[MDT-226] Projection stream manager started for ${project.id} → ${cloudProjectId} (state: ${projectionStreamManager.getStatus(project.id)?.state ?? 'unknown'})`)

        // Start the bounded write-journal retry runner so stuck entries
        // (authentication_paused, transient) are retried on a fixed interval
        // instead of waiting forever (C-12).
        const binding = bindingFromEnabledConnection(connection.connection)
        const sync = new CloudProjectionSync({
          binding,
          // Effective trust = distribution origins + operator extensions. The
          // raw operator list alone fail-closes the journal's publishes before
          // the wire (found on the deployed 2026-08-15 probe).
          allowedOrigins: buildEffectiveCloudSyncConfig({
            allowedOrigins: globalConfig.cloudSync?.allowedOrigins ?? [],
          }).allowedOrigins,
          journalRoot: path.join(cloudConfigDir, 'cloud-sync', 'projection-journal'),
          physicalRepoPath: project.project.path,
          credentialProvider: cloudCredentialProvider,
        })
        sync.startRetryRunner(60_000)
        projectionSyncs.push(sync)
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        logger.warn(`[MDT-226] Failed to start projection stream for ${project.id}: ${message}`)
      }
    }
    logger.info(`[MDT-226] ${projectionStreamManager.openStreamCount} projection stream(s) active`)
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn(`[MDT-226] Projection stream initialization failed: ${message}`)
  }
}

// =============================================================================
// Register Routes
// =============================================================================

// Browser auth session routes are intentionally mounted before the protected API auth gate.
app.use('/api/auth', createAuthRouter())
app.use('/api/share', createShareRouter(projectServiceAdapter as ProjectServiceExtension))
app.use('/api/read-tokens', createPublicReadTokensRouter())

// Backend API auth gate: after generic middleware and auth session routes, before protected /api routers.
app.use('/api', createApiAuthMiddleware(runtimeConfig.auth, {
  allowLocalReadSessionFallback: runtimeConfig.readSessions.allowLocalFallback,
  configDir: runtimeConfig.configDir,
  originPolicy,
  readSessionSecret: runtimeConfig.readSessions.secret,
}))

// Multi-Project API routes
app.use('/api/projects', createProjectRouter(projectController))

// MDT-226 incident recovery: local-only cloud-sync diagnostics. Reads manager
// and persisted activation state only — no credential, HTTP, WebSocket, or D1
// call (BR-1.5, C-11, C-15). MDT-203 may render this in Project Settings and
// MDT-223 in CLI diagnostics.
app.get('/api/projects/:id/cloud-sync/status', (req, res) => {
  const status = projectionStreamManager.getStatus(req.params.id)
  if (!status) {
    res.status(404).json({ error: 'cloud sync is not enabled for this project' })
    return
  }
  res.json({
    projectId: req.params.id,
    rolloutEnabled: projectionStreamRolloutEnabled,
    ...status,
  })
})

// MDT-179: Unified search endpoint
const searchController = new SearchController(projectController)
app.use('/api/search', createSearchRouter(searchController))
app.use('/api/read-tokens', createReadTokensRouter())

// Document routes
app.use('/api/documents', createDocumentRouter(documentController, projectController))

// Pin rail routes (MDT-197): cross-project pinned tickets, user-global state.
app.use('/api/pins', createPinRouter(pinController))

// SSE routes
app.use('/api/events', createSSERouter(fileWatcher, originPolicy, projectServiceAdapter as ProjectServiceExtension))

// System routes (status, directories, filesystem, config)
app.use('/api', createSystemRouter(fileWatcher, projectController, projectDiscovery, documentService.fileInvoker as FileInvokerAdapter))

// Configuration management routes (MDT-168): thin extracted config endpoints.
// Owner-only via the /api/config prefix in accessPolicy.ts. Real post-write side
// effects (discovery cache + document watcher refresh) are injected here.
app.use(
  '/api/config',
  createConfigRouter({
    resolveProjectId: (req) => {
      const q = req.query.projectId
      return typeof q === 'string' ? q : undefined
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
app.use('/api-docs', createDocsRouter())

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use(notFoundHandler)

// Error handler middleware
app.use(errorHandler)

// =============================================================================
// Export Express app for Supertest testing (MDT-106)
// This export allows tests to use the app without calling listen()
// =============================================================================
export { app }

// =============================================================================
// Server Initialization
// =============================================================================

// Start server only when run directly (not when imported for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  const _server = app.listen(PORT, HOST, async () => {
    // Disable server-level timeouts for SSE support.
    // Per-request req.setTimeout(0) in the SSE route works on Node.js but is a no-op on Bun.
    // This server-level fallback ensures SSE survives on both runtimes.
    _server.timeout = 0
    _server.keepAliveTimeout = 0
    _server.requestTimeout = 0
    _server.headersTimeout = 0
    logger.info(`🚀 Ticket board server running at http://${HOST}:${PORT}`)
    logger.info(`🌐 API endpoints:`)
    logger.info(`   GET  /api/events - Server-Sent Events for real-time updates`)
    logger.info(`   GET  /api/status - Server status`)
    logger.info(`   GET  /api/projects - List all registered projects`)
    logger.info(`   GET  /api/projects/:id/crs - List CRs for project`)
    logger.info(`   PATCH /api/projects/:id/crs/:crId - Partial update CR`)
    logger.info(`   POST /api/projects/create - Create new project`)
    logger.info(`   GET  /api/documents - Discover project documents`)
    logger.info(`   GET  /api-docs - API Documentation (Redoc UI)`)

    // Initialize the server
    await initializeMultiProjectWatchers()
    fileWatcher.startHeartbeat()
    // MDT-226: open backend-owned projection streams for enabled cloud projects.
    await startProjectionStreams()
  })
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...')
  projectionStreamManager.stopAll()
  projectionSyncs.forEach(s => s.stopRetryRunner())
  fileWatcher.stop()
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...')
  projectionStreamManager.stopAll()
  projectionSyncs.forEach(s => s.stopRetryRunner())
  fileWatcher.stop()
  process.exit(0)
})
