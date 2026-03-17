import { z } from 'zod'

export const GLOBAL_DISCOVERY_DEFAULTS = {
  autoDiscover: true,
  searchPaths: [] as string[],
  maxDepth: 3,
} as const

export const GLOBAL_LINKS_DEFAULTS = {
  enableAutoLinking: true,
  enableTicketLinks: true,
  enableDocumentLinks: true,
  enableHoverPreviews: false,
  linkValidation: false,
} as const

export const GLOBAL_UI_DEFAULTS = {
  theme: 'auto' as const,
  autoRefresh: true,
  refreshInterval: 5000,
} as const

export const GLOBAL_SYSTEM_DEFAULTS = {
  logLevel: 'info' as const,
  cacheTimeout: 30000,
} as const

export const GLOBAL_CONFIG_DEFAULTS = {
  discovery: { ...GLOBAL_DISCOVERY_DEFAULTS },
  links: { ...GLOBAL_LINKS_DEFAULTS },
  ui: { ...GLOBAL_UI_DEFAULTS },
  system: { ...GLOBAL_SYSTEM_DEFAULTS },
} as const

export const PROJECT_SELECTOR_PREFERENCES_DEFAULTS = {
  visibleCount: 7,
  compactInactive: true,
} as const

export const SELECTOR_STATE_ENTRY_DEFAULTS = {
  favorite: false,
  lastUsedAt: null,
  count: 0,
} as const

export const USER_CONFIG_DEFAULTS = {
  ui: {
    projectSelector: { ...PROJECT_SELECTOR_PREFERENCES_DEFAULTS },
  },
} as const

export const GlobalDiscoveryConfigSchema = z.object({
  autoDiscover: z.boolean().catch(GLOBAL_DISCOVERY_DEFAULTS.autoDiscover).default(GLOBAL_DISCOVERY_DEFAULTS.autoDiscover),
  searchPaths: z.array(z.string()).catch([...GLOBAL_DISCOVERY_DEFAULTS.searchPaths]).default([...GLOBAL_DISCOVERY_DEFAULTS.searchPaths]),
  maxDepth: z.number().int().min(1).max(50).catch(GLOBAL_DISCOVERY_DEFAULTS.maxDepth).default(GLOBAL_DISCOVERY_DEFAULTS.maxDepth),
}).catch({ ...GLOBAL_DISCOVERY_DEFAULTS, searchPaths: [...GLOBAL_DISCOVERY_DEFAULTS.searchPaths] }).default({ ...GLOBAL_DISCOVERY_DEFAULTS, searchPaths: [...GLOBAL_DISCOVERY_DEFAULTS.searchPaths] })

export const GlobalLinksConfigSchema = z.object({
  enableAutoLinking: z.boolean().catch(GLOBAL_LINKS_DEFAULTS.enableAutoLinking).default(GLOBAL_LINKS_DEFAULTS.enableAutoLinking),
  enableTicketLinks: z.boolean().catch(GLOBAL_LINKS_DEFAULTS.enableTicketLinks).default(GLOBAL_LINKS_DEFAULTS.enableTicketLinks),
  enableDocumentLinks: z.boolean().catch(GLOBAL_LINKS_DEFAULTS.enableDocumentLinks).default(GLOBAL_LINKS_DEFAULTS.enableDocumentLinks),
  enableHoverPreviews: z.boolean().catch(GLOBAL_LINKS_DEFAULTS.enableHoverPreviews).default(GLOBAL_LINKS_DEFAULTS.enableHoverPreviews),
  linkValidation: z.boolean().catch(GLOBAL_LINKS_DEFAULTS.linkValidation).default(GLOBAL_LINKS_DEFAULTS.linkValidation),
}).catch({ ...GLOBAL_LINKS_DEFAULTS }).default({ ...GLOBAL_LINKS_DEFAULTS })

export const GlobalUIConfigSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).catch(GLOBAL_UI_DEFAULTS.theme).default(GLOBAL_UI_DEFAULTS.theme),
  autoRefresh: z.boolean().catch(GLOBAL_UI_DEFAULTS.autoRefresh).default(GLOBAL_UI_DEFAULTS.autoRefresh),
  refreshInterval: z.number().int().min(0).catch(GLOBAL_UI_DEFAULTS.refreshInterval).default(GLOBAL_UI_DEFAULTS.refreshInterval),
}).catch({ ...GLOBAL_UI_DEFAULTS }).default({ ...GLOBAL_UI_DEFAULTS })

export const GlobalSystemConfigSchema = z.object({
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).catch(GLOBAL_SYSTEM_DEFAULTS.logLevel).default(GLOBAL_SYSTEM_DEFAULTS.logLevel),
  cacheTimeout: z.number().int().min(0).catch(GLOBAL_SYSTEM_DEFAULTS.cacheTimeout).default(GLOBAL_SYSTEM_DEFAULTS.cacheTimeout),
}).catch({ ...GLOBAL_SYSTEM_DEFAULTS }).default({ ...GLOBAL_SYSTEM_DEFAULTS })

export const GlobalConfigSchema = z.object({
  discovery: GlobalDiscoveryConfigSchema.default({ ...GLOBAL_DISCOVERY_DEFAULTS, searchPaths: [...GLOBAL_DISCOVERY_DEFAULTS.searchPaths] }),
  links: GlobalLinksConfigSchema.default({ ...GLOBAL_LINKS_DEFAULTS }),
  ui: GlobalUIConfigSchema.default({ ...GLOBAL_UI_DEFAULTS }),
  system: GlobalSystemConfigSchema.default({ ...GLOBAL_SYSTEM_DEFAULTS }),
}).catch({
  discovery: { ...GLOBAL_DISCOVERY_DEFAULTS, searchPaths: [...GLOBAL_DISCOVERY_DEFAULTS.searchPaths] },
  links: { ...GLOBAL_LINKS_DEFAULTS },
  ui: { ...GLOBAL_UI_DEFAULTS },
  system: { ...GLOBAL_SYSTEM_DEFAULTS },
}).default({
  discovery: { ...GLOBAL_DISCOVERY_DEFAULTS, searchPaths: [...GLOBAL_DISCOVERY_DEFAULTS.searchPaths] },
  links: { ...GLOBAL_LINKS_DEFAULTS },
  ui: { ...GLOBAL_UI_DEFAULTS },
  system: { ...GLOBAL_SYSTEM_DEFAULTS },
})

export const SelectorPreferencesSchema = z.object({
  visibleCount: z.number().int().min(1).catch(PROJECT_SELECTOR_PREFERENCES_DEFAULTS.visibleCount).default(PROJECT_SELECTOR_PREFERENCES_DEFAULTS.visibleCount),
  compactInactive: z.boolean().catch(PROJECT_SELECTOR_PREFERENCES_DEFAULTS.compactInactive).default(PROJECT_SELECTOR_PREFERENCES_DEFAULTS.compactInactive),
}).catch({ ...PROJECT_SELECTOR_PREFERENCES_DEFAULTS }).default({ ...PROJECT_SELECTOR_PREFERENCES_DEFAULTS })

export const UserUIConfigSchema = z.object({
  projectSelector: SelectorPreferencesSchema.default({ ...PROJECT_SELECTOR_PREFERENCES_DEFAULTS }),
}).catch({
  projectSelector: { ...PROJECT_SELECTOR_PREFERENCES_DEFAULTS },
}).default({
  projectSelector: { ...PROJECT_SELECTOR_PREFERENCES_DEFAULTS },
})

export const UserConfigSchema = z.object({
  ui: UserUIConfigSchema.default({
    projectSelector: { ...PROJECT_SELECTOR_PREFERENCES_DEFAULTS },
  }),
}).catch({
  ui: {
    projectSelector: { ...PROJECT_SELECTOR_PREFERENCES_DEFAULTS },
  },
}).default({
  ui: {
    projectSelector: { ...PROJECT_SELECTOR_PREFERENCES_DEFAULTS },
  },
})

export const SelectorStateEntrySchema = z.object({
  favorite: z.boolean().catch(SELECTOR_STATE_ENTRY_DEFAULTS.favorite).default(SELECTOR_STATE_ENTRY_DEFAULTS.favorite),
  lastUsedAt: z.string().datetime({ offset: true }).nullable().catch(SELECTOR_STATE_ENTRY_DEFAULTS.lastUsedAt).default(SELECTOR_STATE_ENTRY_DEFAULTS.lastUsedAt),
  count: z.number().int().min(0).catch(SELECTOR_STATE_ENTRY_DEFAULTS.count).default(SELECTOR_STATE_ENTRY_DEFAULTS.count),
}).catch({ ...SELECTOR_STATE_ENTRY_DEFAULTS }).default({ ...SELECTOR_STATE_ENTRY_DEFAULTS })

export const SelectorStateSchema = z.record(SelectorStateEntrySchema).catch({}).default({})

export type GlobalConfig = z.output<typeof GlobalConfigSchema>
export type GlobalConfigInput = z.input<typeof GlobalConfigSchema>
export type UserConfig = z.output<typeof UserConfigSchema>
export type UserConfigInput = z.input<typeof UserConfigSchema>
export type SelectorPreferences = z.output<typeof SelectorPreferencesSchema>
export type SelectorStateEntry = z.output<typeof SelectorStateEntrySchema>
export type SelectorState = z.output<typeof SelectorStateSchema>
