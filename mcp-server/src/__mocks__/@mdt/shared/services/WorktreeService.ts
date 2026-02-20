/**
 * Mock WorktreeService for testing
 * MDT-095: Git Worktree Support
 */

export type WorktreeMapping = Map<string, string>

export interface WorktreeServiceOptions {
  enabled?: boolean
}

/**
 * Mock WorktreeService class
 */
export class WorktreeService {
  private config: { enabled: boolean }
  private cache: Map<string, unknown>

  constructor(options?: WorktreeServiceOptions) {
    this.config = {
      enabled: options?.enabled ?? true,
    }
    this.cache = new Map()
  }

  async detect(_projectPath: string, _projectCode: string): Promise<WorktreeMapping> {
    // Return empty mapping by default
    return new Map()
  }

  async resolvePath(
    projectPath: string,
    _ticketCode: string,
    _ticketsPath: string,
    _projectCode: string,
  ): Promise<string> {
    // Return main project path by default (no worktree)
    return projectPath
  }

  invalidateCache(_projectPath: string): void {
    // No-op for mock
  }

  clearAllCache(): void {
    this.cache.clear()
  }

  getCacheSize(): number {
    return this.cache.size
  }
}
