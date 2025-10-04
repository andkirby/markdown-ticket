import path from 'path';

/**
 * Base strategy for tree building operations
 */
export class TreeBuildingStrategy {
  /**
   * Build tree from file paths
   * @param {Array<string>} filePaths - Array of file paths
   * @param {string} projectPath - Project root path
   * @param {Object} config - Project configuration
   * @returns {Promise<Array>} Tree structure
   */
  async buildTree(filePaths, projectPath, config) {
    throw new Error('buildTree must be implemented by strategy');
  }

  /**
   * Process individual file for tree inclusion
   * @param {string} filePath - File path
   * @param {string} relativePath - Relative path from project root
   * @returns {Promise<Object>} File object
   */
  async processFile(filePath, relativePath) {
    return {
      name: path.basename(relativePath),
      path: relativePath,
      type: 'file'
    };
  }
}
