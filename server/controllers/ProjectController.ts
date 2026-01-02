import { Request, Response } from 'express';
import { ProjectService } from '@mdt/shared/services/ProjectService.js';
import { Project } from '@mdt/shared/models/Project.js';
import { ProjectManager } from '@mdt/shared/tools/ProjectManager.js';
import { TicketService } from '../services/TicketService.js';

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
    code?: string;
    crId?: string;
  };
  query: {
    projectId?: string;
    path?: string;
    bypassCache?: string;
  };
  body: any;
}

// Extended interfaces for methods not in shared ProjectService
// These methods are now provided by ProjectManager
interface ProjectServiceExtension {
  getAllProjects(bypassCache?: boolean): Promise<any[]>;
  getProjectConfig(path: string): any;
  getProjectCRs(path: string): Promise<Ticket[]>;
  getSystemDirectories(path?: string): Promise<DirectoryListing>;
  configureDocuments(projectId: string, documentPaths: string[]): Promise<any>;
  checkDirectoryExists(dirPath: string): Promise<{ exists: boolean }>;
  projectDiscovery: any;
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
  private fileSystemService: FileSystemService;
  private fileWatcher: FileWatcher;
  private projectManager: ProjectManager;
  private ticketController?: any; // Optional TicketController for delegation
  private ticketService?: TicketService; // Optional TicketService for CR operations

  constructor(
    projectService: ProjectServiceExtension,
    fileSystemService: FileSystemService,
    fileWatcher: FileWatcher,
    ticketController?: any, // Optional TicketController for CR operations
    ticketService?: TicketService // Optional TicketService for CR operations
  ) {
    this.projectService = projectService;
    this.fileSystemService = fileSystemService;
    this.fileWatcher = fileWatcher;
    this.projectManager = new ProjectManager(true); // Quiet mode for server
    this.ticketController = ticketController;
    this.ticketService = ticketService;
  }

  /**
   * Get all projects
   */
  async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const bypassCache = req.query.bypassCache === 'true';
      const projects = await this.projectService.getAllProjects(bypassCache);
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
        res.status(404).json({ error: 'Not Found', message: 'Project not found' });
        return;
      }

      const config = this.projectService.getProjectConfig(project.project.path);
      if (!config) {
        res.status(404).json({ error: 'Not Found', message: 'Project configuration not found' });
        return;
      }

      const result = { project, config };
      res.json(result);
    } catch (error: any) {
      console.error('Error getting project config:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get project configuration' });
    }
  }

  
  /**
   * Create new project
   */
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.projectManager.createProject(req.body);

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
        res.status(400).json({ error: 'Bad Request', message: 'Project code is required' });
        return;
      }

      console.log(`Updating project ${code} with data:`, req.body);
      const result = await this.projectManager.updateProject(code, req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Error updating project:', error);
      if (error.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: error.message });
      } else {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update project' });
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
        res.status(400).json({ error: 'Bad Request', message: 'Project code is required' });
        return;
      }

      const result = await this.projectManager.enableProject(code);
      res.json(result);
    } catch (error: any) {
      console.error('Error enabling project:', error);
      if (error.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: error.message });
      } else {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to enable project' });
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

      const result = await this.projectManager.disableProject(code);
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
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' });
        return;
      }

      const items = await this.fileSystemService.buildProjectFileSystemTree(
        projectId as string,
        this.projectService
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

  /**
   * Check if directory exists
   */
  async checkDirectoryExists(req: Request, res: Response): Promise<void> {
    const { path } = req.body;

    if (!path || typeof path !== 'string') {
      res.status(400).json({ error: 'Path is required and must be a string' });
      return;
    }

    try {
      const result = await this.projectService.checkDirectoryExists(path);
      console.log(`🔍 Directory exists check for "${path}": ${result.exists}`);
      res.json(result);
    } catch (error: any) {
      console.error('Error checking directory existence:', error);
      res.status(500).json({ error: 'Failed to check directory existence' });
    }
  }

  // CR/CR-related methods - delegate to TicketController or return not implemented
  async getProjectCRs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' });
        return;
      }

      // Get project by ID first, supporting bypassCache query param
      const bypassCache = req.query.bypassCache === 'true';
      const projects = await this.projectService.getAllProjects(bypassCache);
      const project = projects.find(p => p.id === projectId);

      if (!project) {
        res.status(404).json({ error: 'Not Found', message: 'Project not found' });
        return;
      }

      const crs = await this.projectService.getProjectCRs(project.project.path);
      res.json(crs);
    } catch (error: any) {
      console.error('Error getting project CRs:', error);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get project CRs' });
    }
  }

  async getCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, crId } = req.params;

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' });
        return;
      }

      // Use TicketService if available
      if (this.ticketService) {
        const cr = await this.ticketService.getCR(projectId, crId);
        res.json(cr);
        return;
      }

      // Fallback: try to use TicketController if it has the necessary methods
      if (this.ticketController && this.ticketController.ticketService) {
        const cr = await this.ticketController.ticketService.getCR(projectId, crId);
        res.json(cr);
        return;
      }

      res.status(501).json({ error: 'Ticket service not available for fetching CR' });
    } catch (error: any) {
      console.error('Error getting CR:', error);

      if (error.message === 'Project not found' || error.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get CR', details: error.message });
    }
  }

  async createCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const crData = req.body;

      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' });
        return;
      }

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.createCR(projectId, crData);
        res.status(201).json(result);
        return;
      }

      res.status(501).json({ error: 'Ticket service not available for creating CR' });
    } catch (error: any) {
      console.error('Error creating CR:', error);

      if (error.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: error.message });
        return;
      }

      if (error.message.includes('required')) {
        res.status(400).json({ error: 'Bad Request', message: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create CR', details: error.message });
    }
  }

  async patchCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, crId } = req.params;
      const updates = req.body;

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' });
        return;
      }

      if (!updates || Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'Bad Request', message: 'No update data provided' });
        return;
      }

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.updateCRPartial(projectId, crId, updates);
        res.json(result);
        return;
      }

      // Fallback: try to use TicketController if it has the necessary methods
      if (this.ticketController && this.ticketController.ticketService) {
        const result = await this.ticketController.ticketService.updateCRPartial(projectId, crId, updates);
        res.json(result);
        return;
      }

      res.status(501).json({ error: 'Ticket service not available for CR updates' });
    } catch (error: any) {
      console.error('Error updating CR:', error);

      // Handle validation errors with appropriate status codes
      if (error.message.includes('Invalid status transition')) {
        res.status(400).json({ error: 'Bad Request', message: error.message });
        return;
      }

      if (error.message === 'Project not found' || error.message === 'CR not found' || error.message.includes('not found')) {
        res.status(404).json({ error: 'Not Found', message: error.message });
        return;
      }

      if (error.message.includes('No fields provided') || error.message.includes('required') || error.message.includes('Invalid')) {
        res.status(400).json({ error: 'Bad Request', message: error.message });
        return;
      }

      if (error.message.includes('Permission denied')) {
        res.status(403).json({ error: 'Forbidden', message: error.message });
        return;
      }

      // Generic errors
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update CR', details: error.message });
    }
  }

  async updateCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, crId } = req.params;
      const crData = req.body;

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' });
        return;
      }

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.updateCRPartial(projectId, crId, crData);
        res.json(result);
        return;
      }

      res.status(501).json({ error: 'Ticket service not available for updating CR' });
    } catch (error: any) {
      console.error('Error updating CR:', error);

      if (error.message === 'Project not found' || error.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update CR', details: error.message });
    }
  }

  async deleteCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, crId } = req.params;

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' });
        return;
      }

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.deleteCR(projectId, crId);
        res.json(result);
        return;
      }

      res.status(501).json({ error: 'Ticket service not available for deleting CR' });
    } catch (error: any) {
      console.error('Error deleting CR:', error);

      if (error.message === 'Project not found' || error.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: error.message });
        return;
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete CR', details: error.message });
    }
  }
}