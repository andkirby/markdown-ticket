
/**
 * Three-Strategy Configuration Architecture Interfaces
 *
 * Strategy 1: Global-Only Mode - Complete definition in global registry
 * Strategy 2: Project-First Mode (Default) - Complete definition in local config, minimal reference in global
 * Strategy 3: Auto-Discovery Mode - Complete definition in local config only
 */

/**
 * Global registry minimal reference (Project-First Strategy)
 * Stores only project location and metadata for discovery
 */
export interface GlobalRegistryMinimal {
  project: {
    path: string; // Absolute path to project directory
  };
  metadata: {
    dateRegistered: string;
    lastAccessed: string;
    version: string;
  };
}

/**
 * Global registry complete definition (Global-Only Strategy)
 * Stores complete project definition in global registry only
 */
export interface GlobalRegistryComplete {
  project: {
    id?: string;
    name: string;
    code: string;
    path: string;
    active: boolean;
    description?: string;
    repository?: string;
    startNumber?: number;
    counterFile?: string;
  };
  metadata: {
    dateRegistered: string;
    lastAccessed: string;
    version: string;
  };
}

/**
 * Local project configuration (Project-First and Auto-Discovery Strategies)
 * Complete project definition stored locally for portability
 */
export interface LocalProjectConfig {
  project: {
    id?: string;
    name: string;
    code: string;
    path?: string; // Project root path (optional - config file location determines root)
    startNumber: number;
    counterFile: string;
    active: boolean;
    description?: string;
    repository?: string;
    ticketsPath?: string; // Tickets path relative to project root (e.g., "docs/CRs")
  };
  document_paths?: string[];
  exclude_folders?: string[];
}

/**
 * Unified Project model (merged view for API consumers)
 * Combines global and local configurations according to strategy priorities
 */
export interface Project {
  id: string;
  project: {
    id?: string;
    name: string;
    code?: string;
    path: string; // Absolute path to project directory
    configFile: string; // Path to local config file
    counterFile?: string;
    startNumber?: number;
    active: boolean;
    description: string;
    repository?: string;
  };
  metadata: {
    dateRegistered: string;
    lastAccessed: string;
    version: string;
  };
  tickets?: {
    codePattern?: string;
  };
  autoDiscovered?: boolean; // True for Strategy 3 (Auto-Discovery)
  configPath?: string; // Path to local config (if exists)
  registryFile?: string; // Exact path to the registry file (for CLI operations)
}

/**
 * Legacy ProjectConfig interface (maintained for backward compatibility)
 * @deprecated Use LocalProjectConfig instead
 */
export interface ProjectConfig {
  project: {
    id?: string;
    name: string;
    code: string;
    path?: string; // Optional: config file location determines project root
    startNumber: number;
    counterFile: string;
    active?: boolean; // Added for three-strategy architecture compatibility
    description?: string;
    repository?: string;
    ticketsPath?: string; // Tickets path relative to project root
  };
}

/**
 * Project status enumeration
 */
export enum ProjectStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

/**
 * Helper function to generate ticket codes based on project configuration
 */
export function generateTicketCode(project: Project, projectConfig: ProjectConfig | null, existingTicketCount: number): string {
  const projectCode = projectConfig?.project?.code || project.id.toUpperCase();
  const startNumber = projectConfig?.project?.startNumber || 1;
  const ticketNumber = startNumber + existingTicketCount;
  return `${projectCode}-${ticketNumber.toString().padStart(3, '0')}`;
}

/**
 * Get tickets path from configuration with backward compatibility
 * Simplified priority: project.ticketsPath -> project.path (legacy) -> defaultPath
 */
export function getTicketsPath(config: ProjectConfig | null, defaultPath: string = 'docs/CRs'): string {
  if (!config) {
    return defaultPath;
  }

  // New flat format: project.ticketsPath (preferred)
  if (config.project?.ticketsPath) {
    return config.project.ticketsPath;
  }

  // Legacy format: project.path contains tickets path
  if (config.project?.path) {
    return config.project.path;
  }

  return defaultPath;
}

/**
 * Check if configuration uses legacy format (tickets path in project.path)
 */
export function isLegacyConfig(config: ProjectConfig | null): boolean {
  if (!config || !config.project?.path) {
    return false;
  }

  // Legacy format: project.path exists and is not the new ticketsPath format
  return !config.project.ticketsPath && !!config.project.path;
}

/**
 * Migrate legacy configuration to new format
 * Moves project.path (tickets) to project.ticketsPath and sets project.path to "."
 */
export function migrateLegacyConfig(config: ProjectConfig): ProjectConfig {
  if (!isLegacyConfig(config)) {
    return config;
  }

  // At this point, config.project.path is guaranteed to be a string (not undefined)
  // because isLegacyConfig() checks for its existence and non-undefined value
  const legacyTicketsPath = config.project.path!; // Non-null assertion - safe due to isLegacyConfig check

  // Create a clean migrated configuration
  return {
    ...config,
    project: {
      ...config.project,
      // Set project.path to "." since it represents the project root
      // The legacy path was actually the tickets path, not the project root
      path: ".",
      // Move the legacy path to ticketsPath where it belongs
      ticketsPath: legacyTicketsPath
    }
  };
}

/**
 * Validate local project configuration (LocalProjectConfig or legacy ProjectConfig)
 * Accepts all properly formed project configurations regardless of creation method
 */
export function validateProjectConfig(config: any): config is ProjectConfig {
  if (!config || !config.project) {
    return false;
  }

  const project = config.project;

  // Required fields for all configurations
  const hasValidName = typeof project.name === 'string' && project.name.trim().length > 0;
  const hasValidCode = typeof project.code === 'string' && project.code.trim().length > 0;
  // path is optional in new configs since config file location determines project root
  const hasValidPath = project.path === undefined ||
    (typeof project.path === 'string' && project.path.trim().length > 0);

  // Optional fields with defaults if missing
  const hasValidStartNumber = project.startNumber === undefined ||
    typeof project.startNumber === 'number' ||
    (typeof project.startNumber === 'string' && !isNaN(Number(project.startNumber)));

  const hasValidCounterFile = project.counterFile === undefined ||
    typeof project.counterFile === 'string';

  const hasValidDescription = project.description === undefined ||
    typeof project.description === 'string';

  const hasValidRepository = project.repository === undefined ||
    typeof project.repository === 'string';

  // Optional fields for LocalProjectConfig - handle both array and object formats
  const hasValidDocumentPaths = config.document_paths === undefined ||
    (Array.isArray(config.document_paths) && config.document_paths.every((p: any) => typeof p === 'string')) ||
    (config.document_paths && config.document_paths.paths && Array.isArray(config.document_paths.paths) && config.document_paths.paths.every((p: any) => typeof p === 'string'));

  const hasValidExcludeFolders = config.exclude_folders === undefined ||
    (Array.isArray(config.exclude_folders) && config.exclude_folders.every((f: any) => typeof f === 'string')) ||
    (config.exclude_folders && config.exclude_folders.folders && Array.isArray(config.exclude_folders.folders) && config.exclude_folders.folders.every((f: any) => typeof f === 'string'));

  return hasValidName && hasValidCode && hasValidPath && hasValidStartNumber &&
         hasValidCounterFile && hasValidDescription && hasValidRepository &&
         hasValidDocumentPaths && hasValidExcludeFolders;
}
