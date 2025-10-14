import chokidar from 'chokidar';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import os from 'os';

class FileWatcherService extends EventEmitter {
  constructor() {
    super();
    this.watchers = new Map(); // Map of projectId -> watcher instance
    this.eventQueue = [];
    this.clients = new Set();
    this.debounceTimers = new Map();
    this.watchPaths = new Map(); // Map of projectId -> watchPath
    this.fileInvoker = null; // Will be set by server
  }

  /**
   * Set file operation invoker for cache invalidation
   */
  setFileInvoker(fileInvoker) {
    this.fileInvoker = fileInvoker;
  }

  initFileWatcher(watchPath = './sample-tasks/*.md') {
    // Backward compatibility - single path watcher
    return this.initMultiProjectWatcher([{ id: 'default', path: watchPath }]);
  }

  initMultiProjectWatcher(projectPaths) {
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
        .on('add', (filePath) => this.handleFileEvent('add', filePath, project.id))
        .on('change', (filePath) => this.handleFileEvent('change', filePath, project.id))
        .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath, project.id))
        .on('error', (error) => {
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
   * Watches ~/.config/markdown-ticket/projects/*.toml for project lifecycle events
   */
  initGlobalRegistryWatcher() {
    const registryPath = path.join(os.homedir(), '.config', 'markdown-ticket', 'projects');

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
      .on('add', (filePath) => this.handleRegistryEvent('add', filePath))
      .on('change', (filePath) => this.handleRegistryEvent('change', filePath))
      .on('unlink', (filePath) => this.handleRegistryEvent('unlink', filePath))
      .on('error', (error) => {
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
   * @param {string} eventType - 'add', 'change', or 'unlink'
   * @param {string} filePath - Full path to the .toml file
   */
  handleRegistryEvent(eventType, filePath) {
    const projectId = path.basename(filePath, '.toml');

    const eventTypeMap = {
      'add': 'project-created',
      'change': 'project-updated',
      'unlink': 'project-deleted'
    };

    const sseEventType = eventTypeMap[eventType];
    const now = Date.now();
    const eventId = `evt_${now}_${Math.random().toString(36).substr(2, 9)}`;

    const event = {
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

  handleFileEvent(eventType, filePath, projectId) {
    const filename = filePath.split('/').pop();
    
    // Only process .md files
    if (!filename.endsWith('.md')) {
      return;
    }

    console.log(`File ${eventType} in project ${projectId}: ${filename}`);

    // Debounce rapid file changes
    const debounceKey = `${eventType}:${filePath}:${projectId}`;
    
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(debounceKey);
      this.broadcastFileChange(eventType, filename, projectId);
    }, 100);

    this.debounceTimers.set(debounceKey, timer);
  }

  getProjectPath(projectId) {
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

  async broadcastFileChange(eventType, filename, projectId) {
    let ticketData = null;
    
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
      } catch (error) {
        console.warn('Failed to parse ticket data for SSE:', error.message);
      }
    }

    const event = {
      type: 'file-change',
      data: {
        eventType,
        filename,
        projectId,
        timestamp: Date.now(),
        ticketData // Include parsed ticket data
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
    const staleClients = [];
    
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

  addClient(response) {
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

  removeClient(response) {
    if (this.clients.has(response)) {
      this.clients.delete(response);
      console.log(`Removed SSE client. Total clients: ${this.clients.size}`);
    }
  }

  sendSSEEvent(response, event) {
    try {
      const data = `data: ${JSON.stringify(event)}\n\n`;
      response.write(data);
    } catch (error) {
      console.error('Error sending SSE event:', error);
      this.removeClient(response);
    }
  }

  // Send heartbeat to all clients to detect dead connections
  startHeartbeat(intervalMs = 30000) {
    setInterval(() => {
      const heartbeatEvent = {
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

  getClientCount() {
    return this.clients.size;
  }

  stop() {
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
          client.end();
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