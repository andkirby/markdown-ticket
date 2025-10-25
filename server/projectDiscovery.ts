import fs from 'fs';
import path from 'path';
import toml from 'toml';
import os from 'os';
// import { MarkdownService } from './shared/services/MarkdownService';
// import { ProjectService } from './shared/services/ProjectService';
// import { Project, ProjectConfig } from './shared/models/Project';
// import { Ticket } from './shared/models/Ticket';

// Temporarily using any types until shared services are migrated
interface Project {
  id: string;
  project: {
    name: string;
    code?: string;
    path: string;
    active: boolean;
    description?: string;
    repository?: string;
  };
  metadata: {
    dateRegistered: string;
    lastAccessed: string;
    version: string;
  };
}

interface Ticket {
  code: string;
  title: string;
  status: string;
  type: string;
  priority: string;
  dateCreated: Date | null;
  lastModified: Date | null;
  content: string;
  filePath: string;
  phaseEpic?: string;
  assignee?: string;
  implementationDate?: Date | null;
  implementationNotes?: string;
  relatedTickets: string[];
  dependsOn: string[];
  blocks: string[];
}

// Temporarily unused until shared services are migrated
// interface ProjectService {
//   autoDiscoverProjects(searchPaths: string[]): Project[];
// }

// interface MarkdownService {
//   scanMarkdownFiles(fullCRPath: string, projectPath: string): Promise<Ticket[]>;
// }

const CONFIG_FILES = {
  PROJECT_CONFIG: '.mdt-config.toml',
  COUNTER_FILE: '.mdt-next'
} as const;

interface GlobalConfig {
  dashboard: {
    port: number;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  discovery: {
    autoDiscover: boolean;
    searchPaths: string[];
  };
}

interface ProjectCache {
  projects: (Project | ExtendedProject)[] | null;
  timestamp: number;
  ttl: number;
}

interface ExtendedProject {
  id: string;
  project: {
    name: string;
    path: string;
    configFile: string;
    active: boolean;
    description: string;
    code: string;
    crsPath: string;
    repository: string;
    startNumber: number;
    counterFile: string;
  };
  metadata: {
    dateRegistered: string;
    lastAccessed: string;
    version: string;
  };
}

interface LocalProjectConfig {
  project?: {
    name: string;
    code: string;
    path?: string;
    description?: string;
    repository?: string;
    startNumber?: number;
    counterFile?: string;
  };
}

/**
 * Unified Project Discovery Service (Server Implementation)
 * Uses shared logic but with server dependencies
 */
class ProjectDiscoveryService {
  private globalConfigDir: string;
  private projectsDir: string;
  private globalConfigPath: string;
  private sharedProjectService: { autoDiscoverProjects: (_searchPaths: string[]) => Project[] };
  private cache: ProjectCache;

  constructor() {
    this.globalConfigDir = path.join(os.homedir(), '.config', 'markdown-ticket');
    this.projectsDir = path.join(this.globalConfigDir, 'projects');
    this.globalConfigPath = path.join(this.globalConfigDir, 'config.toml');
    // this.sharedProjectService = new ProjectService();
    // Will be implemented when shared services are migrated
    this.sharedProjectService = {
      autoDiscoverProjects: (_searchPaths: string[]) => []
    };

    // Cache for project discovery results
    this.cache = {
      projects: null,
      timestamp: 0,
      ttl: 30000 // 30 seconds cache TTL
    };
  }

  /**
   * Get global dashboard configuration
   */
  getGlobalConfig(): GlobalConfig {
    try {
      if (!fs.existsSync(this.globalConfigPath)) {
        return {
          dashboard: { port: 3002, autoRefresh: true, refreshInterval: 5000 },
          discovery: { autoDiscover: true, searchPaths: [] }
        };
      }

      const configContent = fs.readFileSync(this.globalConfigPath, 'utf8');
      return toml.parse(configContent) as GlobalConfig;
    } catch (error) {
      console.error('Error reading global config:', error);
      return {
        dashboard: { port: 3002, autoRefresh: true, refreshInterval: 5000 },
        discovery: { autoDiscover: true, searchPaths: [] }
      };
    }
  }

  /**
   * Get all registered projects
   */
  getRegisteredProjects(): ExtendedProject[] {
    try {
      if (!fs.existsSync(this.projectsDir)) {
        return [];
      }

      const projects: ExtendedProject[] = [];
      const projectFiles = fs.readdirSync(this.projectsDir)
        .filter(file => file.endsWith('.toml'));

      for (const file of projectFiles) {
        try {
          const projectPath = path.join(this.projectsDir, file);
          const content = fs.readFileSync(projectPath, 'utf8');
          const projectData = toml.parse(content);

          // Read the actual project data from local config file
          const localConfig = this.getProjectConfig(projectData.project?.path || '');

          const project: ExtendedProject = {
            id: path.basename(file, '.toml'),
            project: {
              name: localConfig?.project?.name || projectData.project?.name || 'Unknown Project',
              path: projectData.project?.path || '',
              configFile: path.join(projectData.project?.path || '', CONFIG_FILES.PROJECT_CONFIG),
              active: projectData.project?.active !== false,
              description: localConfig?.project?.description || projectData.project?.description || '',
              code: localConfig?.project?.code || '',
              crsPath: localConfig?.project?.path || 'docs/CRs',
              repository: localConfig?.project?.repository || '',
              startNumber: localConfig?.project?.startNumber || 1,
              counterFile: localConfig?.project?.counterFile || '.mdt-next'
            },
            metadata: {
              dateRegistered: projectData.metadata?.dateRegistered || new Date().toISOString().split('T')[0],
              lastAccessed: projectData.metadata?.lastAccessed || new Date().toISOString().split('T')[0],
              version: projectData.metadata?.version || '1.0.0'
            }
          };

          projects.push(project);
        } catch (error) {
          console.error(`Error parsing project file ${file}:`, error);
        }
      }

      return projects;
    } catch (error) {
      console.error('Error reading registered projects:', error);
      return [];
    }
  }

  /**
   * Get project configuration from local .mdt-config.toml
   */
  getProjectConfig(projectPath: string): LocalProjectConfig | null {
    try {
      const configPath = path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG);

      if (!fs.existsSync(configPath)) {
        return null;
      }

      const content = fs.readFileSync(configPath, 'utf8');
      const config = toml.parse(content) as LocalProjectConfig;

      if (config && config.project &&
          typeof config.project.name === 'string' &&
          typeof config.project.code === 'string') {
        return config;
      }

      return null;
    } catch (error) {
      console.error(`Error reading project config from ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Get all projects (registered + auto-discovered)
   */
  async getAllProjects(): Promise<(Project | ExtendedProject)[]> {
    const now = Date.now();

    // Return cached results if still valid
    if (this.cache.projects && (now - this.cache.timestamp) < this.cache.ttl) {
      return this.cache.projects;
    }

    const registered = this.getRegisteredProjects();

    const globalConfig = this.getGlobalConfig();

    if (globalConfig.discovery?.autoDiscover) {
      const searchPaths = globalConfig.discovery?.searchPaths || [];
      const discovered = this.sharedProjectService.autoDiscoverProjects(searchPaths);

      // Create sets for both path and id to avoid duplicates
      const registeredPaths = new Set(registered.map(p => p.project.path));
      const registeredIds = new Set(registered.map(p => p.id));

      const uniqueDiscovered = discovered.filter((p: Project) =>
        !registeredPaths.has(p.project.path) && !registeredIds.has(p.id)
      );

      // Combine and deduplicate by id (in case of any remaining duplicates)
      const allProjects = [...registered, ...uniqueDiscovered];
      const seenIds = new Set();

      const result = allProjects.filter(project => {
        if (seenIds.has(project.id)) {
          return false;
        }
        seenIds.add(project.id);
        return true;
      });

      // Cache the result
      this.cache.projects = result;
      this.cache.timestamp = now;

      return result;
    }

    // Cache registered projects too
    this.cache.projects = registered;
    this.cache.timestamp = now;
    return registered;
  }

  /**
   * Clear the project cache
   */
  clearCache(): void {
    this.cache.projects = null;
    this.cache.timestamp = 0;
  }

  /**
   * Get CRs for a specific project using shared MarkdownService
   */
  async getProjectCRs(projectPath: string): Promise<Ticket[]> {
    try {
      const config = this.getProjectConfig(projectPath);
      if (!config || !config.project) {
        return [];
      }

      const crPath = config.project.path || 'docs/CRs';
      const fullCRPath = path.resolve(projectPath, crPath);

      if (!fs.existsSync(fullCRPath)) {
        return [];
      }

      // Use shared MarkdownService for consistent parsing
      // Import shared service - use dynamic import to avoid bundling issues
      const sharedModule = await import('../shared/services/MarkdownService');
      const { MarkdownService } = sharedModule;
      return await MarkdownService.scanMarkdownFiles(fullCRPath, projectPath);
    } catch (error) {
      console.error(`Error getting CRs for project ${projectPath}:`, error);
      return [];
    }
  }
}

export default ProjectDiscoveryService;