/**
 * Mock implementation of WorktreeService for testing.
 */

import type { WorktreeMapping } from '@mdt/shared/services/WorktreeService.js'

export class WorktreeService {
  private readonly config: { enabled: boolean }
  private readonly cache: Map<string, { mapping: WorktreeMapping, expiresAt: number }>

  constructor(options?: { enabled?: boolean }) {
    this.config = {
      enabled: options?.enabled ?? true,
    }
    this.cache = new Map()
  }

  async detect(_projectPath: string, _projectCode: string): Promise<WorktreeMapping> {
    if (!this.config.enabled) {
      return new Map()
    }

    // Return empty mapping by default
    return new Map()
  }

  async resolvePath(
    projectPath: string,
    _ticketCode: string,
    _ticketsPath: string,
    _projectCode: string,
  ): Promise<string> {
    if (!this.config.enabled) {
      return projectPath
    }

    // Return main path by default
    return projectPath
  }

  async isInWorktree(_projectPath: string, _ticketCode: string): Promise<boolean> {
    if (!this.config.enabled) {
      return false
    }

    // Return false by default (not in worktree)
    return false
  }

  invalidateCache(_projectPath: string): void {
    this.cache.delete(_projectPath)
  }

  clearAllCache(): void {
    this.cache.clear()
  }

  getCacheSize(): number {
    return this.cache.size
  }
}
