import type { GlobalConfig } from '../services/project/types.js'
import { logQuiet } from './logger.js'

const defaultConfig = {
  discovery: { autoDiscover: true, searchPaths: [], maxDepth: 3 },
  links: { enableAutoLinking: true, enableTicketLinks: true, enableDocumentLinks: true, enableHoverPreviews: false, linkValidation: false },
  ui: { theme: 'auto' as const, autoRefresh: true, refreshInterval: 5000 },
  system: { logLevel: 'info' as const, cacheTimeout: 30000 },
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function getBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function getNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback
}

function getArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback
}

function getEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value) ? value : fallback
}

export function migrateConfig(oldConfig: unknown, quiet = false): GlobalConfig {
  const config = asRecord(oldConfig)
  const discovery = asRecord(config.discovery)
  const dashboard = asRecord(config.dashboard)

  logQuiet(quiet, 'Migrating old configuration structure...')

  return {
    discovery: {
      autoDiscover: getBool(discovery.autoDiscover, defaultConfig.discovery.autoDiscover),
      searchPaths: getArray(discovery.searchPaths, defaultConfig.discovery.searchPaths),
      maxDepth: defaultConfig.discovery.maxDepth,
    },
    links: {
      enableAutoLinking: getBool(dashboard.autoRefresh, defaultConfig.links.enableAutoLinking),
      enableTicketLinks: defaultConfig.links.enableTicketLinks,
      enableDocumentLinks: defaultConfig.links.enableDocumentLinks,
      enableHoverPreviews: defaultConfig.links.enableHoverPreviews,
      linkValidation: defaultConfig.links.linkValidation,
    },
    ui: {
      theme: defaultConfig.ui.theme,
      autoRefresh: getBool(dashboard.autoRefresh, defaultConfig.ui.autoRefresh),
      refreshInterval: getNumber(dashboard.refreshInterval, defaultConfig.ui.refreshInterval),
    },
    system: defaultConfig.system,
  }
}

export function validateConfig(config: unknown, quiet = false): GlobalConfig {
  logQuiet(quiet, 'Validating global configuration...')

  const root = asRecord(config)
  const discovery = asRecord(root.discovery)
  const links = asRecord(root.links)
  const ui = asRecord(root.ui)
  const system = asRecord(root.system)

  const result: GlobalConfig = {
    discovery: {
      autoDiscover: getBool(discovery?.autoDiscover, defaultConfig.discovery.autoDiscover),
      searchPaths: getArray(discovery?.searchPaths, defaultConfig.discovery.searchPaths),
      maxDepth: getNumber(discovery?.maxDepth, defaultConfig.discovery.maxDepth),
    },
    links: {
      enableAutoLinking: getBool(links?.enableAutoLinking, defaultConfig.links.enableAutoLinking),
      enableTicketLinks: getBool(links?.enableTicketLinks, defaultConfig.links.enableTicketLinks),
      enableDocumentLinks: getBool(links?.enableDocumentLinks, defaultConfig.links.enableDocumentLinks),
      enableHoverPreviews: getBool(links?.enableHoverPreviews, defaultConfig.links.enableHoverPreviews),
      linkValidation: getBool(links?.linkValidation, defaultConfig.links.linkValidation),
    },
  }

  // Add optional properties if they exist or have defaults
  if (root.ui !== undefined) {
    result.ui = {
      theme: getEnum(ui?.theme, ['light', 'dark', 'auto'], defaultConfig.ui.theme) as 'auto' | 'light' | 'dark',
      autoRefresh: getBool(ui?.autoRefresh, defaultConfig.ui.autoRefresh),
      refreshInterval: getNumber(ui?.refreshInterval, defaultConfig.ui.refreshInterval),
    }
  }

  if (root.system !== undefined) {
    result.system = {
      logLevel: getEnum(system?.logLevel, ['error', 'warn', 'info', 'debug'], defaultConfig.system.logLevel) as 'error' | 'warn' | 'info' | 'debug',
      cacheTimeout: getNumber(system?.cacheTimeout, defaultConfig.system.cacheTimeout),
    }
  }

  return result
}

export function processConfig(config: unknown, quiet = false): GlobalConfig {
  const root = asRecord(config)
  return root.dashboard !== undefined ? migrateConfig(root, quiet) : validateConfig(root, quiet)
}

export function getDefaultConfig(): GlobalConfig {
  return defaultConfig
}
