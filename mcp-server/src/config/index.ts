import * as fs from 'fs-extra';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as toml from 'toml';
// @ts-ignore
import { DEFAULT_PATHS } from '../../../shared/utils/constants.js';

/**
 * Server configuration with merged approach.
 *
 * Configuration sources (in order of precedence):
 * 1. config.toml (optional) - for server settings and scanPaths
 * 2. Environment variables (MCP_LOG_LEVEL, MCP_CACHE_TIMEOUT)
 * 3. Hardcoded defaults
 *
 * Project discovery supports BOTH:
 * - Global registry: ~/.config/markdown-ticket/projects/*.toml
 * - ScanPaths: Configured directories scanned for *-config.toml files
 */

export interface ServerConfig {
  server: {
    port: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  discovery: {
    registryPath: string;    // Path to global registry
    scanPaths: string[];     // Additional scan paths
    excludePaths: string[];
    maxDepth: number;        // For directory scanning
    cacheTimeout: number;
  };
  templates: {
    customPath: string;
  };
}

const DEFAULT_CONFIG: ServerConfig = {
  server: {
    port: 8000,
    logLevel: (process.env.MCP_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
  },
  discovery: {
    registryPath: DEFAULT_PATHS.PROJECTS_REGISTRY,
    scanPaths: [],  // Empty by default, populated from config.toml if present
    excludePaths: [
      'node_modules',
      '.git',
      'vendor',
      '.next',
      'dist',
      'build',
      'target',
      '__pycache__',
      '.vscode',
      '.idea',
      'tmp',
      'temp'
    ],
    maxDepth: 4,
    cacheTimeout: parseInt(process.env.MCP_CACHE_TIMEOUT || '300', 10) // 5 minutes default
  },
  templates: {
    customPath: DEFAULT_PATHS.TEMPLATES_DIR
  }
};

const CONFIG_PATH = DEFAULT_PATHS.CONFIG_FILE;

export class ConfigService {
  private config: ServerConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfigFile();
    console.error(`📋 Configuration loaded`);
    console.error(`   Log Level: ${this.config.server.logLevel}`);
    console.error(`   Registry Path: ${this.config.discovery.registryPath}`);
    console.error(`   Scan Paths: ${this.config.discovery.scanPaths.length} configured`);
    console.error(`   Cache Timeout: ${this.config.discovery.cacheTimeout}s`);
  }

  private loadConfigFile(): void {
    try {
      if (existsSync(CONFIG_PATH)) {
        console.error(`📝 Loading config from: ${CONFIG_PATH}`);
        const configContent = readFileSync(CONFIG_PATH, 'utf-8');
        const fileConfig = toml.parse(configContent);

        // Merge server settings
        if (fileConfig.server) {
          if (fileConfig.server.port) {
            this.config.server.port = fileConfig.server.port;
          }
          if (fileConfig.server.logLevel && !process.env.MCP_LOG_LEVEL) {
            // Environment variable takes precedence
            this.config.server.logLevel = fileConfig.server.logLevel;
          }
        }

        // Merge discovery settings
        if (fileConfig.discovery) {
          if (Array.isArray(fileConfig.discovery.scanPaths)) {
            this.config.discovery.scanPaths = fileConfig.discovery.scanPaths.map((p: string) =>
              this.expandPath(p)
            );
          }
          if (Array.isArray(fileConfig.discovery.excludePaths)) {
            this.config.discovery.excludePaths = fileConfig.discovery.excludePaths;
          }
          if (typeof fileConfig.discovery.maxDepth === 'number') {
            this.config.discovery.maxDepth = fileConfig.discovery.maxDepth;
          }
          if (typeof fileConfig.discovery.cacheTimeout === 'number' && !process.env.MCP_CACHE_TIMEOUT) {
            // Environment variable takes precedence
            this.config.discovery.cacheTimeout = fileConfig.discovery.cacheTimeout;
          }
        }

        // Merge template settings
        if (fileConfig.templates?.customPath) {
          this.config.templates.customPath = this.expandPath(fileConfig.templates.customPath);
        }
      } else {
        console.error(`ℹ️  No config.toml found (optional) - using defaults and environment variables`);
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load config.toml: ${(error as Error).message}`);
      console.warn(`   Falling back to defaults`);
    }
  }

  private expandPath(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
      return path.join(os.homedir(), inputPath.slice(2));
    }
    return path.resolve(inputPath);
  }

  /**
   * Load global config template from external file
   */
  private async loadConfigTemplate(): Promise<string> {
    try {
      const templatePath = path.join(__dirname, '../../config-samples/global-config.toml');
      if (await fs.pathExists(templatePath)) {
        return await fs.readFile(templatePath, 'utf-8');
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load config template: ${(error as Error).message}`);
    }

    // Fallback to minimal inline template if external file is not available
    return `# Markdown Ticket MCP Server Configuration
# This file was auto-generated on first run

[server]
port = 8000
logLevel = "info"

[discovery]
scanPaths = []
excludePaths = ["node_modules", ".git", "vendor", ".next", "dist", "build", "target"]
maxDepth = 4
cacheTimeout = 300

[templates]
# customPath = "~/.config/markdown-ticket/templates"
`;
  }

  /**
   * Load project registry template from external file
   */
  private async loadProjectRegistryTemplate(projectName: string, projectPath: string): Promise<string> {
    try {
      const templatePath = path.join(__dirname, '../../config-samples/project-registry.toml');
      if (await fs.pathExists(templatePath)) {
        let template = await fs.readFile(templatePath, 'utf-8');
        const dateString = new Date().toISOString().split('T')[0];

        // Replace template variables
        template = template.replace(/\$\{projectName\}/g, projectName);
        template = template.replace(/\$\{projectPath\}/g, projectPath);
        template = template.replace(/\$\{dateCreated\}/g, dateString);
        template = template.replace(/\$\{dateRegistered\}/g, dateString);
        template = template.replace(/\$\{lastAccessed\}/g, dateString);

        return template;
      }
    } catch (error) {
      console.warn(`⚠️  Failed to load project registry template: ${(error as Error).message}`);
    }

    // Fallback to minimal inline template if external file is not available
    const dateString = new Date().toISOString().split('T')[0];
    return `# Auto-generated registry entry for ${projectName}
# Created: ${dateString}

projectPath = "${projectPath}"

[metadata]
dateRegistered = "${dateString}"
lastAccessed = "${dateString}"
version = "1.0.0"
`;
  }

  getConfig(): ServerConfig {
    return this.config;
  }

  /**
   * Create sample configurations on first run
   */
  private async createSampleConfigs(): Promise<void> {
    try {
      console.error('📝 Creating sample configurations...');

      // 1. Create a sample global config.toml if it doesn't exist
      if (!await fs.pathExists(CONFIG_PATH)) {
        const sampleGlobalConfig = await this.loadConfigTemplate();
        await fs.outputFile(CONFIG_PATH, sampleGlobalConfig, 'utf-8');
        console.error(`   ✅ Created global config: ${CONFIG_PATH}`);
      }

      // 2. Create templates directory
      const templatesDir = this.config.templates.customPath;
      if (!await fs.pathExists(templatesDir)) {
        await fs.ensureDir(templatesDir);
        console.error(`   ✅ Created templates directory: ${templatesDir}`);
      }

      // 3. Scan for projects and create registry entries
      await this.scanAndRegisterProjects();

      console.error('✅ Sample configurations created successfully');
    } catch (error) {
      console.error(`❌ Failed to create sample configs: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Scan for projects and create registry entries
   */
  private async scanAndRegisterProjects(): Promise<void> {
    try {
      const projectsToScan = [
        // 1. Priority: mounted project data directory (Docker environment)
        '/app/data',
        // 2. Check current working directory (could contain sample projects)
        process.cwd(),
        // 3. Check common Docker mount paths
        '/app',
        '/workspace',
        // 4. Check parent directory (in case we're in a subdirectory)
        path.dirname(process.cwd())
      ];

      // 4. Add scan paths from global config (if any)
      const globalConfigPath = this.config.discovery.registryPath.replace('/projects', '/config.toml');
      if (await fs.pathExists(globalConfigPath)) {
        const globalConfigContent = readFileSync(globalConfigPath, 'utf-8');
        const globalConfig = toml.parse(globalConfigContent);
        if (globalConfig.discovery?.scanPaths) {
          projectsToScan.push(...globalConfig.discovery.scanPaths.map((p: string) => this.expandPath(p)));
        }
      }

      console.error(`   🔍 Scanning ${projectsToScan.length} potential project locations...`);

      for (const projectPath of projectsToScan) {
        if (await fs.pathExists(projectPath)) {
          await this.registerProjectIfValid(projectPath);
        }
      }
    } catch (error) {
      console.error(`   ⚠️  Error scanning for projects: ${(error as Error).message}`);
    }
  }

  /**
   * Register a project if it has valid configuration
   */
  private async registerProjectIfValid(projectPath: string): Promise<void> {
    try {
      const hasProjectConfig = await this.hasValidProjectConfig(projectPath);

      if (hasProjectConfig) {
        const projectName = path.basename(projectPath);
        const registryFileName = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.toml`;
        const registryFilePath = path.join(this.config.discovery.registryPath, registryFileName);

        // Don't overwrite existing registry entries
        if (!await fs.pathExists(registryFilePath)) {
          const sampleRegistry = await this.loadProjectRegistryTemplate(projectName, projectPath);
          await fs.outputFile(registryFilePath, sampleRegistry, 'utf-8');
          console.error(`   ✅ Registered project: ${projectName} (${projectPath})`);
        } else {
          console.error(`   ℹ️  Project already registered: ${projectName}`);
        }
      }
    } catch (error) {
      console.error(`   ⚠️  Failed to register project at ${projectPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Check if a directory contains a valid project configuration
   */
  private async hasValidProjectConfig(projectPath: string): Promise<boolean> {
    try {
      // Check for .mdt-config.toml or *-config.toml files
      const configPatterns = [
        path.join(projectPath, '.mdt-config.toml'),
        path.join(projectPath, '*-config.toml')
      ];

      for (const pattern of configPatterns) {
        if (pattern.includes('*')) {
          // Use glob for pattern matching
          const { glob } = await import('glob');
          const matches = await glob(pattern);
          if (matches.length > 0) return true;
        } else {
          // Direct file check
          if (await fs.pathExists(pattern)) return true;
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  async validateConfig(): Promise<{valid: boolean, errors: string[], warnings: string[]}> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate server config
    if (!this.config.server) {
      errors.push('server configuration section is missing');
    } else {
      if (typeof this.config.server.port !== 'number' || this.config.server.port < 1 || this.config.server.port > 65535) {
        errors.push('server.port must be a number between 1 and 65535');
      }

      const validLogLevels = ['debug', 'info', 'warn', 'error'];
      if (!validLogLevels.includes(this.config.server.logLevel)) {
        errors.push(`server.logLevel must be one of: ${validLogLevels.join(', ')}`);
      }
    }

    // Validate discovery config
    if (!this.config.discovery) {
      errors.push('discovery configuration section is missing');
    } else {
      // Check if registry path exists (create if not)
      if (!await fs.pathExists(this.config.discovery.registryPath)) {
        warnings.push(`Registry path does not exist, will be created: ${this.config.discovery.registryPath}`);
        try {
          await fs.ensureDir(this.config.discovery.registryPath);
          await this.createSampleConfigs();
          // Reload configuration after creating sample configs
          this.loadConfigFile();
        } catch (error) {
          errors.push(`Failed to create registry path: ${(error as Error).message}`);
        }
      }

      // Validate scanPaths
      if (!Array.isArray(this.config.discovery.scanPaths)) {
        warnings.push('discovery.scanPaths should be an array');
      } else if (this.config.discovery.scanPaths.length > 0) {
        for (const scanPath of this.config.discovery.scanPaths) {
          if (!await fs.pathExists(scanPath)) {
            warnings.push(`Scan path does not exist: ${scanPath}`);
          }
        }
      }

      if (!Array.isArray(this.config.discovery.excludePaths)) {
        warnings.push('discovery.excludePaths should be an array');
      }

      if (typeof this.config.discovery.maxDepth !== 'number' || this.config.discovery.maxDepth < 1) {
        warnings.push('discovery.maxDepth should be a positive number');
      }

      if (typeof this.config.discovery.cacheTimeout !== 'number' || this.config.discovery.cacheTimeout < 0) {
        errors.push('discovery.cacheTimeout must be a non-negative number');
      }
    }

    // Validate templates config
    if (this.config.templates?.customPath) {
      if (!await fs.pathExists(this.config.templates.customPath)) {
        warnings.push(`Templates path does not exist, will be created if needed: ${this.config.templates.customPath}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}