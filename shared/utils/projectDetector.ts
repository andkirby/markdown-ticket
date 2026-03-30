import * as path from 'node:path'

/**
 * Project Detector Utility
 * MDT-145: Root-up .mdt-config.toml detection from current working directory
 *
 * This is a stub for TDD - implementation will be added in Task 2
 */

import process from 'node:process'
import { fileExists } from './file-utils.js'

export interface ProjectDetectionResult {
  found: boolean
  configPath: string | null
  projectRoot: string | null
}

const CONFIG_FILE = '.mdt-config.toml'

/**
 * Detect project context by searching parent directories for .mdt-config.toml
 * Searches from the provided directory up to filesystem root
 */
export function detectProjectContext(startDir: string = process.cwd()): ProjectDetectionResult {
  let currentDir = path.resolve(startDir)
  const root = path.parse(currentDir).root

  while (true) {
    const configPath = path.join(currentDir, CONFIG_FILE)

    if (fileExists(configPath)) {
      return {
        found: true,
        configPath,
        projectRoot: currentDir,
      }
    }

    // Check if we've reached the root
    if (currentDir === root) {
      break
    }

    // Move up one directory
    const parentDir = path.dirname(currentDir)

    // Safety check for infinite loop
    if (parentDir === currentDir) {
      break
    }

    currentDir = parentDir
  }

  return {
    found: false,
    configPath: null,
    projectRoot: null,
  }
}
