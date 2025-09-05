import chokidar from 'chokidar';
import { EventEmitter } from 'events';

class FileWatcherService extends EventEmitter {
  constructor() {
    super();
    this.watchers = new Map(); // Map of projectId -> watcher instance
    this.eventQueue = [];
    this.clients = new Set();
    this.debounceTimers = new Map();
    this.watchPaths = new Map(); // Map of projectId -> watchPath
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

  broadcastFileChange(eventType, filename, projectId) {
    const event = {
      type: 'file-change',
      data: {
        eventType,
        filename,
        projectId,
        timestamp: Date.now()
      }
    };

    console.log(`Broadcasting event:`, event);

    // Add to event queue for new connections
    this.eventQueue.push(event);
    
    // Keep only last 50 events to prevent memory issues
    if (this.eventQueue.length > 50) {
      this.eventQueue = this.eventQueue.slice(-50);
    }

    // Broadcast to all connected clients
    this.clients.forEach(client => {
      try {
        if (!client.headersSent) {
          this.sendSSEEvent(client, event);
        }
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        this.removeClient(client);
      }
    });

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