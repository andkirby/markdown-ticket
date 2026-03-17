#!/usr/bin/env node

import type { GlobalConfig } from '@mdt/domain-contracts'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { parseToml } from '../utils/toml.js'
import { getDefaultPaths } from '../utils/constants.js'
import { getDefaultConfig as getDefaultConfigUtil, processConfig } from '../utils/config-validator.js'

/**
 * Unknown object type for dynamic property access
 */
type UnknownObject = Record<string, unknown>

/**
 * Configuration value types supported in TOML
 */
type ConfigValue = string | number | boolean | string[] | null | undefined

/**
 * Configuration error class
 */
class ConfigError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'ConfigError'
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
    return key.split('.').filter(part => part.length > 0)
  }

  /**
   * Set nested object property using dot notation path
   * @param obj - Target object
   * @param path - Path array from dot notation
   * @param value - Value to set
   */
  static setNested(obj: GlobalConfig, path: string[], value: unknown): void {
    let current: UnknownObject = obj as unknown as UnknownObject

    // Navigate to the parent of the target property
    for (let i = 0; i < path.length - 1; i++) {
      const segment = path[i]
      if (!(segment in current) || typeof current[segment] !== 'object' || current[segment] === null) {
        current[segment] = {}
      }
      current = current[segment] as UnknownObject
    }

    // Set the final property
    const finalKey = path[path.length - 1]
    current[finalKey] = value
  }

  /**
   * Get nested object property using dot notation path
   * @param obj - Source object
   * @param path - Path array from dot notation
   * @returns Property value or undefined if not found
   */
  static getNested(obj: GlobalConfig, path: string[]): unknown {
    let current: UnknownObject = obj as unknown as UnknownObject

    for (const segment of path) {
      if (current === null || typeof current !== 'object' || !(segment in current)) {
        return undefined
      }
      current = current[segment] as UnknownObject
    }

    return current
  }
}

/**
 * Configuration manager for TOML files
 */
class ConfigManager {
  private configPath: string
  private configDir: string

  constructor(configPath?: string) {
    this.configPath = configPath || getDefaultPaths().CONFIG_FILE
    this.configDir = path.dirname(this.configPath)
  }

  /**
   * Get the configuration file path
   */
  getConfigPath(): string {
    return this.configPath
  }

  /**
   * Read configuration from TOML file
   */
  async readConfig(): Promise<GlobalConfig> {
    try {
      if (!fs.existsSync(this.configPath)) {
        return this.getDefaultConfig()
      }

      const configContent = fs.readFileSync(this.configPath, 'utf8')
      const parsedConfig = parseToml(configContent)

      return processConfig(parsedConfig)
    }
    catch (error) {
      throw new ConfigError(`Failed to read configuration: ${error instanceof Error ? error.message : String(error)}`, error as Error)
    }
  }

  /**
   * Write configuration to TOML file
   */
  async writeConfig(config: GlobalConfig): Promise<void> {
    try {
      // Ensure config directory exists
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true })
      }

      // Convert to TOML format
      const tomlContent = this.objectToToml(config)

      // Write atomically to prevent corruption
      const tempPath = `${this.configPath}.tmp`
      fs.writeFileSync(tempPath, tomlContent, 'utf8')
      fs.renameSync(tempPath, this.configPath)
    }
    catch (error) {
      throw new ConfigError(`Failed to write configuration: ${error instanceof Error ? error.message : String(error)}`, error as Error)
    }
  }

  /**
   * Get configuration value using dot notation
   */
  async get(key: string): Promise<ConfigValue> {
    const config = await this.readConfig()
    const path = DotNotationParser.parse(key)
    return DotNotationParser.getNested(config, path) as ConfigValue
  }

  /**
   * Set configuration value using dot notation
   */
  async set(key: string, value: string): Promise<void> {
    const config = await this.readConfig()
    const path = DotNotationParser.parse(key)

    // Parse the value based on expected type
    const parsedValue = this.parseValue(value, path, config)

    DotNotationParser.setNested(config, path, parsedValue)
    await this.writeConfig(config)
  }

  /**
   * Parse string value based on expected configuration type
   */
  private parseValue(value: string, path: string[], config: GlobalConfig): ConfigValue {
    const currentValue = DotNotationParser.getNested(config, path)

    // If current value is a boolean, parse as boolean
    if (typeof currentValue === 'boolean') {
      return value.toLowerCase() === 'true'
    }

    // If current value is a number, parse as number
    if (typeof currentValue === 'number') {
      const parsed = Number(value)
      if (Number.isNaN(parsed)) {
        throw new ConfigError(`Invalid number value: ${value}`)
      }
      return parsed
    }

    // If current value is an array, parse as comma-separated values
    if (Array.isArray(currentValue)) {
      return value.split(',').map(item => item.trim()).filter(item => item.length > 0)
    }

    // Default: treat as string
    return value
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): GlobalConfig {
    return getDefaultConfigUtil()
  }

  /**
   * Simple TOML serializer for configuration data
   */
  objectToToml(obj: GlobalConfig): string {
    let toml = ''

    for (const [section, data] of Object.entries(obj)) {
      if (!data)
        continue
      toml += `[${section}]\n`
      const dataRecord = data as Record<string, ConfigValue>
      for (const [key, value] of Object.entries(dataRecord)) {
        if (typeof value === 'string') {
          toml += `${key} = "${value}"\n`
        }
        else if (typeof value === 'boolean') {
          toml += `${key} = ${value}\n`
        }
        else if (typeof value === 'number') {
          toml += `${key} = ${value}\n`
        }
        else if (Array.isArray(value)) {
          if (value.length > 0) {
            toml += `${key} = [${value.map(item => `"${item}"`).join(', ')}]\n`
          }
          else {
            toml += `${key} = []\n`
          }
        }
        else if (value === null || value === undefined) {
          // Skip null/undefined values
          continue
        }
        else {
          toml += `${key} = "${value}"\n`
        }
      }
      toml += '\n'
    }

    return toml
  }
}

/**
 * CLI command handlers
 */
class ConfigCommands {
  private configManager: ConfigManager

  constructor(configManager: ConfigManager) {
    this.configManager = configManager
  }

  async getCommand(key: string): Promise<void> {
    try {
      const value = await this.configManager.get(key)
      if (value !== undefined) {
        if (Array.isArray(value)) {
          console.error(`${key}: [${value.map(item => `"${item}"`).join(', ')}]`)
        }
        else if (typeof value === 'string') {
          console.error(`${key}: "${value}"`)
        }
        else {
          console.error(`${key}: ${value}`)
        }
      }
      else {
        console.error(`Configuration key '${key}' not found`)
        process.exit(1)
      }
    }
    catch (error) {
      console.error('Error getting configuration:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }

  async setCommand(key: string, value: string): Promise<void> {
    try {
      await this.configManager.set(key, value)
      console.error(`✅ Configuration updated successfully`)
      console.error(`   File: ${this.configManager.getConfigPath()}`)
      console.error(`   Key: ${key} = ${value}`)
    }
    catch (error) {
      console.error('Error setting configuration:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }

  async showCommand(): Promise<void> {
    try {
      const config = await this.configManager.readConfig()
      console.error('# Markdown Ticket Configuration')
      console.error(`# Path: ${this.configManager.getConfigPath()}`)
      console.error('')

      // Use a temporary instance to access method for serialization
      const tempManager = new ConfigManager()
      console.error(tempManager.objectToToml(config))
    }
    catch (error) {
      console.error('Error reading configuration:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }

  async initCommand(): Promise<void> {
    try {
      // Check if config already exists
      if (fs.existsSync(this.configManager.getConfigPath())) {
        console.error('ℹ️  Configuration file already exists')
        console.error(`   File: ${this.configManager.getConfigPath()}`)
        console.error('   Use "show" command to view current configuration.')
        return
      }

      // Use a temporary instance to access method for default config
      const tempManager = new ConfigManager()
      await this.configManager.writeConfig(tempManager.getDefaultConfig())
      console.error('✅ Configuration file created successfully')
      console.error(`   File: ${this.configManager.getConfigPath()}`)
    }
    catch (error) {
      console.error('Error initializing configuration:', error instanceof Error ? error.message : String(error))
      process.exit(1)
    }
  }
}

/**
 * Main CLI application
 */
class ConfigCLI {
  private configManager: ConfigManager
  private commands: ConfigCommands

  constructor() {
    this.configManager = new ConfigManager()
    this.commands = new ConfigCommands(this.configManager)
  }

  async run(argv: string[]): Promise<void> {
    const args = argv.slice(2) // Remove node and script path

    if (args.length === 0) {
      this.showUsage()
      process.exit(1)
    }

    const command = args[0]

    switch (command) {
      case 'get':
        if (args.length !== 2) {
          console.error('Usage: config get <key>')
          process.exit(1)
        }
        await this.commands.getCommand(args[1])
        break

      case 'set':
        if (args.length !== 3) {
          console.error('Usage: config set <key> <value>')
          process.exit(1)
        }
        await this.commands.setCommand(args[1], args[2])
        break

      case 'show':
        await this.commands.showCommand()
        break

      case 'init':
        await this.commands.initCommand()
        break

      case 'help':
      case '--help':
      case '-h':
        this.showUsage()
        break

      default:
        console.error(`Unknown command: ${command}`)
        this.showUsage()
        process.exit(1)
    }
  }

  private showUsage(): void {
    console.error('Markdown Ticket Configuration CLI')
    console.error('')
    console.error('Usage: config <command> [args]')
    console.error('')
    console.error('Commands:')
    console.error('  get <key>     Get configuration value using dot notation')
    console.error('                 Examples: config get discovery.autoDiscover')
    console.error('                           config get discovery.searchPaths')
    console.error('                           config get links.enableTicketLinks')
    console.error('')
    console.error('  set <key> <value>  Set configuration value using dot notation')
    console.error('                 Examples: config set discovery.autoDiscover true')
    console.error('                           config set discovery.searchPaths "/path1,/path2"')
    console.error('                           config set links.enableTicketLinks false')
    console.error('')
    console.error('  show          Display current configuration')
    console.error('  init          Create default configuration file')
    console.error('  help          Show this help message')
    console.error('')
    console.error('Configuration file location: ~/.config/markdown-ticket/config.toml')
  }
}

// Export for testing
export { ConfigCLI, ConfigError, ConfigManager, DotNotationParser }

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new ConfigCLI()
  cli.run(process.argv).catch((error) => {
    console.error('CLI error:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
