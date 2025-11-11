interface Project {
    id: string;
    project: {
        name: string;
        code?: string;
        path: string;
        configFile: string;
        active: boolean;
        description?: string;
        repository?: string;
    };
    metadata: {
        dateRegistered: string;
        lastAccessed: string;
        version: string;
    };
    autoDiscovered?: boolean;
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
interface RegisteredProject {
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
declare class ProjectDiscoveryService {
    private globalConfigDir;
    private projectsDir;
    private globalConfigPath;
    private sharedProjectService;
    private cache;
    private projectServiceInitialized;
    constructor();
    /**
     * Initialize the shared ProjectService asynchronously
     */
    private initializeProjectService;
    /**
     * Simple auto-discovery implementation without external dependencies
     */
    private simpleAutoDiscover;
    /**
     * Simple recursive scan for project configurations
     */
    private scanDirectoryForProjectsSimple;
    /**
     * Get global dashboard configuration
     */
    getGlobalConfig(): GlobalConfig;
    /**
     * Get all registered projects
     */
    getRegisteredProjects(): RegisteredProject[];
    /**
     * Get project configuration from local .mdt-config.toml
     */
    getProjectConfig(projectPath: string): LocalProjectConfig | null;
    /**
     * Get all projects (registered + auto-discovered)
     */
    getAllProjects(): Promise<(Project | RegisteredProject)[]>;
    /**
     * Clear the project cache
     */
    clearCache(): void;
    /**
     * Get CRs for a specific project using shared MarkdownService
     */
    getProjectCRs(projectPath: string): Promise<Ticket[]>;
}
export default ProjectDiscoveryService;
