#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import os from 'os';
import toml from 'toml';
import { GlobalConfig } from '../services/project/types.js';
import { DEFAULT_PATHS } from '../utils/constants.js';

/**
 * Configuration error class
 */
class ConfigError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Dot notation parser for nested configuration keys
 */
class DotNotationParser {
  /**
   * Parse dot notation key into path array
   * @param key - Dot notation key (e.g., "discovery.searchPaths")
   * @returns Array of path segments
   */
  static parse(key: string): string[] {
    return key.split('.').filter(part => part.length > 0);
  }

  /**
   * Set nested object property using dot notation path
   * @param obj - Target object
   * @param path - Path array from dot notation
   * @param value - Value to set
   */
  static setNested(obj: any, path: string[], value: any): void {
    let current = obj;

    // Navigate to the parent of the target property
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i];
      if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
        current[segment] = {};
      }
      current = current[segment];
    }

    // Set the final property
    const finalKey = path[path.length - 1];
    current[finalKey] = value;
  }

  /**
   * Get nested object property using dot notation path
   * @param obj - Source object
   * @param path - Path array from dot notation
   * @returns Property value or undefined if not found
   */
  static getNested(obj: any, path: string[]): any {
    let current = obj;

    for (const segment of path) {
      if (current === null || typeof current !== 'object' || !(segment in current)) {
        return undefined;
      }
      current = current[segment];
    }

    return current;
  }
}

/**
 * Configuration manager for TOML files
 */
class ConfigManager {
  private configPath: string;
  private configDir: string;

  constructor(configPath?: string) {
    this.configPath = configPath || DEFAULT_PATHS.CONFIG_FILE;
    this.configDir = path.dirname(this.configPath);
  }

  /**
   * Read configuration from TOML file
   */
  async readConfig(): Promise<GlobalConfig> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return this.getDefaultConfig();
      }

      const configContent = fs.readFileSync(this.configPath, 'utf8');
      const parsedConfig = toml.parse(configContent);

      // Check for old config structure and migrate if needed
      if (parsedConfig.dashboard) {
        console.warn('Migrating old configuration structure...');
        return this.migrateConfig(parsedConfig);
      }

      return this.validateConfig(parsedConfig);
    } catch (error) {
      throw new ConfigError(`Failed to read configuration: ${error instanceof Error ? error.message : String(error)}`, error as Error);
    }
  }

  /**
   * Write configuration to TOML file
   */
  async writeConfig(config: GlobalConfig): Promise<void> {
    try {
      // Ensure config directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      // Convert to TOML format
      const tomlContent = this.objectToToml(config);

      // Write atomically to prevent corruption
      const tempPath = `${this.configPath}.tmp`;
      fs.writeFileSync(tempPath, tomlContent, 'utf8');
      fs.renameSync(tempPath, this.configPath);
    } catch (error) {
      throw new ConfigError(`Failed to write configuration: ${error instanceof Error ? error.message : String(error)}`, error as Error);
    }
  }

  /**
   * Get configuration value using dot notation
   */
  async get(key: string): Promise<any> {
    const config = await this.readConfig();
    const path = DotNotationParser.parse(key);
    return DotNotationParser.getNested(config, path);
  }

  /**
   * Set configuration value using dot notation
   */
  async set(key: string, value: string): Promise<void> {
    const config = await this.readConfig();
    const path = DotNotationParser.parse(key);

    // Parse the value based on expected type
    const parsedValue = this.parseValue(value, path, config);

    DotNotationParser.setNested(config, path, parsedValue);
    await this.writeConfig(config);
  }

  /**
   * Parse string value based on expected configuration type
   */
  private parseValue(value: string, path: string[], config: GlobalConfig): any {
    const currentValue = DotNotationParser.getNested(config, path);

    // If current value is a boolean, parse as boolean
    if (typeof currentValue === 'boolean') {
      return value.toLowerCase() === 'true';
    }

    // If current value is a number, parse as number
    if (typeof currentValue === 'number') {
      const parsed = Number(value);
      if (isNaN(parsed)) {
        throw new ConfigError(`Invalid number value: ${value}`);
      }
      return parsed;
    }

    // If current value is an array, parse as comma-separated values
    if (Array.isArray(currentValue)) {
      return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
    }

    // Default: treat as string
    return value;
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
   * Simple TOML serializer for configuration data
   */
  private objectToToml(obj: any): string {
    let toml = '';

    for (const [section, data] of Object.entries(obj)) {
      toml += `[${section}]\n`;
      for (const [key, value] of Object.entries(data as any)) {
        if (typeof value === 'string') {
          toml += `${key} = "${value}"\n`;
        } else if (typeof value === 'boolean') {
          toml += `${key} = ${value}\n`;
        } else if (typeof value === 'number') {
          toml += `${key} = ${value}\n`;
        } else if (Array.isArray(value)) {
          if (value.length > 0) {
            toml += `${key} = [${value.map(item => `"${item}"`).join(', ')}]\n`;
          } else {
            toml += `${key} = []\n`;
          }
        } else if (value === null || value === undefined) {
          // Skip null/undefined values
          continue;
        } else {
          toml += `${key} = "${value}"\n`;
        }
      }
      toml += '\n';
    }

    return toml;
  }
}

/**
 * CLI command handlers
 */
class ConfigCommands {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  async getCommand(key: string): Promise<void> {
    try {
      const value = await this.configManager.get(key);
      if (value !== undefined) {
        if (Array.isArray(value)) {
          console.log(`${key}: [${value.map(item => `"${item}"`).join(', ')}]`);
        } else if (typeof value === 'string') {
          console.log(`${key}: "${value}"`);
        } else {
          console.log(`${key}: ${value}`);
        }
      } else {
        console.error(`Configuration key '${key}' not found`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error getting configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  async setCommand(key: string, value: string): Promise<void> {
    try {
      await this.configManager.set(key, value);
      console.log(`✅ Configuration updated successfully`);
      console.log(`   File: ${this.configManager['configPath']}`);
      console.log(`   Key: ${key} = ${value}`);
    } catch (error) {
      console.error('Error setting configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  async showCommand(): Promise<void> {
    try {
      const config = await this.configManager.readConfig();
      console.log('# Markdown Ticket Configuration');
      console.log('# Path: ' + this.configManager['configPath']);
      console.log('');

      // Use a temporary instance to access private method for serialization
      const tempManager = new ConfigManager();
      console.log((tempManager as any)['objectToToml'](config));
    } catch (error) {
      console.error('Error reading configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  async initCommand(): Promise<void> {
    try {
      // Check if config already exists
      if (fs.existsSync(this.configManager['configPath'])) {
        console.log('ℹ️  Configuration file already exists');
        console.log(`   File: ${this.configManager['configPath']}`);
        console.log('   Use "show" command to view current configuration.');
        return;
      }

      // Use a temporary instance to access private method for default config
      const tempManager = new ConfigManager();
      await this.configManager.writeConfig((tempManager as any)['getDefaultConfig']());
      console.log('✅ Configuration file created successfully');
      console.log(`   File: ${this.configManager['configPath']}`);
    } catch (error) {
      console.error('Error initializing configuration:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

/**
 * Main CLI application
 */
class ConfigCLI {
  private configManager: ConfigManager;
  private commands: ConfigCommands;

  constructor() {
    this.configManager = new ConfigManager();
    this.commands = new ConfigCommands(this.configManager);
  }

  async run(argv: string[]): Promise<void> {
    const args = argv.slice(2); // Remove node and script path

    if (args.length === 0) {
      this.showUsage();
      process.exit(1);
    }

    const command = args[0];

    switch (command) {
      case 'get':
        if (args.length !== 2) {
          console.error('Usage: config get <key>');
          process.exit(1);
        }
        await this.commands.getCommand(args[1]);
        break;

      case 'set':
        if (args.length !== 3) {
          console.error('Usage: config set <key> <value>');
          process.exit(1);
        }
        await this.commands.setCommand(args[1], args[2]);
        break;

      case 'show':
        await this.commands.showCommand();
        break;

      case 'init':
        await this.commands.initCommand();
        break;

      case 'help':
      case '--help':
      case '-h':
        this.showUsage();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        this.showUsage();
        process.exit(1);
    }
  }

  private showUsage(): void {
    console.log('Markdown Ticket Configuration CLI');
    console.log('');
    console.log('Usage: config <command> [args]');
    console.log('');
    console.log('Commands:');
    console.log('  get <key>     Get configuration value using dot notation');
    console.log('                 Examples: config get discovery.autoDiscover');
    console.log('                           config get discovery.searchPaths');
    console.log('                           config get links.enableTicketLinks');
    console.log('');
    console.log('  set <key> <value>  Set configuration value using dot notation');
    console.log('                 Examples: config set discovery.autoDiscover true');
    console.log('                           config set discovery.searchPaths "/path1,/path2"');
    console.log('                           config set links.enableTicketLinks false');
    console.log('');
    console.log('  show          Display current configuration');
    console.log('  init          Create default configuration file');
    console.log('  help          Show this help message');
    console.log('');
    console.log('Configuration file location: ~/.config/markdown-ticket/config.toml');
  }
}

// Export for testing
export { ConfigCLI, ConfigManager, DotNotationParser, ConfigError };

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ConfigCLI();
  cli.run(process.argv).catch(error => {
    console.error('CLI error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}