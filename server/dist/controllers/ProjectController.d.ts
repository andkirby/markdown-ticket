import { Request, Response } from 'express';
interface Project {
    id: string;
    project: {
        name: string;
        path: string;
        active: boolean;
    };
}
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
interface ProjectService {
    getAllProjects(): Promise<Project[]>;
    getProjectConfig(projectId: string): Promise<ProjectWithConfig>;
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
}
/**
 * Controller layer for project-related HTTP endpoints
 */
export declare class ProjectController {
    private projectService;
    private ticketService;
    private fileSystemService;
    private fileWatcher;
    constructor(projectService: ProjectService, ticketService: TicketService, fileSystemService: FileSystemService, fileWatcher: FileWatcher);
    /**
     * Get all projects
     */
    getAllProjects(req: Request, res: Response): Promise<void>;
    /**
     * Get project configuration
     */
    getProjectConfig(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get CRs for a project
     */
    getProjectCRs(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get specific CR
     */
    getCR(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Create new CR
     */
    createCR(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Partially update CR
     */
    patchCR(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Update CR completely
     */
    updateCR(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Delete CR
     */
    deleteCR(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Create new project
     */
    createProject(req: Request, res: Response): Promise<void>;
    /**
     * Update existing project
     */
    updateProject(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get system directories
     */
    getSystemDirectories(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Get file system tree
     */
    getFileSystemTree(req: AuthenticatedRequest, res: Response): Promise<void>;
    /**
     * Configure document paths
     */
    configureDocuments(req: Request, res: Response): Promise<void>;
}
export {};
