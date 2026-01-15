import type { ProjectConfig, TreeNode } from './TreeBuildingStrategy.js'
import * as path from 'node:path'
import { TreeBuildingStrategy } from './TreeBuildingStrategy.js'

interface FolderNode {
  name: string
  path: string
  type: 'directory' | 'folder'
  children: Record<string, FolderNode | FileNode | TreeNode>
}

interface FileNode {
  name: string
  path: string
  type: 'file'
}

interface TreeObject {
  [key: string]: FolderNode | FileNode | TreeNode
}

/**
 * Strategy for building trees for path selection (no metadata).
 */
export class PathSelectionStrategy extends TreeBuildingStrategy {
  async buildTree(
    filePaths: string[],
    projectPath: string,
    _config: ProjectConfig,
  ): Promise<TreeNode[]> {
    const tree: TreeObject = {}
    const rootFiles: TreeNode[] = []

    for (const filePath of filePaths) {
      const relativePath = path.relative(projectPath, filePath)
      const parts = relativePath.split(path.sep)

      if (parts.length === 1) {
        rootFiles.push(await this.processFile(filePath, relativePath))
        continue
      }

      let current: TreeObject = tree
      let currentRelativePath = ''

      // Build nested structure
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i]

        currentRelativePath = currentRelativePath ? path.join(currentRelativePath, part) : part

        if (!current[part]) {
          current[part] = {
            type: 'folder' as const,
            name: part,
            path: currentRelativePath,
            children: {} as TreeObject,
          }
        }
        current = (current[part] as FolderNode).children as TreeObject
      }

      // Add the file
      const fileName = parts[parts.length - 1]

      current[fileName] = await this.processFile(filePath, relativePath)
    }

    const result = this._treeToArray(tree)

    if (rootFiles.length > 0) {
      result.unshift({
        name: './ (root files)',
        path: './',
        type: 'folder',
        children: rootFiles,
      })
    }

    return result
  }

  private _treeToArray(obj: TreeObject): TreeNode[] {
    const items: TreeNode[] = []

    for (const [name, item] of Object.entries(obj)) {
      if ((item as FolderNode).type === 'folder') {
        const folderItem = item as FolderNode
        const children = this._treeToArray(folderItem.children as TreeObject)

        if (children.length > 0) {
          items.push({
            name,
            path: folderItem.path,
            type: 'folder',
            children,
          })
        }
      }
      else {
        const fileItem = item as FileNode

        items.push({ name: fileItem.name, path: fileItem.path, type: fileItem.type })
      }
    }

    return items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }

      return a.name.localeCompare(b.name)
    })
  }
}
