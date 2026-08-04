import type { ProjectConfig, TreeNode } from './TreeBuildingStrategy.js'
import { readdir } from 'node:fs/promises'
import * as path from 'node:path'
import { PROJECT_DOCUMENT_CONFIG_DEFAULTS } from '@mdt/domain-contracts'
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
    const tree = await this.buildSelectionTree(projectPath, config)
    return this.pruneFoldersWithoutMarkdown(tree)
  }

  /**
   * Drop folders whose subtree contains no markdown documents.
   * Applies to both path selection and document navigation — only folders
   * that actually contain at least one markdown file are shown or selectable.
   */
  private pruneFoldersWithoutMarkdown(nodes: TreeNode[]): TreeNode[] {
    const result: TreeNode[] = []
    for (const node of nodes) {
      if (node.type === 'file') {
        result.push(node)
        continue
      }
      if (node.type === 'folder') {
        const children = node.children
          ? this.pruneFoldersWithoutMarkdown(node.children)
          : []
        if (children.length > 0) {
          result.push({ ...node, children })
        }
      }
    }
    return result
  }

  private async buildSelectionTree(
    projectPath: string,
    config: ProjectConfig,
  ): Promise<TreeNode[]> {
    const maxDepth
      = config.document?.maxDepth ?? PROJECT_DOCUMENT_CONFIG_DEFAULTS.maxDepth
    const excludeFolders
      = config.document?.excludeFolders ?? config.exclude_folders ?? []
    const ticketsPath
      = typeof config.ticketsPath === 'string'
        ? this.normalizePath(config.ticketsPath)
        : undefined
    const rootFiles: TreeNode[] = []

    const walk = async (
      absoluteDir: string,
      relativeParts: string[],
    ): Promise<TreeNode[]> => {
      const nodes: TreeNode[] = []

      try {
        const entries = await readdir(absoluteDir, { withFileTypes: true })

        for (const entry of entries) {
          const nextParts = [...relativeParts, entry.name]
          const relativePath = this.normalizePath(nextParts.join(path.sep))
          const depth = nextParts.length

          if (
            depth > maxDepth
            || this.shouldExclude(relativePath, ticketsPath, excludeFolders)
          ) {
            continue
          }

          const absolutePath = path.join(absoluteDir, entry.name)

          if (entry.isDirectory()) {
            nodes.push({
              name: entry.name,
              path: relativePath,
              type: 'folder',
              children:
                depth < maxDepth ? await walk(absolutePath, nextParts) : [],
            })
            continue
          }

          if (entry.isFile() && /\.(?:md|html|htm)$/.test(entry.name)) {
            // MDT-221: exclude the repo-root app shell index.html. When
            // project.document.paths includes ./, the Vite app shell at the
            // project root would otherwise become previewable inside the app.
            // Only the root level (relativeParts.length === 0) is excluded;
            // docs/site/index.html is fine.
            if (relativeParts.length === 0 && entry.name === 'index.html') {
              continue
            }
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

  private shouldExclude(
    relativePath: string,
    ticketsPath: string | undefined,
    excludeFolders: string[],
  ): boolean {
    if (
      ticketsPath
      && (relativePath === ticketsPath
        || relativePath.startsWith(`${ticketsPath}/`))
    ) {
      return true
    }

    return shouldIgnorePath(relativePath, excludeFolders)
  }

  private normalizePath(inputPath: string): string {
    return inputPath
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '')
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
