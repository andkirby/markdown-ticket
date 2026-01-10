import { ProjectConfig, validateProjectConfig, isLegacyConfig, migrateLegacyConfig, getTicketsPath } from '../../models/Project.js';
import { IProjectConfigService, GlobalConfig, RegistryData } from './types.js';
import { CONFIG_FILES, DEFAULT_PATHS, DEFAULTS, getDefaultPaths } from '../../utils/constants.js';
import { logQuiet } from '../../utils/logger.js';
import { parseToml, stringify } from '../../utils/toml.js';
import { processConfig, getDefaultConfig as getDefaultConfigUtil } from '../../utils/config-validator.js';
import { fileExists, directoryExists, readFile, writeFile, createDirectory } from '../../utils/file-utils.js';
import {
  buildConfigFilePath,
  buildRegistryFilePath,
  buildProjectPath
} from '../../utils/path-resolver.js';

/**
 * Project Configuration Service
 * Handles configuration management for projects including global config,
 * local project config, and configuration updates.
 */
export class ProjectConfigService implements IProjectConfigService {
  private quiet: boolean;

  constructor(quiet: boolean = false) {
    this.quiet = quiet;
  }

  /** Get global configuration path dynamically (respects process.env.CONFIG_DIR) */
  private get globalConfigPath(): string {
    return getDefaultPaths().CONFIG_FILE;
  }

  /** Get projects directory dynamically (respects process.env.CONFIG_DIR) */
  private get projectsDir(): string {
    return getDefaultPaths().PROJECTS_REGISTRY;
  }

  /** Get global configuration */
  getGlobalConfig(): GlobalConfig {
    try {
      if (!fileExists(this.globalConfigPath)) {
        return getDefaultConfigUtil();
      }
      const configContent = readFile(this.globalConfigPath);
      const parsedConfig = parseToml(configContent);
      return processConfig(parsedConfig, this.quiet);
    } catch (error) {
      logQuiet(this.quiet, 'Error reading global config:', error);
      return getDefaultConfigUtil();
    }
  }

  /** Get project configuration from local .mdt-config.toml with auto-migration */
  getProjectConfig(projectPath: string): ProjectConfig | null {
    try {
      const configPath = buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG);
      if (!fileExists(configPath)) return null;

      const content = readFile(configPath);
      const config = parseToml(content);

      if (!validateProjectConfig(config)) return null;

      // Auto-migrate legacy configurations
      if (isLegacyConfig(config)) {
        logQuiet(this.quiet, `Automatically migrating legacy configuration format for project at ${projectPath}...`);
        const migratedConfig = migrateLegacyConfig(config);
        writeFile(configPath, stringify(migratedConfig));
        logQuiet(this.quiet, `Updated legacy config to clean format at ${configPath}`);
        return migratedConfig;
      }

      return config;
    } catch (error) {
      logQuiet(this.quiet, `Error reading project config from ${projectPath}:`, error);
      return null;
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
    ticketsPath?: string
  ): void {
    try {
      if (globalOnly) {
        logQuiet(this.quiet, `Global-only mode: skipping local config creation for ${projectId}`);
        return;
      }

      const configPath = buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG);
      let config = this.loadOrMigrateConfig(configPath, projectId);

      const finalTicketsPath = ticketsPath || getTicketsPath(config, DEFAULTS.TICKETS_PATH);
      this.ensureTicketsDirectory(projectPath, finalTicketsPath);

      config.project = {
        ...config.project,
        id: projectId,
        name,
        code,
        startNumber: config.project.startNumber || 1,
        counterFile: config.project.counterFile || CONFIG_FILES.COUNTER_FILE,
        description: description || config.project.description || '',
        repository: repository || config.project.repository || '',
        path: ".",
        ticketsPath: finalTicketsPath
      };

      // Preserve existing document and exclude configurations
      if (!config.document) config.document = {};
      if (config.document_paths) config.document.paths = config.document_paths;
      if (config.exclude_folders) config.document.excludeFolders = config.exclude_folders;

      // Auto-add custom tickets path to excludeFolders if it's not the default
      // This prevents tickets from being included in document discovery
      if (finalTicketsPath && finalTicketsPath !== DEFAULTS.TICKETS_PATH) {
        if (!config.document.excludeFolders) {
          config.document.excludeFolders = [];
        }
        // Add the custom tickets path if not already excluded
        if (!config.document.excludeFolders.includes(finalTicketsPath)) {
          config.document.excludeFolders.push(finalTicketsPath);
          logQuiet(this.quiet, `Added custom tickets path to excludeFolders: ${finalTicketsPath}`);
        }
      }

      writeFile(configPath, stringify(config));
      logQuiet(this.quiet, `Updated local config for ${projectId} at ${configPath}`);
    } catch (error) {
      logQuiet(this.quiet, 'Error creating/updating local config:', error);
      throw error;
    }
  }

  /** Helper to load existing config or create new with migration */
  private loadOrMigrateConfig(configPath: string, projectId: string): any {
    if (fileExists(configPath)) {
      const content = readFile(configPath);
      const config = parseToml(content);

      if (validateProjectConfig(config) && isLegacyConfig(config)) {
        logQuiet(this.quiet, `Migrating legacy configuration format for ${projectId}...`);
        return migrateLegacyConfig(config);
      }
      return config;
    }

    return { project: { ticketsPath: DEFAULTS.TICKETS_PATH } };
  }

  /** Ensure tickets directory exists */
  private ensureTicketsDirectory(projectPath: string, ticketsPath: string): void {
    if (ticketsPath) {
      const fullTicketsPath = buildProjectPath(projectPath, ticketsPath);
      if (!directoryExists(fullTicketsPath)) {
        createDirectory(fullTicketsPath);
        logQuiet(this.quiet, `Created tickets directory: ${fullTicketsPath}`);
      }
    }
  }

  
  /** Update existing project (local config + registry metadata) */
  updateProject(
    projectId: string,
    updates: Partial<Pick<ProjectConfig['project'], 'name' | 'description' | 'repository' | 'active' | 'ticketsPath'>>
  ): void {
    try {
      const projectFile = buildRegistryFilePath(this.projectsDir, projectId);
      if (!fileExists(projectFile)) {
        throw new Error(`Project ${projectId} not found in registry`);
      }

      const content = readFile(projectFile);
      const registryData: RegistryData = parseToml(content);

      if (!registryData.project?.path) {
        throw new Error(`Project ${projectId} registry entry missing project path`);
      }

      // Update registry timestamp
      registryData.metadata.lastAccessed = new Date().toISOString().split('T')[0];

      // Check if this is a global-only project
      const isGlobalOnly = registryData.metadata?.globalOnly === true ||
                            registryData.project.name !== undefined;

      if (isGlobalOnly) {
        // Strategy 1: Global-Only - Update project details in global registry
        Object.assign(registryData.project, updates);
        writeFile(projectFile, stringify(registryData));
        logQuiet(this.quiet, `Updated project ${projectId} in global registry (global-only mode)`);
      } else {
        // Strategy 2: Project-First - Write registry metadata and update local config
        writeFile(projectFile, stringify(registryData));

        // Update local config
        const configPath = buildConfigFilePath(registryData.project.path, CONFIG_FILES.PROJECT_CONFIG);
        if (fileExists(configPath)) {
          const localConfig = parseToml(readFile(configPath));
          Object.assign(localConfig.project, updates);
          writeFile(configPath, stringify(localConfig));
          logQuiet(this.quiet, `Updated project ${projectId} in local config`);
        } else {
          logQuiet(this.quiet, `Warning: Project ${projectId} local config not found at ${configPath}`);
        }
      }
    } catch (error) {
      logQuiet(this.quiet, 'Error updating project:', error);
      throw error;
    }
  }

  /** Configure document paths for a project (by registry lookup) */
  async configureDocuments(projectId: string, documentPaths: string[]): Promise<void> {
    try {
      const projectFile = buildRegistryFilePath(this.projectsDir, projectId);
      if (!fileExists(projectFile)) {
        throw new Error('Project not found in registry');
      }

      const registryData = parseToml(readFile(projectFile));
      if (!registryData.project?.path) {
        throw new Error('Project registry entry missing project path');
      }

      return this.configureDocumentsByPath(projectId, registryData.project.path, documentPaths);
    } catch (error) {
      logQuiet(this.quiet, `Error configuring documents for project ${projectId}: ${error}`);
      throw error;
    }
  }

  /** Configure document paths for a project (direct path - supports auto-discovered projects) */
  async configureDocumentsByPath(projectId: string, projectPath: string, documentPaths: string[]): Promise<void> {
    try {
      const configPath = buildConfigFilePath(projectPath, CONFIG_FILES.PROJECT_CONFIG);
      if (fileExists(configPath)) {
        const localConfig = parseToml(readFile(configPath));
        if (!localConfig.project) localConfig.project = {};
        if (!localConfig.document) localConfig.document = {};
        localConfig.document.paths = documentPaths;
        writeFile(configPath, stringify(localConfig));
        logQuiet(this.quiet, `Updated document paths for project ${projectId}: [${documentPaths.join(', ')}]`);
      } else {
        throw new Error('Project configuration file not found');
      }
    } catch (error) {
      logQuiet(this.quiet, `Error configuring documents for project ${projectId}: ${error}`);
      throw error;
    }
  }
}