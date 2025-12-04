import { Project, ProjectConfig } from '../../models/Project.js';
import { Ticket } from '../../models/Ticket.js';

/** Global configuration interface */
export interface GlobalConfig {
  discovery: {
    autoDiscover: boolean;
    searchPaths: string[];
    maxDepth?: number;
  };
  links: {
    enableAutoLinking: boolean;
    enableTicketLinks: boolean;
    enableDocumentLinks: boolean;
    enableHoverPreviews?: boolean;
    linkValidation?: boolean;
  };
  ui?: {
    theme?: 'light' | 'dark' | 'auto';
    autoRefresh?: boolean;
    refreshInterval?: number;
  };
  system?: {
    logLevel?: 'error' | 'warn' | 'info' | 'debug';
    cacheTimeout?: number;
  };
}

/** Project cache structure */
export interface ProjectCache {
  projects: Project[] | null;
  timestamp: number;
  ttl: number;
}

/** Project discovery service - handles scanning and registry */
export interface IProjectDiscoveryService {
  getRegisteredProjects(): Project[];
  autoDiscoverProjects(searchPaths: string[]): Project[];
  registerProject(project: Project): void;
  // Additional methods from original ProjectService that weren't extracted:
  deleteProject?(projectId: string, deleteLocalConfig?: boolean): Promise<void>;
  getProjectByCodeOrId?(codeOrId: string): Promise<Project | null>;
  generateProjectId?(name: string): Promise<string>;
  getProjectCRs?(projectPath: string): Promise<Ticket[]>;
}

/** Project configuration service - handles local and global configs */
export interface IProjectConfigService {
  getGlobalConfig(): GlobalConfig;
  getProjectConfig(projectPath: string): ProjectConfig | null;
  createOrUpdateLocalConfig(
    projectId: string,
    projectPath: string,
    name: string,
    code: string,
    description?: string,
    repository?: string,
    globalOnly?: boolean,
    ticketsPath?: string
  ): void;
  updateProject(
    projectId: string,
    updates: Partial<Pick<ProjectConfig['project'], 'name' | 'description' | 'repository' | 'active' | 'ticketsPath'>>
  ): void;
  configureDocuments(projectId: string, documentPaths: string[]): Promise<void>;
}

/** Project cache service - handles caching for performance */
export interface IProjectCacheService {
  getAllProjects(): Promise<Project[]>;
  getAllProjectsFromCache(): Promise<Project[] | null>;
  clearCache(): void;
  isCacheValid(): boolean;
  getCacheAge(): number;
  setCacheTTL(ttl: number): void;
  setCachedProjects(projects: Project[]): void;
}

/** Project file system service - handles file operations */
export interface IProjectFileSystemService {
  getSystemDirectories(path?: string): Promise<{
    currentPath: string;
    parentPath: string;
    directories: Array<{ name: string; path: string; isDirectory: boolean; }>;
  }>;
  checkDirectoryExists(dirPath: string): Promise<{ exists: boolean }>;
}

/** Combined project service interface */
export interface IProjectService extends
  IProjectDiscoveryService,
  IProjectConfigService,
  IProjectCacheService,
  IProjectFileSystemService {}

/** Registry data structure */
export type RegistryData = {
  project: { path: string; code?: string; };
  metadata: { dateRegistered: string; lastAccessed: string; version: string; };
};

/** Project scan options */
export interface ProjectScanOptions {
  searchPaths: string[];
  maxDepth: number;
  includeHidden?: boolean;
  excludePatterns?: string[];
}

/** Project validation result */
export interface ProjectValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/** Project export format */
export interface ProjectExport {
  project: Project;
  config: ProjectConfig;
  tickets: Ticket[];
  exportedAt: string;
  version: string;
}