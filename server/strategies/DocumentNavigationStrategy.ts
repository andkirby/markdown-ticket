import type { FileMetadata } from '../commands/ExtractMetadataCommand.js'
import type { ProjectConfig, TreeNode } from './TreeBuildingStrategy.js'
import { FileOperationInvoker } from '../invokers/FileOperationInvoker.js'
import { PathSelectionStrategy } from './PathSelectionStrategy.js'

/**
 * Strategy for building trees for document navigation (with metadata).
 */
export class DocumentNavigationStrategy extends PathSelectionStrategy {
  private fileInvoker: FileOperationInvoker

  constructor() {
    super()
    this.fileInvoker = new FileOperationInvoker()
  }

  async buildTree(filePaths: string[], projectPath: string, config: ProjectConfig): Promise<TreeNode[]> {
    const tree = await super.buildTree(filePaths, projectPath, config)
    return this.pruneEmptyFolders(tree)
  }

  async processFile(filePath: string, relativePath: string): Promise<TreeNode & FileMetadata> {
    const baseFile = await super.processFile(filePath, relativePath)
    const metadata = await this.fileInvoker.getMetadata(filePath)

    return {
      ...baseFile,
      ...metadata,
    }
  }

  /**
   * Drop folders whose subtree contains no markdown documents.
   * The path selector keeps such folders; document navigation must not.
   */
  private pruneEmptyFolders(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = []
    for (const node of nodes) {
      if (node.type === 'file') {
        result.push(node)
        continue
      }
      if (node.type === 'folder') {
        const children = node.children ? this.pruneEmptyFolders(node.children) : []
        if (children.length > 0) {
          result.push({ ...node, children })
        }
      }
    }
    return result
  }
}
