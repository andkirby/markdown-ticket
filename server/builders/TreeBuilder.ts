import type { ProjectDetails } from '@mdt/domain-contracts'
import * as path from 'node:path'
import {
  PROJECT_CODE_PATTERN_BODY,
  PROJECT_DOCUMENT_CONFIG_DEFAULTS,
  TICKET_NUMBER_MAX_DIGITS,
  TICKET_NUMBER_MIN_DIGITS,
} from '@mdt/domain-contracts'
import { glob } from 'glob'
import { shouldIgnorePath } from '../utils/fsIgnoreList.js'

// Define strategy interface
interface ITreeBuildingStrategy {
  buildTree: (
    filePaths: string[],
    projectPath: string,
    config: ProjectConfig,
  ) => Promise<unknown[]>
}

// Project configuration interface (simplified for this context)
type ProjectConfig = Partial<Pick<ProjectDetails, 'ticketsPath'>> & {
  excludeFolders?: string[]
  [key: string]: unknown
}

/**
 * TreeBuilder that uses different strategies for building trees.
 */
export class TreeBuilder {
  private strategy: ITreeBuildingStrategy

  constructor(strategy: ITreeBuildingStrategy) {
    this.strategy = strategy
  }

  /**
   * Build tree using current strategy.
   *
   * @param projectPath - Project root path.
   * @param config - Project configuration.
   * @param maxDepth - Maximum depth to scan.
   * @returns Tree structure.
   */
  async build(
    projectPath: string,
    config: ProjectConfig,
    maxDepth: number = PROJECT_DOCUMENT_CONFIG_DEFAULTS.maxDepth,
  ): Promise<unknown[]> {
    // Get markdown and HTML files (HTML preview support, MDT-221)
    // Use cwd instead of absolute path pattern for better compatibility
    let filePaths = await glob('**/*.{md,html,htm}', {
      cwd: projectPath,
      maxDepth,
      absolute: true,
      dot: false, // don't include dot files
    })

    // Apply ignore patterns. (Root index.html exclusion for the app shell is
    // enforced inside the walking strategies — PathSelectionStrategy/
    // DocumentNavigationStrategy ignore this filePaths list and re-walk, so a
    // filter here would be inert for them.)
    filePaths = filePaths.filter((filePath) => {
      const relativePath = path.relative(projectPath, filePath)

      return !shouldIgnorePath(relativePath, config.excludeFolders || [])
    })

    // Filter out tickets path if configured
    if (config.ticketsPath) {
      filePaths = this._filterTicketFiles(
        filePaths,
        projectPath,
        config.ticketsPath,
      )
    }

    return await this.strategy.buildTree(filePaths, projectPath, config)
  }

  private _filterTicketFiles(
    filePaths: string[],
    projectPath: string,
    ticketsPath: string,
  ): string[] {
    if (ticketsPath === '.') {
      // Filter ticket files by pattern when in root directory. Shape derives
      // from the canonical key contract (MDT-254) so 4/5-digit tickets and
      // alphanumeric project codes (TP0) are filtered correctly; the slug
      // part is optional (bare "CODE-001.md" is a valid ticket filename,
      // same shape staged-validation enforces).
      const ticketFileNamePattern = new RegExp(
        `^${PROJECT_CODE_PATTERN_BODY}-\\d{${TICKET_NUMBER_MIN_DIGITS},${TICKET_NUMBER_MAX_DIGITS}}(?:-[^/]*)?\\.md$`,
      )
      return filePaths.filter((filePath) => {
        const fileName = path.basename(filePath)

        return !fileName.match(ticketFileNamePattern)
      })
    }
    // Filter out files in tickets directory
    const ticketsFullPath = path.join(projectPath, ticketsPath)

    return filePaths.filter(
      filePath => !filePath.startsWith(ticketsFullPath),
    )
  }
}
