import type { GlobalConfig } from '@mdt/domain-contracts'
import { GLOBAL_CONFIG_DEFAULTS, validateGlobalConfig } from '@mdt/domain-contracts'
import { logQuiet } from './logger.js'

const defaultConfig: GlobalConfig = {
  discovery: { ...GLOBAL_CONFIG_DEFAULTS.discovery, searchPaths: [...GLOBAL_CONFIG_DEFAULTS.discovery.searchPaths] },
  links: { ...GLOBAL_CONFIG_DEFAULTS.links },
  ui: { ...GLOBAL_CONFIG_DEFAULTS.ui },
  system: { ...GLOBAL_CONFIG_DEFAULTS.system },
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

function getEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback
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

  return validateGlobalConfig({
    discovery: {
      autoDiscover: getBool(asRecord(root.discovery).autoDiscover, defaultConfig.discovery.autoDiscover),
      searchPaths: getArray(asRecord(root.discovery).searchPaths, defaultConfig.discovery.searchPaths),
      maxDepth: getNumber(asRecord(root.discovery).maxDepth, defaultConfig.discovery.maxDepth),
    },
    links: {
      enableAutoLinking: getBool(asRecord(root.links).enableAutoLinking, defaultConfig.links.enableAutoLinking),
      enableTicketLinks: getBool(asRecord(root.links).enableTicketLinks, defaultConfig.links.enableTicketLinks),
      enableDocumentLinks: getBool(asRecord(root.links).enableDocumentLinks, defaultConfig.links.enableDocumentLinks),
      enableHoverPreviews: getBool(asRecord(root.links).enableHoverPreviews, defaultConfig.links.enableHoverPreviews),
      linkValidation: getBool(asRecord(root.links).linkValidation, defaultConfig.links.linkValidation),
    },
    ui: {
      theme: getEnum(asRecord(root.ui).theme, ['light', 'dark', 'auto'], defaultConfig.ui.theme),
      autoRefresh: getBool(asRecord(root.ui).autoRefresh, defaultConfig.ui.autoRefresh),
      refreshInterval: getNumber(asRecord(root.ui).refreshInterval, defaultConfig.ui.refreshInterval),
    },
    system: {
      logLevel: getEnum(asRecord(root.system).logLevel, ['error', 'warn', 'info', 'debug'], defaultConfig.system.logLevel),
      cacheTimeout: getNumber(asRecord(root.system).cacheTimeout, defaultConfig.system.cacheTimeout),
    },
  })
}

export function processConfig(config: unknown, quiet = false): GlobalConfig {
  const root = asRecord(config)
  return root.dashboard !== undefined ? migrateConfig(root, quiet) : validateConfig(root, quiet)
}

export function getDefaultConfig(): GlobalConfig {
  return defaultConfig
}
