import * as fs from 'fs';
import * as path from 'path';
import { ProjectService } from '../services/ProjectService.js';
import { ProjectValidator } from './ProjectValidator.js';
import { Project } from '../models/Project.js';
import { CONFIG_FILES } from '../utils/constants.js';

/**
 * Project update input
 */
export interface ProjectUpdateInput {
  name?: string;
  description?: string;
  repository?: string;
  active?: boolean;
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
  ticketsPath?: string; // Relative path for tickets (default: "docs/CRs")
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
      throw new Error(nameResult.error);
    }
    const name = nameResult.normalized!;

    // Validate or generate code
    let code: string;
    if (input.code) {
      const codeResult = ProjectValidator.validateCode(input.code);
      if (!codeResult.valid) {
        throw new Error(codeResult.error);
      }
      code = codeResult.normalized!;
    } else {
      code = ProjectValidator.generateCodeFromName(name);
    }

    // Check code doesn't already exist
    const allProjects = await this.projectService.getAllProjects();
    const existingProject = allProjects.find(p => p.project.code === code);
    if (existingProject) {
      throw new Error(`Project with code "${code}" already exists`);
    }

    // Validate path (require existence unless createProjectPath flag is set)
    const pathResult = ProjectValidator.validatePath(input.path, {
      mustExist: !input.createProjectPath
    });
    if (!pathResult.valid) {
      throw new Error(pathResult.error);
    }
    const projectPath = pathResult.normalized!;

    // Validate description
    const description = input.description || '';
    if (description) {
      const descResult = ProjectValidator.validateDescription(description);
      if (!descResult.valid) {
        throw new Error(descResult.error);
      }
    }

    // Validate repository
    const repository = input.repository || '';
    if (repository) {
      const repoResult = ProjectValidator.validateRepository(repository);
      if (!repoResult.valid) {
        throw new Error(repoResult.error);
      }
    }

    // Validate tickets path if provided
    let ticketsPath: string | undefined;
    if (input.ticketsPath) {
      const ticketsPathResult = ProjectValidator.validateTicketsPath(input.ticketsPath);
      if (!ticketsPathResult.valid) {
        throw new Error(ticketsPathResult.error);
      }
      ticketsPath = ticketsPathResult.normalized!;
    }

    // Generate unique project ID
    const projectId = await this.projectService.generateProjectId(name);

    // Create project directory if needed (if createProjectPath flag is set)
    if (input.createProjectPath && !input.globalOnly && !fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    } else if (!input.globalOnly && !fs.existsSync(projectPath) && !input.createProjectPath) {
      throw new Error(`Project path does not exist: ${projectPath}. Use --create-project-path flag to auto-create.`);
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
        counterFile: CONFIG_FILES.COUNTER_FILE
      },
      metadata: {
        dateRegistered: new Date().toISOString().split('T')[0],
        lastAccessed: new Date().toISOString().split('T')[0],
        version: '1.0.0'
      }
    };

    // Register project (global config is always created)
    this.projectService.registerProject(project);

    // Create local config based on strategy
    if (!input.globalOnly) {
      // Strategy 2: Project-First Mode (default) - Create local config
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
      console.log(`Global-only mode: Project registered only in global registry`);
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
      throw new Error(`Project not found: ${codeOrId}`);
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
        throw new Error(nameResult.error);
      }
      validatedUpdates.name = nameResult.normalized!;
    }

    if (updates.description !== undefined) {
      const descResult = ProjectValidator.validateDescription(updates.description);
      if (!descResult.valid) {
        throw new Error(descResult.error);
      }
      validatedUpdates.description = descResult.normalized!;
    }

    if (updates.repository !== undefined) {
      const repoResult = ProjectValidator.validateRepository(updates.repository);
      if (!repoResult.valid) {
        throw new Error(repoResult.error);
      }
      validatedUpdates.repository = repoResult.normalized!;
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
