import * as fs from 'fs-extra';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as toml from 'toml';
// @ts-ignore
import { DEFAULT_PATHS } from '@mdt/shared/utils/constants.js';

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
  private quiet: boolean;

  constructor(quiet: boolean = false) {
    this.quiet = quiet;
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfigFile();
    this.log(`📋 Configuration loaded`);
    this.log(`   Log Level: ${this.config.server.logLevel}`);
    this.log(`   Registry Path: ${this.config.discovery.registryPath}`);
    this.log(`   Scan Paths: ${this.config.discovery.scanPaths.length} configured`);
    this.log(`   Cache Timeout: ${this.config.discovery.cacheTimeout}s`);
  }

  private log(message: string): void {
    if (!this.quiet) {
      console.error(message);
    }
  }

  private loadConfigFile(): void {
    try {
      if (existsSync(CONFIG_PATH)) {
        this.log(`📝 Loading config from: ${CONFIG_PATH}`);
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
        this.log(`ℹ️  No config.toml found (optional) - using defaults and environment variables`);
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

  getConfig(): ServerConfig {
    return this.config;
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