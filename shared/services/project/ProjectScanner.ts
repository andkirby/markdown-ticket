import type { Project } from '../../models/Project.js'
import type { DiscoveryConfig } from './types.js'
import { CONFIG_FILES } from '../../utils/constants.js'
import { directoryExists, fileExists, readDirectory } from '../../utils/file-utils.js'
import { logQuiet } from '../../utils/logger.js'
import {
  buildConfigFilePath,
  getBaseName,
  joinPaths,
} from '../../utils/path-resolver.js'
import { validateNoDuplicateByCodeInDiscovery, validateProjectIdMatchesDirectory } from '../../utils/project-validation-helpers.js'
import { ProjectConfigLoader } from './ProjectConfigLoader.js'
import { ProjectFactory } from './ProjectFactory.js'

/**
 * Utility class for handling project auto-discovery and scanning operations
 * Extracted from ProjectDiscoveryService to reduce file size
 */
export class ProjectScanner {
  private quiet: boolean
  private configLoader: ProjectConfigLoader
  private factory: ProjectFactory

  constructor(quiet: boolean = false) {
    this.quiet = quiet
    this.configLoader = new ProjectConfigLoader(quiet)
    this.factory = new ProjectFactory()
  }

  /**
   * Auto-discover projects by scanning for .mdt-config.toml files
   */
  autoDiscoverProjects(searchPaths: string[] = []): Project[] {
    const discoveryConfigs: DiscoveryConfig[] = this.scanForDiscoveryConfigs(searchPaths)

    // Convert discovery configs to Projects using factory
    return discoveryConfigs.map(dc =>
      this.factory.createAutoDiscovered(dc.config, dc.projectPath),
    )
  }

  /**
   * Scan for discovery configs without constructing Project objects
   * Returns raw configuration data for deferred Project construction
   */
  scanForDiscoveryConfigs(searchPaths: string[] = []): DiscoveryConfig[] {
    const discovered: DiscoveryConfig[] = []

    const pathsToSearch = Array.from(new Set(searchPaths))
    logQuiet(this.quiet, '🔍 Auto-discovery scanning paths:', pathsToSearch)

    for (const searchPath of pathsToSearch) {
      try {
        logQuiet(this.quiet, `🔍 Checking path: ${searchPath}, exists: ${directoryExists(searchPath)}`)
        if (directoryExists(searchPath)) {
          logQuiet(this.quiet, `🔍 Scanning ${searchPath} for projects...`)
          this.scanDirectoryForConfigs(searchPath, discovered, 3) // Max depth 3
        }
      }
      catch {
        logQuiet(this.quiet, `Error scanning ${searchPath}`)
      }
    }
    logQuiet(this.quiet, `🔍 Auto-discovery complete. Found ${discovered.length} projects:`)

    return discovered
  }

  /**
   * Recursively scan directory for project configurations
   * Returns discovery configs without constructing Project objects
   */
  private scanDirectoryForConfigs(dirPath: string, discovered: DiscoveryConfig[], maxDepth: number): void {
    if (maxDepth <= 0)
      return

    try {
      const configPath = buildConfigFilePath(dirPath, CONFIG_FILES.PROJECT_CONFIG)

      if (fileExists(configPath)) {
        const config = this.configLoader.getProjectConfig(dirPath)
        if (config) {
          const directoryName = getBaseName(dirPath)

          // Validate that project ID matches directory name (if ID is explicitly set)
          // This prevents worktrees and misconfigured projects from being added
          // Case-insensitive comparison for case-insensitive filesystems like macOS
          if (!validateProjectIdMatchesDirectory(config.project.id, directoryName)) {
            logQuiet(this.quiet, `Skipping project at ${directoryName}: project.id "${config.project.id}" does not match directory name`)
            return // Skip this project - ID must match directory
          }

          // Track projects by code to handle duplicates without proper IDs
          // Check for duplicate discovery configs by code (for configs without explicit ID)
          if (!config.project.id && config.project.code) {
            if (!validateNoDuplicateByCodeInDiscovery(config.project.code, discovered)) {
              logQuiet(this.quiet, `Ignoring duplicate project ${directoryName} with code "${config.project.code}" (no ID in config)`)
              return // Skip duplicate
            }
          }

          // Store discovery config for deferred Project construction
          discovered.push({
            config,
            projectPath: dirPath,
            configPath,
          })
        }
      }

      // Continue scanning subdirectories
      const entries = readDirectory(dirPath)
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          this.scanDirectoryForConfigs(joinPaths(dirPath, entry.name), discovered, maxDepth - 1)
        }
      }
    }
    catch {
      // Silently skip directories we can't read
    }
  }
}
