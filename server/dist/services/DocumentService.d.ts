interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: TreeNode[];
    size?: number;
    lastModified?: Date;
    metadata?: Record<string, any>;
}
interface Project {
    id: string;
    project: {
        name: string;
        path: string;
        active: boolean;
    };
}
interface ProjectDiscovery {
    getAllProjects(): Promise<Project[]>;
}
interface FileInvoker {
    readFile(filePath: string): Promise<string>;
}
/**
 * Service layer for document discovery and management
 */
export declare class DocumentService {
    private projectDiscovery;
    private treeService;
    private _fileInvoker;
    constructor(projectDiscovery: ProjectDiscovery);
    /**
     * Discover documents for a project
     */
    discoverDocuments(projectId: string): Promise<TreeNode[]>;
    /**
     * Get document content
     */
    getDocumentContent(projectId: string, filePath: string): Promise<string>;
    /**
     * Expose file invoker for external use
     */
    get fileInvoker(): FileInvoker;
}
export {};
