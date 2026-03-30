import type { FileChangeEventPayload, ProjectPath, WorktreeWatcherEntry } from './PathWatcherService.js'
import type { FileChangeEvent, ResponseLike, SSEEvent, TicketData } from './SSEBroadcaster.js'
import { EventEmitter } from 'node:events'
import * as fs from 'node:fs'
import * as path from 'node:path'
import matter from 'gray-matter'
import { PathWatcherService } from './PathWatcherService.js'
import { SSEBroadcaster } from './SSEBroadcaster.js'

interface FileInvoker {
  invalidateFile: (filePath: string) => void
}

/**
 * FileWatcherService facade that composes PathWatcherService and SSEBroadcaster.
 * Maintains backward compatibility with the existing monolithic fileWatcherService.ts API.
 *
 * Architecture:
 * - PathWatcherService: Handles file system watching and raw event emission
 * - SSEBroadcaster: Manages SSE client connections and event broadcasting
 * - This facade: Coordinates between the two and provides the public API
 *
 * Events forwarded from PathWatcherService:
 * - 'ready', 'error', 'file-change', 'project-created', 'project-updated', 'project-deleted',
 *   'worktree-ready', 'worktree-error', 'registry-change'
 *
 * Events forwarded from SSEBroadcaster:
 * - 'broadcast' (when an event is sent to clients)
 */
class FileWatcherService extends EventEmitter {
  private pathWatcher: PathWatcherService
  private sseBroadcaster: SSEBroadcaster
  private fileInvoker: FileInvoker | null = null

  /** Backward compatibility: expose watchers map for tests */
  get watchers(): Map<string, import('chokidar').FSWatcher> {
    return (this.pathWatcher as any).watchers
  }

  /** Backward compatibility: expose worktreeWatchers map for tests */
  get worktreeWatchers(): Map<string, WorktreeWatcherEntry> {
    return (this.pathWatcher as any).worktreeWatchers
  }

  /** Backward compatibility: expose eventQueue for tests */
  get eventQueue(): SSEEvent[] {
    return (this.sseBroadcaster as any).eventQueue
  }

  /** Backward compatibility: expose watchPaths for tests */
  get watchPaths(): Map<string, string> {
    return (this.pathWatcher as any).watchPaths
  }

  /** Backward compatibility: expose worktreeService for tests */
  get worktreeService(): any {
    return (this.pathWatcher as any).worktreeService
  }

  /** Backward compatibility: expose clients for tests */
  get clients(): Set<ResponseLike> {
    return (this.sseBroadcaster as any).clients
  }

  /** Backward compatibility: expose debounceTimers for tests */
  get debounceTimers(): Map<string, NodeJS.Timeout> {
    return (this.sseBroadcaster as any).debounceTimers
  }

  constructor() {
    super()
    this.pathWatcher = new PathWatcherService()
    this.sseBroadcaster = new SSEBroadcaster()
    this.setupEventForwarding()
  }

  /**
   * Forward events from PathWatcherService to facade listeners.
   * This maintains backward compatibility for code listening to FileWatcherService events.
   */
  private setupEventForwarding(): void {
    const eventsToForward = [
      'ready',
      'error',
      'file-change',
      'project-created',
      'project-updated',
      'project-deleted',
      'worktree-ready',
      'worktree-error',
      'registry-change',
    ]

    eventsToForward.forEach((event) => {
      this.pathWatcher.on(event, (data) => {
        this.emit(event, data)
      })
    })

    // Forward SSE broadcast events
    this.sseBroadcaster.on('broadcast', (event: SSEEvent) => {
      this.emit('broadcast', event)
    })

    // Wire up file changes to SSE broadcasting with cache invalidation
    this.pathWatcher.on('file-change', (data) => {
      this.handleFileChangeForSSE(data)
    })

    // Wire up registry events to SSE broadcasting
    this.pathWatcher.on('project-created', (data) => {
      this.sseBroadcaster.broadcast({ type: 'project-created', data })
    })

    this.pathWatcher.on('project-updated', (data) => {
      this.sseBroadcaster.broadcast({ type: 'project-updated', data })
    })

    this.pathWatcher.on('project-deleted', (data) => {
      this.sseBroadcaster.broadcast({ type: 'project-deleted', data })
    })
  }

  /**
   * Handle file change events and broadcast to SSE clients with ticket data.
   * Includes cache invalidation and ticket metadata parsing.
   * MDT-142: Now includes subdocument metadata and source attribution.
   */
  private handleFileChangeForSSE(data: FileChangeEventPayload): void {
    const { eventType, filename, projectId, timestamp, subdocument, source } = data
    let ticketData: TicketData | null = null

    // Invalidate cache for changed files
    if (this.fileInvoker && (eventType === 'change' || eventType === 'add' || eventType === 'unlink')) {
      const projectPath = this.pathWatcher.getProjectPath(projectId)
      const filePath = path.join(projectPath, filename)

      console.warn(`Invalidating cache for: ${filePath}`)
      this.fileInvoker.invalidateFile(filePath)
    }

    // For change events, try to parse the ticket data
    if (eventType === 'change' || eventType === 'add') {
      try {
        const projectPath = this.pathWatcher.getProjectPath(projectId)
        const filePath = path.join(projectPath, filename)

        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8')
          const { data: frontmatter } = matter(fileContent)

          // Extract key ticket fields
          ticketData = {
            code: frontmatter.code,
            title: frontmatter.title,
            status: frontmatter.status,
            type: frontmatter.type,
            priority: frontmatter.priority,
            lastModified: frontmatter.lastModified || new Date().toISOString(),
          }
        }
      }
      catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn('Failed to parse ticket data for SSE:', message)
      }
    }

    // Debounce rapid file changes
    const debounceKey = `${eventType}:${filename}:${projectId}`
    this.sseBroadcaster.debouncedBroadcast(debounceKey, () => {
      const event: FileChangeEvent = {
        type: 'file-change',
        data: {
          eventType,
          filename,
          projectId,
          timestamp,
          ticketData: ticketData || undefined,
          // MDT-142: Include subdocument metadata for targeted UI updates
          subdocument,
          source,
        },
      }

      console.warn(`Broadcasting file-change: ${eventType} - ${filename} in project ${projectId}${subdocument ? ` (subdocument: ${subdocument.code})` : ''}`)
      this.sseBroadcaster.broadcast(event)
    }, 100)
  }

  /**
   * Set file operation invoker for cache invalidation.
   */
  setFileInvoker(fileInvoker: FileInvoker): void {
    this.fileInvoker = fileInvoker
  }

  /**
   * Initialize file watcher for a single path (backward compatibility).
   */
  initFileWatcher(watchPath = './sample-tasks/*.md'): this {
    return this.initMultiProjectWatcher([{ id: 'default', path: watchPath }])
  }

  /**
   * Initialize file watchers for multiple projects.
   */
  initMultiProjectWatcher(projectPaths: ProjectPath[]): this {
    this.pathWatcher.initMultiProjectWatcher(projectPaths)
    return this
  }

  /**
   * Initialize file watcher for global project registry.
   */
  initGlobalRegistryWatcher(): void {
    this.pathWatcher.initGlobalRegistryWatcher()
  }

  /**
   * MDT-142: Auto-discover and create worktree watchers for a project.
   */
  async initWorktreeWatchers(projectId: string, projectPath: string, projectCode?: string): Promise<number> {
    return this.pathWatcher.initWorktreeWatchers(projectId, projectPath, projectCode)
  }

  /**
   * Add a watcher for a worktree path.
   * @returns Unique watcher ID if successful, null if watching failed
   */
  addWatcher(projectId: string, ticketCode: string, worktreePath: string): string | null {
    return this.pathWatcher.addWatcher(projectId, ticketCode, worktreePath)
  }

  /**
   * Remove a worktree watcher by ticket code.
   */
  async removeWorktreeWatcher(projectId: string, ticketCode: string): Promise<void> {
    await this.pathWatcher.removeWorktreeWatcher(projectId, ticketCode)
  }

  /**
   * Add an SSE client connection.
   */
  addClient(response: ResponseLike): void {
    this.sseBroadcaster.addClient(response)
  }

  /**
   * Remove an SSE client connection.
   */
  removeClient(response: ResponseLike): void {
    this.sseBroadcaster.removeClient(response)
  }

  /**
   * Get the count of connected SSE clients.
   */
  getClientCount(): number {
    return this.sseBroadcaster.getClientCount()
  }

  /**
   * Start heartbeat to detect dead connections.
   */
  startHeartbeat(intervalMs = 30000): void {
    this.sseBroadcaster.startHeartbeat(intervalMs)
  }

  /**
   * Get all worktree watchers for a specific project.
   */
  getProjectWorktreeWatchers(projectId: string): WorktreeWatcherEntry[] {
    return this.pathWatcher.getProjectWorktreeWatchers(projectId)
  }

  /**
   * Get total count of worktree watchers.
   */
  getWorktreeWatcherCount(): number {
    return this.pathWatcher.getWorktreeWatcherCount()
  }

  /** Backward compatibility: get worktree watcher ID */
  getWorktreeWatcherId(projectId: string, ticketCode: string): string | null {
    return (this.pathWatcher as any).getWorktreeWatcherId?.(projectId, ticketCode) ?? null
  }

  /** Backward compatibility: handle registry event */
  handleRegistryEvent(eventType: string, filePath: string): void {
    (this.pathWatcher as any).handleRegistryEvent?.(eventType, filePath)
  }

  /** Backward compatibility: handle file event */
  handleFileEvent(eventType: string, filePath: string, projectId: string): void {
    (this.pathWatcher as any).handleFileEvent?.(eventType, filePath, projectId)
  }

  /** Backward compatibility: get project path */
  getProjectPath(projectId: string): string {
    return this.pathWatcher.getProjectPath(projectId)
  }

  /** Backward compatibility: broadcast file change */
  async broadcastFileChange(eventType: 'add' | 'change' | 'unlink', filename: string, projectId: string): Promise<void> {
    // Trigger the internal file change handler
    this.handleFileChangeForSSE({
      eventType,
      filename,
      projectId,
      timestamp: Date.now(),
      subdocument: null,
      source: 'main',
    })
  }

  /** Backward compatibility: send SSE event */
  sendSSEEvent(response: ResponseLike, event: SSEEvent): void {
    this.sseBroadcaster.sendSSEEvent(response, event)
  }

  /**
   * Stop all watchers and clean up resources.
   */
  stop(): void {
    this.pathWatcher.stop()
    this.sseBroadcaster.stop()
  }

  /**
   * Forward EventEmitter methods to support event registration.
   */
  on(event: string, listener: (...args: any[]) => void): this {
    return super.on(event, listener)
  }

  emit(event: string, ...args: any[]): boolean {
    return super.emit(event, ...args)
  }
}

export default FileWatcherService
