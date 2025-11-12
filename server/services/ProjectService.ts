import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { DEFAULT_PATHS } from '@mdt/shared/utils/constants.js';

// Type definitions
interface Project {
  id: string;
  project: {
    name: string;
    path: string;
    active: boolean;
  };
}

interface ProjectWithConfig {
  project: Project;
  config: ProjectConfig;
}

interface ProjectConfig {
  code: string;
  project?: {
    path?: string;
    counterFile?: string;
  };
}

interface CreateProjectData {
  name: string;
  code?: string;
  path: string;
  crsPath?: string;
  description?: string;
  repositoryUrl?: string;
}

interface CreateProjectResult {
  success: boolean;
  message: string;
  project: {
    id: string;
    path: string;
    configFile: string;
    active: boolean;
  };
  configPath: string;
}

interface UpdateProjectData {
  name?: string;
  crsPath?: string;
  description?: string;
  repositoryUrl?: string;
}

interface UpdateResult {
  success: boolean;
  message: string;
}

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface DirectoryListing {
  currentPath: string;
  parentPath: string;
  directories: DirectoryEntry[];
}

interface ConfigureDocumentsResult {
  success: boolean;
}

interface ProjectDiscovery {
  getAllProjects(): Promise<Project[]>;
  getProjectConfig(projectPath: string): ProjectConfig | null;
}

/**
 * Service layer for project management operations
 */
export class ProjectService {
  public projectDiscovery: ProjectDiscovery;

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery;
  }

  /**
   * Get all registered projects
   * @returns Array of project objects
   */
  async getAllProjects(): Promise<Project[]> {
    return await this.projectDiscovery.getAllProjects();
  }

  /**
   * Get specific project by ID
   * @param projectId - Project ID
   * @returns Project object or null if not found
   */
  async getProjectById(projectId: string): Promise<Project | null> {
    const projects = await this.projectDiscovery.getAllProjects();
    return projects.find(p => p.id === projectId) || null;
  }

  /**
   * Get project configuration
   * @param projectId - Project ID
   * @returns Project and config object
   */
  async getProjectConfig(projectId: string): Promise<ProjectWithConfig> {
    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // For auto-discovered projects, use the directory containing the config file
    let configPath: string;
    if ((project as any).autoDiscovered && (project as any).configPath) {
      configPath = path.dirname((project as any).configPath);
    } else {
      configPath = project.project.path;
    }

    const config = this.projectDiscovery.getProjectConfig(configPath);
    if (!config) {
      throw new Error('Project configuration not found');
    }

    return { project, config };
  }

  /**
   * Create a new project
   * @param projectData - Project data
   * @returns Created project info
   */
  async createProject(projectData: CreateProjectData): Promise<CreateProjectResult> {
    const { name, code, path: projectPath, crsPath = 'docs/CRs', description, repositoryUrl } = projectData;

    if (!name || !projectPath) {
      throw new Error('Name and path are required');
    }

    // Verify project path exists
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        throw new Error('Project path must be a directory');
      }
    } catch (_error) {
      throw new Error('Project path does not exist');
    }

    // Generate project code if not provided
    const projectCode = code || name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);

    // Create project config directory
    const configDir = DEFAULT_PATHS.PROJECTS_REGISTRY;
    await fs.mkdir(configDir, { recursive: true });

    // Create project config file using directory name, fallback to project code
    const projectDirName = path.basename(projectPath);
    const configFileName = `${projectDirName}.toml`;
    const configFilePath = path.join(configDir, configFileName);

    // Check if project already exists
    try {
      await fs.access(configFilePath);
      throw new Error('Project with this directory name already exists');
    } catch (error: any) {
      if (error.message === 'Project with this directory name already exists') {
        throw error;
      }
      // Check fallback with project code
      try {
        const fallbackConfigFileName = `${projectCode.toLowerCase()}.toml`;
        const fallbackConfigFilePath = path.join(configDir, fallbackConfigFileName);
        await fs.access(fallbackConfigFilePath);
        throw new Error('Project with this code already exists');
      } catch (fallbackError: any) {
        if (fallbackError.message === 'Project with this code already exists') {
          throw fallbackError;
        }
        // Neither file exists, proceed with creation
      }
    }

    // Create CRs directory if it doesn't exist
    const crsDir = path.join(projectPath, crsPath);
    await fs.mkdir(crsDir, { recursive: true });

    // Create minimal global config content
    const globalConfigContent = `[project]
path = "${projectPath}"
active = true

[metadata]
dateRegistered = "${new Date().toISOString().split('T')[0]}"
lastAccessed = "${new Date().toISOString().split('T')[0]}"
`;

    // Write global config file
    await fs.writeFile(configFilePath, globalConfigContent, 'utf8');

    // Create local project config content
    const localConfigContent = `[project]
id = "${projectDirName}"
name = "${name}"
code = "${projectCode}"
path = "${crsPath}"
startNumber = 1
counterFile = ".mdt-next"
description = "${description || ''}"
${repositoryUrl ? `repository = "${repositoryUrl}"` : 'repository = ""'}
`;

    // Write local config file
    const localConfigPath = path.join(projectPath, '.mdt-config.toml');
    await fs.writeFile(localConfigPath, localConfigContent, 'utf8');

    // Create counter file
    const counterFile = path.join(projectPath, '.mdt-next');
    await fs.writeFile(counterFile, '1', 'utf8');

    return {
      success: true,
      message: 'Project created successfully',
      project: {
        id: projectDirName,
        path: projectPath,
        configFile: '.mdt-config.toml',
        active: true
      },
      configPath: configFilePath
    };
  }

  /**
   * Update existing project
   * @param projectCode - Project code
   * @param updates - Fields to update
   * @returns Success status
   */
  async updateProject(projectCode: string, updates: UpdateProjectData): Promise<UpdateResult> {
    const { name, crsPath, description, repositoryUrl } = updates;

    // Map known project codes to IDs (reverse of getProjectCode logic)
    const codeToIdMap: Record<string, string> = {
      'DEB': 'debug',
      'MDT': 'markdown-ticket',
      'CR': 'LlmTranslator',
      'GT': 'goto_dir',
      'SB': 'sentence-breakdown'
    };

    const projectId = codeToIdMap[projectCode] || projectCode.toLowerCase();

    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // Read current local config
    const localConfigPath = path.join(project.project.path, '.mdt-config.toml');
    let configContent = await fs.readFile(localConfigPath, 'utf8');

    // Update editable fields
    if (name) {
      configContent = configContent.replace(/^name = ".*"$/m, `name = "${name}"`);
    }
    if (crsPath) {
      configContent = configContent.replace(/^path = ".*"$/m, `path = "${crsPath}"`);
    }
    if (description !== undefined) {
      configContent = configContent.replace(/^description = ".*"$/m, `description = "${description}"`);
    }
    if (repositoryUrl !== undefined) {
      configContent = configContent.replace(/^repository = ".*"$/m, `repository = "${repositoryUrl}"`);
    }

    // Write updated config
    await fs.writeFile(localConfigPath, configContent, 'utf8');

    return { success: true, message: 'Project updated successfully' };
  }

  /**
   * Get system directories for project path selection
   * @param requestPath - Path to list directories from
   * @returns Directory listing
   */
  async getSystemDirectories(requestPath?: string): Promise<DirectoryListing> {
    const basePath = requestPath || process.env.HOME || os.homedir();

    // Security check - only allow paths under home directory
    const homedir = process.env.HOME || os.homedir();
    const resolvedPath = path.resolve(basePath);

    if (!resolvedPath.startsWith(homedir)) {
      throw new Error('Access denied to path outside home directory');
    }

    try {
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const directories = entries
        .filter(entry => entry.isDirectory())
        .filter(entry => !entry.name.startsWith('.') || entry.name === '.config')
        .map(entry => ({
          name: entry.name,
          path: path.join(resolvedPath, entry.name),
          isDirectory: true
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        currentPath: resolvedPath,
        parentPath: path.dirname(resolvedPath),
        directories
      };
    } catch (_error) {
      throw new Error('Directory not found or not accessible');
    }
  }

  /**
   * Configure document paths for a project
   * @param projectId - Project ID
   * @param documentPaths - Array of document paths
   * @returns Success status
   */
  async configureDocuments(projectId: string, documentPaths: string[]): Promise<ConfigureDocumentsResult> {
    if (!Array.isArray(documentPaths)) {
      throw new Error('Document paths must be an array');
    }

    const projects = await this.projectDiscovery.getAllProjects();
    const project = projects.find(p => p.id === projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    const projectPath = project.project.path;
    const configPath = path.join(projectPath, '.mdt-config.toml');

    // Create or update config file
    let configContent = '';

    try {
      configContent = await fs.readFile(configPath, 'utf8');
    } catch {
      // Config doesn't exist, start with empty content
    }

    // Remove existing document configuration section entirely
    configContent = configContent.replace(/\n*# Documentation Configuration[\s\S]*?(?=\n\n|\n$|$)/g, '');
    configContent = configContent.replace(/\n*document_paths\s*=\s*\[[\s\S]*?\]/g, '');
    configContent = configContent.replace(/\n*max_depth\s*=.*$/gm, '');

    // Clean up extra newlines
    configContent = configContent.replace(/\n{3,}/g, '\n\n').trim();

    // Add new document_paths (convert absolute paths to relative, keep relative paths as-is)
    const relativePaths = documentPaths.map(p => {
      // If path is already relative, keep it as-is
      if (!path.isAbsolute(p)) {
        return p;
      }
      // Convert absolute path to relative
      return path.relative(projectPath, p);
    });
    const pathsString = relativePaths.map(p => `    "${p}"`).join(',\n');

    // Add to config content
    if (!configContent.includes('[project]')) {
      configContent = '[project]\n' + configContent;
    }

    // Add document configuration section
    configContent += `\n\n# Documentation Configuration\ndocument_paths = [\n${pathsString}\n]\nmax_depth = 3             # Maximum directory depth for scanning`;

    await fs.writeFile(configPath, configContent + '\n', 'utf8');

    return { success: true };
  }
}