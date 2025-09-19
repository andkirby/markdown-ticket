/**
 * Shared Project Model for Frontend, Backend, and MCP
 * Ensures consistent project structure across all systems
 */

export interface Project {
  id: string;
  project: {
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
 */
export function validateProjectConfig(config: any): config is ProjectConfig {
  return (
    config &&
    config.project &&
    typeof config.project.name === 'string' &&
    typeof config.project.code === 'string' &&
    typeof config.project.path === 'string' &&
    typeof config.project.startNumber === 'number'
  );
}
