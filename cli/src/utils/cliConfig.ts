/**
 * CLI Configuration Management (MDT-143)
 *
 * Reads ~/.config/mdt/cli.toml and provides defaults.
 * Uses shared toml parser for consistency.
 */

import { parseToml } from '@mdt/shared/utils/toml.js'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

/**
 * CLI configuration interface
 */
export interface CliConfig {
  ticket: {
    absolutePath: boolean
  }
  display: {
    color: boolean
  }
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CliConfig = {
  ticket: {
    absolutePath: false,
  },
  display: {
    color: true,
  },
}

/**
 * Cached configuration singleton
 */
let cachedConfig: CliConfig | null = null

/**
 * Load CLI configuration from ~/.config/mdt/cli.toml
 *
 * If file doesn't exist or is malformed, returns defaults.
 *
 * @returns Parsed CLI configuration
 */
export function loadCliConfig(): CliConfig {
  const configPath = join(homedir(), '.config', 'mdt', 'cli.toml')

  // If config file doesn't exist, return defaults
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG }
  }

  try {
    const content = readFileSync(configPath, 'utf-8')
    const parsed = parseToml(content) as Record<string, unknown>

    // Extract CLI configuration section
    const cliSection = parsed.cli as Record<string, unknown> | undefined

    if (!cliSection) {
      return { ...DEFAULT_CONFIG }
    }

    // Extract ticket section
    const ticketSection = cliSection.ticket as Record<string, unknown> | undefined
    const absolutePath = typeof ticketSection?.absolutePath === 'boolean'
      ? ticketSection.absolutePath
      : DEFAULT_CONFIG.ticket.absolutePath

    // Extract display section
    const displaySection = cliSection.display as Record<string, unknown> | undefined
    const color = typeof displaySection?.color === 'boolean'
      ? displaySection.color
      : DEFAULT_CONFIG.display.color

    return {
      ticket: { absolutePath },
      display: { color },
    }
  }
  catch (error) {
    // If parsing fails, return defaults
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * Get cached CLI configuration (lazy-loads on first call)
 *
 * @returns CLI configuration
 */
export function getCliConfig(): CliConfig {
  if (!cachedConfig) {
    cachedConfig = loadCliConfig()
  }
  return cachedConfig
}
