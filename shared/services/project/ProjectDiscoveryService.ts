import type { Project } from '../../models/Project.js'
import type { IProjectDiscoveryService } from './types.js'
import { getDefaultPaths } from '../../utils/constants.js'
import { directoryExists } from '../../utils/file-utils.js'
import { logQuiet } from '../../utils/logger.js'
import {
  getBaseName,
  joinPaths,
} from '../../utils/path-resolver.js'
import { validateProjectIdMatchesDirectory } from '../../utils/project-validation-helpers.js'
import { ProjectConfigLoader } from './ProjectConfigLoader.js'
import { ProjectFactory } from './ProjectFactory.js'
import { ProjectRegistry } from './ProjectRegistry.js'
import { ProjectScanner } from './ProjectScanner.js'

/**
 * Project Discovery Service
 * Handles project scanning, registration, and discovery operations
 * Extracted from ProjectService to separate concerns
 * Refactored to use utilities for better separation of concerns
 */
export class ProjectDiscoveryService implements IProjectDiscoveryService {
  private quiet: boolean
  private configLoader: ProjectConfigLoader
  private scanner: ProjectScanner
  private registry: ProjectRegistry
  private factory: ProjectFactory

  constructor(quiet: boolean = false) {
    this.quiet = quiet
    this.configLoader = new ProjectConfigLoader(quiet)
    this.scanner = new ProjectScanner(quiet)
    this.registry = new ProjectRegistry(quiet)
    this.factory = new ProjectFactory()
  }

  /**
   * Get all registered projects
   * Strategy 1 (Global-Only): Reads full project details from global registry when no local config exists
   * Strategy 2 (Project-First): Reads minimal references from global registry and merges with local project configs
   * Global provides: path location + metadata (or full details for global-only)
   * Local provides: complete project definition (name, code, settings) for Project-First
   */
  getRegisteredProjects(): Project[] {
    const projects: Project[] = []
    const registeredProjects = this.registry.getRegisteredProjects()

    for (const { file, data: registryData } of registeredProjects) {
      try {
        const projectPath = registryData.project.path
        const registryPath = joinPaths(getDefaultPaths().PROJECTS_REGISTRY, file)

        // Validate that the project path still exists
        // This filters out stale registry entries for deleted/moved projects
        if (!directoryExists(projectPath)) {
          logQuiet(this.quiet, `Skipping non-existent project from registry: ${projectPath}`)
          continue
        }

        // Check if this is a global-only project (full data in registry) or project-first (minimal data)
        const isGlobalOnly = registryData.metadata?.globalOnly === true
          || registryData.project.name !== undefined

        // Validate that project.id matches directory name (if ID is explicitly set in registry)
        // This prevents worktrees and misconfigured projects from being loaded from registry
        const directoryName = getBaseName(projectPath)
        if (!validateProjectIdMatchesDirectory(registryData.project.id, directoryName)) {
          logQuiet(this.quiet, `Skipping registered project at ${directoryName}: project.id "${registryData.project.id}" does not match directory name`)
          continue // Skip this registry entry - ID must match directory
        }

        if (isGlobalOnly) {
          // Strategy 1: Global-Only - Full project details stored in global registry
          const project = this.factory.createFromRegistry(registryData, projectPath, registryPath)
          projects.push(project)
        }
        else {
          // Strategy 2: Project-First - Read complete project definition from local config
          const localConfig = this.configLoader.getProjectConfig(projectPath)

          // Validate local config exists and is valid
          if (!localConfig) {
            logQuiet(this.quiet, `Skipping project ${getBaseName(projectPath)}: global registry exists but no valid local config at ${projectPath}`)
            continue // Graceful handling - skip projects without local config
          }

          // Additional validation: if local config has explicit ID, it must match directory name
          if (!validateProjectIdMatchesDirectory(localConfig.project.id, directoryName)) {
            logQuiet(this.quiet, `Skipping registered project at ${directoryName}: local config project.id "${localConfig.project.id}" does not match directory name`)
            continue // Skip this registry entry - ID must match directory
          }

          // Use factory to construct project from local config
          const project = this.factory.createFromConfig(localConfig, projectPath, registryPath)

          // Merge registry metadata (registry takes precedence over defaults)
          project.metadata = {
            dateRegistered: registryData.metadata.dateRegistered || project.metadata.dateRegistered,
            lastAccessed: registryData.metadata.lastAccessed || project.metadata.lastAccessed,
            version: registryData.metadata.version || project.metadata.version,
          }

          projects.push(project)
        }
      }
      catch (error) {
        logQuiet(this.quiet, `Error processing registry entry for ${file}:`, error)
      }
    }

    return projects
  }

  /**
   * Auto-discover projects by scanning for .mdt-config.toml files
   */
  autoDiscoverProjects(searchPaths: string[] = []): Project[] {
    return this.scanner.autoDiscoverProjects(searchPaths)
  }

  /**
   * Register a project in the global registry (Project-First Strategy)
   * Stores minimal reference: path for discovery, metadata for tracking
   * Complete project definition remains in local config
   */
  registerProject(project: Project, documentDiscoverySettings?: {
    paths?: string[]
    maxDepth?: number
  }): void {
    this.registry.registerProject(project, documentDiscoverySettings)
  }
}
