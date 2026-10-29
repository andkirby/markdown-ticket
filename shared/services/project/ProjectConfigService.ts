import type { ProjectConfigDisplayFile, ProjectConfigWriteFile } from '@mdt/domain-contracts'
import type { ProjectConfig } from '../../models/Project.js'
import type { ProjectDocumentEffectiveConfig, ProjectDocumentPatchInput } from './ProjectDocumentPatch.js'
import type { GlobalConfig, IProjectConfigService, ProjectUpdateFields, ProjectWriteReference } from './types.js'
import { randomBytes } from 'node:crypto'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import process from 'node:process'
import { ProjectConfigDisplayFileSchema, ProjectConfigReadFileSchema, ProjectConfigWriteFileSchema, ProjectDocumentWriteFileSchema, ProjectRegistryWriteFileSchema } from '@mdt/domain-contracts'
import { getTicketsPath, isLegacyConfig, migrateLegacyConfig, validateProjectConfig } from '../../models/Project.js'
import { validateTicketsPath } from '../../tools/ProjectValidator.js'
import { getDefaultConfig as getDefaultConfigUtil, processConfig } from '../../utils/config-validator.js'
import { CONFIG_FILES, DEFAULTS, getDefaultPaths } from '../../utils/constants.js'
import { createDirectory, directoryExists, fileExists, readFile, writeFileAtomic } from '../../utils/file-utils.js'
import { logQuiet } from '../../utils/logger.js'
import {
  buildConfigFilePath,
  buildProjectPath,
  buildRegistryFilePath,
} from '../../utils/path-resolver.js'
import { parseToml, stringify } from '../../utils/toml.js'
import {
  applyProjectDocumentPatch,

  validateProjectDocumentPatch,
} from './ProjectDocumentPatch.js'
import { ProjectConfigurationMode } from './types.js'

/**
 * Project Configuration Service
 * Handles configuration management for projects including global config,
 * local project config, and configuration updates.
 */
export class ProjectConfigService implements IProjectConfigService {
  getDiscoveryProjectConfig(projectPath: string): ProjectConfig | null {
    try {
      const configPath = buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG)

      if (!fileExists(configPath)) {
        return null
      }

      const content = readFile(configPath)
      const config = ProjectConfigReadFileSchema.parse(parseToml(content))

      // Check for legacy configuration and migrate automatically.
      if (isLegacyConfig(config)) {
        logQuiet(this.quiet, `Automatically migrating legacy configuration format for project at ${projectPath}...`)
        return this.migrateDiscoveryLegacyConfig(config, configPath)
      }
      return config
    }
    catch (error) {
      logQuiet(this.quiet, `Error reading project config from ${projectPath}:`, error)
      return null
    }
  }

  /**
   * Enhanced migration method that properly cleans up legacy configurations
   * Moves project.path (tickets) to project.ticketsPath and sets project.path to "."
   */
  private migrateDiscoveryLegacyConfig(config: ProjectConfig, configPath: string): ProjectConfig {
    if (!isLegacyConfig(config)) {
      return config
    }

    // At this point, config.project.path is guaranteed to be a string (not undefined)
    // because isLegacyConfig() checks for its existence and non-undefined value
    const legacyTicketsPath = config.project.path! // Non-null assertion - safe due to isLegacyConfig check

    // Create a clean migrated configuration
    const migratedConfig = {
      ...config,
      project: {
        ...config.project,
        // Set project.path to "." since it represents the project root
        // The legacy path was actually the tickets path, not the project root
        path: '.',
        // Move the legacy path to ticketsPath where it belongs
        ticketsPath: legacyTicketsPath,
      },
    }

    // Write the migrated config back to disk to clean up the legacy format
    // This ensures the migration is persisted and future reads are fast
    const tomlContent = stringify(migratedConfig)
    writeFileAtomic(configPath, tomlContent)
    logQuiet(this.quiet, `Updated legacy config to clean format at ${configPath}`)

    return migratedConfig
  }

  projectFilePath(projectPath: string): string {
    return path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG)
  }

  async readProjectFile(projectPath: string, forWrite = false): Promise<ProjectConfigDisplayFile> {
    try {
      const content = await fs.readFile(this.projectFilePath(projectPath), 'utf8')
      // Display extraction and mutation reloads have separate contracts.
      return forWrite
        ? ProjectConfigWriteFileSchema.parse(parseToml(content))
        : ProjectConfigDisplayFileSchema.parse(parseToml(content))
    }
    catch (error) {
      if (forWrite && !(typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'))
        throw error
      // Missing file -> minimal default shape; caller decides whether to create.
      return { project: { name: '', code: '', id: '' } }
    }
  }

  /** Selector writes keep their strict-reload/minimal-missing-file contract. */
  async mutateProjectFile(projectPath: string, mutator: (current: ProjectConfigDisplayFile) => ProjectConfigDisplayFile) {
    const next = mutator(await this.readProjectFile(projectPath, true))
    await this.writeProjectFile(projectPath, next)
    return { effective: next, filePath: this.projectFilePath(projectPath) }
  }

  private async writeProjectFile(projectPath: string, config: ProjectConfigDisplayFile): Promise<void> {
    const parentDir = path.dirname(this.projectFilePath(projectPath))
    await fs.mkdir(parentDir, { recursive: true })
    const tmpPath = `${this.projectFilePath(projectPath)}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
    try {
      await fs.writeFile(
        tmpPath,
        stringify(config),
        'utf8',
      )
      await fs.rename(tmpPath, this.projectFilePath(projectPath))
    }
    catch (writeError) {
      try {
        await fs.unlink(tmpPath)
      }
      catch {
        // ignore cleanup failure
      }
      throw writeError
    }
  }

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
      const config = ProjectConfigReadFileSchema.parse(parseToml(content))

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
        writeFileAtomic(configPath, stringify(migratedConfig))
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

  /** Preflight create writes without modifying the existing file. */
  assertLocalConfigWritable(projectPath: string): void {
    this.loadOrMigrateConfig(buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG), projectPath)
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

      const finalTicketsPath = ticketsPath || getTicketsPath(config as ProjectConfig, DEFAULTS.TICKETS_PATH)
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

      writeFileAtomic(configPath, stringify(config))
      logQuiet(this.quiet, `Updated local config for ${projectId} at ${configPath}`)
    }
    catch (error) {
      logQuiet(this.quiet, 'Error creating/updating local config:', error)
      throw error
    }
  }

  /** Helper to load existing config or create new with migration */
  private loadOrMigrateConfig(configPath: string, projectId: string): ProjectConfigWriteFile {
    if (fileExists(configPath)) {
      const content = readFile(configPath)
      const config = ProjectConfigWriteFileSchema.parse(parseToml(content))

      if (validateProjectConfig(config) && isLegacyConfig(config)) {
        logQuiet(this.quiet, `Migrating legacy configuration format for ${projectId}...`)
        return migrateLegacyConfig(config)
      }
      return config
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
      const registryData = ProjectRegistryWriteFileSchema.parse(parseToml(content))

      const localConfig = writeReference.mode !== ProjectConfigurationMode.GLOBAL_ONLY
        && writeReference.localConfigPath && fileExists(writeReference.localConfigPath)
        ? ProjectConfigWriteFileSchema.parse(parseToml(readFile(writeReference.localConfigPath)))
        : undefined

      registryData.metadata ??= {}
      // Update registry timestamp
      registryData.metadata.lastAccessed = new Date().toISOString().split('T')[0]

      if (writeReference.mode === ProjectConfigurationMode.GLOBAL_ONLY) {
        // Strategy 1: Global-Only - Update project details in global registry
        Object.assign(registryData.project, updates)
        writeFileAtomic(writeReference.registryPath!, stringify(registryData))
        logQuiet(this.quiet, `Updated project ${projectId} in global registry (global-only mode)`)
      }
      else {
        // Strategy 2: Project-First - Write registry metadata and update local config
        writeFileAtomic(writeReference.registryPath!, stringify(registryData))

        // Update local config
        if (localConfig && writeReference.localConfigPath) {
          Object.assign(localConfig.project, updates)
          writeFileAtomic(writeReference.localConfigPath, stringify(localConfig))
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

      const localConfig = ProjectConfigWriteFileSchema.parse(parseToml(readFile(writeReference.localConfigPath!)))
      Object.assign(localConfig.project, updates)
      writeFileAtomic(writeReference.localConfigPath!, stringify(localConfig))
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

    const registryData = ProjectRegistryWriteFileSchema.parse(parseToml(readFile(registryPath)))
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

      const registryData = ProjectRegistryWriteFileSchema.parse(parseToml(readFile(projectFile)))
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
    // MDT-168: delegate to the typed document patch seam. The legacy positional
    // signature is preserved for backward compatibility (POST /api/documents/configure);
    // it is translated into a paths-only patch validated by the strict schema.
    await this.applyDocumentPatchByPath(projectId, projectPath, { paths: documentPaths })
  }

  /**
   * Apply a typed project-document patch (MDT-168). Validates the COMPLETE
   * candidate change via the strict patch schemas before one atomic write,
   * preserves all sibling fields, and returns effective saved values.
   *
   * Throws a field-labeled error on validation failure (no partial write).
   */
  async applyDocumentPatchByPath(
    projectId: string,
    projectPath: string,
    patchInput: ProjectDocumentPatchInput,
  ): Promise<ProjectDocumentEffectiveConfig> {
    try {
      // 1. Strictly validate the patch input (never converts invalid to default).
      const validation = validateProjectDocumentPatch(patchInput)
      if (!validation.ok) {
        throw new Error(`${validation.field}: ${validation.message}`)
      }

      const configPath = buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG)
      if (!fileExists(configPath)) {
        throw new Error('Project configuration file not found')
      }

      const localConfig = ProjectDocumentWriteFileSchema.parse(parseToml(readFile(configPath)))

      // Ensure project.document structure exists
      if (!localConfig.project) {
        localConfig.project = {}
      }
      if (!localConfig.project.document) {
        localConfig.project.document = {}
      }

      // Remove old buggy [document] section if exists (MDT-098)
      delete localConfig.document

      // 2. Apply validated patch, preserving siblings.
      const effective = applyProjectDocumentPatch(localConfig.project.document, validation.validated)

      // 3. One atomic write (write-temp-then-rename).
      writeFileAtomic(configPath, stringify(localConfig))
      logQuiet(this.quiet, `Applied document patch for project ${projectId}: ${JSON.stringify(effective)}`)

      return effective
    }
    catch (error) {
      logQuiet(this.quiet, `Error applying document patch for project ${projectId}: ${error}`)
      throw error
    }
  }
}
