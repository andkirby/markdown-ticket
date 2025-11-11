/**
 * Base strategy for tree building operations
 */
export interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'directory' | 'folder';
    children?: TreeNode[];
}
export interface ProjectConfig {
    document_paths?: string[];
    exclude_folders?: string[];
    [key: string]: unknown;
}
export declare class TreeBuildingStrategy {
    /**
     * Build tree from file paths
     * @param filePaths - Array of file paths
     * @param projectPath - Project root path
     * @param config - Project configuration
     * @returns Tree structure
     */
    buildTree(_filePaths: string[], _projectPath: string, _config: ProjectConfig): Promise<TreeNode[]>;
    /**
     * Process individual file for tree inclusion
     * @param filePath - File path
     * @param relativePath - Relative path from project root
     * @returns File object
     */
    processFile(_filePath: string, relativePath: string): Promise<TreeNode>;
}
