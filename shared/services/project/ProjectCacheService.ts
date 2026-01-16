import type { Project } from '../../models/Project.js'
import type { IProjectCacheService, ProjectCache } from './types.js'
import { logQuiet } from '../../utils/logger.js'

/**
 * Project Cache Service
 * Handles caching operations for project data with TTL support
 * Implements IProjectCacheService interface for testability and dependency injection
 */
export class ProjectCacheService implements IProjectCacheService {
  private cache: ProjectCache
  private quiet: boolean

  constructor(quiet: boolean = false, defaultTTL: number = 30000) {
    this.quiet = quiet
    this.cache = {
      projects: null,
      timestamp: 0,
      ttl: defaultTTL, // 30 seconds by default
    }
  }

  /**
   * Check if cache is valid (not expired and contains data)
   * @returns True if cache contains valid data
   */
  isCacheValid(): boolean {
    const now = Date.now()
    return !!(this.cache.projects && (now - this.cache.timestamp) < this.cache.ttl)
  }

  /**
   * Get current cache age in milliseconds
   * @returns Age of cache in milliseconds, or 0 if no cached data
   */
  getCacheAge(): number {
    if (!this.cache.projects) {
      return 0
    }
    return Date.now() - this.cache.timestamp
  }

  /**
   * Get cached projects if valid, null otherwise
   * @returns Cached projects array or null if invalid
   */
  getCachedProjects(): Project[] | null {
    if (this.isCacheValid()) {
      logQuiet(this.quiet, '📦 Using cached projects data')
      return this.cache.projects
    }
    return null
  }

  /**
   * Cache projects data with current timestamp
   * @param projects - Projects array to cache
   */
  setCachedProjects(projects: Project[]): void {
    this.cache.projects = projects
    this.cache.timestamp = Date.now()
    logQuiet(this.quiet, `📦 Cached ${projects.length} projects`)
  }

  /**
   * Get all projects from cache if valid
   * This is the main cache access method used by ProjectService
   * @returns Promise resolving to cached projects or null if cache invalid
   */
  async getAllProjectsFromCache(): Promise<Project[] | null> {
    return this.getCachedProjects()
  }

  /**
   * Get all projects from cache if valid
   * This method satisfies the interface by returning empty array when no cache
   * @returns Promise resolving to cached projects or empty array if cache invalid
   */
  async getAllProjects(): Promise<Project[]> {
    const cached = this.getCachedProjects()
    return cached || []
  }

  /**
   * Clear the project cache
   * Forces next getAllProjects() call to refresh data
   */
  clearCache(): void {
    this.cache.projects = null
    this.cache.timestamp = 0
    logQuiet(this.quiet, '📦 Cache cleared')
  }

  /**
   * Update cache TTL
   * @param ttl - New TTL in milliseconds
   */
  setCacheTTL(ttl: number): void {
    this.cache.ttl = ttl
    logQuiet(this.quiet, `📦 Cache TTL set to ${ttl}ms`)
  }

  /**
   * Get current cache TTL
   * @returns Current TTL in milliseconds
   */
  getCacheTTL(): number {
    return this.cache.ttl
  }

  /**
   * Check if cache has any data (regardless of validity)
   * @returns True if cache contains data
   */
  hasCachedData(): boolean {
    return this.cache.projects !== null
  }

  /**
   * Get cache timestamp
   * @returns Cache timestamp or 0 if no data
   */
  getCacheTimestamp(): number {
    return this.cache.timestamp
  }
}
