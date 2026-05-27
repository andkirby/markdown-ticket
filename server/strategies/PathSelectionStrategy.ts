import type { ProjectConfig, TreeNode } from './TreeBuildingStrategy.js'
import { readdir } from 'node:fs/promises'
import * as path from 'node:path'
import { shouldIgnorePath } from '../utils/fsIgnoreList.js'
import { TreeBuildingStrategy } from './TreeBuildingStrategy.js'

/**
 * Strategy for building trees for path selection (no metadata).
 */
export class PathSelectionStrategy extends TreeBuildingStrategy {
  async buildTree(
    _filePaths: string[],
    projectPath: string,
    config: ProjectConfig,
  ): Promise<TreeNode[]> {
    return await this.buildSelectionTree(projectPath, config)
  }

  private async buildSelectionTree(projectPath: string, config: ProjectConfig): Promise<TreeNode[]> {
    const maxDepth = config.document?.maxDepth ?? 5
    const excludeFolders = config.document?.excludeFolders ?? config.exclude_folders ?? []
    const ticketsPath = typeof config.ticketsPath === 'string' ? this.normalizePath(config.ticketsPath) : undefined
    const rootFiles: TreeNode[] = []

    const walk = async (absoluteDir: string, relativeParts: string[]): Promise<TreeNode[]> => {
      const nodes: TreeNode[] = []

      try {
        const entries = await readdir(absoluteDir, { withFileTypes: true })

        for (const entry of entries) {
          const nextParts = [...relativeParts, entry.name]
          const relativePath = this.normalizePath(nextParts.join(path.sep))
          const depth = nextParts.length

          if (depth > maxDepth || this.shouldExclude(relativePath, ticketsPath, excludeFolders)) {
            continue
          }

          const absolutePath = path.join(absoluteDir, entry.name)

          if (entry.isDirectory()) {
            nodes.push({
              name: entry.name,
              path: relativePath,
              type: 'folder',
              children: depth < maxDepth ? await walk(absolutePath, nextParts) : [],
            })
            continue
          }

          if (entry.isFile() && entry.name.endsWith('.md')) {
            const fileNode = await this.processFile(absolutePath, relativePath)
            if (relativeParts.length === 0) {
              rootFiles.push(fileNode)
            }
            else {
              nodes.push(fileNode)
            }
          }
        }
      }
      catch {
        return nodes
      }

      return this.sortNodes(nodes)
    }

    const result = await walk(projectPath, [])

    if (rootFiles.length > 0) {
      result.unshift({
        name: './ (root files)',
        path: './',
        type: 'folder',
        children: this.sortNodes(rootFiles),
      })
    }

    return result
  }

  private shouldExclude(relativePath: string, ticketsPath: string | undefined, excludeFolders: string[]): boolean {
    if (ticketsPath && (relativePath === ticketsPath || relativePath.startsWith(`${ticketsPath}/`))) {
      return true
    }

    return shouldIgnorePath(relativePath, excludeFolders)
  }

  private normalizePath(inputPath: string): string {
    return inputPath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '')
  }

  private sortNodes(nodes: TreeNode[]): TreeNode[] {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }

      return a.name.localeCompare(b.name)
    })
  }
}
