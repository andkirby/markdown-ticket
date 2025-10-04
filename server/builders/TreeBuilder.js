import { glob } from 'glob';
import path from 'path';
import { shouldIgnorePath } from '../utils/fsIgnoreList.js';

/**
 * TreeBuilder that uses different strategies for building trees
 */
export class TreeBuilder {
  constructor(strategy) {
    this.strategy = strategy;
  }

  /**
   * Build tree using current strategy
   * @param {string} projectPath - Project root path
   * @param {Object} config - Project configuration
   * @param {number} maxDepth - Maximum depth to scan
   * @returns {Promise<Array>} Tree structure
   */
  async build(projectPath, config, maxDepth = 3) {
    // Get all markdown files
    const pattern = path.join(projectPath, '**/*.md');
    let filePaths = await glob(pattern, { maxDepth });

    // Apply ignore patterns
    filePaths = filePaths.filter(filePath => {
      const relativePath = path.relative(projectPath, filePath);
      return !shouldIgnorePath(relativePath, config.excludeFolders);
    });

    // Filter out tickets path if configured
    if (config.ticketsPath) {
      filePaths = this._filterTicketFiles(filePaths, projectPath, config.ticketsPath);
    }

    return await this.strategy.buildTree(filePaths, projectPath, config);
  }

  _filterTicketFiles(filePaths, projectPath, ticketsPath) {
    if (ticketsPath === '.') {
      // Filter ticket files by pattern when in root directory
      return filePaths.filter(filePath => {
        const fileName = path.basename(filePath);
        return !fileName.match(/^[A-Z]+-\d{3}-.*\.md$/);
      });
    } else {
      // Filter out files in tickets directory
      const ticketsFullPath = path.join(projectPath, ticketsPath);
      return filePaths.filter(filePath => !filePath.startsWith(ticketsFullPath));
    }
  }
}
