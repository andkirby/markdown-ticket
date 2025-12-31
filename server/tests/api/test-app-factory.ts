/**
 * Test App Factory - MDT-106
 *
 * Creates Express app instances for testing without using import.meta.
 *
 * This factory creates a fresh Express app using the server's routes and controllers,
 * ensuring proper test isolation and respecting process.env.CONFIG_DIR.
 *
 * IMPORTANT: Set process.env.CONFIG_DIR BEFORE calling this function
 * to ensure services use the test configuration directory.
 */

import express, { Express } from 'express';
import cors from 'cors';

// Use require() for imports to avoid ESM issues in Jest
const loadServerModules = () => {
  // Services
  const FileWatcherService = require('../../fileWatcherService').default;
  const { ProjectService: SharedProjectService } = require('@mdt/shared/services/ProjectService');
  const { ProjectManager } = require('@mdt/shared/tools/ProjectManager');
  const { TicketService } = require('../../services/TicketService');
  const { DocumentService } = require('../../services/DocumentService');
  const { FileSystemService } = require('../../services/FileSystemService');

  // Controllers
  const { ProjectController } = require('../../controllers/ProjectController');
  const { TicketController } = require('../../controllers/TicketController');
  const { DocumentController } = require('../../controllers/DocumentController');

  // Routes
  const { createProjectRouter } = require('../../routes/projects');
  const { createTicketRouter, createDuplicateRouter } = require('../../routes/tickets');
  const { createDocumentRouter } = require('../../routes/documents');
  const { createSSERouter } = require('../../routes/sse');
  const { createSystemRouter } = require('../../routes/system');
  const { createDevToolsRouter, setupLogInterception } = require('../../routes/devtools');
  // Note: Skipping createDocsRouter due to import.meta issue in openapi/config.ts
  // const { createDocsRouter } = require('../../routes/docs');

  // Middleware
  const { errorHandler, notFoundHandler } = require('../../middleware/errorHandler');

  return {
    FileWatcherService,
    SharedProjectService,
    ProjectManager,
    TicketService,
    DocumentService,
    FileSystemService,
    ProjectController,
    TicketController,
    DocumentController,
    createProjectRouter,
    createTicketRouter,
    createDuplicateRouter,
    createDocumentRouter,
    createSSERouter,
    createSystemRouter,
    createDevToolsRouter,
    setupLogInterception,
    // Note: createDocsRouter skipped due to import.meta issue in openapi/config.ts
    // createDocsRouter,
    errorHandler,
    notFoundHandler,
  };
};

// Adapter to make SharedProjectService compatible with server's ProjectController expectations
class ProjectServiceAdapter {
  private projectService: any;
  private projectManager: any;

  constructor(projectService: any) {
    this.projectService = projectService;
    this.projectManager = new (loadServerModules().ProjectManager)(true); // Quiet mode
  }

  // Methods from SharedProjectService
  async getAllProjects(bypassCache?: boolean) {
    // Always refresh registry to pick up projects created dynamically
    if (this.projectService.refreshRegistry) {
      this.projectService.refreshRegistry();
    }
    return this.projectService.getAllProjects();
  }

  getProjectConfig(path: string) {
    // Refresh before lookup
    if (this.projectService.refreshRegistry) {
      this.projectService.refreshRegistry();
    }
    return this.projectService.getProjectConfig(path);
  }

  async getProjectCRs(path: string) {
    return this.projectService.getProjectCRs(path);
  }

  // Additional methods needed by ProjectController
  async getSystemDirectories(path?: string) {
    return this.projectService.getSystemDirectories(path);
  }

  async configureDocuments(projectId: string, documentPaths: string[]) {
    return this.projectService.configureDocuments(projectId, documentPaths);
  }

  async checkDirectoryExists(dirPath: string) {
    return this.projectService.checkDirectoryExists(dirPath);
  }

  get projectDiscovery() {
    return this.projectService;
  }
}

interface FileInvokerAdapter {
  readFile(filePath: string): Promise<string>;
  clearCache(): void;
  invalidateFile(filePath: string): void;
}

/**
 * Create a fresh Express app with new service instances.
 * This ensures tests get services that respect process.env.CONFIG_DIR.
 *
 * IMPORTANT: Call this AFTER setting process.env.CONFIG_DIR to ensure
 * services use the test configuration directory.
 */
export function createTestApp(): Express {
  const modules = loadServerModules();

  // Create Express app
  const app: Express = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Skip log interception for tests (devtools is OOS for E2E testing per MDT-106)
  // modules.setupLogInterception();

  // Initialize FRESH service instances (not singletons)
  const fileWatcher = new modules.FileWatcherService();
  const projectDiscovery = new modules.SharedProjectService(true);
  const projectManager = new modules.ProjectManager(true);

  // Business logic services
  const projectServiceAdapter = new ProjectServiceAdapter(projectDiscovery);
  const ticketService = new modules.TicketService(projectDiscovery);
  const documentService = new modules.DocumentService(projectDiscovery);
  const fileSystemService = new modules.FileSystemService(process.cwd());

  // Connect file watcher to document service for cache invalidation
  fileWatcher.setFileInvoker(documentService.fileInvoker as FileInvokerAdapter);

  // Initialize Controllers
  const projectController = new modules.ProjectController(
    projectServiceAdapter as any,
    fileSystemService,
    fileWatcher,
    undefined, // ticketController (not needed)
    ticketService
  );

  const ticketController = new modules.TicketController(fileSystemService);
  const documentController = new modules.DocumentController(documentService);

  // Register Routes
  app.use('/api/projects', modules.createProjectRouter(projectController));
  app.use('/api/tasks', modules.createTicketRouter(ticketController));
  app.use('/api/duplicates', modules.createDuplicateRouter(ticketController));
  app.use('/api/documents', modules.createDocumentRouter(documentController, projectController));
  app.use('/api/events', modules.createSSERouter(fileWatcher));
  app.use('/api', modules.createSystemRouter(fileWatcher, projectController, projectDiscovery, documentService.fileInvoker as FileInvokerAdapter));
  // Devtools router is OOS for E2E testing per MDT-106 (development-only feature)
  // app.use('/api', modules.createDevToolsRouter());
  // Note: Skipping /api-docs route due to import.meta issue in openapi/config.ts
  // app.use('/api-docs', modules.createDocsRouter());

  // Error Handling
  app.use(modules.notFoundHandler);
  app.use(modules.errorHandler);

  return app;
}

/**
 * Reset the cached app (useful between test suites if needed)
 */
export function resetTestAppCache(): void {
  // Clear require cache for server modules
  const modulesToClear = [
    '../../fileWatcherService',
    '../../services/TicketService',
    '../../services/DocumentService',
    '../../services/FileSystemService',
    '../../controllers/ProjectController',
    '../../controllers/TicketController',
    '../../controllers/DocumentController',
    '../../routes/projects',
    '../../routes/tickets',
    '../../routes/documents',
    '../../routes/sse',
    '../../routes/system',
    '../../routes/devtools',
    '../../routes/docs',
    '../../middleware/errorHandler',
  ];

  for (const mod of modulesToClear) {
    try {
      const path = require.resolve(mod);
      delete require.cache[path];
    } catch {
      // Module not loaded yet
    }
  }
}
