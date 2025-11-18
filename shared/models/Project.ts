/**
 * Shared Project Model for Frontend, Backend, and MCP
 * Ensures consistent project structure across all systems
 */

export interface Project {
  id: string;
  project: {
    id?: string;
    name: string;
    code?: string;
    path: string;
    configFile: string;
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
  autoDiscovered?: boolean;
  configPath?: string;
}

export interface ProjectConfig {
  project: {
    id?: string;
    name: string;
    code: string;
    path: string;
    startNumber: number;
    counterFile: string;
    description?: string;
    repository?: string;
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
 * Validate project configuration
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
  const hasValidPath = typeof project.path === 'string' && project.path.trim().length > 0;

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

  return hasValidName && hasValidCode && hasValidPath && hasValidStartNumber &&
         hasValidCounterFile && hasValidDescription && hasValidRepository;
}
