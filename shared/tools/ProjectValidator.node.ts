import type { ValidationResult } from './ProjectValidator.js'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { ProjectValidator as BaseProjectValidator } from './ProjectValidator.js'

/**
 * Node.js-specific ProjectValidator extension
 * Extends base class with filesystem validation capabilities
 */
export class ProjectValidator extends BaseProjectValidator {
  /**
   * Validate directory path with filesystem checking (Node.js)
   * @override
   */
  static validatePath(inputPath: string, options: { mustExist?: boolean } = {}): ValidationResult {
    try {
      // Step 1: Expand tilde path first
      const expandedPath = this.expandTildePath(inputPath)

      // Step 2: Convert to absolute path
      const absolutePath = path.resolve(expandedPath)

      // Step 3: Check existence if required
      if (options.mustExist) {
        if (!fs.existsSync(absolutePath)) {
          return {
            valid: false,
            error: `Path does not exist: ${absolutePath}`,
          }
        }

        // Step 4: Verify it's a directory
        try {
          const stats = fs.statSync(absolutePath)
          if (!stats.isDirectory()) {
            return {
              valid: false,
              error: `Path is not a directory: ${absolutePath}`,
            }
          }
        }
        catch (statError) {
          return {
            valid: false,
            error: `Cannot access path: ${statError instanceof Error ? statError.message : String(statError)}`,
          }
        }
      }

      // Step 5: Return success with normalized absolute path
      return {
        valid: true,
        normalized: absolutePath,
      }
    }
    catch (error) {
      return {
        valid: false,
        error: `Invalid path: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Expand tilde to home directory (Node.js)
   * @override
   */
  static expandTildePath(inputPath: string): string {
    // If path starts with ~, replace with home directory
    if (inputPath.startsWith('~')) {
      const homeDir = os.homedir()
      return inputPath.replace('~', homeDir)
    }

    // Otherwise return unchanged
    return inputPath
  }
}
