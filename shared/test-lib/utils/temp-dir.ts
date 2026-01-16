/**
 * Temporary Directory Management Utility
 *
 * Cross-platform temp directory creation with UUID naming and cleanup.
 */

import { randomUUID } from 'node:crypto'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { TestFrameworkError } from '../types.js'

export class TempDirectoryManager {
  private createdDirs = new Set<string>()

  async createTempDir(prefix = 'mdt-test-', baseDir = os.tmpdir()): Promise<string> {
    const dirName = `${prefix}${randomUUID().split('-')[0]}`
    const tempPath = path.join(baseDir, dirName)

    try {
      await fs.mkdir(tempPath, { recursive: true })
      this.createdDirs.add(tempPath)
      return tempPath
    }
    catch (error) {
      throw new TestFrameworkError(
        `Failed to create temp dir: ${error instanceof Error ? error.message : String(error)}`,
        'TEMP_DIR_CREATE_FAILED',
      )
    }
  }

  async cleanupTempDir(dirPath: string): Promise<void> {
    if (!this.createdDirs.has(dirPath))
      return

    try {
      await fs.rm(dirPath, { recursive: true, force: true })
      this.createdDirs.delete(dirPath)
    }
    catch (error) {
      console.warn(`Failed to cleanup ${dirPath}:`, error)
    }
  }

  async cleanupAll(): Promise<void> {
    await Promise.all(
      Array.from(this.createdDirs).map(dir => this.cleanupTempDir(dir).catch()),
    )
    this.createdDirs.clear()
  }

  async exists(dirPath: string): Promise<boolean> {
    try {
      return (await fs.stat(dirPath)).isDirectory()
    }
    catch {
      return false
    }
  }

  getManagedDirs(): string[] {
    return Array.from(this.createdDirs)
  }
}

export const tempDirManager = new TempDirectoryManager()

export function createTempDir(prefix?: string, baseDir?: string) {
  return tempDirManager.createTempDir(prefix, baseDir)
}

export function cleanupTempDir(dirPath: string) {
  return tempDirManager.cleanupTempDir(dirPath)
}
