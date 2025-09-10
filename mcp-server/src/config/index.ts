import * as fs from 'fs-extra';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as toml from 'toml';
import { ServerConfig } from '../../../shared/models/Config.js';
// @ts-ignore
import { DEFAULT_PATHS } from '../../../shared/utils/constants.js';

const DEFAULT_CONFIG: ServerConfig = {
  server: {
    port: 8000,
    logLevel: 'info'
  },
  discovery: {
    scanPaths: [
      // No default scan paths - require explicit configuration for security
    ],
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
    cacheTimeout: 300 // 5 minutes
  },
  templates: {
    customPath: DEFAULT_PATHS.TEMPLATES_DIR
  }
};

export class ConfigService {
  private config: ServerConfig;
  private configPath: string;

  constructor() {
    this.configPath = this.getConfigPath();
    this.config = this.loadConfig();
  }

  private getConfigPath(): string {
    // Check for config file in order of preference
    const possiblePaths = [
      DEFAULT_PATHS.MCP_CONFIG
    ];

    for (const configPath of possiblePaths) {
      if (existsSync(configPath)) {
        console.error(`📋 Using config file: ${configPath}`);
        return configPath;
      }
    }

    // Return unified path for creation
    console.error(`📋 No config file found, will use defaults. Config can be created at: ${DEFAULT_PATHS.MCP_CONFIG}`);
    return DEFAULT_PATHS.MCP_CONFIG;
  }

  private loadConfig(): ServerConfig {
    try {
      if (existsSync(this.configPath)) {
        const configContent = readFileSync(this.configPath, 'utf-8');
        const userConfig = toml.parse(configContent);
        
        // Deep merge with defaults
        return this.mergeConfig(DEFAULT_CONFIG, userConfig);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load config from ${this.configPath}, using defaults:`, (error as Error).message);
    }

    return { ...DEFAULT_CONFIG };
  }

  private mergeConfig(defaultConfig: any, userConfig: any): any {
    const merged = { ...defaultConfig };
    
    for (const [key, value] of Object.entries(userConfig)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = this.mergeConfig(defaultConfig[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  getConfig(): ServerConfig {
    return this.config;
  }

  private generateConfigContent(): string {
    return `# MCP CR Server Configuration
# This file configures the Model Context Protocol server for Change Request management

[server]
# Server port for MCP communication
port = ${this.config.server.port}
# Log level: debug, info, warn, error
logLevel = "${this.config.server.logLevel}"

[discovery]
# Paths to scan for project configuration files (*-config.toml)
# SECURITY: Only add paths you explicitly want to scan
scanPaths = [
  # Add your project directories here, e.g.:
  # "${path.join(os.homedir(), 'my-projects')}",
  # "/path/to/specific/project"
]

# Directories to exclude from scanning
excludePaths = [
  "node_modules",
  ".git", 
  "vendor",
  ".next",
  "dist",
  "build",
  "target",
  "__pycache__",
  ".vscode",
  ".idea",
  "tmp",
  "temp"
]

# Maximum directory depth to scan
maxDepth = ${this.config.discovery.maxDepth}

# Cache timeout in seconds (project discovery results)
cacheTimeout = ${this.config.discovery.cacheTimeout}

[templates]
# Path to custom CR templates (optional)
# customPath = "${this.config.templates.customPath}"

# Example project structure:
# 
# my-project/
# ├── .mdt-config.toml          <- Project configuration
# ├── .mdt-next                 <- Counter file
# └── docs/CRs/                 <- CR directory
#     ├── MDT-001-feature.md
#     └── MDT-002-bugfix.md
#
# The server will automatically discover projects by scanning for *-config.toml files
# in the configured scan paths. Each project should have:
# 1. A configuration file (e.g., .mdt-config.toml)
# 2. A CR directory specified in the config
# 3. A counter file for tracking CR numbers
`;
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
      if (!Array.isArray(this.config.discovery.scanPaths) || this.config.discovery.scanPaths.length === 0) {
        errors.push('discovery.scanPaths must be a non-empty array');
      } else {
        // Check if scan paths exist
        for (const scanPath of this.config.discovery.scanPaths) {
          const expandedPath = this.expandPath(scanPath);
          if (!await fs.pathExists(expandedPath)) {
            warnings.push(`Scan path does not exist: ${scanPath} (${expandedPath})`);
          }
        }
      }

      if (!Array.isArray(this.config.discovery.excludePaths)) {
        warnings.push('discovery.excludePaths should be an array');
      }

      if (typeof this.config.discovery.maxDepth !== 'number' || this.config.discovery.maxDepth < 1) {
        errors.push('discovery.maxDepth must be a positive number');
      }

      if (typeof this.config.discovery.cacheTimeout !== 'number' || this.config.discovery.cacheTimeout < 0) {
        errors.push('discovery.cacheTimeout must be a non-negative number');
      }
    }

    // Validate templates config
    if (this.config.templates?.customPath) {
      const customPath = this.expandPath(this.config.templates.customPath);
      if (!await fs.pathExists(customPath)) {
        warnings.push(`Custom templates path does not exist: ${this.config.templates.customPath} (${customPath})`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private expandPath(inputPath: string): string {
    if (inputPath.startsWith('~/')) {
      return path.join(os.homedir(), inputPath.slice(2));
    }
    return path.resolve(inputPath);
  }
}