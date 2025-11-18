import { Request, Response } from 'express';
import { ProjectService } from '@mdt/shared/services/ProjectService.js';
import { Project } from '@mdt/shared/models/Project.js';
import { ProjectManager } from '@mdt/shared/tools/ProjectManager.js';

interface Ticket {
  code: string;
  filePath: string;
}

interface ProjectWithConfig {
  project: Project;
  config: any;
}

interface CreateProjectData {
  name: string;
  code?: string;
  path: string;
  crsPath?: string;
  description?: string;
  repositoryUrl?: string;
  createProjectPath?: boolean; // Auto-create project directory if it doesn't exist
}

interface UpdateProjectData {
  name?: string;
  crsPath?: string;
  description?: string;
  repositoryUrl?: string;
}

interface CRData {
  code?: string;
  title: string;
  type: string;
  priority?: string;
  description?: string;
}

interface DirectoryListing {
  currentPath: string;
  parentPath: string;
  directories: Array<{
    name: string;
    path: string;
    isDirectory: boolean;
  }>;
}

interface FileSystemTree {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileSystemTree[];
}

interface AuthenticatedRequest extends Request {
  params: {
    projectId?: string;
    crId?: string;
    code?: string;
  };
  query: {
    projectId?: string;
    path?: string;
  };
  body: any;
}

// Extended interfaces for methods not in shared ProjectService
interface ProjectServiceExtension extends ProjectService {
  createProject(data: CreateProjectData): Promise<any>;
  updateProject(code: string, data: UpdateProjectData): Promise<any>;
  getSystemDirectories(path?: string): Promise<DirectoryListing>;
  configureDocuments(projectId: string, documentPaths: string[]): Promise<any>;
  projectDiscovery: any;
}

interface TicketService {
  getProjectCRs(projectId: string): Promise<Ticket[]>;
  getCR(projectId: string, crId: string): Promise<Ticket>;
  createCR(projectId: string, data: CRData): Promise<any>;
  updateCRPartial(projectId: string, crId: string, updates: any): Promise<any>;
  updateCR(projectId: string, crId: string, content: string): Promise<any>;
  deleteCR(projectId: string, crId: string): Promise<any>;
}

interface FileSystemService {
  buildProjectFileSystemTree(projectId: string, projectDiscovery: any): Promise<FileSystemTree[]>;
}

interface FileWatcher {
  // FileWatcher interface - methods not used directly in this controller
}

/**
 * Controller layer for project-related HTTP endpoints
 */
export class ProjectController {
  private projectService: ProjectServiceExtension;
  private ticketService: TicketService;
  private fileSystemService: FileSystemService;
  private fileWatcher: FileWatcher;

  constructor(
    projectService: ProjectServiceExtension,
    ticketService: TicketService,
    fileSystemService: FileSystemService,
    fileWatcher: FileWatcher
  ) {
    this.projectService = projectService;
    this.ticketService = ticketService;
    this.fileSystemService = fileSystemService;
    this.fileWatcher = fileWatcher;
  }

  /**
   * Get all projects
   */
  async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const projects = await this.projectService.getAllProjects();
      // Filter out inactive projects (MDT-001)
      const activeProjects = projects.filter(project => project.project.active === true);
      res.json(activeProjects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get projects' });
    }
  }

  /**
   * Get project configuration
   */
  async getProjectConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { projectId } = req.params;
    if (!projectId) {
      res.status(400).json({ error: 'Project ID is required' });
      return;
    }

    try {
      // Get project by ID first, then get config using project path
      const projects = await this.projectService.getAllProjects();
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const config = this.projectService.getProjectConfig(project.project.path);
      if (!config) {
        res.status(404).json({ error: 'Project configuration not found' });
        return;
      }

      const result = { project, config };
      res.json(result);
    } catch (error: any) {
      console.error('Error getting project config:', error);
      res.status(500).json({ error: 'Failed to get project configuration' });
    }
  }

  /**
   * Get CRs for a project
   */
  async getProjectCRs(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { projectId } = req.params;
    if (!projectId) {
      res.status(400).json({ error: 'Project ID is required' });
      return;
    }

    try {
      const crs = await this.ticketService.getProjectCRs(projectId);
      res.json(crs);
    } catch (error: any) {
      console.error('Error getting project CRs:', error);
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get project CRs' });
      }
    }
  }

  /**
   * Get specific CR
   */
  async getCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, crId } = req.params;
      if (!projectId || !crId) {
        res.status(400).json({ error: 'Project ID and CR ID are required' });
        return;
      }

      const cr = await this.ticketService.getCR(projectId, crId);
      res.json(cr);
    } catch (error: any) {
      console.error('Error getting CR:', error);
      if (error.message === 'Project not found' || error.message === 'CR not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to get CR' });
      }
    }
  }

  /**
   * Create new CR
   */
  async createCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const result = await this.ticketService.createCR(projectId, req.body);
      console.log(`Created CR: ${result.filename} in project ${projectId}`);
      res.json(result);
    } catch (error: any) {
      console.error('Error creating CR:', error);
      if (error.message.includes('required')) {
        res.status(400).json({ error: error.message });
      } else if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create CR' });
      }
    }
  }

  /**
   * Partially update CR
   */
  async patchCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, crId } = req.params;
      if (!projectId || !crId) {
        res.status(400).json({ error: 'Project ID and CR ID are required' });
        return;
      }

      const result = await this.ticketService.updateCRPartial(projectId, crId, req.body);
      console.log(`Successfully updated CR: ${crId} in project ${projectId}`);
      res.json(result);
    } catch (error: any) {
      console.error('Error updating CR partially:', error);
      if (error.message === 'No fields provided for update') {
        res.status(400).json({ error: error.message });
      } else if (error.message === 'Project not found' || error.message === 'CR not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('Invalid ticket format')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update CR' });
      }
    }
  }

  /**
   * Update CR completely
   */
  async updateCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, crId } = req.params;
      const { content } = req.body;

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Project ID and CR ID are required' });
        return;
      }

      console.log(`PUT /api/projects/${projectId}/crs/${crId} - Received update request`);
      console.log('Request body content length:', content ? content.length : 0);

      const result = await this.ticketService.updateCR(projectId, crId, content);
      console.log(`Updated CR: ${result.filename} in project ${projectId}`);
      res.json(result);
    } catch (error: any) {
      console.error('Error updating CR:', error);
      if (error.message === 'Content is required') {
        res.status(400).json({ error: error.message });
      } else if (error.message === 'Project not found' || error.message === 'CR not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update CR' });
      }
    }
  }

  /**
   * Delete CR
   */
  async deleteCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, crId } = req.params;
      if (!projectId || !crId) {
        res.status(400).json({ error: 'Project ID and CR ID are required' });
        return;
      }

      const result = await this.ticketService.deleteCR(projectId, crId);
      console.log(`Deleted CR: ${result.filename} from project ${projectId}`);
      res.json(result);
    } catch (error: any) {
      console.error('Error deleting CR:', error);
      if (error.message === 'Project not found' || error.message === 'CR not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete CR' });
      }
    }
  }

  /**
   * Create new project
   */
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.projectService.createProject(req.body);

      // File watcher will automatically detect the new .toml file
      // and emit the 'project-created' event - no manual emission needed

      res.json(result);
    } catch (error: any) {
      console.error('Error creating project:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno,
        path: error.path
      });
      if (error.message.includes('required') || error.message.includes('already exists')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to create project', details: error.message });
      }
    }
  }

  /**
   * Update existing project
   */
  async updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      if (!code) {
        res.status(400).json({ error: 'Project code is required' });
        return;
      }

      console.log(`Updating project ${code} with data:`, req.body);
      const result = await this.projectService.updateProject(code, req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Error updating project:', error);
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to update project' });
      }
    }
  }

  /**
   * Enable project
   */
  async enableProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      if (!code) {
        res.status(400).json({ error: 'Project code is required' });
        return;
      }

      const projectManager = new ProjectManager();
      const result = await projectManager.enableProject(code);
      res.json(result);
    } catch (error: any) {
      console.error('Error enabling project:', error);
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to enable project' });
      }
    }
  }

  /**
   * Disable project
   */
  async disableProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params;
      if (!code) {
        res.status(400).json({ error: 'Project code is required' });
        return;
      }

      const projectManager = new ProjectManager();
      const result = await projectManager.disableProject(code);
      res.json(result);
    } catch (error: any) {
      console.error('Error disabling project:', error);
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to disable project' });
      }
    }
  }

  /**
   * Get system directories
   */
  async getSystemDirectories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { path: requestPath } = req.query;
      const result = await this.projectService.getSystemDirectories(requestPath as string);
      res.json(result);
    } catch (error: any) {
      console.error('Error listing directories:', error);
      if (error.message.includes('Access denied')) {
        res.status(403).json({ error: error.message });
      } else if (error.message.includes('not found') || error.message.includes('not accessible')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to list directories' });
      }
    }
  }

  /**
   * Get file system tree
   */
  async getFileSystemTree(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.query;

      console.log(`🗂️ Filesystem API called for project: ${projectId}`);

      if (!projectId) {
        res.status(400).json({ error: 'Project ID is required' });
        return;
      }

      const items = await this.fileSystemService.buildProjectFileSystemTree(
        projectId as string,
        this.projectService.projectDiscovery
      );

      console.log(`🗂️ Found ${items.length} items`);
      res.json(items);
    } catch (error: any) {
      console.error('Error loading file system:', error);
      if (error.message === 'Project not found' || error.message === 'Path not found') {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to load file system' });
      }
    }
  }

  /**
   * Configure document paths
   */
  async configureDocuments(req: Request, res: Response): Promise<void> {
    const { projectId, documentPaths } = req.body;

    console.log(`📝 Configure documents for project: ${projectId}`);
    console.log(`📝 Document paths: ${JSON.stringify(documentPaths)}`);

    if (!projectId || !Array.isArray(documentPaths)) {
      res.status(400).json({ error: 'Project ID and document paths are required' });
      return;
    }

    try {
      await this.projectService.configureDocuments(projectId, documentPaths);
      console.log(`✅ Document paths configured successfully`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error configuring documents:', error);
      if (error.message === 'Project not found') {
        res.status(404).json({ error: error.message });
      } else if (error.message.includes('must be an array')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to configure documents' });
      }
    }
  }
}