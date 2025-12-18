import * as fs from 'fs';
import * as path from 'path';
import { ProjectService } from '../services/ProjectService.js';
import { ProjectValidator } from './ProjectValidator.js';
import { Project } from '../models/Project.js';
import { CONFIG_FILES, DEFAULTS } from '../utils/constants.js';
import { ProjectError, CLI_ERROR_CODES } from './project-cli.js';
import { isPathWithinSearchPaths, calculatePathDepth } from '../utils/path-resolver.js';

/**
 * Project update input
 */
export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  repository?: string;
  active?: boolean;
  ticketsPath?: string; // Relative path for tickets
}

/**
 * Project creation input
 */
export interface ProjectCreateInput {
  name: string;
  code?: string;
  path: string;
  description?: string;
  repository?: string;
  globalOnly?: boolean; // Strategy 1: Global-only mode
  createProjectPath?: boolean; // Flag to auto-create project directory
  ticketsPath?: string; // Relative path for tickets (default: DEFAULTS.TICKETS_PATH)
  documentPaths?: string[]; // Document discovery paths (global-only mode only)
  maxDepth?: number; // Document discovery max depth (global-only mode only)
}

/**
 * Project manager with validation
 * Wraps ProjectService with validation and business logic
 */
export class ProjectManager {
  private projectService: ProjectService;
  private quiet: boolean;

  constructor(quiet: boolean = false) {
    this.quiet = quiet;
    this.projectService = new ProjectService(quiet);
  }

  /**
   * Create new project with three-strategy architecture support
   */
  async createProject(input: ProjectCreateInput): Promise<Project> {
    // Validate name
    const nameResult = ProjectValidator.validateName(input.name);
    if (!nameResult.valid) {
      throw new ProjectError(nameResult.error!, CLI_ERROR_CODES.VALIDATION_ERROR);
    }
    const name = nameResult.normalized!;

    // Validate or generate code
    let code: string;
    if (input.code) {
      const codeResult = ProjectValidator.validateCode(input.code);
      if (!codeResult.valid) {
        throw new ProjectError(codeResult.error!, CLI_ERROR_CODES.VALIDATION_ERROR);
      }
      code = codeResult.normalized!;
    } else {
      code = ProjectValidator.generateCodeFromName(name);
    }

    // Validate path (require existence unless createProjectPath flag is set)
    const pathResult = ProjectValidator.validatePath(input.path, {
      mustExist: !input.createProjectPath
    });
    if (!pathResult.valid) {
      throw new ProjectError(pathResult.error!, CLI_ERROR_CODES.VALIDATION_ERROR);
    }
    const projectPath = pathResult.normalized!;

    // Check for existing projects
    const allProjects = await this.projectService.getAllProjects();

    // Check if code is already used by another project
    const existingProjectByCode = allProjects.find(p => p.project.code === code);
    if (existingProjectByCode) {
      throw new ProjectError(
        `Project with code "${code}" already exists. To modify this project, use the update command: npm run project:update -- ${code}`,
        CLI_ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Check if there's an existing project at the same path
    const existingProjectByPath = allProjects.find(p => p.project.path === projectPath);
    let projectId: string;

    if (existingProjectByPath) {
      // If there's already a project at this path, we'll update it
      // This happens when a minimal registry entry exists and we're converting to global-only
      projectId = existingProjectByPath.id;
    } else {
      // Generate unique project ID from directory name for consistency with listing
      projectId = await this.projectService.generateProjectId(path.basename(projectPath));
    }

    // Validate description
    const description = input.description || '';
    if (description) {
      const descResult = ProjectValidator.validateDescription(description);
      if (!descResult.valid) {
        throw new ProjectError(descResult.error!, CLI_ERROR_CODES.VALIDATION_ERROR);
      }
    }

    // Validate repository
    const repository = input.repository || '';
    if (repository) {
      const repoResult = ProjectValidator.validateRepository(repository);
      if (!repoResult.valid) {
        throw new ProjectError(repoResult.error!, CLI_ERROR_CODES.VALIDATION_ERROR);
      }
    }

    // Validate tickets path if provided
    let ticketsPath: string | undefined;
    if (input.ticketsPath) {
      const ticketsPathResult = ProjectValidator.validateTicketsPath(input.ticketsPath);
      if (!ticketsPathResult.valid) {
        throw new ProjectError(ticketsPathResult.error!, CLI_ERROR_CODES.VALIDATION_ERROR);
      }
      ticketsPath = ticketsPathResult.normalized!;
    }

  
    // Create project directory if needed (if createProjectPath flag is set)
    if (input.createProjectPath && !input.globalOnly && !fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    } else if (!input.globalOnly && !fs.existsSync(projectPath) && !input.createProjectPath) {
      throw new ProjectError(`Project path does not exist: ${projectPath}. Use --create-project-path flag to auto-create.`, CLI_ERROR_CODES.VALIDATION_ERROR);
    }

    // Determine if this should be an auto-discovery project
    // Auto-discovery projects are NOT registered in the global registry
    let isAutoDiscovery = false;
    if (!input.globalOnly) {
      // Check if project path is within configured search paths and depth
      const globalConfig = this.projectService.getGlobalConfig();
      if (globalConfig.discovery?.autoDiscover && globalConfig.discovery.searchPaths) {
        const isWithinSearchPaths = isPathWithinSearchPaths(projectPath, globalConfig.discovery.searchPaths);
        if (isWithinSearchPaths) {
          // Check depth for each search path
          const maxDepth = globalConfig.discovery.maxDepth || 2;
          for (const searchPath of globalConfig.discovery.searchPaths) {
            const depth = calculatePathDepth(projectPath, searchPath);
            if (depth >= 0 && depth <= maxDepth) {
              isAutoDiscovery = true;
              break;
            }
          }
        }
      }
    }

    // Build Project object with complete configuration matching Web UI template
    const project: Project = {
      id: projectId,
      project: {
        id: projectId,
        name,
        code,
        path: projectPath,
        configFile: input.globalOnly ? '' : path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG),
        active: true,
        description,
        repository,
        startNumber: 1,
        counterFile: CONFIG_FILES.COUNTER_FILE,
        ticketsPath: ticketsPath || DEFAULTS.TICKETS_PATH
      },
      metadata: {
        dateRegistered: new Date().toISOString().split('T')[0],
        lastAccessed: new Date().toISOString().split('T')[0],
        version: '1.0.0'
      },
      autoDiscovered: isAutoDiscovery
    };

    // Register project in global registry only if NOT auto-discovery
    if (!isAutoDiscovery) {
      // For global-only projects, pass document discovery settings
      const documentDiscoverySettings = input.globalOnly ? {
        paths: input.documentPaths,
        maxDepth: input.maxDepth
      } : undefined;

      this.projectService.registerProject(project, documentDiscoverySettings);

      if (input.globalOnly) {
        console.log(`Global-only mode: Project registered only in global registry`);
      } else {
        console.log(`Project-first mode: Project registered in global registry with local config`);
      }
    } else {
      console.log(`Auto-discovery mode: Project created with local config only (no global registry entry)`);
    }

    // Create local config based on strategy
    if (!input.globalOnly) {
      // Strategy 2: Project-First Mode (default) - Create local config
      // Strategy 3: Auto-Discovery Mode - Also creates local config
      this.projectService.createOrUpdateLocalConfig(
        projectId,
        projectPath,
        name,
        code,
        description,
        repository,
        false, // not global-only
        ticketsPath // pass the validated tickets path
      );

      // Create counter file
      const counterFile = path.join(projectPath, CONFIG_FILES.COUNTER_FILE);
      if (!fs.existsSync(counterFile)) {
        fs.writeFileSync(counterFile, '1', 'utf8');
      }
    } else {
      // Strategy 1: Global-Only Mode - Skip local config creation
      // Local config would be handled by auto-discovery if needed
    }

    return project;
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<Project[]> {
    return this.projectService.getAllProjects();
  }

  /**
   * Get single project
   */
  async getProject(codeOrId: string): Promise<Project> {
    const project = await this.projectService.getProjectByCodeOrId(codeOrId);

    if (!project) {
      throw new ProjectError(`Project not found: ${codeOrId}`, CLI_ERROR_CODES.NOT_FOUND);
    }

    return project;
  }

  /**
   * Update existing project
   */
  async updateProject(codeOrId: string, updates: ProjectUpdateInput): Promise<Project> {
    // Load project first
    const project = await this.getProject(codeOrId);

    // Validate each update field if provided
    const validatedUpdates: ProjectUpdateInput = {};

    if (updates.name !== undefined) {
      const nameResult = ProjectValidator.validateName(updates.name);
      if (!nameResult.valid) {
        throw new ProjectError(nameResult.error!, CLI_ERROR_CODES.VALIDATION_ERROR);
      }
      validatedUpdates.name = nameResult.normalized!;
    }

    if (updates.description !== undefined) {
      const descResult = ProjectValidator.validateDescription(updates.description);
      if (!descResult.valid) {
        throw new ProjectError(descResult.error!, CLI_ERROR_CODES.VALIDATION_ERROR);
      }
      validatedUpdates.description = descResult.normalized!;
    }

    if (updates.repository !== undefined) {
      const repoResult = ProjectValidator.validateRepository(updates.repository);
      if (!repoResult.valid) {
        throw new ProjectError(repoResult.error!, CLI_ERROR_CODES.VALIDATION_ERROR);
      }
      validatedUpdates.repository = repoResult.normalized!;
    }

    if (updates.ticketsPath !== undefined) {
      const ticketsPathResult = ProjectValidator.validateTicketsPath(updates.ticketsPath);
      if (!ticketsPathResult.valid) {
        throw new ProjectError(ticketsPathResult.error!, CLI_ERROR_CODES.VALIDATION_ERROR);
      }
      validatedUpdates.ticketsPath = ticketsPathResult.normalized!;
    }

    if (updates.active !== undefined) {
      validatedUpdates.active = updates.active;
    }

    // Update project
    this.projectService.updateProject(project.id, validatedUpdates);

    // Return updated project
    return this.getProject(codeOrId);
  }

  /**
   * Delete project
   */
  async deleteProject(codeOrId: string, deleteLocalConfig: boolean = true): Promise<void> {
    // Load project first to verify it exists
    const project = await this.getProject(codeOrId);

    // Delete project (registry entry and/or local config)
    this.projectService.deleteProject(project.id, deleteLocalConfig);
  }

  /**
   * Disable project (set active: false)
   */
  async disableProject(codeOrId: string): Promise<Project> {
    // Load project first
    const project = await this.getProject(codeOrId);

    // Check if already inactive
    if (!project.project.active) {
      return project; // Already disabled
    }

    // Update to set active: false
    await this.updateProject(codeOrId, { active: false });

    // Return updated project
    return this.getProject(codeOrId);
  }

  /**
   * Enable project (set active: true)
   */
  async enableProject(codeOrId: string): Promise<Project> {
    // Load project first
    const project = await this.getProject(codeOrId);

    // Check if already active
    if (project.project.active) {
      return project; // Already enabled
    }

    // Update to set active: true
    await this.updateProject(codeOrId, { active: true });

    // Return updated project
    return this.getProject(codeOrId);
  }
}
