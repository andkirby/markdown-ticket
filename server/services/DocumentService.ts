import type { Project } from '@mdt/shared/models/Project.js'
import type { TreeNode } from '../types/tree.js'
import * as path from 'node:path'
import { FileOperationInvoker } from '../invokers/FileOperationInvoker.js'
import { ConfigRepository } from '../repositories/ConfigRepository.js'
import { DocumentFavStateService } from './DocumentFavStateService.js'
import { TreeService } from './TreeService.js'

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
  private documentFavStateService: DocumentFavStateService
  private configRepository: ConfigRepository
  private _fileInvoker: FileInvoker

  constructor(projectDiscovery: ProjectDiscovery) {
    this.projectDiscovery = projectDiscovery
    this.treeService = new TreeService(projectDiscovery)
    this.documentFavStateService = new DocumentFavStateService(projectDiscovery, this.treeService)
    this.configRepository = new ConfigRepository()
    this._fileInvoker = new FileOperationInvoker()
  }

  /**
   * Discover documents for a project.
   */
  async discoverDocuments(projectId: string): Promise<TreeNode[]> {
    const tree = await this.treeService.getDocumentTree(projectId)
    const favState = await this.documentFavStateService.readReconciledState(projectId, tree)

    return this.documentFavStateService.enrichTree(tree, favState)
  }

  async updateDocumentFavs(projectId: string, favState: unknown) {
    return await this.documentFavStateService.writeState(projectId, favState)
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
    const project = projects.find(p => p.id === projectId || p.project.code === projectId)

    if (!project) {
      throw new Error('Project not found')
    }

    const projectPath = path.resolve(project.project.path)
    const normalizedFilePath = this.normalizeRelativePath(filePath)
    const config = await this.configRepository.getConfig(projectPath)

    if (!this.isInConfiguredDocumentPath(normalizedFilePath, config.documentPaths)) {
      throw new Error('File is outside configured document paths')
    }

    const resolvedPath = path.resolve(projectPath, normalizedFilePath)

    if (!this.isInsideProjectPath(projectPath, resolvedPath)) {
      throw new Error('Access denied')
    }

    return await this._fileInvoker.readFile(resolvedPath)
  }

  private normalizeRelativePath(filePath: string): string {
    return filePath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+/g, '/')
  }

  private isInsideProjectPath(projectPath: string, resolvedPath: string): boolean {
    const relativePath = path.relative(projectPath, resolvedPath)
    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath))
  }

  private isInConfiguredDocumentPath(filePath: string, documentPaths: string[]): boolean {
    return documentPaths.some((documentPath) => {
      const normalizedDocumentPath = this.normalizeRelativePath(documentPath)
      if (normalizedDocumentPath === '' || normalizedDocumentPath === '.') {
        return true
      }

      return filePath === normalizedDocumentPath || filePath.startsWith(`${normalizedDocumentPath}/`)
    })
  }

  /**
   * Expose file invoker for external use.
   */
  get fileInvoker(): FileInvoker {
    return this._fileInvoker
  }
}
