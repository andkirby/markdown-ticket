import type { Project } from '@mdt/shared/models/Project.js'
import type { FileMetadata } from '../commands/ExtractMetadataCommand.js'
import type { ProjectConfig, TreeNode as StrategyTreeNode } from '../strategies/TreeBuildingStrategy.js'
import { TreeBuilder } from '../builders/TreeBuilder.js'
import { TreeStrategyFactory } from '../factories/TreeStrategyFactory.js'
import { ConfigRepository } from '../repositories/ConfigRepository.js'

// Re-export TreeNode with metadata support
interface TreeNode extends StrategyTreeNode {
  size?: number
  lastModified?: Date
  metadata?: FileMetadata
}

interface ProjectDiscovery {
  getAllProjects: () => Promise<Project[]>
}

/**
 * Facade service for all tree building operations.
 */
export class TreeService {
  private projectDiscovery: ProjectDiscovery
  private configRepository: ConfigRepository

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery
    this.configRepository = new ConfigRepository()
  }

  /**
   * Get document navigation tree with metadata.
   */
  async getDocumentTree(projectId: string): Promise<TreeNode[]> {
    const project = await this._getProject(projectId)
    const config = await this.configRepository.getConfig(project.project.path)

    const docPaths = config.documentPaths

    if (!docPaths || docPaths.length === 0) {
      throw new Error('No document configuration found')
    }

    const strategy = TreeStrategyFactory.createDocumentNavigationStrategy()
    const builder = new TreeBuilder(strategy)
    const projectConfig: ProjectConfig = {
      document: {
        paths: docPaths,
        excludeFolders: config.excludeFolders,
        maxDepth: config.maxDepth,
      },
      ticketsPath: config.ticketsPath ?? undefined,
    }
    const allFiles = await builder.build(project.project.path, projectConfig, config.maxDepth) as TreeNode[]

    return this._filterByDocumentPaths(allFiles, docPaths, config.ticketsPath ?? 'docs/CRs')
  }

  /**
   * Get path selection tree (basic, no metadata).
   */
  async getPathSelectionTree(projectId: string): Promise<TreeNode[]> {
    const project = await this._getProject(projectId)
    const config = await this.configRepository.getConfig(project.project.path)

    const strategy = TreeStrategyFactory.createPathSelectionStrategy()
    const builder = new TreeBuilder(strategy)
    const projectConfig: ProjectConfig = {
      document: {
        paths: config.documentPaths,
        excludeFolders: config.excludeFolders,
        maxDepth: config.maxDepth,
      },
      ticketsPath: config.ticketsPath ?? undefined,
    }

    return await builder.build(project.project.path, projectConfig, config.maxDepth) as TreeNode[]
  }

  private async _getProject(projectId: string): Promise<Project> {
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(p => p.id === projectId || p.project.code === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    return project
  }

  private _filterByDocumentPaths(allFiles: TreeNode[], documentPaths: string[], ticketPath: string): TreeNode[] {
    const results: TreeNode[] = []

    for (const docPath of documentPaths) {
      const matches = this._findMatches(allFiles, docPath)

      results.push(...matches)
    }

    const merged = this._mergeFolders(results)
    const filtered = this._excludePath(merged, this._normalizePath(ticketPath))

    return filtered.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1
      }

      return a.name.localeCompare(b.name)
    })
  }

  private _normalizePath(inputPath: string): string {
    return inputPath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '')
  }

  private _isExcludedPath(nodePath: string, excludedPath: string): boolean {
    const normalizedNodePath = this._normalizePath(nodePath)
    return normalizedNodePath === excludedPath || normalizedNodePath.startsWith(`${excludedPath}/`)
  }

  private _excludePath(nodes: TreeNode[], excludedPath: string): TreeNode[] {
    return nodes.reduce((filtered: TreeNode[], node) => {
      if (this._isExcludedPath(node.path, excludedPath)) {
        return filtered
      }

      if (node.type === 'folder' && node.children) {
        filtered.push({
          ...node,
          children: this._excludePath(node.children, excludedPath),
        })
        return filtered
      }

      filtered.push(node)
      return filtered
    }, [])
  }

  private _findMatches(files: TreeNode[], targetPath: string): TreeNode[] {
    const results: TreeNode[] = []

    for (const file of files) {
      if (file.path === targetPath) {
        results.push(file)
      }
      else if (file.type === 'folder' && file.children) {
        if (targetPath.startsWith(`${file.path}/`)) {
          const filteredChildren = this._findMatches(file.children, targetPath)

          if (filteredChildren.length > 0) {
            results.push({ ...file, children: filteredChildren })
          }
        }
        else {
          results.push(...this._findMatches(file.children, targetPath))
        }
      }
    }

    return results
  }

  private _mergeFolders(nodes: TreeNode[]): TreeNode[] {
    const pathMap = new Map<string, TreeNode>()

    for (const node of nodes) {
      if (node.type === 'file') {
        pathMap.set(node.path, node)
      }
      else if (node.type === 'folder' && node.children) {
        const existing = pathMap.get(node.path)

        if (existing && existing.type === 'folder' && existing.children) {
          // Merge children of folders with the same path
          const mergedChildren = this._mergeFolders([...existing.children, ...node.children])
          pathMap.set(node.path, { ...existing, children: mergedChildren })
        }
        else {
          // Recursively merge children within this folder
          const mergedChildren = this._mergeFolders(node.children)
          pathMap.set(node.path, { ...node, children: mergedChildren })
        }
      }
    }

    return Array.from(pathMap.values())
  }
}
