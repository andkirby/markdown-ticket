import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import os from 'os';
import { DEFAULT_PATHS } from '../shared/utils/constants.js';

// Type definitions
interface ProjectPath {
  id: string;
  path: string;
}

interface SSEEvent {
  type: string;
  data: any;
}

interface TicketData {
  code?: string;
  title?: string;
  status?: string;
  type?: string;
  priority?: string;
  lastModified?: string;
}

interface FileChangeEvent {
  type: 'file-change';
  data: {
    eventType: string;
    filename: string;
    projectId: string;
    timestamp: number;
    ticketData?: TicketData;
  };
}

interface RegistryEvent {
  type: string;
  data: {
    projectId: string;
    timestamp: number;
    eventId: string;
    source: string;
  };
}

interface FileInvoker {
  invalidateFile(filePath: string): void;
}

interface ResponseLike {
  write(data: string): void;
  on(event: string, callback: (...args: any[]) => void): void;
  headersSent: boolean;
  destroyed?: boolean;
  closed?: boolean;
  end?(): void;
}

/**
 * File watcher service for monitoring changes to markdown files and project configurations
 */
class FileWatcherService extends EventEmitter {
  private watchers: Map<string, chokidar.FSWatcher> = new Map(); // Map of projectId -> watcher instance
  private eventQueue: SSEEvent[] = [];
  private clients: Set<ResponseLike> = new Set();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private watchPaths: Map<string, string> = new Map(); // Map of projectId -> watchPath
  private fileInvoker: FileInvoker | null = null; // Will be set by server

  constructor() {
    super();
  }

  /**
   * Set file operation invoker for cache invalidation
   */
  setFileInvoker(fileInvoker: FileInvoker): void {
    this.fileInvoker = fileInvoker;
  }

  initFileWatcher(watchPath: string = './sample-tasks/*.md'): FileWatcherService {
    // Backward compatibility - single path watcher
    return this.initMultiProjectWatcher([{ id: 'default', path: watchPath }]);
  }

  initMultiProjectWatcher(projectPaths: ProjectPath[]): FileWatcherService {
    console.log(`Initializing multi-project file watchers for ${projectPaths.length} projects`);

    for (const project of projectPaths) {
      if (this.watchers.has(project.id)) {
        console.log(`FileWatcher already initialized for project: ${project.id}`);
        continue;
      }

      const watchPath = project.path;
      this.watchPaths.set(project.id, watchPath);
      console.log(`Initializing file watcher for project ${project.id}: ${watchPath}`);

      const watcher = chokidar.watch(watchPath, {
        ignoreInitial: true,
        persistent: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 100
        }
      });

      // Set up event handlers for this watcher
      watcher
        .on('add', (filePath: string) => this.handleFileEvent('add', filePath, project.id))
        .on('change', (filePath: string) => this.handleFileEvent('change', filePath, project.id))
        .on('unlink', (filePath: string) => this.handleFileEvent('unlink', filePath, project.id))
        .on('error', (error: Error) => {
          console.error(`File watcher error for project ${project.id}:`, error);
          this.emit('error', { error, projectId: project.id });
        })
        .on('ready', () => {
          console.log(`File watcher ready for project: ${project.id}`);
          this.emit('ready', { projectId: project.id });
        });

      this.watchers.set(project.id, watcher);
    }

    return this;
  }

  /**
   * Initialize file watcher for global project registry
   * Watches {DEFAULT_PATHS.PROJECTS_REGISTRY}/*.toml for project lifecycle events
   */
  initGlobalRegistryWatcher(): void {
    const registryPath = DEFAULT_PATHS.PROJECTS_REGISTRY;

    // Check if registry directory exists
    if (!fs.existsSync(registryPath)) {
      console.log(`📡 Global registry directory not found: ${registryPath}`);
      return;
    }

    const watcher = chokidar.watch(path.join(registryPath, '*.toml'), {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    });

    watcher
      .on('add', (filePath: string) => this.handleRegistryEvent('add', filePath))
      .on('change', (filePath: string) => this.handleRegistryEvent('change', filePath))
      .on('unlink', (filePath: string) => this.handleRegistryEvent('unlink', filePath))
      .on('error', (error: Error) => {
        console.error('Global registry watcher error:', error);
      })
      .on('ready', () => {
        console.log(`📡 Global registry watcher ready: ${registryPath}`);
      });

    this.watchers.set('__global_registry__', watcher);
    console.log(`📡 Global registry watcher initialized: ${registryPath}`);
  }

  /**
   * Handle global registry file events
   * @param eventType - 'add', 'change', or 'unlink'
   * @param filePath - Full path to the .toml file
   */
  handleRegistryEvent(eventType: string, filePath: string): void {
    const projectId = path.basename(filePath, '.toml');

    const eventTypeMap: Record<string, string> = {
      'add': 'project-created',
      'change': 'project-updated',
      'unlink': 'project-deleted'
    };

    const sseEventType = eventTypeMap[eventType];
    const now = Date.now();
    const eventId = `evt_${now}_${Math.random().toString(36).substr(2, 9)}`;

    const event: RegistryEvent = {
      type: sseEventType,
      data: {
        projectId,
        timestamp: now,
        eventId,
        source: 'file_watcher'
      }
    };

    console.log(`📡 Registry event: ${sseEventType} - ${projectId} (eventId: ${eventId}, source: file_watcher)`);

    // Broadcast to all connected SSE clients
    this.clients.forEach(client => {
      try {
        this.sendSSEEvent(client, event);
      } catch (error) {
        console.error('Failed to broadcast registry event:', error);
      }
    });

    // Emit event for other parts of the application
    this.emit(sseEventType, event.data);
  }

  handleFileEvent(eventType: string, filePath: string, projectId: string): void {
    const filename = filePath.split('/').pop();

    // Only process .md files
    if (!filename || !filename.endsWith('.md')) {
      return;
    }

    console.log(`File ${eventType} in project ${projectId}: ${filename}`);

    // Debounce rapid file changes
    const debounceKey = `${eventType}:${filePath}:${projectId}`;

    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey)!);
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(debounceKey);
      this.broadcastFileChange(eventType, filename, projectId);
    }, 100);

    this.debounceTimers.set(debounceKey, timer);
  }

  getProjectPath(projectId: string): string {
    // This should match your project path resolution logic
    // For debug project, it's in debug-tasks folder relative to project root
    if (projectId === 'debug') {
      return path.join(process.cwd(), '..', 'debug-tasks');
    }
    // For markdown-ticket project, CRs are in docs/CRs relative to project root
    if (projectId === 'markdown-ticket') {
      return path.join(process.cwd(), '..', 'docs', 'CRs');
    }
    // For other projects, try to find them in the project registry
    // This is a simplified version - in production you'd look up the actual project paths
    return path.join(process.cwd(), '..');
  }

  async broadcastFileChange(eventType: string, filename: string, projectId: string): Promise<void> {
    let ticketData: TicketData | null = null;

    // Invalidate cache for changed files
    if (this.fileInvoker && (eventType === 'change' || eventType === 'add' || eventType === 'unlink')) {
      const projectPath = this.getProjectPath(projectId);
      const filePath = path.join(projectPath, filename);
      console.log(`🗑️  Invalidating cache for: ${filePath}`);
      this.fileInvoker.invalidateFile(filePath);
    }

    // For change events, try to parse the ticket data
    if (eventType === 'change' || eventType === 'add') {
      try {
        const projectPath = this.getProjectPath(projectId);
        const filePath = path.join(projectPath, filename);

        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const { data: frontmatter } = matter(fileContent);

          // Extract key ticket fields
          ticketData = {
            code: frontmatter.code,
            title: frontmatter.title,
            status: frontmatter.status,
            type: frontmatter.type,
            priority: frontmatter.priority,
            lastModified: frontmatter.lastModified || new Date().toISOString()
          };
        }
      } catch (error: any) {
        console.warn('Failed to parse ticket data for SSE:', error.message);
      }
    }

    const event: FileChangeEvent = {
      type: 'file-change',
      data: {
        eventType,
        filename,
        projectId,
        timestamp: Date.now(),
        ticketData: ticketData || undefined // Include parsed ticket data
      }
    };

    console.log(`📡 Event happened: ${eventType} - ${filename} in project ${projectId}`);
    console.log(`📤 Broadcasting to ${this.clients.size} SSE clients:`, event);

    // Add to event queue for new connections
    this.eventQueue.push(event);

    // Keep only last 50 events to prevent memory issues
    if (this.eventQueue.length > 50) {
      this.eventQueue = this.eventQueue.slice(-50);
    }

    // Broadcast to all connected clients
    let successCount = 0;
    let failCount = 0;
    let clientIndex = 0;
    const staleClients: ResponseLike[] = [];

    this.clients.forEach(client => {
      clientIndex++;
      try {
        if (client.destroyed || client.closed) {
          console.log(`⚠️ Client #${clientIndex} is stale (destroyed: ${client.destroyed}, closed: ${client.closed}), marking for removal`);
          staleClients.push(client);
          failCount++;
        } else {
          this.sendSSEEvent(client, event);
          successCount++;
          console.log(`✅ SSE pushed to client #${clientIndex}`);
        }
      } catch (error) {
        console.error(`❌ Failed to push SSE to client #${clientIndex}:`, error);
        staleClients.push(client);
        failCount++;
      }
    });

    // Remove stale clients
    staleClients.forEach(client => {
      console.log(`🧹 Removing stale SSE client`);
      this.removeClient(client);
    });

    console.log(`📊 SSE push summary: ${successCount} successful, ${failCount} failed, ${this.clients.size} active clients`);

    // Emit event for other parts of the application
    this.emit('file-change', event.data);
  }

  addClient(response: ResponseLike): void {
    console.log(`Adding SSE client. Total clients: ${this.clients.size + 1}`);
    this.clients.add(response);

    // Send connection established event
    this.sendSSEEvent(response, {
      type: 'connection',
      data: { status: 'connected', timestamp: Date.now() }
    });

    // Set up client cleanup on connection close
    response.on('close', () => {
      this.removeClient(response);
    });

    response.on('error', () => {
      this.removeClient(response);
    });
  }

  removeClient(response: ResponseLike): void {
    if (this.clients.has(response)) {
      this.clients.delete(response);
      console.log(`Removed SSE client. Total clients: ${this.clients.size}`);
    }
  }

  sendSSEEvent(response: ResponseLike, event: SSEEvent): void {
    try {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      response.write(data);
    } catch (error) {
      console.error('Error sending SSE event:', error);
      this.removeClient(response);
    }
  }

  // Send heartbeat to all clients to detect dead connections
  startHeartbeat(intervalMs: number = 30000): void {
    setInterval(() => {
      const heartbeatEvent: SSEEvent = {
        type: 'heartbeat',
        data: { timestamp: Date.now() }
      };

      this.clients.forEach(client => {
        try {
          if (!client.headersSent) {
            this.sendSSEEvent(client, heartbeatEvent);
          }
        } catch (error) {
          console.error('Heartbeat failed for client:', error);
          this.removeClient(client);
        }
      });
    }, intervalMs);
  }

  getClientCount(): number {
    return this.clients.size;
  }

  stop(): void {
    // Stop all watchers
    this.watchers.forEach((watcher, projectId) => {
      console.log(`Stopping file watcher for project: ${projectId}`);
      watcher.close();
    });
    this.watchers.clear();
    this.watchPaths.clear();

    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Close all client connections
    this.clients.forEach(client => {
      try {
        if (!client.headersSent) {
          if (client.end) {
            client.end();
          }
        }
      } catch (error) {
        console.error('Error closing client connection:', error);
      }
    });
    this.clients.clear();

    this.eventQueue = [];
  }
}

export default FileWatcherService;