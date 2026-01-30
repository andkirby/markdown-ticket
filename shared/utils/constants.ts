import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'
import { CRPriorities, CRTypes, CRType } from '@mdt/domain-contracts'
import { CR_STATUSES } from '../models/Types.js'

/**
 * Shared Constants for Frontend, Backend, and MCP
 * Ensures consistent values across all systems
 */

// Re-export from Types.ts for single source of truth
export const STATUSES = CR_STATUSES
export type Status = typeof CR_STATUSES[number]

export const TYPES = CRTypes
export type TicketType = typeof CRTypes[number]

export const PRIORITIES = CRPriorities
export type Priority = typeof CRPriorities[number]

// File Extensions
export const SUPPORTED_EXTENSIONS = ['.md', '.markdown'] as const

/**
 * Get or create the configuration directory with fallback logic
 * Handles environment variables, directory creation, and permission issues
 */
function getOrCreateConfigDir(): string {
  // Try environment variable first
  let configDir = process.env.CONFIG_DIR

  if (!configDir) {
    // Use default location
    configDir = path.join(os.homedir(), '.config', 'markdown-ticket')
  }

  // Try to create the directory if it doesn't exist
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    // Test if directory is writable
    const testFile = path.join(configDir, '.write-test')
    fs.writeFileSync(testFile, 'test')
    fs.unlinkSync(testFile)

    return configDir
  }
  catch {
    // If creation or write test fails, use fallback
    const fallbackDir = path.join(os.homedir(), '.config', 'markdown-ticket')

    // Try fallback directory
    try {
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true })
      }
      console.warn(`⚠️  Could not create or write to config directory "${configDir}". Using fallback: "${fallbackDir}"`)
      return fallbackDir
    }
    catch {
      // Last resort: use temp directory
      const tempDir = path.join(os.tmpdir(), 'markdown-ticket')
      try {
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true })
        }
        console.error(`❌ Could not create config directory. Using temporary directory: "${tempDir}"`)
        return tempDir
      }
      catch {
        // Ultimate fallback - use current working directory
        const cwdFallback = path.join(process.cwd(), '.mdt-config')
        console.error(`🚨 All config directory creation failed. Using current directory: "${cwdFallback}"`)
        return cwdFallback
      }
    }
  }
}

// Initialize config directory and create paths
// NOTE: We provide both static and dynamic access to support test isolation
// where process.env.CONFIG_DIR may change during runtime

const CONFIG_DIR = getOrCreateConfigDir()

// Function to get current CONFIG_DIR (respects process.env.CONFIG_DIR)
export function getConfigDir(): string {
  return process.env.CONFIG_DIR || CONFIG_DIR
}

// Dynamic paths (for test isolation)
export function getDefaultPaths() {
  const configDir = getConfigDir()
  return {
    CONFIG_DIR: configDir,
    CONFIG_FILE: path.join(configDir, 'config.toml'),
    TEMPLATES_DIR: path.join(configDir, 'templates'),
    PROJECTS_REGISTRY: path.join(configDir, 'projects'),
    USER_CONFIG: path.join(configDir, 'user.toml'),
  }
}

// Static paths (for backwards compatibility - used at module load time)
export const DEFAULT_PATHS = {
  CONFIG_DIR,
  CONFIG_FILE: path.join(CONFIG_DIR, 'config.toml'),
  TEMPLATES_DIR: path.join(CONFIG_DIR, 'templates'),
  PROJECTS_REGISTRY: path.join(CONFIG_DIR, 'projects'),
  USER_CONFIG: path.join(CONFIG_DIR, 'user.toml'),
}

// Configuration Files
export const CONFIG_FILES = {
  PROJECT_CONFIG: '.mdt-config.toml',
  COUNTER_FILE: '.mdt-next',
  get USER_CONFIG() { return path.join(getConfigDir(), 'user.toml') },
  get PROJECTS_REGISTRY() { return path.join(getConfigDir(), 'projects') },
} as const

// Default Values
export const DEFAULTS = {
  STATUS: 'Proposed' as Status,
  TYPE: CRType.FEATURE_ENHANCEMENT as TicketType,
  PRIORITY: 'Medium' as Priority,
  TICKETS_PATH: 'docs/CRs',
  START_NUMBER: 1,
  CODE_PADDING: 3,
} as const

// Validation Patterns
export const PATTERNS = {
  TICKET_CODE: /^[A-Z0-9]{2,5}-\d{3,}$/,
  PROJECT_CODE: /^[A-Z0-9]{2,5}$/,
  YAML_FRONTMATTER: /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n([\s\S]*)$/,
} as const

// CLI Error Codes
export const CLI_ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  NOT_FOUND: 3,
  ALREADY_EXISTS: 4,
  PERMISSION_DENIED: 5,
  USER_CANCELLED: 6,
} as const
