/**
 * Configuration selector allowlist and exposure metadata (MDT-168).
 *
 * Default-deny: only selectors explicitly listed here may be read or written
 * through the configuration management API. This registry is the single source
 * of truth for selector identity, scope, exposure classification, owning UI
 * surface, and validation constraints.
 *
 * This module is pure contract data — no filesystem, controller, or UI behavior.
 */

/** Configuration scope: which storage adapter owns the selector. */
export const ConfigScope = {
  PROJECT: 'project',
  GLOBAL: 'global',
  USER: 'user',
  REGISTRY: 'registry',
} as const

export type ConfigScopeValue = (typeof ConfigScope)[keyof typeof ConfigScope]

/** Exposure classification controlling UI/API render and edit behavior. */
export const Exposure = {
  /** Safe, common setting with clear validation. Rendered as a normal setting. */
  EDITABLE: 'editable',
  /** High-impact setting; shown only with warning/confirmation or an advanced workflow. */
  GUARDED: 'guarded',
  /** Useful context but unsafe to mutate from UI. Display only. */
  READ_ONLY: 'readOnly',
  /** Must stay in config files/manual workflow. Not exposed in normal UI/API. */
  FILE_ONLY: 'fileOnly',
} as const

export type ExposureValue = (typeof Exposure)[keyof typeof Exposure]

/** Owning UI surface suggested for the selector. */
export const ConfigOwnerSurface = {
  DOCUMENTS_SETTINGS: 'documents-settings',
  PROJECT_EDIT: 'project-edit',
  SETTINGS: 'settings',
  NONE: 'none',
} as const

export type ConfigOwnerSurfaceValue
  = (typeof ConfigOwnerSurface)[keyof typeof ConfigOwnerSurface]

/** A single allowlisted selector descriptor. */
export interface ConfigSelector {
  /** Stable dotted path, e.g. `project.document.maxDepth`. */
  readonly selector: string
  readonly scope: ConfigScopeValue
  readonly exposure: ExposureValue
  readonly ownerSurface: ConfigOwnerSurfaceValue
  /** Human-readable validation constraints surfaced to the UI/API consumer. */
  readonly validation: string
}

/**
 * The default-deny allowlist. Adding a selector here is the only way to make it
 * readable/writable through the configuration management API.
 *
 * Source of truth: docs/CRs/MDT-168/configuration-exposure.md
 */
export const CONFIG_SELECTOR_ALLOWLIST: readonly ConfigSelector[] = [
  // --- project (local .mdt-config.toml) ---
  {
    selector: 'project.name',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation: 'Non-empty string, trimmed length >= 3, max 512 chars.',
  },
  {
    selector: 'project.description',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation: 'String, may be empty, max 512 chars.',
  },
  {
    selector: 'project.repository',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation: 'URL string or empty.',
  },
  {
    selector: 'project.active',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation: 'Boolean.',
  },
  {
    selector: 'project.ticketsPath',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.GUARDED,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation:
      'Relative path string; requires confirmation (guarded workflow).',
  },
  {
    selector: 'project.code',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.GUARDED,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation:
      '2-5 chars, uppercase alpha start, alphanumeric; confirmation required (guarded workflow).',
  },

  // --- project.cloudSync (MDT-200 cloud coordination binding) ---
  // Source: docs/architecture/cloud-sync/README.md § Project Binding.
  // enabled/pollIntervalSeconds are guarded (confirmable via UI); projectId and
  // serviceUrl are file-only (see inspect-config FILE_ONLY_SETTINGS) because
  // projectId is immutable while enabled and serviceUrl gates credential flow.
  {
    selector: 'project.cloudSync.enabled',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.GUARDED,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation:
      'Boolean; enable only after provisioning and a successful identity/membership probe (guarded workflow).',
  },
  {
    selector: 'project.cloudSync.pollIntervalSeconds',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.GUARDED,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation: 'Integer from 5 through 300; default 15 (guarded workflow).',
  },
  {
    selector: 'project.path',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.READ_ONLY,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation: 'Project root path (display context only).',
  },

  // --- project.document ---
  {
    selector: 'project.document.paths',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.DOCUMENTS_SETTINGS,
    validation: 'Array of relative document path strings.',
  },
  {
    selector: 'project.document.excludeFolders',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.DOCUMENTS_SETTINGS,
    validation:
      'Array of relative folder path strings; no ".." or absolute paths.',
  },
  {
    selector: 'project.document.maxDepth',
    scope: ConfigScope.PROJECT,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.DOCUMENTS_SETTINGS,
    validation: 'Integer between 1 and 10.',
  },

  // --- global discovery (CONFIG_DIR/config.toml) ---
  {
    selector: 'discovery.autoDiscover',
    scope: ConfigScope.GLOBAL,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'Boolean.',
  },
  {
    selector: 'discovery.searchPaths',
    scope: ConfigScope.GLOBAL,
    exposure: Exposure.GUARDED,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation:
      'Array of path strings; changes filesystem discovery scope (guarded).',
  },
  {
    selector: 'discovery.maxDepth',
    scope: ConfigScope.GLOBAL,
    exposure: Exposure.GUARDED,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'Integer between 1 and 50 (guarded).',
  },

  // --- global system ---
  {
    selector: 'system.cacheTimeout',
    scope: ConfigScope.GLOBAL,
    exposure: Exposure.GUARDED,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'Non-negative integer milliseconds (guarded, advanced).',
  },
  {
    selector: 'system.logLevel',
    scope: ConfigScope.GLOBAL,
    exposure: Exposure.GUARDED,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'One of: debug, info, warn, error (guarded, advanced).',
  },

  // --- global links ---
  {
    selector: 'links.enableAutoLinking',
    scope: ConfigScope.GLOBAL,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'Boolean.',
  },
  {
    selector: 'links.enableTicketLinks',
    scope: ConfigScope.GLOBAL,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'Boolean.',
  },
  {
    selector: 'links.enableDocumentLinks',
    scope: ConfigScope.GLOBAL,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'Boolean.',
  },
  {
    selector: 'links.enableHoverPreviews',
    scope: ConfigScope.GLOBAL,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'Boolean.',
  },
  {
    selector: 'links.linkValidation',
    scope: ConfigScope.GLOBAL,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'Boolean.',
  },

  // --- stable user preferences (CONFIG_DIR/user.toml) ---
  {
    selector: 'ui.projectSelector.visibleCount',
    scope: ConfigScope.USER,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'Positive integer.',
  },
  {
    selector: 'ui.projectSelector.compactInactive',
    scope: ConfigScope.USER,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.SETTINGS,
    validation: 'Boolean.',
  },

  // --- registry ---
  {
    selector: 'registry.project.path',
    scope: ConfigScope.REGISTRY,
    exposure: Exposure.GUARDED,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation:
      'Absolute project path; confirmation required (guarded workflow).',
  },
  {
    selector: 'registry.project.active',
    scope: ConfigScope.REGISTRY,
    exposure: Exposure.EDITABLE,
    ownerSurface: ConfigOwnerSurface.PROJECT_EDIT,
    validation: 'Boolean.',
  },
] as const

/** Lookup map keyed by selector dotted path. */
export const CONFIG_SELECTOR_MAP: ReadonlyMap<string, ConfigSelector> = new Map(
  CONFIG_SELECTOR_ALLOWLIST.map(s => [s.selector, s] as const),
)

/** Returns the selector descriptor if allowlisted, otherwise undefined. */
export function findSelector(selector: string): ConfigSelector | undefined {
  return CONFIG_SELECTOR_MAP.get(selector)
}

/** Whether a selector is on the allowlist at all. */
export function isAllowlisted(selector: string): boolean {
  return CONFIG_SELECTOR_MAP.has(selector)
}

/** Selectors that may be returned in API read responses (not file-only). */
export function readableSelectors(): readonly ConfigSelector[] {
  return CONFIG_SELECTOR_ALLOWLIST.filter(
    s => s.exposure !== Exposure.FILE_ONLY,
  )
}

/** Selectors that may be mutated through a scalar patch (editable only). */
export function editableSelectors(): readonly ConfigSelector[] {
  return CONFIG_SELECTOR_ALLOWLIST.filter(
    s => s.exposure === Exposure.EDITABLE,
  )
}

/** All allowlisted selector dotted paths (for allowlist exhaustiveness checks). */
export function allSelectorPaths(): readonly string[] {
  return CONFIG_SELECTOR_ALLOWLIST.map(s => s.selector)
}
