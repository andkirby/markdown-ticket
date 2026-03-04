/**
 * Project Validation Helpers
 *
 * Centralized validation functions for project discovery.
 * Extracted from ProjectScanner and ProjectDiscoveryService to eliminate duplication.
 *
 * These helpers provide consistent validation logic across the project discovery subsystem.
 */

import type { Project } from '../models/Project.js'
import type { DiscoveryConfig } from '../services/project/types.js'
import { fileExists } from './file-utils.js'

/**
 * Validates that project ID matches directory name (case-insensitive)
 *
 * This prevents worktrees and misconfigured projects from being added.
 * Case-insensitive comparison for compatibility with case-insensitive filesystems like macOS.
 *
 * @param id - The project ID from config (may be undefined)
 * @param directoryName - The directory name to validate against
 * @returns true if validation passes (ID matches or is undefined), false otherwise
 *
 * @example
 * ```ts
 * validateProjectIdMatchesDirectory('myproject', 'myproject') // true
 * validateProjectIdMatchesDirectory('MyProject', 'myproject') // true (case-insensitive)
 * validateProjectIdMatchesDirectory('different', 'myproject') // false
 * validateProjectIdMatchesDirectory(undefined, 'myproject') // true (no explicit ID)
 * ```
 */
export function validateProjectIdMatchesDirectory(
  id: string | undefined,
  directoryName: string,
): boolean {
  // If no explicit ID is set, validation passes (directory name will be used as ID)
  if (id === undefined) {
    return true
  }

  // Case-insensitive comparison for case-insensitive filesystems
  return id.toLowerCase() === directoryName.toLowerCase()
}

/**
 * Validates no duplicate project code exists in the project list
 *
 * This prevents duplicate projects (including worktrees) from being added.
 * The check is case-insensitive to catch variations like 'MDT' vs 'mdt'.
 *
 * IMPORTANT: This checks ALL existing projects for duplicate codes, not just
 * those without IDs. This catches worktrees that have the same code as the
 * main project but different directory names.
 *
 * @param code - The project code to validate (may be undefined)
 * @param existingProjects - List of existing projects to check against
 * @returns true if no duplicate found (or code is undefined), false if duplicate exists
 *
 * @example
 * ```ts
 * const projects = [
 *   { id: 'proj1', project: { code: 'AAA', id: 'proj1' } },
 *   { id: 'proj2', project: { code: 'BBB' } },
 * ]
 * validateNoDuplicateByCode('CCC', projects) // true
 * validateNoDuplicateByCode('AAA', projects) // false (even though proj1 has ID)
 * validateNoDuplicateByCode('aaa', projects) // false (case-insensitive)
 * validateNoDuplicateByCode(undefined, projects) // true
 * ```
 */
export function validateNoDuplicateByCode(
  code: string | undefined,
  existingProjects: Project[],
): boolean {
  // If no code is set, validation passes (no duplicate to check)
  if (code === undefined) {
    return true
  }

  // Check for existing projects with the same code
  // This catches worktrees and duplicate projects regardless of ID presence
  const hasDuplicate = existingProjects.some(
    p => p.project.code?.toLowerCase() === code.toLowerCase(),
  )

  return !hasDuplicate
}

/**
 * Validates no duplicate project code exists in the discovery config list
 *
 * This prevents duplicate projects (including worktrees) from being added.
 * The check is case-insensitive to catch variations like 'MDT' vs 'mdt'.
 *
 * IMPORTANT: This checks ALL existing configs for duplicate codes, not just
 * those without IDs. This catches worktrees that have the same code as the
 * main project but different directory names.
 *
 * @param code - The project code to validate (may be undefined)
 * @param discoveryConfigs - List of existing discovery configs to check against
 * @returns true if no duplicate found (or code is undefined), false if duplicate exists
 *
 * @example
 * ```ts
 * const configs = [
 *   { config: { project: { code: 'AAA', id: 'proj1' } } },
 *   { config: { project: { code: 'BBB' } } },
 * ]
 * validateNoDuplicateByCodeInDiscovery('CCC', configs) // true
 * validateNoDuplicateByCodeInDiscovery('AAA', configs) // false (even though proj1 has ID)
 * validateNoDuplicateByCodeInDiscovery('aaa', configs) // false (case-insensitive)
 * validateNoDuplicateByCodeInDiscovery(undefined, configs) // true
 * ```
 */
export function validateNoDuplicateByCodeInDiscovery(
  code: string | undefined,
  discoveryConfigs: DiscoveryConfig[],
): boolean {
  // If no code is set, validation passes (no duplicate to check)
  if (code === undefined) {
    return true
  }

  // Check for existing discovery configs with the same code
  // This catches worktrees and duplicate projects regardless of ID presence
  const hasDuplicate = discoveryConfigs.some(
    dc => dc.config.project.code?.toLowerCase() === code.toLowerCase(),
  )

  return !hasDuplicate
}

/**
 * Validates that config file exists at the specified path
 *
 * @param configPath - The path to the config file
 * @returns true if config file exists, false otherwise
 *
 * @example
 * ```ts
 * validateConfigExists('/path/to/.mdt-config.toml') // true if file exists
 * validateConfigExists('/path/to/nonexistent.toml') // false
 * ```
 */
export function validateConfigExists(configPath: string): boolean {
  return fileExists(configPath)
}
