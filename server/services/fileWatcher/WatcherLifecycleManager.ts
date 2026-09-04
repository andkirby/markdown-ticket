/**
 * MDT-183: WatcherLifecycleManager
 *
 * Coordinates lazy watcher provisioning driven by SSE client connections.
 * Owns per-project refcount, debounce stop, and client subscription tracking.
 *
 * Delegates actual chokidar creation to PathWatcherService.
 */

import type { PathWatcherService, ProjectPath } from './PathWatcherService.js'

const DEBOUNCE_MS = 5000

export interface ProjectRegistration extends ProjectPath {
  documentPaths?: string[]
  ticketsPath?: string
}

export class WatcherLifecycleManager {
  private pathWatcher: PathWatcherService
  private projectRegistry = new Map<string, ProjectRegistration>()
  private refcounts = new Map<string, number>()
  private clientSubscriptions = new Map<string, Set<string>>()
  private debounceTimers = new Map<string, NodeJS.Timeout>()

  constructor(pathWatcher: PathWatcherService) {
    this.pathWatcher = pathWatcher
  }

  /**
   * Register project metadata for lazy watcher creation.
   * Called at startup during project discovery (no watchers created yet).
   * D5 (UAT 2026-09-02): also called at runtime on registry-change; SSE
   * subscribers that raced the registration get watchers provisioned now.
   */
  registerProject(project: ProjectRegistration): void {
    this.projectRegistry.set(project.id, project)

    if ((this.refcounts.get(project.id) ?? 0) > 0) {
      this.provisionWatchers(project).catch((e) => {
        console.error(`Error provisioning watchers for late-registered project ${project.id}:`, e)
      })
    }
  }

  /**
   * Ensure watchers are running for the given projects, subscribing a client.
   * Creates watchers lazily on first subscriber.
   */
  async ensureWatchers(clientId: string, projectIds: string[]): Promise<void> {
    // Track client subscriptions
    if (!this.clientSubscriptions.has(clientId)) {
      this.clientSubscriptions.set(clientId, new Set())
    }
    const clientProjects = this.clientSubscriptions.get(clientId)!

    for (const projectId of projectIds) {
      // Already subscribed — no-op (idempotent D5 resubscribe)
      if (clientProjects.has(projectId))
        continue

      // Cancel any pending stop debounce for this project
      if (this.debounceTimers.has(projectId)) {
        clearTimeout(this.debounceTimers.get(projectId)!)
        this.debounceTimers.delete(projectId)
      }

      const currentCount = this.refcounts.get(projectId) ?? 0

      if (currentCount === 0) {
        // First subscriber — create watchers
        const project = this.projectRegistry.get(projectId)
        if (project) {
          await this.provisionWatchers(project)
        }
        else {
          // BR-7: never silently skip — the refcount below still reserves the
          // subscription; late registerProject() provisions the watchers.
          console.warn(`[WatcherLifecycle] Unknown project ${projectId} requested by ${clientId}; holding subscription until registry registration`)
        }
      }

      this.refcounts.set(projectId, currentCount + 1)
      clientProjects.add(projectId)
    }
  }

  /**
   * Release ALL of a client's recorded subscriptions (the authoritative set),
   * including projects added after connect via D5 resubscribe.
   */
  releaseClient(clientId: string): void {
    const clientProjects = this.clientSubscriptions.get(clientId)
    if (clientProjects && clientProjects.size > 0)
      this.releaseProject(clientId, Array.from(clientProjects))
    else
      this.clientSubscriptions.delete(clientId) // no-op for unknown clients
  }

  /**
   * Release a client's subscription to projects.
   * Idempotent: only decrements refcount for projects the client is actually subscribed to.
   * Starts debounce stop when refcount hits 0.
   */
  releaseProject(clientId: string, projectIds: string[]): void {
    const clientProjects = this.clientSubscriptions.get(clientId)
    if (!clientProjects)
      return // Client already released or never subscribed

    for (const projectId of projectIds) {
      // Only decrement if this client is actually subscribed to this project
      if (!clientProjects.has(projectId))
        continue

      clientProjects.delete(projectId)

      const currentCount = this.refcounts.get(projectId) ?? 0
      if (currentCount <= 0)
        continue

      const newCount = currentCount - 1
      this.refcounts.set(projectId, newCount)

      if (newCount === 0) {
        // Start debounce to stop watchers for this project
        const timer = setTimeout(async () => {
          this.debounceTimers.delete(projectId)
          this.refcounts.delete(projectId)
          // Stop chokidar watchers for this specific project
          try {
            await this.pathWatcher.stopProject(projectId)
          }
          catch (e) {
            console.error(`Error stopping watchers for project ${projectId}:`, e)
          }
        }, DEBOUNCE_MS)
        this.debounceTimers.set(projectId, timer)
      }
    }

    // Clean up client subscription set when empty
    if (clientProjects.size === 0) {
      this.clientSubscriptions.delete(clientId)
    }
  }

  /**
   * Create the watcher set for a project (ticket glob + document + worktree).
   * Idempotent at the PathWatcherService level (existing watcher IDs are skipped).
   */
  private async provisionWatchers(project: ProjectRegistration): Promise<void> {
    this.pathWatcher.initMultiProjectWatcher([project])
    // Also init document and worktree watchers if project has config
    if (project.projectRoot) {
      this.pathWatcher.initDocumentWatchers(
        project.id,
        project.projectRoot,
        project.documentPaths ?? [],
        project.ticketsPath,
      )
      await this.pathWatcher.initWorktreeWatchers(
        project.id,
        project.projectRoot,
        project.projectCode,
      )
    }
  }

  /**
   * Number of projects with active watchers (refcount > 0).
   */
  activeWatcherCount(): number {
    return Array.from(this.refcounts.values()).filter(rc => rc > 0).length
  }

  /**
   * Current refcount for a project. Returns 0 if not tracked.
   */
  refCount(projectId: string): number {
    return this.refcounts.get(projectId) ?? 0
  }

  /**
   * Stop all debounce timers. Does not stop watchers (that's PathWatcherService's job).
   */
  stop(): void {
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
  }
}
