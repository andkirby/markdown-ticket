import type { DocumentFavItem, DocumentFavState } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project.js'
import type { TreeNode } from '../types/tree.js'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  parseDocumentFavStateOrDefault,
  validateDocumentFavState,
} from '@mdt/domain-contracts'
import { getConfigDir } from '@mdt/shared/utils/constants.js'
import { TreeService } from './TreeService.js'

interface ProjectDiscovery {
  getAllProjects: () => Promise<Project[]>
}

export class DocumentFavStateService {
  private projectDiscovery: ProjectDiscovery
  private treeService: TreeService

  constructor(projectDiscovery: ProjectDiscovery, treeService?: TreeService) {
    this.projectDiscovery = projectDiscovery
    this.treeService = treeService ?? new TreeService(projectDiscovery)
  }

  async readReconciledState(projectRef: string, eligibleTree: TreeNode[]): Promise<DocumentFavState> {
    const project = await this.resolveProject(projectRef)
    const state = await this.readStateFile(project)

    return this.reconcileState(state, eligibleTree)
  }

  async writeState(projectRef: string, input: unknown): Promise<DocumentFavState> {
    const project = await this.resolveProject(projectRef)
    const state = validateDocumentFavState(input)
    const eligibleTree = await this.treeService.getDocumentTree(project.id)
    const eligible = this.buildEligibleMap(eligibleTree)

    for (const item of state.favItems) {
      const eligibleItem = eligible.get(item.path)
      if (!eligibleItem || eligibleItem.type !== item.type) {
        throw new Error('Invalid document fav target')
      }
    }

    await fs.mkdir(path.dirname(this.getStatePath(project)), { recursive: true })
    await fs.writeFile(this.getStatePath(project), JSON.stringify(state, null, 2), 'utf8')

    return state
  }

  enrichTree(tree: TreeNode[], state: DocumentFavState): TreeNode[] {
    const favorites = new Map(state.favItems.map(item => [item.path, item]))

    return tree.map((node) => {
      const favorite = favorites.get(node.path)
      return {
        ...node,
        ...(favorite ? { favorite: true, favoritedAt: favorite.favoritedAt } : {}),
        ...(node.children ? { children: this.enrichTree(node.children, state) } : {}),
      }
    })
  }

  getStatePathForProjectId(projectId: string): string {
    return path.join(getConfigDir(), 'projects', projectId, 'document-favs.json')
  }

  async resolveProject(projectRef: string): Promise<Project> {
    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(p => p.id === projectRef || p.project.code === projectRef)

    if (!project) {
      throw new Error('Project not found')
    }

    return project
  }

  private async readStateFile(project: Project): Promise<DocumentFavState> {
    try {
      const content = await fs.readFile(this.getStatePath(project), 'utf8')
      return parseDocumentFavStateOrDefault(JSON.parse(content))
    }
    catch {
      return { favItems: [] }
    }
  }

  private reconcileState(state: DocumentFavState, eligibleTree: TreeNode[]): DocumentFavState {
    const eligible = this.buildEligibleMap(eligibleTree)
    const favItems = state.favItems.filter((item) => {
      const eligibleItem = eligible.get(item.path)
      return eligibleItem?.type === item.type
    })

    return { favItems }
  }

  private buildEligibleMap(tree: TreeNode[]): Map<string, Pick<DocumentFavItem, 'path' | 'type'>> {
    const eligible = new Map<string, Pick<DocumentFavItem, 'path' | 'type'>>()

    const walk = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        eligible.set(node.path, { path: node.path, type: node.type })
        if (node.children) {
          walk(node.children)
        }
      }
    }

    walk(tree)

    return eligible
  }

  private getStatePath(project: Project): string {
    return this.getStatePathForProjectId(project.id)
  }
}
