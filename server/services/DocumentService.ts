import type { TreeNode } from '../types/tree.js'
import * as path from 'node:path'
import { FileOperationInvoker } from '../invokers/FileOperationInvoker.js'
import { TreeService } from './TreeService.js'

// Type definitions
interface Project {
  id: string
  project: {
    name: string
    path: string
    active: boolean
  }
}

interface ProjectDiscovery {
  getAllProjects: () => Promise<Project[]>
}

interface FileInvoker {
  readFile: (filePath: string) => Promise<string>
}

/**
 * Service layer for document discovery and management.
 */
export class DocumentService {
  private projectDiscovery: ProjectDiscovery
  private treeService: TreeService
  private _fileInvoker: FileInvoker

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery
    this.treeService = new TreeService(projectDiscovery)
    this._fileInvoker = new FileOperationInvoker()
  }

  /**
   * Discover documents for a project.
   */
  async discoverDocuments(projectId: string): Promise<TreeNode[]> {
    return await this.treeService.getDocumentTree(projectId)
  }

  /**
   * Get document content.
   */
  async getDocumentContent(projectId: string, filePath: string): Promise<string> {
    if (filePath.includes('..')) {
      throw new Error('Invalid file path')
    }

    if (!filePath.endsWith('.md')) {
      throw new Error('Only markdown files are allowed')
    }

    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(p => p.id === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    const projectPath = project.project.path
    const resolvedPath = path.join(projectPath, filePath)

    if (!resolvedPath.startsWith(projectPath)) {
      throw new Error('Access denied')
    }

    return await this._fileInvoker.readFile(resolvedPath)
  }

  /**
   * Expose file invoker for external use.
   */
  get fileInvoker(): FileInvoker {
    return this._fileInvoker
  }
}
