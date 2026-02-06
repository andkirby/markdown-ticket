/**
 * Project Detection Utility
 *
 * Responsible for detecting .mdt-config.toml files from the current working directory.
 * This module only handles file system search - it does not parse files or know about MCP tools.
 *
 * Scope boundary: File system search ONLY
 */

import { existsSync } from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'

export interface ProjectDetectionResult {
  /**
   * Path to the detected .mdt-config.toml file
   */
  configPath: string | null
}

/**
 * Find .mdt-config.toml by searching parent directories up to the specified depth.
 * Returns the closest (most nested) config file found.
 *
 * Scope: File system search ONLY - does not parse file content beyond reading search depth
 *
 * @param depth - Maximum number of parent directories to search (default: 3)
 * @returns Detection result with config path (null if not found)
 */
export function find(depth: number = 3): ProjectDetectionResult {
  let currentDir = process.cwd()

  for (let i = 0; i <= depth; i++) {
    const configPath = path.join(currentDir, '.mdt-config.toml')

    if (existsSync(configPath)) {
      return {
        configPath,
      }
    }

    // Stop at filesystem root
    const parentDir = path.dirname(currentDir)
    if (parentDir === currentDir) {
      break
    }

    currentDir = parentDir
  }

  return {
    configPath: null,
  }
}
