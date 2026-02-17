/**
 * Project Factory
 *
 * Centralized factory for creating Project objects from various sources.
 * Extracted from ProjectScanner and ProjectDiscoveryService to eliminate duplication.
 *
 * This factory provides three creation methods corresponding to the three project strategies:
 * - createFromConfig: For auto-discovered projects (Strategy 3)
 * - createFromRegistry: For global-only projects (Strategy 1)
 * - createAutoDiscovered: Alias for createFromConfig with explicit auto-discovery flag
 */

import type { Project, ProjectConfig } from '../../models/Project.js'
import type { RegistryData } from './types.js'
import { CONFIG_FILES, DEFAULTS } from '../../utils/constants.js'
import { getBaseName } from '../../utils/path-resolver.js'

/**
 * Factory for creating Project objects from various sources
 *
 * All construction logic for Project objects is centralized here,
 * ensuring consistency across the project discovery subsystem.
 */
export class ProjectFactory {
  /**
   * Create Project from local config (auto-discovery or project-first)
   *
   * This method is used when a local config file exists.
   * It extracts all project information from the config and builds a complete Project object.
   *
   * @param config - The project configuration loaded from local config file
   * @param projectPath - The absolute path to the project directory
   * @param registryPath - Optional path to the registry file (for registered projects)
   * @returns A fully constructed Project object
   *
   * @example
   * ```ts
   * const config = configLoader.getProjectConfig('/path/to/project')
   * const project = factory.createFromConfig(config, '/path/to/project', '/registry/project.toml')
   * ```
   */
  createFromConfig(
    config: ProjectConfig,
    projectPath: string,
    registryPath?: string,
  ): Project {
    const directoryName = getBaseName(projectPath)

    // Determine project ID: use config.id if available, otherwise use directory name
    const projectId = config.project.id || directoryName

    // Build the Project object
    const project: Project = {
      id: projectId,
      project: {
        id: config.project.id || undefined, // Store explicit ID if set
        name: config.project.name,
        code: config.project.code,
        path: projectPath,
        configFile: `${projectPath}/${CONFIG_FILES.PROJECT_CONFIG}`,
        startNumber: config.project.startNumber,
        counterFile: config.project.counterFile || CONFIG_FILES.COUNTER_FILE,
        active: config.project.active !== false, // Default to true
        description: config.project.description || '',
        repository: config.project.repository || '',
        ticketsPath: config.project.ticketsPath || DEFAULTS.TICKETS_PATH,
      },
      metadata: {
        dateRegistered: new Date().toISOString().split('T')[0],
        lastAccessed: new Date().toISOString().split('T')[0],
        version: '1.0.0',
      },
      ...(registryPath && { registryFile: registryPath }),
    }

    return project
  }

  /**
   * Create Project from registry data (global-only strategy)
   *
   * This method is used for global-only projects where the complete
   * project definition is stored in the global registry.
   *
   * @param registryData - The registry data containing project information
   * @param projectPath - The absolute path to the project directory
   * @param registryPath - The path to the registry file
   * @returns A fully constructed Project object with globalOnly flag set
   *
   * @example
   * ```ts
   * const registryData = parseRegistryFile('/registry/project.toml')
   * const project = factory.createFromRegistry(registryData, '/path/to/project', '/registry/project.toml')
   * ```
   */
  createFromRegistry(
    registryData: RegistryData,
    projectPath: string,
    registryPath: string,
  ): Project {
    const directoryName = getBaseName(projectPath)

    // For global-only projects, ID comes from registry or directory name
    const projectId = registryData.project.id || directoryName

    const project: Project = {
      id: projectId,
      project: {
        id: registryData.project.id || undefined,
        name: registryData.project.name || projectId,
        code: registryData.project.code,
        path: projectPath,
        configFile: '', // No local config for global-only projects
        startNumber: registryData.project.startNumber || DEFAULTS.START_NUMBER,
        counterFile: registryData.project.counterFile || CONFIG_FILES.COUNTER_FILE,
        active: registryData.project.active !== false,
        description: registryData.project.description || '',
        repository: registryData.project.repository || '',
        ticketsPath: registryData.project.ticketsPath,
      },
      metadata: {
        dateRegistered: registryData.metadata.dateRegistered || new Date().toISOString().split('T')[0],
        lastAccessed: registryData.metadata.lastAccessed || new Date().toISOString().split('T')[0],
        version: registryData.metadata.version || '1.0.0',
        globalOnly: true,
      },
      document: registryData.project.document,
      registryFile: registryPath,
    }

    return project
  }

  /**
   * Create auto-discovered Project
   *
   * This method is used for projects found during auto-discovery scanning.
   * It marks the project as autoDiscovered and uses directory name as ID.
   *
   * @param config - The project configuration loaded from local config file
   * @param projectPath - The absolute path to the project directory
   * @returns A fully constructed Project object with autoDiscovered flag set
   *
   * @example
   * ```ts
   * const config = configLoader.getProjectConfig('/path/to/project')
   * const project = factory.createAutoDiscovered(config, '/path/to/project')
   * ```
   */
  createAutoDiscovered(
    config: ProjectConfig,
    projectPath: string,
  ): Project {
    const project = this.createFromConfig(config, projectPath)

    // Mark as auto-discovered
    project.autoDiscovered = true

    return project
  }
}
