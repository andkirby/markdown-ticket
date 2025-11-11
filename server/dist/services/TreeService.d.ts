interface Project {
    id: string;
    project: {
        name: string;
        path: string;
        active: boolean;
    };
    autoDiscovered?: boolean;
    configPath?: string;
}
interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: TreeNode[];
    size?: number;
    lastModified?: Date;
    metadata?: Record<string, any>;
}
interface ProjectDiscovery {
    getAllProjects(): Promise<Project[]>;
}
/**
 * Facade service for all tree building operations
 */
export declare class TreeService {
    private projectDiscovery;
    private configRepository;
    constructor(projectDiscovery: ProjectDiscovery);
    /**
     * Get document navigation tree with metadata
     */
    getDocumentTree(projectId: string): Promise<TreeNode[]>;
    /**
     * Get path selection tree (basic, no metadata)
     */
    getPathSelectionTree(projectId: string): Promise<TreeNode[]>;
    private _getProject;
    private _filterByDocumentPaths;
    private _findMatches;
}
export {};
