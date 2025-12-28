/**
 * Mock of @mdt/shared/utils/constants for testing
 * Provides minimal implementation for test environment
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// Ticket Statuses
export const STATUSES = [
  'Proposed',
  'Approved',
  'In Progress',
  'Implemented',
  'Rejected',
  'On Hold'
] as const;

export type Status = typeof STATUSES[number];

// Ticket Types
export const TYPES = [
  'Architecture',
  'Feature Enhancement',
  'Bug Fix',
  'Technical Debt',
  'Documentation'
] as const;

export type TicketType = typeof TYPES[number];

// Ticket Priorities
export const PRIORITIES = [
  'Low',
  'Medium',
  'High',
  'Critical'
] as const;

export type Priority = typeof PRIORITIES[number];

// File Extensions
export const SUPPORTED_EXTENSIONS = ['.md', '.markdown'] as const;

/**
 * Get or create the configuration directory with fallback logic
 * Handles environment variables, directory creation, and permission issues
 */
function getOrCreateConfigDir(): string {
  // Try environment variable first
  let configDir = process.env.CONFIG_DIR;

  if (!configDir) {
    // Use default location
    configDir = path.join(os.homedir(), '.config', 'markdown-ticket');
  }

  // Try to create the directory if it doesn't exist
  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Test if directory is writable
    const testFile = path.join(configDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);

    return configDir;
  } catch (error) {
    // If creation or write test fails, use fallback
    const fallbackDir = path.join(os.homedir(), '.config', 'markdown-ticket');

    // Try fallback directory
    try {
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      console.warn(`Warning: Could not create or write to config directory "${configDir}". Using fallback: "${fallbackDir}"`);
      return fallbackDir;
    } catch (fallbackError) {
      // Last resort: use temp directory
      const tempDir = path.join(os.tmpdir(), 'markdown-ticket');
      try {
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        console.error(`Error: Could not create config directory. Using temporary directory: "${tempDir}"`);
        return tempDir;
      } catch (tempError) {
        // Ultimate fallback - use current working directory
        const cwdFallback = path.join(process.cwd(), '.mdt-config');
        console.error(`Critical: All config directory creation failed. Using current directory: "${cwdFallback}"`);
        return cwdFallback;
      }
    }
  }
}

// Initialize config directory and create paths
const CONFIG_DIR = getOrCreateConfigDir();

// Function to get current CONFIG_DIR (respects process.env.CONFIG_DIR)
export function getConfigDir(): string {
  return process.env.CONFIG_DIR || CONFIG_DIR;
}

// Dynamic paths (for test isolation)
export function getDefaultPaths() {
  const configDir = getConfigDir();
  return {
    CONFIG_DIR: configDir,
    CONFIG_FILE: path.join(configDir, 'config.toml'),
    TEMPLATES_DIR: path.join(configDir, 'templates'),
    PROJECTS_REGISTRY: path.join(configDir, 'projects'),
    USER_CONFIG: path.join(configDir, 'user.toml')
  };
}

// Static paths (for backwards compatibility - used at module load time)
export const DEFAULT_PATHS = {
  CONFIG_DIR,
  CONFIG_FILE: path.join(CONFIG_DIR, 'config.toml'),
  TEMPLATES_DIR: path.join(CONFIG_DIR, 'templates'),
  PROJECTS_REGISTRY: path.join(CONFIG_DIR, 'projects'),
  USER_CONFIG: path.join(CONFIG_DIR, 'user.toml')
};

// Configuration Files
export const CONFIG_FILES = {
  PROJECT_CONFIG: '.mdt-config.toml',
  COUNTER_FILE: '.mdt-next',
  get USER_CONFIG() { return path.join(getConfigDir(), 'user.toml'); },
  get PROJECTS_REGISTRY() { return path.join(getConfigDir(), 'projects'); },
} as const;

// Default Values
export const DEFAULTS = {
  STATUS: 'Proposed' as Status,
  TYPE: 'Feature Enhancement' as TicketType,
  PRIORITY: 'Medium' as Priority,
  TICKETS_PATH: 'docs/CRs',
  START_NUMBER: 1,
  CODE_PADDING: 3
} as const;

// Validation Patterns
export const PATTERNS = {
  TICKET_CODE: /^[A-Z0-9]{2,5}-\d{3,}$/,
  PROJECT_CODE: /^[A-Z0-9]{2,5}$/,
  YAML_FRONTMATTER: /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
} as const;

// CLI Error Codes
export const CLI_ERROR_CODES = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  VALIDATION_ERROR: 2,
  NOT_FOUND: 3,
  ALREADY_EXISTS: 4,
  PERMISSION_DENIED: 5,
  USER_CANCELLED: 6
} as const;
