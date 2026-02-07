/**
 * Three-Strategy Configuration Architecture Interfaces
 *
 * Strategy 1: Global-Only Mode - Complete definition in global registry
 * Strategy 2: Project-First Mode (Default) - Complete definition in local config, minimal reference in global
 * Strategy 3: Auto-Discovery Mode - Complete definition in local config only
 */

/**
 * Local project configuration (Project-First and Auto-Discovery Strategies)
 * Complete project definition stored locally for portability
 */
export interface LocalProjectConfig {
  project: {
    id?: string
    name: string
    code: string
    path?: string // Project root path (optional - config file location determines root)
    startNumber: number
    counterFile: string
    active: boolean
    description?: string
    repository?: string
    ticketsPath?: string // Tickets path relative to project root (e.g., "docs/CRs")
  }
  document: {
    paths?: string[]
    excludeFolders?: string[]
    maxDepth?: number
  }
}

/**
 * Unified Project model (merged view for API consumers)
 * Combines global and local configurations according to strategy priorities
 */
export interface Project {
  id: string
  project: {
    id?: string
    name: string
    code?: string
    path: string // Absolute path to project directory
    configFile: string // Path to local config file
    counterFile?: string
    startNumber?: number
    active: boolean
    description: string
    repository?: string
    ticketsPath?: string
  }
  metadata: {
    dateRegistered: string
    lastAccessed: string
    version: string
    globalOnly?: boolean // True for Strategy 1 (Global-Only)
  }
  tickets?: {
    codePattern?: string
  }
  document?: {
    paths?: string[]
    excludeFolders?: string[]
    maxDepth?: number
  }
  autoDiscovered?: boolean // True for Strategy 3 (Auto-Discovery)
  configPath?: string // Path to local config (if exists)
  registryFile?: string // Exact path to the registry file (for CLI operations)
}

/**
 * Legacy ProjectConfig interface (maintained for backward compatibility)
 * @deprecated Use LocalProjectConfig instead
 */
export interface ProjectConfig {
  project: {
    id?: string
    name: string
    code: string
    path?: string // Optional: config file location determines project root
    startNumber: number
    counterFile: string
    active?: boolean // Added for three-strategy architecture compatibility
    description?: string
    repository?: string
    ticketsPath?: string // Tickets path relative to project root
  }
  document: {
    paths?: string[]
    excludeFolders?: string[]
    maxDepth?: number
  }
}

/**
 * Get tickets path from configuration with backward compatibility
 * Simplified priority: project.ticketsPath -> project.path (legacy) -> defaultPath
 */
export function getTicketsPath(config: ProjectConfig | null, defaultPath: string = 'docs/CRs'): string {
  if (!config) {
    return defaultPath
  }

  // New flat format: project.ticketsPath (preferred)
  if (config.project?.ticketsPath) {
    return config.project.ticketsPath
  }

  // Legacy format: project.path contains tickets path
  if (config.project?.path) {
    return config.project.path
  }

  return defaultPath
}

/**
 * Check if configuration uses legacy format (tickets path in project.path)
 */
export function isLegacyConfig(config: ProjectConfig | null): boolean {
  if (!config || !config.project?.path) {
    return false
  }

  // Legacy format: project.path exists and is not the new ticketsPath format
  return !config.project.ticketsPath && !!config.project.path
}

/**
 * Legacy configuration format with snake_case document paths
 */
interface LegacyProjectConfig extends ProjectConfig {
  document_paths?: string[]
  exclude_folders?: string[]
}

/**
 * Migrate legacy configuration to new format
 * Moves project.path (tickets) to project.ticketsPath and sets project.path to "."
 */
export function migrateLegacyConfig(config: ProjectConfig): ProjectConfig {
  if (!isLegacyConfig(config)) {
    return config
  }

  // At this point, config.project.path is guaranteed to be a string (not undefined)
  // because isLegacyConfig() checks for its existence and non-undefined value
  const legacyTicketsPath = config.project.path! // Non-null assertion - safe due to isLegacyConfig check

  // Create a clean migrated configuration
  return {
    ...config,
    project: {
      ...config.project,
      // Set project.path to "." since it represents the project root
      // The legacy path was actually the tickets path, not the project root
      path: '.',
      // Move the legacy path to ticketsPath where it belongs
      ticketsPath: legacyTicketsPath,
    },
    // Add document section for legacy configs that don't have it
    document: config.document || {
      paths: Array.isArray((config as LegacyProjectConfig).document_paths) ? (config as LegacyProjectConfig).document_paths : [],
      excludeFolders: Array.isArray((config as LegacyProjectConfig).exclude_folders) ? (config as LegacyProjectConfig).exclude_folders : [],
    },
  }
}

/**
 * Unknown configuration type for validation
 */
type UnknownConfig = unknown

/**
 * Validate local project configuration (LocalProjectConfig or legacy ProjectConfig)
 * Accepts all properly formed project configurations regardless of creation method
 */
export function validateProjectConfig(config: UnknownConfig): config is ProjectConfig {
  if (!config || typeof config !== 'object' || !('project' in config)) {
    return false
  }

  const project = (config as Record<string, unknown>).project

  if (!project || typeof project !== 'object') {
    return false
  }

  const projectRecord = project as Record<string, unknown>

  // Required fields for all configurations
  const projectName = projectRecord.name
  const projectCode = projectRecord.code
  const projectPath = projectRecord.path
  const hasValidName = typeof projectName === 'string' && projectName.trim().length > 0
  const hasValidCode = typeof projectCode === 'string' && projectCode.trim().length > 0
  // path is optional in new configs since config file location determines project root
  const hasValidPath = projectPath === undefined
    || (typeof projectPath === 'string' && projectPath.trim().length > 0)

  // Optional fields with defaults if missing
  const startNumber = projectRecord.startNumber
  const hasValidStartNumber = startNumber === undefined
    || typeof startNumber === 'number'
    || (typeof startNumber === 'string' && !Number.isNaN(Number(startNumber)))

  const hasValidCounterFile = projectRecord.counterFile === undefined
    || typeof projectRecord.counterFile === 'string'

  const hasValidDescription = projectRecord.description === undefined
    || typeof projectRecord.description === 'string'

  const hasValidRepository = projectRecord.repository === undefined
    || typeof projectRecord.repository === 'string'

  // Optional fields for LocalProjectConfig - handle both array and object formats
  const document = (config as Record<string, unknown>).document
  const hasValidDocumentPaths = document === undefined
    || (typeof document === 'object' && document !== null && 'paths' in document
      && Array.isArray((document as Record<string, unknown>).paths)
      && ((document as Record<string, unknown>).paths as unknown[]).every((p: unknown) => typeof p === 'string'))

  const hasValidExcludeFolders = document === undefined
    || (typeof document === 'object' && document !== null && 'excludeFolders' in document
      && Array.isArray((document as Record<string, unknown>).excludeFolders)
      && ((document as Record<string, unknown>).excludeFolders as unknown[]).every((f: unknown) => typeof f === 'string'))

  return hasValidName && hasValidCode && hasValidPath && hasValidStartNumber
    && hasValidCounterFile && hasValidDescription && hasValidRepository
    && hasValidDocumentPaths && hasValidExcludeFolders
}
