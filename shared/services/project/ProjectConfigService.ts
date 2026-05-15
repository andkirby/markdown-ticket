import type { ProjectConfig } from '../../models/Project.js'
import type { GlobalConfig, IProjectConfigService, ProjectUpdateFields, ProjectWriteReference, RegistryData } from './types.js'
import { getTicketsPath, isLegacyConfig, migrateLegacyConfig, validateProjectConfig } from '../../models/Project.js'
import { validateTicketsPath } from '../../tools/ProjectValidator.js'
import { getDefaultConfig as getDefaultConfigUtil, processConfig } from '../../utils/config-validator.js'
import { CONFIG_FILES, DEFAULTS, getDefaultPaths } from '../../utils/constants.js'
import { createDirectory, directoryExists, fileExists, readFile, writeFile } from '../../utils/file-utils.js'
import { logQuiet } from '../../utils/logger.js'
import {
  buildConfigFilePath,
  buildProjectPath,
  buildRegistryFilePath,
} from '../../utils/path-resolver.js'
import { parseToml, stringify } from '../../utils/toml.js'
import { ProjectConfigurationMode } from './types.js'

interface ProjectDocumentConfig {
  paths?: string[]
  excludeFolders?: string[]
  maxDepth?: number
}

interface LocalProjectConfigWithNestedDocument extends Omit<ProjectConfig, 'project'> {
  document?: unknown
  project?: Partial<NonNullable<ProjectConfig['project']>> & {
    document?: ProjectDocumentConfig
  }
}

/**
 * Project Configuration Service
 * Handles configuration management for projects including global config,
 * local project config, and configuration updates.
 */
export class ProjectConfigService implements IProjectConfigService {
  private quiet: boolean

  constructor(quiet: boolean = false) {
    this.quiet = quiet
  }

  /** Get global configuration path dynamically (respects process.env.CONFIG_DIR) */
  private get globalConfigPath(): string {
    return getDefaultPaths().CONFIG_FILE
  }

  /** Get projects directory dynamically (respects process.env.CONFIG_DIR) */
  private get projectsDir(): string {
    return getDefaultPaths().PROJECTS_REGISTRY
  }

  /** Get global configuration */
  getGlobalConfig(): GlobalConfig {
    try {
      if (!fileExists(this.globalConfigPath)) {
        return getDefaultConfigUtil()
      }
      const configContent = readFile(this.globalConfigPath)
      const parsedConfig = parseToml(configContent)
      return processConfig(parsedConfig, this.quiet)
    }
    catch (error) {
      logQuiet(this.quiet, 'Error reading global config:', error)
      return getDefaultConfigUtil()
    }
  }

  /** Get project configuration from local .mdt-config.toml with auto-migration */
  getProjectConfig(projectPath: string): ProjectConfig | null {
    try {
      const configPath = buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG)
      if (!fileExists(configPath))
        return null

      const content = readFile(configPath)
      const config = parseToml(content)

      if (!validateProjectConfig(config))
        return null

      // MDT-151: Validate ticketsPath at config load time
      const ticketsPath = getTicketsPath(config, DEFAULTS.TICKETS_PATH)
      const pathValidation = validateTicketsPath(ticketsPath)
      if (!pathValidation.valid) {
        logQuiet(this.quiet, `Invalid ticketsPath "${ticketsPath}" in project config: ${pathValidation.error}`)
        return null
      }

      // Auto-migrate legacy configurations
      if (isLegacyConfig(config)) {
        logQuiet(this.quiet, `Automatically migrating legacy configuration format for project at ${projectPath}...`)
        const migratedConfig = migrateLegacyConfig(config)
        writeFile(configPath, stringify(migratedConfig))
        logQuiet(this.quiet, `Updated legacy config to clean format at ${configPath}`)
        return migratedConfig
      }

      return config
    }
    catch (error) {
      logQuiet(this.quiet, `Error reading project config from ${projectPath}:`, error)
      return null
    }
  }

  /** Create or update local .mdt-config.toml file */
  createOrUpdateLocalConfig(
    projectId: string,
    projectPath: string,
    name: string,
    code: string,
    description?: string,
    repository?: string,
    globalOnly: boolean = false,
    ticketsPath?: string,
  ): void {
    try {
      if (globalOnly) {
        logQuiet(this.quiet, `Global-only mode: skipping local config creation for ${projectId}`)
        return
      }

      const configPath = buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG)
      const config = this.loadOrMigrateConfig(configPath, projectId)

      const finalTicketsPath = ticketsPath || getTicketsPath(config, DEFAULTS.TICKETS_PATH)
      this.ensureTicketsDirectory(projectPath, finalTicketsPath)

      config.project = {
        ...config.project,
        id: projectId,
        name,
        code,
        startNumber: config.project.startNumber || 1,
        counterFile: config.project.counterFile || CONFIG_FILES.COUNTER_FILE,
        description: description || config.project.description || '',
        repository: repository || config.project.repository || '',
        path: '.',
        ticketsPath: finalTicketsPath,
      }

      // Ensure project.document structure exists
      if (!config.project.document)
        config.project.document = {}

      // Auto-add custom tickets path to excludeFolders if it's not the default
      // This prevents tickets from being included in document discovery
      if (finalTicketsPath && finalTicketsPath !== DEFAULTS.TICKETS_PATH) {
        if (!config.project.document.excludeFolders) {
          config.project.document.excludeFolders = []
        }
        // Add the custom tickets path if not already excluded
        if (!config.project.document.excludeFolders.includes(finalTicketsPath)) {
          config.project.document.excludeFolders.push(finalTicketsPath)
          logQuiet(this.quiet, `Added custom tickets path to excludeFolders: ${finalTicketsPath}`)
        }
      }

      writeFile(configPath, stringify(config))
      logQuiet(this.quiet, `Updated local config for ${projectId} at ${configPath}`)
    }
    catch (error) {
      logQuiet(this.quiet, 'Error creating/updating local config:', error)
      throw error
    }
  }

  /** Helper to load existing config or create new with migration */
  private loadOrMigrateConfig(configPath: string, projectId: string): ProjectConfig {
    if (fileExists(configPath)) {
      const content = readFile(configPath)
      const config = parseToml(content)

      if (validateProjectConfig(config) && isLegacyConfig(config)) {
        logQuiet(this.quiet, `Migrating legacy configuration format for ${projectId}...`)
        return migrateLegacyConfig(config)
      }
      if (validateProjectConfig(config)) {
        return config
      }
    }

    return {
      project: {
        name: '',
        code: '',
        path: '.',
        startNumber: 1,
        counterFile: CONFIG_FILES.COUNTER_FILE,
        active: true,
        description: '',
        repository: '',
        ticketsPath: DEFAULTS.TICKETS_PATH,
        document: {},
      },
    }
  }

  /** Ensure tickets directory exists */
  private ensureTicketsDirectory(projectPath: string, ticketsPath: string): void {
    if (ticketsPath) {
      const fullTicketsPath = buildProjectPath(projectPath, ticketsPath)
      if (!directoryExists(fullTicketsPath)) {
        createDirectory(fullTicketsPath)
        logQuiet(this.quiet, `Created tickets directory: ${fullTicketsPath}`)
      }
    }
  }

  /** Update existing project (local config + registry metadata) */
  updateProject(
    projectId: string,
    updates: ProjectUpdateFields,
  ): void {
    try {
      const writeReference = this.resolveProjectWriteReference(projectId)
      const content = readFile(writeReference.registryPath!)
      const registryData = parseToml(content) as RegistryData

      // Update registry timestamp
      registryData.metadata.lastAccessed = new Date().toISOString().split('T')[0]

      if (writeReference.mode === ProjectConfigurationMode.GLOBAL_ONLY) {
        // Strategy 1: Global-Only - Update project details in global registry
        Object.assign(registryData.project, updates)
        writeFile(writeReference.registryPath!, stringify(registryData))
        logQuiet(this.quiet, `Updated project ${projectId} in global registry (global-only mode)`)
      }
      else {
        // Strategy 2: Project-First - Write registry metadata and update local config
        writeFile(writeReference.registryPath!, stringify(registryData))

        // Update local config
        if (writeReference.localConfigPath && fileExists(writeReference.localConfigPath)) {
          const localConfig = parseToml(readFile(writeReference.localConfigPath)) as ProjectConfig
          Object.assign(localConfig.project, updates)
          writeFile(writeReference.localConfigPath, stringify(localConfig))
          logQuiet(this.quiet, `Updated project ${projectId} in local config`)
        }
        else {
          logQuiet(this.quiet, `Warning: Project ${projectId} local config not found at ${writeReference.localConfigPath}`)
        }
      }
    }
    catch (error) {
      logQuiet(this.quiet, 'Error updating project:', error)
      throw error
    }
  }

  /** Update a project using its local config path when no registry file exists for the id */
  updateProjectByPath(
    projectId: string,
    projectPath: string,
    updates: ProjectUpdateFields,
  ): void {
    try {
      const writeReference = this.resolveProjectWriteReferenceByPath(projectId, projectPath)

      const localConfig = parseToml(readFile(writeReference.localConfigPath!)) as ProjectConfig
      Object.assign(localConfig.project, updates)
      writeFile(writeReference.localConfigPath!, stringify(localConfig))
      logQuiet(this.quiet, `Updated project ${projectId} in local config by path`)
    }
    catch (error) {
      logQuiet(this.quiet, 'Error updating project by path:', error)
      throw error
    }
  }

  resolveProjectWriteReference(projectId: string): ProjectWriteReference {
    const registryPath = buildRegistryFilePath(this.projectsDir, projectId)
    if (!fileExists(registryPath)) {
      throw new Error(`Project ${projectId} not found in registry`)
    }

    const registryData = parseToml(readFile(registryPath)) as RegistryData
    if (!registryData.project?.path) {
      throw new Error(`Project ${projectId} registry entry missing project path`)
    }

    const mode = registryData.metadata?.globalOnly === true || registryData.project.name !== undefined
      ? ProjectConfigurationMode.GLOBAL_ONLY
      : ProjectConfigurationMode.PROJECT_FIRST
    const localConfigPath = mode === ProjectConfigurationMode.PROJECT_FIRST
      ? buildConfigFilePath(registryData.project.path, CONFIG_FILES.PROJECT_CONFIG)
      : undefined

    return {
      projectId,
      projectPath: registryData.project.path,
      mode,
      registryPath,
      localConfigPath,
      writeTargets: localConfigPath ? [registryPath, localConfigPath] : [registryPath],
    }
  }

  resolveProjectWriteReferenceByPath(projectId: string, projectPath: string): ProjectWriteReference {
    const localConfigPath = buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG)
    if (!fileExists(localConfigPath)) {
      throw new Error(`Project ${projectId} local config not found at ${localConfigPath}`)
    }

    return {
      projectId,
      projectPath,
      mode: ProjectConfigurationMode.AUTO_DISCOVERY,
      localConfigPath,
      writeTargets: [localConfigPath],
    }
  }

  /** Configure document paths for a project (by registry lookup) */
  async configureDocuments(projectId: string, documentPaths: string[]): Promise<void> {
    try {
      const projectFile = buildRegistryFilePath(this.projectsDir, projectId)
      if (!fileExists(projectFile)) {
        throw new Error('Project not found in registry')
      }

      const registryData = parseToml(readFile(projectFile)) as RegistryData
      if (!registryData.project?.path) {
        throw new Error('Project registry entry missing project path')
      }

      return this.configureDocumentsByPath(projectId, registryData.project.path, documentPaths)
    }
    catch (error) {
      logQuiet(this.quiet, `Error configuring documents for project ${projectId}: ${error}`)
      throw error
    }
  }

  /** Configure document paths for a project (direct path - supports auto-discovered projects) */
  async configureDocumentsByPath(projectId: string, projectPath: string, documentPaths: string[]): Promise<void> {
    try {
      const configPath = buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG)
      if (fileExists(configPath)) {
        const localConfig = parseToml(readFile(configPath)) as LocalProjectConfigWithNestedDocument

        // Ensure project.document structure exists
        if (!localConfig.project) {
          localConfig.project = {}
        }
        if (!localConfig.project.document) {
          localConfig.project.document = {}
        }

        // Remove old buggy [document] section if exists (MDT-098)
        // The TOML file should only have [project.document], not a top-level [document]
        delete localConfig.document

        // Set paths under project.document to match TOML structure [project.document.paths]
        localConfig.project.document.paths = documentPaths

        writeFile(configPath, stringify(localConfig))
        logQuiet(this.quiet, `Updated document paths for project ${projectId}: [${documentPaths.join(', ')}]`)
      }
      else {
        throw new Error('Project configuration file not found')
      }
    }
    catch (error) {
      logQuiet(this.quiet, `Error configuring documents for project ${projectId}: ${error}`)
      throw error
    }
  }
}
