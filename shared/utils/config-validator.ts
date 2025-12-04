import { GlobalConfig } from '../services/ProjectService.js';
import { logQuiet } from './logger.js';

const defaultConfig = {
  discovery: { autoDiscover: true, searchPaths: [], maxDepth: 3 },
  links: { enableAutoLinking: true, enableTicketLinks: true, enableDocumentLinks: true, enableHoverPreviews: false, linkValidation: false },
  ui: { theme: 'auto' as const, autoRefresh: true, refreshInterval: 5000 },
  system: { logLevel: 'info' as const, cacheTimeout: 30000 }
};

function getBool(value: any, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function getNumber(value: any, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function getArray(value: any, fallback: string[]): string[] {
  return Array.isArray(value) ? value : fallback;
}

function getEnum<T extends string>(value: any, allowed: T[], fallback: T): T {
  return allowed.includes(value) ? value : fallback;
}

export function migrateConfig(oldConfig: any, quiet = false): GlobalConfig {
  logQuiet(quiet, 'Migrating old configuration structure...');

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
      theme: defaultConfig.ui.theme,
      autoRefresh: oldConfig.dashboard?.autoRefresh ?? defaultConfig.ui.autoRefresh,
      refreshInterval: oldConfig.dashboard?.refreshInterval ?? defaultConfig.ui.refreshInterval
    },
    system: defaultConfig.system
  };
}

export function validateConfig(config: any, quiet = false): GlobalConfig {
  logQuiet(quiet, 'Validating global configuration...');

  const { discovery, links, ui, system } = config || {};

  const result: GlobalConfig = {
    discovery: {
      autoDiscover: getBool(discovery?.autoDiscover, defaultConfig.discovery.autoDiscover),
      searchPaths: getArray(discovery?.searchPaths, defaultConfig.discovery.searchPaths),
      maxDepth: getNumber(discovery?.maxDepth, defaultConfig.discovery.maxDepth)
    },
    links: {
      enableAutoLinking: getBool(links?.enableAutoLinking, defaultConfig.links.enableAutoLinking),
      enableTicketLinks: getBool(links?.enableTicketLinks, defaultConfig.links.enableTicketLinks),
      enableDocumentLinks: getBool(links?.enableDocumentLinks, defaultConfig.links.enableDocumentLinks),
      enableHoverPreviews: getBool(links?.enableHoverPreviews, defaultConfig.links.enableHoverPreviews),
      linkValidation: getBool(links?.linkValidation, defaultConfig.links.linkValidation)
    }
  };

  // Add optional properties if they exist or have defaults
  if (ui !== undefined || config.ui !== undefined) {
    result.ui = {
      theme: getEnum(ui?.theme, ['light', 'dark', 'auto'], defaultConfig.ui.theme) as 'auto' | 'light' | 'dark',
      autoRefresh: getBool(ui?.autoRefresh, defaultConfig.ui.autoRefresh),
      refreshInterval: getNumber(ui?.refreshInterval, defaultConfig.ui.refreshInterval)
    };
  }

  if (system !== undefined || config.system !== undefined) {
    result.system = {
      logLevel: getEnum(system?.logLevel, ['error', 'warn', 'info', 'debug'], defaultConfig.system.logLevel) as 'error' | 'warn' | 'info' | 'debug',
      cacheTimeout: getNumber(system?.cacheTimeout, defaultConfig.system.cacheTimeout)
    };
  }

  return result;
}

export function processConfig(config: any, quiet = false): GlobalConfig {
  return config.dashboard ? migrateConfig(config, quiet) : validateConfig(config, quiet);
}

export function getDefaultConfig(): GlobalConfig {
  return defaultConfig;
}