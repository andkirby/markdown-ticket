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
export declare class ProjectService {
    projectDiscovery: ProjectDiscovery;
    constructor(projectDiscovery: ProjectDiscovery);
    /**
     * Get all registered projects
     * @returns Array of project objects
     */
    getAllProjects(): Promise<Project[]>;
    /**
     * Get specific project by ID
     * @param projectId - Project ID
     * @returns Project object or null if not found
     */
    getProjectById(projectId: string): Promise<Project | null>;
    /**
     * Get project configuration
     * @param projectId - Project ID
     * @returns Project and config object
     */
    getProjectConfig(projectId: string): Promise<ProjectWithConfig>;
    /**
     * Create a new project
     * @param projectData - Project data
     * @returns Created project info
     */
    createProject(projectData: CreateProjectData): Promise<CreateProjectResult>;
    /**
     * Update existing project
     * @param projectCode - Project code
     * @param updates - Fields to update
     * @returns Success status
     */
    updateProject(projectCode: string, updates: UpdateProjectData): Promise<UpdateResult>;
    /**
     * Get system directories for project path selection
     * @param requestPath - Path to list directories from
     * @returns Directory listing
     */
    getSystemDirectories(requestPath?: string): Promise<DirectoryListing>;
    /**
     * Configure document paths for a project
     * @param projectId - Project ID
     * @param documentPaths - Array of document paths
     * @returns Success status
     */
    configureDocuments(projectId: string, documentPaths: string[]): Promise<ConfigureDocumentsResult>;
}
export {};
