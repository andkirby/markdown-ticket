interface Task {
    success: boolean;
    message: string;
    filename?: string;
}
interface ProjectDiscovery {
    getAllProjects(): Promise<Project[]>;
}
interface Project {
    id: string;
    project: {
        name: string;
        path: string;
        active: boolean;
    };
}
interface FileSystemTree {
    name: string;
    path: string;
    type: 'file' | 'folder';
    children?: FileSystemTree[];
}
/**
 * Service layer for file system operations
 */
export declare class FileSystemService {
    private tasksDir;
    constructor(tasksDir: string);
    /**
     * Get all task files from tasks directory
     */
    getAllTasks(): Promise<string[]>;
    /**
     * Get individual task file content
     */
    getTask(filename: string): Promise<string>;
    /**
     * Save task file
     */
    saveTask(filename: string, content: string): Promise<Task>;
    /**
     * Delete task file
     */
    deleteTask(filename: string): Promise<Task>;
    /**
     * Build file system tree for path selection
     */
    buildProjectFileSystemTree(projectId: string, projectDiscovery: ProjectDiscovery): Promise<FileSystemTree[]>;
    /**
     * Ensure tasks directory exists
     */
    ensureTasksDirectory(): Promise<void>;
}
export {};
