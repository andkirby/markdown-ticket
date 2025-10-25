import path from 'path';

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

export class TreeBuildingStrategy {
  /**
   * Build tree from file paths
   * @param filePaths - Array of file paths
   * @param projectPath - Project root path
   * @param config - Project configuration
   * @returns Tree structure
   */
  async buildTree(
    _filePaths: string[],
    _projectPath: string,
    _config: ProjectConfig
  ): Promise<TreeNode[]> {
    throw new Error('buildTree must be implemented by strategy');
  }

  /**
   * Process individual file for tree inclusion
   * @param filePath - File path
   * @param relativePath - Relative path from project root
   * @returns File object
   */
  async processFile(_filePath: string, relativePath: string): Promise<TreeNode> {
    return {
      name: path.basename(relativePath),
      path: relativePath,
      type: 'file'
    };
  }
}