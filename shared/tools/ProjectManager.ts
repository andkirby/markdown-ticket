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
   * Create new project
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

    // Validate path
    const pathResult = ProjectValidator.validatePath(input.path, { mustExist: false });
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

    // Generate unique project ID
    const projectId = await this.projectService.generateProjectId(name);

    // Create project directory if needed
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // Build Project object
    const project: Project = {
      id: projectId,
      project: {
        id: projectId,
        name,
        code,
        path: projectPath,
        configFile: path.join(projectPath, CONFIG_FILES.PROJECT_CONFIG),
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

    // Register project
    this.projectService.registerProject(project);

    // Create or update local config
    this.projectService.createOrUpdateLocalConfig(
      projectId,
      projectPath,
      name,
      code,
      description
    );

    // Create docs/CRs directory
    const crsPath = path.join(projectPath, 'docs', 'CRs');
    if (!fs.existsSync(crsPath)) {
      fs.mkdirSync(crsPath, { recursive: true });
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

    // Update to set active: false
    await this.updateProject(codeOrId, { active: false });

    // Return updated project
    return this.getProject(codeOrId);
  }
}
