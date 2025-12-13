import { glob } from 'glob';
import * as path from 'path';
import { shouldIgnorePath } from '../utils/fsIgnoreList.js';

// Define strategy interface
interface ITreeBuildingStrategy {
  buildTree(filePaths: string[], projectPath: string, config: ProjectConfig): Promise<unknown[]>;
}

// Project configuration interface (simplified for this context)
interface ProjectConfig {
  excludeFolders?: string[];
  ticketsPath?: string;
  [key: string]: unknown;
}


/**
 * TreeBuilder that uses different strategies for building trees
 */
export class TreeBuilder {
  private strategy: ITreeBuildingStrategy;

  constructor(strategy: ITreeBuildingStrategy) {
    this.strategy = strategy;
  }

  /**
   * Build tree using current strategy
   * @param projectPath - Project root path
   * @param config - Project configuration
   * @param maxDepth - Maximum depth to scan
   * @returns Tree structure
   */
  async build(projectPath: string, config: ProjectConfig, maxDepth: number = 3): Promise<unknown[]> {
    // Get all markdown files
    const pattern = path.join(projectPath, '**/*.md');
    let filePaths = await glob(pattern, { maxDepth });

    // Apply ignore patterns
    filePaths = filePaths.filter(filePath => {
      const relativePath = path.relative(projectPath, filePath);
      return !shouldIgnorePath(relativePath, config.excludeFolders || []);
    });

    // Filter out tickets path if configured
    if (config.ticketsPath) {
      filePaths = this._filterTicketFiles(filePaths, projectPath, config.ticketsPath);
    }

    return await this.strategy.buildTree(filePaths, projectPath, config);
  }

  private _filterTicketFiles(filePaths: string[], projectPath: string, ticketsPath: string): string[] {
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