import express from 'express';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

// Services
import FileWatcherService from './fileWatcherService.js';
import ProjectDiscoveryService from './projectDiscovery.js';
import { ProjectService } from './services/ProjectService.js';
import { TicketService } from './services/TicketService.js';
import { DocumentService } from './services/DocumentService.js';
import { FileSystemService } from './services/FileSystemService.js';

// Controllers
import { ProjectController } from './controllers/ProjectController.js';
import { TicketController } from './controllers/TicketController.js';
import { DocumentController } from './controllers/DocumentController.js';

// Routes
import { createProjectRouter } from './routes/projects.js';
import { createTicketRouter, createDuplicateRouter } from './routes/tickets.js';
import { createDocumentRouter } from './routes/documents.js';
import { createSSERouter } from './routes/sse.js';
import { createSystemRouter } from './routes/system.js';
import { createDevToolsRouter, setupLogInterception } from './routes/devtools.js';

// Middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// =============================================================================
// Configuration & Setup
// =============================================================================

const app = express();
const PORT = process.env.PORT || 3001;

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TICKETS_DIR = path.join(__dirname, 'sample-tasks');
const DEFAULT_TICKETS_DIR = './sample-tasks';

// =============================================================================
// Middleware
// =============================================================================

app.use(cors());
app.use(express.json());

// Setup log interception for dev tools
setupLogInterception();

// =============================================================================
// Initialize Services
// =============================================================================

// Core services
const fileWatcher = new FileWatcherService();
const projectDiscovery = new ProjectDiscoveryService();

// Business logic services
const projectService = new ProjectService(projectDiscovery);
const ticketService = new TicketService(projectDiscovery);
const documentService = new DocumentService(projectDiscovery);
const fileSystemService = new FileSystemService(TICKETS_DIR);

// Connect file watcher to document service for cache invalidation
fileWatcher.setFileInvoker(documentService.fileInvoker);

// =============================================================================
// Initialize Controllers
// =============================================================================

const projectController = new ProjectController(
  projectService,
  ticketService,
  fileSystemService,
  fileWatcher
);

const ticketController = new TicketController(fileSystemService);
const documentController = new DocumentController(documentService);

// =============================================================================
// Initialize Multi-Project File Watchers
// =============================================================================

async function initializeMultiProjectWatchers() {
  try {
    console.log('🔍 Discovering projects for file watching...');

    const projects = await projectDiscovery.getAllProjects();
    console.log(`Found ${projects.length} projects for file watching`);

    const projectPaths = [];

    // Add default/legacy project (sample-tasks)
    projectPaths.push({
      id: 'sample-tasks',
      path: path.join(TICKETS_DIR, '*.md')
    });

    // Add configured projects
    for (const project of projects) {
      try {
        if (!project.project.active) {
          console.log(`Skipping inactive project: ${project.project.name}`);
          continue;
        }

        let configPath;
        if (project.autoDiscovered && project.configPath) {
          configPath = path.dirname(project.configPath);
        } else {
          configPath = project.project.path;
        }

        const config = projectDiscovery.getProjectConfig(configPath);

        if (!config || !config.project) {
          console.log(`No config found for project: ${project.project.name}`);
          continue;
        }

        const crPath = config.project.path || 'docs/CRs';
        const fullCRPath = path.resolve(configPath, crPath);
        const watchPath = path.join(fullCRPath, '*.md');

        // Check if directory exists
        try {
          const fs = await import('fs/promises');
          await fs.access(fullCRPath);
          projectPaths.push({
            id: project.id,
            path: watchPath
          });
          console.log(`✅ Will watch project ${project.project.name} at: ${watchPath}`);
        } catch (accessError) {
          console.log(`⚠️  CR directory not found for project ${project.project.name}: ${fullCRPath}`);
        }
      } catch (error) {
        console.error(`Error setting up watcher for project ${project.project.name}:`, error);
      }
    }

    if (projectPaths.length === 0) {
      console.log('⚠️  No valid project paths found, falling back to single watcher');
      const watchPath = path.join(TICKETS_DIR, '*.md');
      fileWatcher.initFileWatcher(watchPath);
      console.log(`📡 Single file watcher initialized for: ${watchPath}`);
    } else {
      fileWatcher.initMultiProjectWatcher(projectPaths);
      console.log(`📡 Multi-project file watchers initialized for ${projectPaths.length} directories`);

      projectPaths.forEach(project => {
        console.log(`   📂 ${project.id}: ${project.path}`);
      });
    }
  } catch (error) {
    console.error('Error initializing multi-project watchers:', error);
    const watchPath = path.join(TICKETS_DIR, '*.md');
    fileWatcher.initFileWatcher(watchPath);
    console.log(`📡 Fallback file watcher initialized for: ${watchPath}`);
  }
}

// =============================================================================
// Register Routes
// =============================================================================

// Multi-Project API routes
app.use('/api/projects', createProjectRouter(projectController));

// Legacy single-project task routes
app.use('/api/tasks', createTicketRouter(ticketController));

// Duplicate detection routes
app.use('/api/duplicates', createDuplicateRouter(ticketController));

// Document routes
app.use('/api/documents', createDocumentRouter(documentController, projectController));

// SSE routes
app.use('/api/events', createSSERouter(fileWatcher));

// System routes (status, directories, filesystem, config)
app.use('/api', createSystemRouter(fileWatcher, projectController, projectDiscovery, documentService.fileInvoker));

// Dev tools routes (logging)
app.use('/api', createDevToolsRouter());

// =============================================================================
// Error Handling
// =============================================================================

// 404 handler
app.use(notFoundHandler);

// Error handler middleware
app.use(errorHandler);

// =============================================================================
// Server Initialization
// =============================================================================

async function initializeServer() {
  await fileSystemService.ensureTasksDirectory();

  // Create sample tickets if directory is empty
  try {
    const fs = await import('fs/promises');
    const files = await fs.readdir(TICKETS_DIR);
    if (files.length === 0) {
      console.log('Creating sample tickets...');
      // Sample tickets creation moved to a separate function if needed
    }
  } catch (error) {
    console.error('Error checking tasks directory:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Ticket board server running on port ${PORT}`);
  console.log(`📁 Tasks directory: ${TICKETS_DIR}`);
  console.log(`🌐 API endpoints:`);
  console.log(`   GET  /api/tasks - List all task files`);
  console.log(`   GET  /api/tasks/:filename - Get specific task`);
  console.log(`   POST /api/tasks/save - Save task file`);
  console.log(`   DELETE /api/tasks/:filename - Delete task file`);
  console.log(`   GET  /api/events - Server-Sent Events for real-time updates`);
  console.log(`   GET  /api/status - Server status`);
  console.log(`   GET  /api/projects - List all registered projects`);
  console.log(`   GET  /api/projects/:id/crs - List CRs for project`);
  console.log(`   PATCH /api/projects/:id/crs/:crId - Partial update CR`);
  console.log(`   POST /api/projects/create - Create new project`);
  console.log(`   GET  /api/documents - Discover project documents`);

  // Initialize the server
  await initializeServer();
  await initializeMultiProjectWatchers();
  fileWatcher.startHeartbeat();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  fileWatcher.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  fileWatcher.stop();
  process.exit(0);
});
