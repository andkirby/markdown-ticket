import type { Project } from '@mdt/shared/models/Project.js'
import type { TreeNode } from '../types/tree.js'
import * as path from 'node:path'
import { FileOperationInvoker } from '../invokers/FileOperationInvoker.js'
import { ConfigRepository } from '../repositories/ConfigRepository.js'
import { isPathInsideDocDir } from '../security/documentPreviewToken.js'
import { DocumentFavStateService } from './DocumentFavStateService.js'
import { TreeService } from './TreeService.js'

interface ProjectDiscovery {
  getAllProjects: () => Promise<Project[]>
}

interface FileInvoker {
  readFile: (filePath: string) => Promise<string>
}

/**
 * MDT-221 — Hand-rolled MIME map for raw-preview serving (no new dependency,
 * per CR C-2.19/C-2.21). Unknown extensions return undefined and the handler
 * rejects with 415.
 *
 * SVG is included; its script vector is closed by the pinned CSP
 * (`default-src 'none'` with no `object-src` override blocks `<object>`/`<embed>`
 * SVG loading, and `<img>`-loaded SVG cannot execute). Do NOT relax
 * default-src without reconsidering SVG.
 */
const RAW_MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export function lookupRawMime(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase()
  return RAW_MIME[ext]
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
    const normalizedPath = path.posix.normalize(filePath.replace(/\\/g, '/').replace(/^\/+/, '')).replace(/\/+$/, '')

    return normalizedPath === '.' ? '' : normalizedPath.replace(/^\/+/, '')
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
   * MDT-221 — Resolve a raw-preview file path against the project, applying the
   * full gate chain (gates G4-G9 in architecture.md §3): project lookup,
   * path normalization, docDir token-scope check, configured-document-path
   * containment, and project-root containment. MIME lookup happens last.
   *
   * Unlike getDocumentContent, this does NOT gate on .md (assets like css/js/png
   * must be servable) and does NOT read the file (binary streaming happens in
   * the controller). The signature check (G2) and expiry (G3) are the token
   * module's responsibility and run before this method is called.
   *
   * Throws the existing error-message strings so the controller's error→status
   * switch maps cleanly; 'Unsupported document type' → 415 is new.
   */
  async resolveRawPreviewPath(
    projectId: string,
    docDir: string,
    requestedPath: string,
  ): Promise<{ projectPath: string, resolvedPath: string, mime: string }> {
    if (typeof requestedPath !== 'string' || requestedPath.includes('..')) {
      throw new Error('Invalid file path')
    }

    const projects = await this.projectDiscovery.getAllProjects()
    const project = projects.find(p => p.id === projectId || p.project.code === projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const projectPath = path.resolve(project.project.path)
    const normalizedRequested = this.normalizeRelativePath(requestedPath)

    // Gate G6: token-scope check. Every requested path must be inside the
    // token's docDir (project-relative). isPathInsideDocDir handles the empty
    // docDir (root) case.
    if (!isPathInsideDocDir(normalizedRequested, docDir)) {
      throw new Error('Access denied')
    }

    // Gate G7: configured document-paths containment.
    const config = await this.configRepository.getConfig(projectPath)
    if (!this.isInConfiguredDocumentPath(normalizedRequested, config.documentPaths)) {
      throw new Error('File is outside configured document paths')
    }

    // Gate G8: project-root containment (catches symlink escapes too).
    const resolvedPath = path.resolve(projectPath, normalizedRequested)
    if (!this.isInsideProjectPath(projectPath, resolvedPath)) {
      throw new Error('Access denied')
    }

    // Gate G9: MIME lookup. Unknown extensions are rejected explicitly (415).
    const mime = lookupRawMime(normalizedRequested)
    if (!mime) {
      throw new Error('Unsupported document type')
    }

    return { projectPath, resolvedPath, mime }
  }

  /**
   * Expose file invoker for external use.
   */
  get fileInvoker(): FileInvoker {
    return this._fileInvoker
  }
}
