import fs from 'fs';
import path from 'path';
import toml from 'toml';
import os from 'os';
import { Project, ProjectConfig, validateProjectConfig, getTicketsPath, isLegacyConfig, migrateLegacyConfig } from '../models/Project.js';
import { Ticket } from '../models/Ticket.js';
import { CONFIG_FILES, DEFAULT_PATHS, DEFAULTS } from '../utils/constants.js';

/**
 * Global configuration interface
 */
export interface GlobalConfig {
  // Discovery configuration (existing, enhanced)
  discovery: {
    autoDiscover: boolean;
    searchPaths: string[];
    maxDepth?: number; // Add optional depth control
  };

  // Links configuration with boolean flags
  links: {
    enableAutoLinking: boolean;
    enableTicketLinks: boolean;
    enableDocumentLinks: boolean;
    enableHoverPreviews?: boolean; // Optional future feature
    linkValidation?: boolean;      // Optional future feature
  };

  // UI/UX preferences (moved from dashboard)
  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    autoRefresh?: boolean;
    refreshInterval?: number;
  };

  // System configuration
  system?: {
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
    cacheTimeout?: number;
  };
}

/**
 * Project cache interface
 */
interface ProjectCache {
  projects: Project[] | null;
  timestamp: number;
  ttl: number;
}

/**
 * Unified Project Discovery Service
 * Handles project scanning, configuration, and management
 * Shared across backend and MCP server
 */
export class ProjectService {
  private globalConfigDir: string;
  private projectsDir: string;
  private globalConfigPath: string;
  private cache: ProjectCache;
  private quiet: boolean;

  constructor(quiet: boolean = false) {
    this.quiet = quiet;
    this.globalConfigPath = DEFAULT_PATHS.CONFIG_FILE;
    this.globalConfigDir = DEFAULT_PATHS.CONFIG_DIR;
    this.projectsDir = DEFAULT_PATHS.PROJECTS_REGISTRY;

    // Initialize cache with 30-second TTL
    this.cache = {
      projects: null,
      timestamp: 0,
      ttl: 30000 // 30 seconds
    };
  }

  /**
   * Log to stderr unless quiet mode is enabled
   */
  private log(message: string, ...args: any[]): void {
    if (!this.quiet) {
      console.error(message, ...args);
    }
  }

  /**
   * Get global configuration
   */
  getGlobalConfig(): GlobalConfig {
    try {
      if (!fs.existsSync(this.globalConfigPath)) {
        return this.getDefaultConfig();
      }

      const configContent = fs.readFileSync(this.globalConfigPath, 'utf8');
      const parsedConfig = toml.parse(configContent);

      // Check for old config structure and migrate if needed
      if (parsedConfig.dashboard) {
        this.log('Migrating old configuration structure...');
        return this.migrateConfig(parsedConfig);
      }

      return this.validateConfig(parsedConfig);
    } catch (error) {
      this.log('Error reading global config:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): GlobalConfig {
    return {
      discovery: {
        autoDiscover: true,
        searchPaths: [],
        maxDepth: 3
      },
      links: {
        enableAutoLinking: true,
        enableTicketLinks: true,
        enableDocumentLinks: true,
        enableHoverPreviews: false,
        linkValidation: false
      },
      ui: {
        theme: 'auto',
        autoRefresh: true,
        refreshInterval: 5000
      },
      system: {
        logLevel: 'info',
        cacheTimeout: 30000
      }
    };
  }

  /**
   * Migrate old configuration to new structure
   */
  private migrateConfig(oldConfig: any): GlobalConfig {
    const defaultConfig = this.getDefaultConfig();

    return {
      discovery: {
        autoDiscover: oldConfig.discovery?.autoDiscover ?? defaultConfig.discovery.autoDiscover,
        searchPaths: oldConfig.discovery?.searchPaths ?? defaultConfig.discovery.searchPaths,
        maxDepth: defaultConfig.discovery.maxDepth
      },
      links: {
        enableAutoLinking: oldConfig.dashboard?.autoRefresh ?? defaultConfig.links.enableAutoLinking,
        enableTicketLinks: defaultConfig.links.enableTicketLinks,
        enableDocumentLinks: defaultConfig.links.enableDocumentLinks,
        enableHoverPreviews: defaultConfig.links.enableHoverPreviews,
        linkValidation: defaultConfig.links.linkValidation
      },
      ui: {
        theme: defaultConfig.ui?.theme,
        autoRefresh: oldConfig.dashboard?.autoRefresh ?? defaultConfig.ui?.autoRefresh,
        refreshInterval: oldConfig.dashboard?.refreshInterval ?? defaultConfig.ui?.refreshInterval
      },
      system: defaultConfig.system
    };
  }

  /**
   * Validate configuration against GlobalConfig interface
   */
  private validateConfig(config: any): GlobalConfig {
    const defaultConfig = this.getDefaultConfig();

    return {
      discovery: {
        autoDiscover: typeof config.discovery?.autoDiscover === 'boolean'
          ? config.discovery.autoDiscover
          : defaultConfig.discovery.autoDiscover,
        searchPaths: Array.isArray(config.discovery?.searchPaths)
          ? config.discovery.searchPaths
          : defaultConfig.discovery.searchPaths,
        maxDepth: typeof config.discovery?.maxDepth === 'number'
          ? config.discovery.maxDepth
          : defaultConfig.discovery.maxDepth
      },
      links: {
        enableAutoLinking: typeof config.links?.enableAutoLinking === 'boolean'
          ? config.links.enableAutoLinking
          : defaultConfig.links.enableAutoLinking,
        enableTicketLinks: typeof config.links?.enableTicketLinks === 'boolean'
          ? config.links.enableTicketLinks
          : defaultConfig.links.enableTicketLinks,
        enableDocumentLinks: typeof config.links?.enableDocumentLinks === 'boolean'
          ? config.links.enableDocumentLinks
          : defaultConfig.links.enableDocumentLinks,
        enableHoverPreviews: typeof config.links?.enableHoverPreviews === 'boolean'
          ? config.links.enableHoverPreviews
          : defaultConfig.links.enableHoverPreviews,
        linkValidation: typeof config.links?.linkValidation === 'boolean'
          ? config.links.linkValidation
          : defaultConfig.links.linkValidation
      },
      ui: {
        theme: ['light', 'dark', 'auto'].includes(config.ui?.theme)
          ? config.ui?.theme
          : defaultConfig.ui?.theme,
        autoRefresh: typeof config.ui?.autoRefresh === 'boolean'
          ? config.ui?.autoRefresh
          : defaultConfig.ui?.autoRefresh,
        refreshInterval: typeof config.ui?.refreshInterval === 'number'
          ? config.ui?.refreshInterval
          : defaultConfig.ui?.refreshInterval
      },
      system: {
        logLevel: ['error', 'warn', 'info', 'debug'].includes(config.system?.logLevel)
          ? config.system?.logLevel
          : defaultConfig.system?.logLevel,
        cacheTimeout: typeof config.system?.cacheTimeout === 'number'
          ? config.system?.cacheTimeout
          : defaultConfig.system?.cacheTimeout
      }
    };
  }

  /**
   * Get all registered projects (Project-First Strategy)
   * Reads minimal references from global registry and merges with local project configs
   * Global provides: path location + metadata
   * Local provides: complete project definition (name, code, settings)
   */
  getRegisteredProjects(): Project[] {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        return [];
      }

      const projects: Project[] = [];
      const projectFiles = fs.readdirSync(this.projectsDir)
        .filter(file => file.endsWith('.toml'));

      for (const file of projectFiles) {
        try {
          const registryPath = path.join(this.projectsDir, file);
          const content = fs.readFileSync(registryPath, 'utf8');
          const registryData = toml.parse(content);

          // Global registry provides only project path and metadata
          const projectPath = registryData.project?.path;
          if (!projectPath) {
            this.log(`Skipping registry file ${file}: missing project path`);
            continue;
          }

          // Read complete project definition from local config
          const localConfig = this.getProjectConfig(projectPath);

          // Validate local config exists and is valid
          if (!localConfig) {
            this.log(`Warning: Project ${path.basename(projectPath)} has global registry but no valid local config at ${projectPath}`);
            // Still include project but with minimal data for recovery scenarios
          }

          // Project-First Strategy: Local config is primary source, global provides metadata only
          const projectId = path.basename(projectPath);
          const project: Project = {
            id: projectId,
            project: {
              name: localConfig?.project?.name || projectId, // Local priority, fallback to directory name
              code: localConfig?.project?.code || projectId.toUpperCase(), // Local priority, fallback to ID
              path: projectPath, // From global registry
              configFile: path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG),
              startNumber: localConfig?.project?.startNumber || 1, // Local priority
              counterFile: localConfig?.project?.counterFile || CONFIG_FILES.COUNTER_FILE, // Local priority
              active: localConfig?.project?.active !== false, // Local priority, default true
              description: localConfig?.project?.description || '', // Local priority
              repository: localConfig?.project?.repository || '' // Local priority
            },
            metadata: {
              dateRegistered: registryData.metadata?.dateRegistered || new Date().toISOString().split('T')[0],
              lastAccessed: registryData.metadata?.lastAccessed || new Date().toISOString().split('T')[0],
              version: registryData.metadata?.version || '1.0.0'
            },
            registryFile: registryPath // Store exact registry file path for CLI operations
          };

          projects.push(project);
        } catch (error) {
          this.log(`Error parsing project file ${file}:`, error);
        }
      }

      return projects;
    } catch (error) {
      this.log('Error reading registered projects:', error);
      return [];
    }
  }

  /**
   * Get project configuration from local .mdt-config.toml
   * Automatically migrates legacy configurations on read
   */
  getProjectConfig(projectPath: string): ProjectConfig | null {
    try {
      const configPath = path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG);

      if (!fs.existsSync(configPath)) {
        return null;
      }

      const content = fs.readFileSync(configPath, 'utf8');
      const config = toml.parse(content);

      if (validateProjectConfig(config)) {
        // Check for legacy configuration and migrate automatically
        if (isLegacyConfig(config)) {
          this.log(`Automatically migrating legacy configuration format for project at ${projectPath}...`);
          const migratedConfig = this.migrateLegacyConfigWithCleanup(config);

          // Write the migrated config back to disk to clean up the legacy format
          // This ensures the migration is persisted and future reads are fast
          const tomlContent = this.objectToToml(migratedConfig);
          fs.writeFileSync(configPath, tomlContent, 'utf8');
          this.log(`Updated legacy config to clean format at ${configPath}`);

          return migratedConfig;
        }
        return config;
      }

      return null;
    } catch (error) {
      this.log(`Error reading project config from ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Auto-discover projects by scanning for .mdt-config.toml files
   */
  autoDiscoverProjects(searchPaths: string[] = []): Project[] {
    const discovered: Project[] = [];

    const pathsToSearch = [...new Set(searchPaths)];
    this.log('🔍 Auto-discovery scanning paths:', pathsToSearch);

    for (const searchPath of pathsToSearch) {
      try {
        this.log(`🔍 Checking path: ${searchPath}, exists: ${fs.existsSync(searchPath)}`);
        if (fs.existsSync(searchPath)) {
          this.log(`🔍 Scanning ${searchPath} for projects...`);
          this.scanDirectoryForProjects(searchPath, discovered, 3); // Max depth 3
        }
      } catch (error) {
        this.log(`Error scanning ${searchPath}:`, error);
      }
    }
    this.log(`🔍 Auto-discovery complete. Found ${discovered.length} projects:`);

    return discovered;
  }

  /**
   * Recursively scan directory for project configurations
   */
  private scanDirectoryForProjects(dirPath: string, discovered: Project[], maxDepth: number): void {
    if (maxDepth <= 0) return;

    try {
      const configPath = path.join(dirPath, CONFIG_FILES.PROJECT_CONFIG);
      
      if (fs.existsSync(configPath)) {
        const config = this.getProjectConfig(dirPath);
        if (config) {
          const directoryName = path.basename(dirPath);

          // Determine project ID: use config.id if available, otherwise use directory name
          const projectId = config.project.id || directoryName;

          // Track projects by code to handle duplicates without proper IDs
          if (!config.project.id && config.project.code) {
            // Check if we already found a project with this code but no ID
            const existingProject = discovered.find(p =>
              p.project.code === config.project.code &&
              !p.project.id
            );
            if (existingProject) {
              this.log(`Ignoring duplicate project ${directoryName} with code "${config.project.code}" (no ID in config)`);
              return; // Skip duplicate
            }
          }

          const project: Project = {
            id: projectId,
            project: {
              name: config.project.name,
              code: config.project.code,
              path: dirPath,
              configFile: configPath,
              active: true,
              description: config.project.description || ''
            },
            metadata: {
              dateRegistered: new Date().toISOString().split('T')[0],
              lastAccessed: new Date().toISOString().split('T')[0],
              version: '1.0.0'
            },
            autoDiscovered: true
          };
          
          discovered.push(project);
        }
      }

      // Continue scanning subdirectories
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          this.scanDirectoryForProjects(path.join(dirPath, entry.name), discovered, maxDepth - 1);
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }

  /**
   * Register a project in the global registry (Project-First Strategy)
   * Stores minimal reference: path for discovery, metadata for tracking
   * Complete project definition remains in local config
   */
  registerProject(project: Project): void {
    try {
      // Ensure projects directory exists
      if (!fs.existsSync(this.projectsDir)) {
        fs.mkdirSync(this.projectsDir, { recursive: true });
      }

      const projectFile = path.join(this.projectsDir, `${project.id}.toml`);

      // Project-First Strategy: Store minimal reference in global registry
      // Complete definition stays in local config for portability and team collaboration
      const projectData = {
        project: {
          path: project.project.path  // Only store path for discovery
        },
        metadata: {
          dateRegistered: project.metadata.dateRegistered,
          lastAccessed: new Date().toISOString().split('T')[0],
          version: project.metadata.version
        }
      };

      
      const tomlContent = this.objectToToml(projectData);
      fs.writeFileSync(projectFile, tomlContent, 'utf8');

      this.log(`Registered project ${project.id} in global registry (minimal reference)`);
    } catch (error) {
      this.log('Error registering project:', error);
      throw error;
    }
  }

  /**
   * Enhanced migration method that properly cleans up legacy configurations
   * Moves project.path (tickets) to project.ticketsPath and sets project.path to "."
   */
  private migrateLegacyConfigWithCleanup(config: ProjectConfig): ProjectConfig {
    if (!isLegacyConfig(config)) {
      return config;
    }

    // At this point, config.project.path is guaranteed to be a string (not undefined)
    // because isLegacyConfig() checks for its existence and non-undefined value
    const legacyTicketsPath = config.project.path!; // Non-null assertion - safe due to isLegacyConfig check

    // Create a clean migrated configuration
    const migratedConfig: ProjectConfig = {
      ...config,
      project: {
        ...config.project,
        // Set project.path to "." since it represents the project root
        // The legacy path was actually the tickets path, not the project root
        path: ".",
        // Move the legacy path to ticketsPath where it belongs
        ticketsPath: legacyTicketsPath
      }
    };

    return migratedConfig;
  }

  /**
   * Create or update local .mdt-config.toml file with complete configuration
   * Uses same template as Web UI to ensure consistency
   */
  createOrUpdateLocalConfig(projectId: string, projectPath: string, name: string, code: string, description?: string, repository?: string, globalOnly: boolean = false, ticketsPath?: string): void {
    try {
      if (globalOnly) {
        // Global-only mode: don't create local config file
        this.log(`Global-only mode: skipping local config creation for ${projectId}`);
        return;
      }

      const configPath = path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG);

      let config: any;
      if (fs.existsSync(configPath)) {
        // Read existing config
        const content = fs.readFileSync(configPath, 'utf8');
        config = toml.parse(content);

        // Check if we need to migrate legacy configuration
        if (validateProjectConfig(config) && isLegacyConfig(config)) {
          this.log(`Migrating legacy configuration format for ${projectId}...`);
          config = this.migrateLegacyConfigWithCleanup(config);
        }
      } else {
        // Create new config structure with all required fields
        config = {
          project: {
            ticketsPath: ticketsPath || DEFAULTS.TICKETS_PATH
          }
        };
      }

      // Determine tickets path (use provided or fallback to existing/default)
      const finalTicketsPath = ticketsPath || getTicketsPath(config, DEFAULTS.TICKETS_PATH);

      // Auto-create tickets directory if it doesn't exist
      if (finalTicketsPath) {
        const fullTicketsPath = path.join(projectPath, finalTicketsPath);
        if (!fs.existsSync(fullTicketsPath)) {
          fs.mkdirSync(fullTicketsPath, { recursive: true });
          this.log(`Created tickets directory: ${fullTicketsPath}`);
        }
      }

      // Update project section with complete configuration matching Web UI template
      // Ensure clean format: never write legacy project.path values for tickets paths
      config.project = {
        ...config.project,
        id: projectId,
        name: name,
        code: code,
        startNumber: config.project.startNumber || 1,
        counterFile: config.project.counterFile || CONFIG_FILES.COUNTER_FILE,
        description: description || config.project.description || '',
        repository: repository || config.project.repository || '',
        // Always set path to "." for clean format - config file location determines project root
        path: ".",
        // Always use ticketsPath for tickets location (clean format)
        ticketsPath: finalTicketsPath
      };

      // Remove any legacy path values that might accidentally be tickets paths
      // This ensures we never write legacy format again
      if (config.project.path && config.project.path !== "." && !fs.existsSync(path.join(projectPath, config.project.path, '.mdt-config.toml'))) {
        // If project.path exists and it's not "." and it doesn't contain a .mdt-config.toml file,
        // it's likely a legacy tickets path that should be removed
        delete config.project.path;
      }

      // Preserve other sections
      if (config.document_paths) {
        config.document_paths = config.document_paths;
      }
      if (config.exclude_folders) {
        config.exclude_folders = config.exclude_folders;
      }

      // Write updated config
      const tomlContent = this.objectToToml(config);
      fs.writeFileSync(configPath, tomlContent, 'utf8');

      this.log(`Updated local config for ${projectId} at ${configPath}`);
    } catch (error) {
      this.log('Error creating/updating local config:', error);
      throw error;
    }
  }

  /**
   * Get all projects (registered + auto-discovered)
   * Uses cache with 30-second TTL for performance
   */
  async getAllProjects(): Promise<Project[]> {
    const now = Date.now();

    // Return cached results if still valid
    if (this.cache.projects && (now - this.cache.timestamp) < this.cache.ttl) {
      return this.cache.projects;
    }

    // Get registered projects
    const registered = this.getRegisteredProjects();

    // Check if auto-discovery is enabled
    const globalConfig = this.getGlobalConfig();
    this.log('🔧 Global config:', JSON.stringify(globalConfig, null, 2));

    if (globalConfig.discovery?.autoDiscover) {
      const searchPaths = globalConfig.discovery?.searchPaths || [];
      this.log('🔧 Auto-discovery enabled with searchPaths:', searchPaths);
      const discovered = this.autoDiscoverProjects(searchPaths);
      this.log('🔧 > Discovered projects:', discovered.length);

      // Create sets for both path and id to avoid duplicates
      const registeredPaths = new Set(registered.map(p => p.project.path));
      const registeredIds = new Set(registered.map(p => p.id));

      const uniqueDiscovered = discovered.filter((p: Project) =>
        !registeredPaths.has(p.project.path) && !registeredIds.has(p.id)
      );

      // Combine and deduplicate by id (in case of any remaining duplicates)
      const allProjects = [...registered, ...uniqueDiscovered];
      const seenIds = new Set<string>();

      const result = allProjects.filter(project => {
        if (seenIds.has(project.id)) {
          return false;
        }
        seenIds.add(project.id);
        return true;
      });

      // Cache the result
      this.cache.projects = result;
      this.cache.timestamp = now;

      return result;
    } else {
      this.log('‼️ Projects auto discover disabled..');
    }

    // Cache registered projects too
    this.cache.projects = registered;
    this.cache.timestamp = now;
    return registered;
  }

  /**
   * Clear the project cache
   * Forces next getAllProjects() call to refresh
   */
  clearCache(): void {
    this.cache.projects = null;
    this.cache.timestamp = 0;
  }

  /**
   * Get CRs for a specific project using shared MarkdownService
   */
  async getProjectCRs(projectPath: string): Promise<Ticket[]> {
    try {
      const config = this.getProjectConfig(projectPath);
      if (!config || !config.project) {
        return [];
      }

      // Use new helper function with backward compatibility
      const crPath = getTicketsPath(config, DEFAULTS.TICKETS_PATH);
      const fullCRPath = path.resolve(projectPath, crPath);

      if (!fs.existsSync(fullCRPath)) {
        return [];
      }

      // Use shared MarkdownService for consistent parsing
      // Dynamic import to avoid circular dependencies
      const sharedModule = await import('./MarkdownService.js');
      const { MarkdownService } = sharedModule;
      return await MarkdownService.scanMarkdownFiles(fullCRPath, projectPath);
    } catch (error) {
      this.log(`Error getting CRs for project ${projectPath}:`, error);
      return [];
    }
  }

  /**
   * TOML serializer matching server formatting
   */
  private objectToToml(obj: any): string {
    let toml = '';

    for (const [section, data] of Object.entries(obj)) {
      // Skip sections with no data
      if (!data || typeof data !== 'object') {
        continue;
      }

      toml += `[${section}]\n`;
      for (const [key, value] of Object.entries(data as any)) {
        // Skip undefined/null values
        if (value === undefined || value === null) {
          continue;
        }

        if (typeof value === 'string') {
          toml += `${key} = "${value}"\n`;
        } else if (typeof value === 'boolean') {
          toml += `${key} = ${value}\n`;
        } else if (typeof value === 'number') {
          toml += `${key} = ${value}\n`;
        } else if (Array.isArray(value)) {
          // Handle arrays properly
          if (value.length > 0) {
            toml += `${key} = [${value.map(item => `"${item}"`).join(', ')}]\n`;
          }
        } else {
          // Fallback for other types
          toml += `${key} = "${value}"\n`;
        }
      }
      toml += '\n';
    }

    return toml.trim() + '\n'; // Ensure single trailing newline
  }

  /**
   * Update existing project (Project-First Strategy)
   * Updates local config only (primary source) and updates metadata in global registry
   */
  updateProject(projectId: string, updates: Partial<Pick<ProjectConfig['project'], 'name' | 'description' | 'repository' | 'active' | 'ticketsPath'>>): void {
    try {
      const projectFile = path.join(this.projectsDir, `${projectId}.toml`);

      if (!fs.existsSync(projectFile)) {
        throw new Error(`Project ${projectId} not found in registry`);
      }

      // Read existing registry file to get project path
      const content = fs.readFileSync(projectFile, 'utf8');
      const registryData = toml.parse(content);

      if (!registryData.project?.path) {
        throw new Error(`Project ${projectId} registry entry missing project path`);
      }

      // Update only metadata in global registry (lastAccessed timestamp)
      registryData.metadata.lastAccessed = new Date().toISOString().split('T')[0];

      // Write updated registry file
      const tomlContent = this.objectToToml(registryData);
      fs.writeFileSync(projectFile, tomlContent, 'utf8');

      // Update local .mdt-config.toml (primary source for project data)
      const configPath = path.join(registryData.project.path, CONFIG_FILES.PROJECT_CONFIG);

      if (fs.existsSync(configPath)) {
        const localContent = fs.readFileSync(configPath, 'utf8');
        const localConfig = toml.parse(localContent);

        // Update local config with all changes (Project-First Strategy)
        if (updates.name !== undefined) {
          localConfig.project.name = updates.name;
        }
        if (updates.description !== undefined) {
          localConfig.project.description = updates.description;
        }
        if (updates.repository !== undefined) {
          localConfig.project.repository = updates.repository;
        }
        if (updates.ticketsPath !== undefined) {
          localConfig.project.ticketsPath = updates.ticketsPath;
        }
        if (updates.active !== undefined) {
          localConfig.project.active = updates.active;
        }

        // Write updated local config
        const localTomlContent = this.objectToToml(localConfig);
        fs.writeFileSync(configPath, localTomlContent, 'utf8');

        this.log(`Updated project ${projectId} in local config`);
      } else {
        // Local config doesn't exist - this is a recovery situation
        this.log(`Warning: Project ${projectId} local config not found at ${configPath}`);
      }

      // Clear cache to force refresh
      this.clearCache();
    } catch (error) {
      this.log('Error updating project:', error);
      throw error;
    }
  }

  /**
   * Find registry file for project by ID or code (filename-agnostic)
   */
  private async findRegistryFile(projectIdOrCode: string): Promise<{ filePath: string; projectData: any } | null> {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        return null;
      }

      const files = fs.readdirSync(this.projectsDir).filter(file => file.endsWith('.toml'));

      for (const file of files) {
        const filePath = path.join(this.projectsDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const projectData = toml.parse(content);

          // Check if this file matches the project by ID or code
          const projectPath = projectData.project?.path;
          const derivedId = projectPath ? path.basename(projectPath) : path.basename(file, '.toml');
          const projectCode = projectData.project?.code;

          if (derivedId === projectIdOrCode || projectCode === projectIdOrCode) {
            return { filePath, projectData };
          }
        } catch (parseError) {
          // Skip invalid files
          continue;
        }
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to find registry file for project ${projectIdOrCode}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Configure document paths for a project
   */
  async configureDocuments(projectId: string, documentPaths: string[]): Promise<void> {
    try {
      // Get project information
      const allProjects = await this.getAllProjects();
      const project = allProjects.find(p => p.id === projectId || p.project.code === projectId);

      if (!project) {
        throw new Error('Project not found');
      }

      // Update local .mdt-config.toml (primary source for project configuration)
      const configPath = path.join(project.project.path, CONFIG_FILES.PROJECT_CONFIG);

      if (fs.existsSync(configPath)) {
        const localContent = fs.readFileSync(configPath, 'utf8');
        const localConfig = toml.parse(localContent);

        // Update document paths
        if (!localConfig.project) {
          localConfig.project = {};
        }
        localConfig.project.document_paths = documentPaths;

        // Write updated local config
        const updatedContent = this.objectToToml(localConfig);
        fs.writeFileSync(configPath, updatedContent, 'utf8');

        this.log(`Updated document paths for project ${projectId}: [${documentPaths.join(', ')}]`);
      } else {
        throw new Error('Project configuration file not found');
      }
    } catch (error) {
      this.log(`Error configuring documents for project ${projectId}: ${error}`);
      throw error;
    }
  }

  /**
   * Remove project from registry
   */
  async deleteProject(projectId: string, deleteLocalConfig: boolean = true): Promise<void> {
    try {
      let projectPath: string | undefined;
      let registryFile: string | undefined;

      // Get project from in-memory data to find the exact registry file path
      const allProjects = await this.getAllProjects();
      const project = allProjects.find(p => p.id === projectId || p.project.code === projectId);

      if (project) {
        projectPath = project.project.path;
        registryFile = project.registryFile; // Use exact registry file path from discovery

        if (registryFile && fs.existsSync(registryFile)) {
          // Delete the exact registry file
          fs.unlinkSync(registryFile);
          this.log(`Deleted registry file for project ${projectId}: ${path.basename(registryFile)}`);
        } else {
          this.log(`Registry file not found for project ${projectId}: ${registryFile || 'no path stored'}`);
        }
      } else {
        // Auto-discovered project not in registry
        this.log(`Project ${projectId} not found in registry`);
        // For auto-discovered projects, we don't have registry files to delete
      }

      // Always delete local project files (.mdt-config.toml and .mdt-next)
      if (projectPath) {
        // Delete .mdt-config.toml
        const configPath = path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG);
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
          this.log(`Deleted config file at ${configPath}`);
        }

        // Delete .mdt-next (counter file)
        const counterFile = path.join(projectPath, CONFIG_FILES.COUNTER_FILE);
        if (fs.existsSync(counterFile)) {
          fs.unlinkSync(counterFile);
          this.log(`Deleted counter file at ${counterFile}`);
        }
      }

      // Clear cache
      this.clearCache();
    } catch (error) {
      this.log('Error deleting project:', error);
      throw error;
    }
  }

  /**
   * Find project by code or ID
   */
  async getProjectByCodeOrId(codeOrId: string): Promise<Project | null> {
    const allProjects = await this.getAllProjects();

    // Try exact ID match first
    let project = allProjects.find(p => p.id === codeOrId);
    if (project) {
      return project;
    }

    // Try code match
    project = allProjects.find(p => p.project.code === codeOrId);
    return project || null;
  }

  /**
   * Generate unique project ID from name
   */
  async generateProjectId(name: string): Promise<string> {
    // Convert name to lowercase with hyphens
    let baseId = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars except spaces and hyphens
      .replace(/\s+/g, '-')          // Replace spaces with hyphens
      .replace(/-+/g, '-')           // Collapse multiple hyphens
      .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens

    // Ensure valid ID
    if (!baseId) {
      baseId = 'project';
    }

    // Check for duplicates
    const allProjects = await this.getAllProjects();
    const existingIds = new Set(allProjects.map(p => p.id));

    // If no duplicate, return base ID
    if (!existingIds.has(baseId)) {
      return baseId;
    }

    // Add numeric suffix
    let counter = 2;
    while (existingIds.has(`${baseId}-${counter}`)) {
      counter++;
    }

    return `${baseId}-${counter}`;
  }

  /**
   * Get system directories for browsing
   * @param path - Optional path to list directories from (defaults to user home)
   * @returns Directory listing with current path, parent path, and directories
   */
  async getSystemDirectories(path?: string): Promise<{
    currentPath: string;
    parentPath: string;
    directories: Array<{
      name: string;
      path: string;
      isDirectory: boolean;
    }>;
  }> {
    const fs = await import('fs/promises');
    const pathModule = await import('path');
    const os = await import('os');

    // Default to user home directory if no path provided
    const targetPath = path || os.homedir();

    // Resolve the path to an absolute path
    const resolvedPath = pathModule.resolve(targetPath);

    // Security check: ensure path exists and is accessible
    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error('Path is not a directory');
      }
    } catch (error) {
      throw new Error('Directory not found or not accessible');
    }

    // Get parent directory
    const parentPath = pathModule.dirname(resolvedPath);

    // Read directory contents
    let entries;
    try {
      entries = await fs.readdir(resolvedPath);
    } catch (error) {
      throw new Error('Access denied to directory');
    }

    // Filter and process directory entries
    const directories: Array<{
      name: string;
      path: string;
      isDirectory: boolean;
    }> = [];

    for (const entry of entries) {
      const entryPath = pathModule.join(resolvedPath, entry);

      try {
        const stats = await fs.stat(entryPath);

        // Only include directories, exclude hidden ones (starting with .)
        if (stats.isDirectory() && !entry.startsWith('.')) {
          directories.push({
            name: entry,
            path: entryPath,
            isDirectory: true
          });
        }
      } catch (error) {
        // Skip entries we can't access
        continue;
      }
    }

    // Sort directories alphabetically
    directories.sort((a, b) => a.name.localeCompare(b.name));

    return {
      currentPath: resolvedPath,
      parentPath: parentPath === resolvedPath ? '' : parentPath,
      directories
    };
  }
}
