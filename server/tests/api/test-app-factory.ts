/**
 * Test App Factory - MDT-106.
 *
 * Creates Express app instances for testing without using import.meta.
 *
 * This factory creates a fresh Express app using the server's routes and controllers,
 * ensuring proper test isolation and respecting process.env.CONFIG_DIR.
 *
 * IMPORTANT: Set process.env.CONFIG_DIR BEFORE calling this function
 * to ensure services use the test configuration directory.
 */

import type { Express } from 'express'
import process from 'node:process'
import { ProjectService as SharedProjectService } from '@mdt/shared/services/ProjectService'
import { ProjectManager } from '@mdt/shared/tools/ProjectManager'

import cors from 'cors'
import express from 'express'

import { DocumentController } from '../../controllers/DocumentController'
import { ProjectController } from '../../controllers/ProjectController'
import { TicketController } from '../../controllers/TicketController'
import FileWatcherService from '../../fileWatcherService'
import { errorHandler, notFoundHandler } from '../../middleware/errorHandler'
import { createDocumentRouter } from '../../routes/documents'
import { createProjectRouter } from '../../routes/projects'
import { createSSERouter } from '../../routes/sse'
import { createSystemRouter } from '../../routes/system'
import { createTicketRouter } from '../../routes/tickets'
import { DocumentService } from '../../services/DocumentService'
import { FileSystemService } from '../../services/FileSystemService'
import { TicketService } from '../../services/TicketService'

// Note: Skipping createDocsRouter due to import.meta issue in openapi/config.ts
// import { createDocsRouter } from '../../routes/docs';

// Adapter to make SharedProjectService compatible with server's ProjectController expectations
class ProjectServiceAdapter {
  private projectService: any
  private projectManager: any

  constructor(projectService: any) {
    this.projectService = projectService
    this.projectManager = new ProjectManager(true) // Quiet mode
  }

  /**
   * Methods from SharedProjectService.
   */
  async getAllProjects(_bypassCache?: boolean) {
    // Always refresh registry to pick up projects created dynamically
    if (this.projectService.refreshRegistry) {
      this.projectService.refreshRegistry()
    }

    return this.projectService.getAllProjects()
  }

  getProjectConfig(path: string) {
    // Refresh before lookup
    if (this.projectService.refreshRegistry) {
      this.projectService.refreshRegistry()
    }

    return this.projectService.getProjectConfig(path)
  }

  async getProjectCRs(path: string) {
    return this.projectService.getProjectCRs(path)
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

  async checkDirectoryExists(dirPath: string) {
    return this.projectService.checkDirectoryExists(dirPath)
  }

  get projectDiscovery() {
    return this.projectService
  }
}

interface FileInvokerAdapter {
  readFile: (filePath: string) => Promise<string>
  clearCache: () => void
  invalidateFile: (filePath: string) => void
}

/**
 * Create a fresh Express app with new service instances.
 * This ensures tests get services that respect process.env.CONFIG_DIR.
 *
 * IMPORTANT: Call this AFTER setting process.env.CONFIG_DIR to ensure
 * services use the test configuration directory.
 */
export function createTestApp(): Express {
  // Create Express app
  const app: Express = express()

  // Middleware
  app.use(cors())
  app.use(express.json())

  // Skip log interception for tests (devtools is OOS for E2E testing per MDT-106)
  // setupLogInterception();

  // Initialize FRESH service instances (not singletons)
  const fileWatcher = new FileWatcherService()
  const projectDiscovery = new SharedProjectService(true)
  const _projectManager = new ProjectManager(true)

  // Business logic services
  const projectServiceAdapter = new ProjectServiceAdapter(projectDiscovery)
  const ticketService = new TicketService(projectDiscovery)
  const documentService = new DocumentService(projectDiscovery)
  const fileSystemService = new FileSystemService(process.cwd())

  // Connect file watcher to document service for cache invalidation
  fileWatcher.setFileInvoker(documentService.fileInvoker as FileInvokerAdapter)

  // Initialize Controllers
  const projectController = new ProjectController(
    projectServiceAdapter as any,
    fileSystemService,
    fileWatcher,
    undefined, // ticketController (not needed)
    ticketService,
  )

  const ticketController = new TicketController(fileSystemService)
  const documentController = new DocumentController(documentService)

  // Register Routes
  app.use('/api/projects', createProjectRouter(projectController))
  app.use('/api/tasks', createTicketRouter(ticketController))
  app.use('/api/documents', createDocumentRouter(documentController, projectController))
  app.use('/api/events', createSSERouter(fileWatcher))
  app.use('/api', createSystemRouter(fileWatcher, projectController, projectDiscovery, documentService.fileInvoker as FileInvokerAdapter))
  // Devtools router is OOS for E2E testing per MDT-106 (development-only feature)
  // app.use('/api', createDevToolsRouter());
  // Note: Skipping /api-docs route due to import.meta issue in openapi/config.ts
  // app.use('/api-docs', createDocsRouter());

  // Error Handling
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

/**
 * Reset the cached app (useful between test suites if needed).
 */
function _resetTestAppCache(): void {
  // With ES6 imports, module caching is handled differently
  // This function is kept for API compatibility but no longer clears cache
  // as ES6 modules are cached differently than CommonJS require()
}
