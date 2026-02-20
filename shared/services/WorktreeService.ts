/**
 * MDT-095: Git Worktree Support - Service Implementation
 *
 * Provides worktree detection, ticket code extraction from branch names,
 * path resolution, and cache management.
 *
 * Scope: Owning git worktree detection, ticket code extraction from branch names,
 * path resolution, and cache management. Must NOT perform file operations,
 * UI rendering, or MCP tool formatting.
 *
 * @module shared/services/WorktreeService
 */

import type { WorktreeConfig } from '../models/WorktreeTypes.js'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

/**
 * Result type for worktree detection operations.
 * Maps ticket codes (e.g., 'MDT-095') to their absolute worktree paths.
 */
export type WorktreeMapping = Map<string, string>

/**
 * Cache entry for storing worktree detection results with timestamp.
 */
interface CacheEntry {
  /** Detected worktree mappings */
  mapping: WorktreeMapping
  /** Cache expiration timestamp */
  expiresAt: number
  /** Flag indicating if a background refresh is in progress */
  refreshing: boolean
}

/**
 * Cache storage keyed by project path.
 */
type WorktreeCache = Map<string, CacheEntry>

/**
 * Configuration options for WorktreeService.
 *
 * @example
 * ```ts
 * const service = new WorktreeService({ enabled: true })
 * ```
 */
export interface WorktreeServiceOptions {
  /** Enable or disable worktree detection (default: true) */
  enabled?: boolean
}

/**
 * Service for detecting and managing git worktrees for ticket-based development.
 *
 * Walking Skeleton Implementation:
 * - Interface stubs only (no actual git execution)
 * - Type-safe method signatures
 * - Cache management structure
 *
 * @example
 * ```ts
 * const service = new WorktreeService({ enabled: true })
 * const worktrees = await service.detect('/path/to/project', 'MDT')
 * const path = await service.resolvePath('/path/to/project', 'MDT-095', 'docs/CRs', 'MDT')
 * service.invalidateCache('/path/to/project')
 * ```
 */
export class WorktreeService {
  /** Worktree detection configuration */
  private readonly config: WorktreeConfig

  /** Cache for worktree mappings per project path (30 second TTL) */
  private readonly cache: WorktreeCache

  /** Default cache TTL in milliseconds (30 seconds per C7) */
  private readonly DEFAULT_CACHE_TTL = 30000

  /**
   * Creates a new WorktreeService instance.
   *
   * @param options - Service configuration options
   */
  constructor(options?: WorktreeServiceOptions) {
    this.config = {
      enabled: options?.enabled ?? true,
    }
    this.cache = new Map()
  }

  /**
   * Detects git worktrees for a project and extracts ticket codes from branch names.
   *
   * Full Implementation: Executes `git worktree list --porcelain` and parses output.
   * Returns stale cached data if available while refreshing in background.
   *
   * @param projectPath - Absolute path to the project directory
   * @param projectCode - Project code prefix (e.g., 'MDT', 'API')
   * @returns Promise resolving to Map of ticket codes to worktree paths
   *
   * @example
   * ```ts
   * const worktrees = await service.detect('/path/to/project', 'MDT')
   * // Map(2) { 'MDT-095' => '/path/to/worktrees/MDT-095', 'MDT-100' => '/path/to/worktrees/MDT-100' }
   * ```
   */
  async detect(projectPath: string, projectCode: string): Promise<WorktreeMapping> {
    if (!this.config.enabled) {
      return new Map()
    }

    // Check cache for existing data (stale or fresh) — bypass getCacheEntry to preserve stale entries
    const cachedEntry = this.cache.get(projectPath)
    const now = Date.now()

    // If cache is still valid, return it
    if (cachedEntry && now <= cachedEntry.expiresAt) {
      return new Map(cachedEntry.mapping)
    }

    // If we have stale data, return it immediately while refreshing
    if (cachedEntry) {
      // Refresh in background without blocking
      this.refreshWorktreeMapping(projectPath, projectCode).catch(() => {
        // Silent degradation - log error but don't throw
        // Background refresh failures don't block operations
      })
      return new Map(cachedEntry.mapping)
    }

    // No cache at all, perform fresh detection
    const mapping = await this.refreshWorktreeMapping(projectPath, projectCode)
    return new Map(mapping)
  }

  /**
   * Refreshes worktree mapping by executing git command.
   *
   * @param projectPath - Absolute path to the project directory
   * @param projectCode - Project code prefix
   * @returns Promise resolving to worktree mapping
   * @internal
   */
  private async refreshWorktreeMapping(
    projectPath: string,
    projectCode: string,
  ): Promise<WorktreeMapping> {
    try {
      // C6: Use execFile (not shell strings) to prevent command injection
      const { stdout } = await execFileAsync('git', ['worktree', 'list', '--porcelain'], {
        cwd: projectPath,
        timeout: 5000, // C1: Complete within 100ms (5s timeout for safety)
      })

      const mapping = this.parseGitWorktreeOutput(stdout, projectCode)
      this.setCacheEntry(projectPath, mapping)
      return mapping
    }
    catch {
      // C4: Silent degradation on git failure - never block core operations
      // Log error but return empty mapping
      return new Map()
    }
  }

  /**
   * Parses git worktree porcelain output and extracts ticket codes from branch names.
   *
   * @param stdout - Git worktree list --porcelain output
   * @param projectCode - Project code prefix (e.g., 'MDT', 'API')
   * @returns Map of ticket codes to worktree paths
   * @internal
   */
  private parseGitWorktreeOutput(stdout: string, projectCode: string): WorktreeMapping {
    const mapping = new Map<string, string>()
    const lines = stdout.split('\n')

    let currentWorktreePath: string | null = null
    let currentBranch: string | null = null

    for (const line of lines) {
      if (line.startsWith('worktree ')) {
        // Store previous worktree if we have both path and branch
        if (currentWorktreePath && currentBranch) {
          const ticketCode = this.extractTicketCode(currentBranch)
          if (ticketCode && ticketCode.startsWith(projectCode)) {
            // First worktree wins for duplicate ticket codes (BR-8 edge case)
            if (!mapping.has(ticketCode)) {
              mapping.set(ticketCode, currentWorktreePath)
            }
          }
        }

        // Start new worktree entry
        currentWorktreePath = line.slice('worktree '.length)
        currentBranch = null
      }
      else if (line.startsWith('branch ')) {
        currentBranch = line.slice('branch '.length)
      }
    }

    // Process last worktree entry
    if (currentWorktreePath && currentBranch) {
      const ticketCode = this.extractTicketCode(currentBranch)
      if (ticketCode && ticketCode.startsWith(projectCode)) {
        if (!mapping.has(ticketCode)) {
          mapping.set(ticketCode, currentWorktreePath)
        }
      }
    }

    return mapping
  }

  /**
   * Extracts ticket code from branch name.
   *
   * Handles patterns:
   * - refs/heads/feature/MDT-095 -> MDT-095
   * - refs/heads/bugfix/MDT-100 -> MDT-100
   * - refs/heads/MDT-095 -> MDT-095
   *
   * @param branch - Full branch ref (e.g., refs/heads/feature/MDT-095)
   * @returns Ticket code if found, otherwise null
   * @internal
   */
  private extractTicketCode(branch: string): string | null {
    // Remove refs/heads/ prefix
    const branchName = branch.replace(/^refs\/heads\//, '')

    // Pattern: PROJECT_CODE-NUMBER (e.g., MDT-095, API-123)
    // Match from end of string to get last segment
    const match = branchName.match(/([A-Z]{2,}-\d{3,})$/)
    return match ? match[1] : null
  }

  /**
   * Resolves the correct path for a ticket, considering worktree mappings.
   *
   * Full Implementation: Checks worktree cache, validates ticket file existence,
   * returns worktree path if valid, otherwise returns main project path.
   *
   * @param projectPath - Absolute path to the main project directory
   * @param ticketCode - Ticket code (e.g., 'MDT-095')
   * @param ticketsPath - Relative path to tickets directory (e.g., 'docs/CRs')
   * @param projectCode - Project code prefix (e.g., 'MDT', 'API')
   * @returns Promise resolving to absolute path for the ticket (worktree or main)
   *
   * @example
   * ```ts
   * const path = await service.resolvePath('/path/to/project', 'MDT-095', 'docs/CRs', 'MDT')
   * // '/path/to/worktrees/MDT-095' (if worktree exists and ticket file present)
   * // '/path/to/project' (if no worktree or ticket file missing)
   * ```
   */
  async resolvePath(
    projectPath: string,
    ticketCode: string,
    ticketsPath: string,
    projectCode: string,
  ): Promise<string> {
    if (!this.config.enabled) {
      return projectPath
    }

    // Get cached worktree mappings or detect if cache expired
    const mapping = await this.detect(projectPath, projectCode)

    // Check if ticketCode has a worktree mapping
    const worktreePath = mapping.get(ticketCode)
    if (!worktreePath) {
      return projectPath
    }

    // Validate ticket file exists in worktree
    // Ticket files are named: {CODE}-{slug}.md or {CODE}.md
    try {
      const ticketsDir = path.join(worktreePath, ticketsPath)
      const files = await fs.readdir(ticketsDir)
      const hasTicketFile = files.some(f =>
        f === `${ticketCode}.md` || f.startsWith(`${ticketCode}-`),
      )
      if (hasTicketFile) {
        return worktreePath
      }
    }
    catch {
      // Directory doesn't exist or can't be read
    }
    // Ticket file doesn't exist, return main project path
    return projectPath
  }

  /**
   * Invalidates the worktree cache for a specific project.
   *
   * Forces a fresh worktree detection on the next `detect()` call.
   *
   * @param projectPath - Absolute path to the project directory
   *
   * @example
   * ```ts
   * service.invalidateCache('/path/to/project')
   * ```
   */
  invalidateCache(projectPath: string): void {
    this.cache.delete(projectPath)
  }

  /**
   * Gets the current cache entry for a project (if exists and valid).
   *
   * @param projectPath - Absolute path to the project directory
   * @returns Cache entry if exists and not expired, otherwise undefined
   *
   * @internal
   */
  private getCacheEntry(projectPath: string): CacheEntry | undefined {
    const entry = this.cache.get(projectPath)
    if (!entry) {
      return undefined
    }

    const now = Date.now()
    if (now > entry.expiresAt) {
      this.cache.delete(projectPath)
      return undefined
    }

    return entry
  }

  /**
   * Sets a cache entry for a project with TTL expiration.
   *
   * @param projectPath - Absolute path to the project directory
   * @param mapping - Worktree mapping to cache
   *
   * @internal
   */
  private setCacheEntry(projectPath: string, mapping: WorktreeMapping): void {
    const entry: CacheEntry = {
      mapping,
      expiresAt: Date.now() + this.DEFAULT_CACHE_TTL,
      refreshing: false,
    }
    this.cache.set(projectPath, entry)
  }

  /**
   * Clears all cached worktree mappings (useful for testing or global refresh).
   *
   * @example
   * ```ts
   * service.clearAllCache()
   * ```
   */
  clearAllCache(): void {
    this.cache.clear()
  }

  /**
   * Gets the current cache size (number of cached projects).
   *
   * @returns Number of cached project mappings
   */
  getCacheSize(): number {
    return this.cache.size
  }
}
