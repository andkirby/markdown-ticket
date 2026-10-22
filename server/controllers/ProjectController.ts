import type { Ticket as DomainTicket, SearchMode } from '@mdt/domain-contracts'
import type { Project, ProjectConfig } from '@mdt/shared/models/Project.js'
import type { TicketMetadata } from '@mdt/shared/models/Ticket.js'
import type { ProjectUpdateInput } from '@mdt/shared/tools/ProjectManager.js'
import type { Request, Response } from 'express'
import type { RequestAccessContext } from '../security/apiAuth.js'
import type { TicketService } from '../services/TicketService.js'
import type { TreeNode } from '../types/tree.js'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import process from 'node:process'
import { ConfigureDocumentsInputSchema, GlobalConfigSchema, ProjectUpdateEnvelopeSchema, RegisterProjectInputSchema, SearchRequestSchema, UpdateProjectSharingInputSchema } from '@mdt/domain-contracts'
import { WorktreeService } from '@mdt/shared/services/WorktreeService.js'
import { ProjectManager } from '@mdt/shared/tools/ProjectManager.js'
import { ProjectValidator } from '@mdt/shared/tools/ProjectValidator.js'
import { DEFAULTS } from '@mdt/shared/utils/constants.js'

import { parseToml } from '@mdt/shared/utils/toml.js'
import { getRuntimeConfig } from '../config/runtimeConfig.js'
import { parseRequest } from '../http/parseRequest.js'
import { ProjectCodeParamsSchema } from '../http/projectSchemas.js'
import { BypassCacheQuerySchema, FilesystemPathQuerySchema, ProjectionQuerySchema, ProjectRefQuerySchema, SubdocumentRefParamsSchema } from '../http/readSchemas.js'
import { ProjectRefParamsSchema, RestCreateTicketInputSchema, RestPatchTicketInputSchema, TicketRefParamsSchema } from '../http/ticketSchemas.js'
import { getRequestAccess } from '../security/apiAuth.js'
import { authorizeFilesystemPath, FilesystemAccessDeniedError, getProjectRoots } from '../security/filesystemAccess.js'
import {
  filterProjectsForAccess,
  findProjectByRef,
  isProjectVisibleToAccess,
  isWriteAccess,
  sanitizeProjectForAccess,
  sanitizeProjectsForAccess,
  updateProjectSharing,
} from '../security/projectSharing.js'

export type Ticket = Pick<DomainTicket, 'code' | 'filePath'>

interface DirectoryListing {
  currentPath: string
  parentPath: string
  directories: {
    name: string
    path: string
    isDirectory: boolean
  }[]
}

export interface AuthenticatedRequest extends Request {
  mdtAccess?: RequestAccessContext
  params: {
    projectId?: string
    code?: string
    crId?: string
  }
  query: {
    projectId?: string
    path?: string
    bypassCache?: string
    after?: string
    limit?: string
  }
  body: unknown
}

// Extended interfaces for methods not in shared ProjectService
// These methods are now provided by ProjectManager
export interface ProjectServiceExtension {
  getAllProjects: (bypassCache?: boolean) => Promise<Project[]>
  getProjectConfig: (path: string) => ProjectConfig | null
  getProjectCRs: (project: Project) => Promise<Ticket[]>
  getProjectCRsMetadata: (project: Project) => Promise<TicketMetadata[]>
  getSystemDirectories: (path?: string) => Promise<DirectoryListing>
  configureDocuments: (projectId: string, documentPaths: string[]) => Promise<void>
  updateProject?: (projectId: string, updates: ProjectUpdateInput) => void
  updateProjectByPath?: (projectId: string, projectPath: string, updates: ProjectUpdateInput) => void
  updateVisibleProject?: (project: Project, updates: ProjectUpdateInput) => void
  projectDiscovery: {
    getAllProjects: (bypassCache?: boolean) => Promise<Project[]>
    autoDiscoverProjects: (searchPaths: string[]) => Project[]
    getRegisteredProjects: () => Project[]
    registerProject: (project: Project, documentDiscoverySettings?: {
      paths?: string[]
      maxDepth?: number
    }) => void
  }
}

export interface TreeServiceInterface {
  getPathSelectionTree: (projectId: string) => Promise<TreeNode[]>
}

interface FileWatcher {
  reconfigureDocumentWatchers?: (projectId: string, projectRoot: string, documentPaths: string[], ticketsPath?: string) => Promise<number>
  disconnectReadOnlyClients?: () => void
}

/**
 * Controller layer for project-related HTTP endpoints.
 */
export class ProjectController {
  private projectService: ProjectServiceExtension
  private treeService: TreeServiceInterface
  private fileWatcher: FileWatcher
  private projectManager: ProjectManager
  /**
   * Optional TicketController for delegation.
   */
  private ticketController?: {
    ticketService?: {
      getCR: (projectId: string, crId: string) => Promise<unknown>
      updateCRPartial: (projectId: string, crId: string, updates: Record<string, unknown>) => Promise<unknown>
    }
  }

  /**
   * Optional TicketService for CR operations.
   */
  private ticketService?: TicketService

  /**
   * WorktreeService for worktree path resolution (MDT-093).
   */
  private worktreeService: WorktreeService

  constructor(
    projectService: ProjectServiceExtension,
    treeService: TreeServiceInterface,
    fileWatcher: FileWatcher,
    ticketController?: {
      ticketService?: {
        getCR: (projectId: string, crId: string) => Promise<unknown>
        updateCRPartial: (projectId: string, crId: string, updates: Record<string, unknown>) => Promise<unknown>
      }
    }, // Optional TicketController for CR operations
    ticketService?: TicketService, // Optional TicketService for CR operations
  ) {
    this.projectService = projectService
    this.treeService = treeService
    this.fileWatcher = fileWatcher
    this.projectManager = new ProjectManager(true) // Quiet mode for server
    this.ticketController = ticketController
    this.ticketService = ticketService
    this.worktreeService = new WorktreeService() // MDT-093: Initialize WorktreeService
  }

  /** MDT-179: Expose project service for unified search */
  getProjectService() { return this.projectService }

  /** MDT-179: Expose ticket service for unified search */
  getTicketService() { return this.ticketService }

  /**
   * Search tickets across projects. MDT-152.
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      const parseResult = parseRequest(SearchRequestSchema, req.body, res, 'body')
      if (!parseResult.success)
        return

      const { mode, query, limitPerProject, limitTotal } = parseResult.data
      const projectCode = 'projectCode' in parseResult.data
        ? (parseResult.data as { projectCode: string }).projectCode
        : undefined

      if (!this.ticketService) {
        res.status(501).json({ error: 'Ticket service not available for search' })
        return
      }

      const result = await this.ticketService.searchTickets(
        mode as SearchMode,
        query,
        { projectCode, limitPerProject, limitTotal },
      )

      res.json(result)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
        return
      }
      console.error('Error searching tickets:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to search tickets' })
    }
  }

  /**
   * Get all projects.
   */
  async getAllProjects(req: Request, res: Response): Promise<void> {
    try {
      const query = parseRequest(BypassCacheQuerySchema, req.query, res, 'query')
      if (!query.success)
        return
      const bypassCache = query.data.bypassCache === 'true'
      const projects = await this.projectService.getAllProjects(bypassCache)
      // Filter out inactive projects (MDT-001)
      const activeProjects = projects.filter(project => project.project.active === true)
      const access = getRequestAccess(req)
      const visibleProjects = filterProjectsForAccess(activeProjects, access)

      res.json(sanitizeProjectsForAccess(visibleProjects, access))
    }
    catch (error: unknown) {
      console.error('Error getting projects:', error)
      res.status(500).json({ error: 'Failed to get projects' })
    }
  }

  /**
   * Get project configuration.
   */
  async getProjectConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
    if (!params.success)
      return
    const { projectId } = params.data

    if (!projectId) {
      res.status(400).json({ error: 'Project ID is required' })

      return
    }

    try {
      // Get project by ID first, then get config using project path
      const projects = await this.projectService.getAllProjects()
      const project = findProjectByRef(projects, projectId)
      const access = getRequestAccess(req)

      if (!project || !isProjectVisibleToAccess(project, access)) {
        res.status(404).json({ error: 'Not Found', message: 'Project not found' })

        return
      }

      const config = this.projectService.getProjectConfig(project.project.path)

      if (!config) {
        res.status(404).json({ error: 'Not Found', message: 'Project configuration not found' })

        return
      }

      const result = {
        project: sanitizeProjectForAccess(project, access),
        config: isWriteAccess(access) ? config : null,
      }

      res.json(result)
    }
    catch (error: unknown) {
      console.error('Error getting project config:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get project configuration' })
    }
  }

  /**
   * Create new project.
   */
  async createProject(req: Request, res: Response): Promise<void> {
    try {
      const body = parseRequest(RegisterProjectInputSchema, req.body, res, 'body')
      if (!body.success)
        return
      const result = await this.projectManager.createProject(body.data)

      // File watcher will automatically detect the new .toml file
      // and emit the 'project-created' event - no manual emission needed

      res.json(result)
    }
    catch (error: unknown) {
      console.error('Error creating project:', error)
      const err = error as Error & { code?: string, errno?: number, path?: string }
      if (err.message.includes('required') || err.message.includes('already exists')) {
        res.status(400).json({ error: err.message })
      }
      else {
        res.status(500).json({ error: 'Failed to create project', details: err.message })
      }
    }
  }

  /**
   * Update existing project.
   */
  async updateProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectCodeParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { code } = params.data

      const body = parseRequest(ProjectUpdateEnvelopeSchema, req.body, res, 'body')
      if (!body.success)
        return
      const updates = body.data
      const validatedUpdates: ProjectUpdateInput = {}

      if (updates.name !== undefined) {
        const nameResult = ProjectValidator.validateName(updates.name)
        if (!nameResult.valid) {
          res.status(400).json({ error: 'Bad Request', message: nameResult.error })
          return
        }
        validatedUpdates.name = nameResult.normalized!
      }

      if (updates.description !== undefined) {
        const descResult = ProjectValidator.validateDescription(updates.description)
        if (!descResult.valid) {
          res.status(400).json({ error: 'Bad Request', message: descResult.error })
          return
        }
        validatedUpdates.description = descResult.normalized!
      }

      if (updates.repository !== undefined) {
        const repoResult = ProjectValidator.validateRepository(updates.repository)
        if (!repoResult.valid) {
          res.status(400).json({ error: 'Bad Request', message: repoResult.error })
          return
        }
        validatedUpdates.repository = repoResult.normalized!
      }

      if (updates.active !== undefined) {
        validatedUpdates.active = updates.active
      }

      if (this.projectService.updateProject) {
        const projects = await this.projectService.getAllProjects(true)
        const normalizedCode = code.toLowerCase()
        const project = projects.find(project =>
          project.id === code || project.project.code?.toLowerCase() === normalizedCode,
        )

        if (!project) {
          res.status(404).json({ error: 'Not Found', message: 'Project not found' })
          return
        }

        if (this.projectService.updateVisibleProject) {
          this.projectService.updateVisibleProject(project, validatedUpdates)
        }
        else {
          try {
            this.projectService.updateProject(project.id, validatedUpdates)
          }
          catch (error) {
            if (!this.projectService.updateProjectByPath || !(error instanceof Error) || !error.message.includes('not found in registry')) {
              throw error
            }

            this.projectService.updateProjectByPath(project.id, project.project.path, validatedUpdates)
          }
        }

        const updatedProjects = await this.projectService.getAllProjects(true)
        const result = updatedProjects.find(updatedProject => updatedProject.id === project.id) || project
        res.json(result)
        return
      }

      const result = await this.projectManager.updateProject(code, validatedUpdates)

      res.json(result)
    }
    catch (error: unknown) {
      console.error('Error updating project:', error)
      const err = error as Error
      if (err.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
      }
      else {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update project' })
      }
    }
  }

  async updateProjectSharing(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectCodeParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { code } = params.data

      const body = parseRequest(UpdateProjectSharingInputSchema, req.body, res, 'body')
      if (!body.success)
        return

      const projects = await this.projectService.getAllProjects(true)
      const project = findProjectByRef(projects, code)

      if (!project) {
        res.status(404).json({ error: 'Not Found', message: 'Project not found' })
        return
      }

      const updatedProject = await updateProjectSharing(project, {
        mode: body.data.mode,
        ...(body.data.rotateShareId === true ? { rotateShareId: true } : {}),
      })

      if ('clearCache' in this.projectService.projectDiscovery) {
        await (this.projectService.projectDiscovery as { clearCache?: () => void | Promise<void> }).clearCache?.()
      }

      this.fileWatcher.disconnectReadOnlyClients?.()
      res.json(updatedProject)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message.includes('Invalid')) {
        res.status(400).json({ error: 'Bad Request', message: err.message })
        return
      }

      console.error('Error updating project sharing:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update project sharing' })
    }
  }

  /**
   * Enable project.
   */
  async enableProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectCodeParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { code } = params.data

      const result = await this.projectManager.enableProject(code)

      res.json(result)
    }
    catch (error: unknown) {
      console.error('Error enabling project:', error)
      const err = error as Error
      if (err.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
      }
      else {
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to enable project' })
      }
    }
  }

  /**
   * Disable project.
   */
  async disableProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectCodeParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { code } = params.data

      const result = await this.projectManager.disableProject(code)

      res.json(result)
    }
    catch (error: unknown) {
      console.error('Error disabling project:', error)
      const err = error as Error
      if (err.message === 'Project not found') {
        res.status(404).json({ error: err.message })
      }
      else {
        res.status(500).json({ error: 'Failed to disable project' })
      }
    }
  }

  /**
   * Get system directories.
   */
  async getSystemDirectories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query = parseRequest(FilesystemPathQuerySchema, req.query, res, 'query')
      if (!query.success)
        return
      const { path: requestPath } = query.data
      const configPath = `${getRuntimeConfig(req).configDir}/config.toml`
      let discoveryPaths: string[] = []

      try {
        const config = GlobalConfigSchema.parse(parseToml(await fs.readFile(configPath, 'utf8')))

        discoveryPaths = config.discovery?.searchPaths || []
      }
      catch {
        discoveryPaths = []
      }

      const allowedRoots = [
        ...discoveryPaths,
        ...await getProjectRoots(this.projectService),
      ]

      const runtimeConfig = getRuntimeConfig(req)
      if (runtimeConfig.system.isTest) {
        allowedRoots.push(os.tmpdir())
      }

      if (!runtimeConfig.system.isProduction) {
        allowedRoots.push(os.homedir())
      }

      const targetPath = requestPath
        ? await authorizeFilesystemPath(requestPath, allowedRoots)
        : await authorizeFilesystemPath(allowedRoots[0] || process.cwd(), allowedRoots)
      const result = await this.projectService.getSystemDirectories(targetPath)

      res.json(result)
    }
    catch (error: unknown) {
      console.error('Error listing directories:', error)
      const err = error as Error
      if (error instanceof FilesystemAccessDeniedError || err.message.includes('Access denied')) {
        res.status(403).json({ error: 'Forbidden' })
      }
      else if (err.message.includes('not found') || err.message.includes('not accessible')) {
        res.status(404).json({ error: err.message })
      }
      else {
        res.status(500).json({ error: 'Failed to list directories' })
      }
    }
  }

  /**
   * Get file system tree.
   */
  async getFileSystemTree(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query = parseRequest(ProjectRefQuerySchema, req.query, res, 'query')
      if (!query.success)
        return
      const { projectId } = query.data

      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })

        return
      }

      const items = await this.treeService.getPathSelectionTree(projectId)

      res.json(items)
    }
    catch (error: unknown) {
      console.error('Error loading file system:', error)
      const err = error as Error
      if (err.message === 'Project not found' || err.message === 'Path not found') {
        res.status(404).json({ error: err.message })
      }
      else {
        res.status(500).json({ error: 'Failed to load file system' })
      }
    }
  }

  /**
   * Configure document paths.
   */
  async configureDocuments(req: Request, res: Response): Promise<void> {
    const body = parseRequest(ConfigureDocumentsInputSchema, req.body, res, 'body')
    if (!body.success)
      return
    const { projectId, documentPaths } = body.data

    try {
      await this.projectService.configureDocuments(projectId, documentPaths)
      await this.reconfigureDocumentWatchers(projectId, documentPaths)
      res.json({ success: true })
    }
    catch (error: unknown) {
      console.error('Error configuring documents:', error)
      const err = error as Error
      if (err.message === 'Project not found') {
        res.status(404).json({ error: err.message })
      }
      else if (err.message.includes('must be an array')) {
        res.status(400).json({ error: err.message })
      }
      else {
        res.status(500).json({ error: 'Failed to configure documents' })
      }
    }
  }

  private async reconfigureDocumentWatchers(projectId: string, documentPaths: string[]): Promise<void> {
    if (!this.fileWatcher.reconfigureDocumentWatchers)
      return

    const projects = await this.projectService.getAllProjects(true)
    const project = projects.find(project => project.id === projectId || project.project.code === projectId)
    if (!project)
      return

    const config = this.projectService.getProjectConfig(project.project.path)
    const ticketsPath = config?.project?.ticketsPath || config?.project?.path || DEFAULTS.TICKETS_PATH

    await this.fileWatcher.reconfigureDocumentWatchers(project.id, project.project.path, documentPaths, ticketsPath)
  }

  /**
   * CR/CR-related methods - delegate to TicketController or return not implemented.
   */
  async getProjectCRs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId } = params.data

      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })

        return
      }

      const project = await this.resolveVisibleProject(projectId, req, res)
      if (!project) {
        return
      }

      // MDT-094: Return metadata-only for list endpoint (reduces payload)
      const crs = await this.projectService.getProjectCRsMetadata(project)

      res.json(crs)
    }
    catch (error: unknown) {
      console.error('Error getting project CRs:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get project CRs' })
    }
  }

  /**
   * Get the unified ticket view (MDT-226): canonical local tickets plus
   * projection-only read-only entries from the cloud stream read model. Each
   * item carries kind/readOnly/stale capability metadata (C-11). The browser
   * consumes this instead of a separate /cloud-projections request.
   */
  async getUnifiedTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId } = params.data
      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })
        return
      }
      const project = await this.resolveVisibleProject(projectId, req, res)
      if (!project) {
        return
      }
      if (!this.ticketService) {
        res.status(503).json({ error: 'Service Unavailable', message: 'Ticket service not initialized' })
        return
      }
      const items = await this.ticketService.getUnifiedTickets(projectId)
      res.json(items)
    }
    catch (error: unknown) {
      console.error('Error getting unified tickets:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get unified tickets' })
    }
  }

  async getCloudProjections(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId } = params.data
      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })
        return
      }

      if (!isWriteAccess(getRequestAccess(req))) {
        res.status(403).json({ error: 'Forbidden', message: 'Owner access is required' })
        return
      }

      if (!this.ticketService) {
        res.status(501).json({ error: 'Ticket service not available for cloud projections' })
        return
      }

      const query = parseRequest(ProjectionQuerySchema, req.query, res, 'query')
      if (!query.success)
        return
      const after = Number.parseInt(query.data.after ?? '0', 10)
      const limit = Number.parseInt(query.data.limit ?? '100', 10)
      if (!Number.isSafeInteger(after) || after < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
        res.status(400).json({ error: 'Bad Request', message: 'Invalid projection cursor or limit' })
        return
      }

      const result = await this.ticketService.getCloudProjections(projectId, after, limit)
      res.json(result)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
        return
      }
      console.error('Error polling cloud projections:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to poll cloud projections' })
    }
  }

  async getCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' })

        return
      }

      if (!await this.resolveVisibleProject(projectId, req, res)) {
        return
      }

      // Use TicketService if available
      if (this.ticketService) {
        const cr = await this.ticketService.getCR(projectId, crId)

        res.json(cr)

        return
      }

      // Fallback: try to use TicketController if it has the necessary methods
      if (this.ticketController?.ticketService) {
        const cr = await this.ticketController.ticketService.getCR(projectId, crId)

        res.json(cr)

        return
      }

      res.status(501).json({ error: 'Ticket service not available for fetching CR' })
    }
    catch (error: unknown) {
      console.error('Error getting CR:', error)
      const err = error as Error

      if (err.message === 'Project not found' || err.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })

        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get CR', details: err.message })
    }
  }

  async createCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(ProjectRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId } = params.data
      const body = parseRequest(RestCreateTicketInputSchema, req.body, res, 'body')
      if (!body.success)
        return
      const crData = body.data

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.createCR(projectId, crData)

        res.status(201).json(result)

        return
      }

      res.status(501).json({ error: 'Ticket service not available for creating CR' })
    }
    catch (error: unknown) {
      console.error('Error creating CR:', error)
      const err = error as Error

      if (err.message === 'Project not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })

        return
      }

      if (err.message.includes('required')) {
        res.status(400).json({ error: 'Bad Request', message: err.message })

        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to create CR', details: err.message })
    }
  }

  async patchCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data
      const body = parseRequest(RestPatchTicketInputSchema, req.body, res, 'body')
      if (!body.success)
        return
      const updates = body.data

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.updateCRPartial(projectId, crId, updates)

        res.json(result)

        return
      }

      // Fallback: try to use TicketController if it has the necessary methods
      if (this.ticketController?.ticketService) {
        const result = await this.ticketController.ticketService.updateCRPartial(projectId, crId, updates)

        res.json(result)

        return
      }

      res.status(501).json({ error: 'Ticket service not available for CR updates' })
    }
    catch (error: unknown) {
      console.error('Error updating CR:', error)
      const err = error as Error

      // Handle validation errors with appropriate status codes
      if (err.message.includes('Invalid status transition')) {
        res.status(400).json({ error: 'Bad Request', message: err.message })

        return
      }

      if (err.message === 'Project not found' || err.message === 'CR not found' || err.message.includes('not found')) {
        res.status(404).json({ error: 'Not Found', message: err.message })

        return
      }

      if (err.message.includes('No fields provided') || err.message.includes('required') || err.message.includes('Invalid')) {
        res.status(400).json({ error: 'Bad Request', message: err.message })

        return
      }

      if (err.message.includes('Permission denied')) {
        res.status(403).json({ error: 'Forbidden', message: err.message })

        return
      }

      // Generic errors
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update CR', details: err.message })
    }
  }

  async updateCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data
      const body = parseRequest(RestPatchTicketInputSchema, req.body, res, 'body')
      if (!body.success)
        return
      const crData = body.data

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.updateCRPartial(projectId, crId, crData)

        res.json(result)

        return
      }

      res.status(501).json({ error: 'Ticket service not available for updating CR' })
    }
    catch (error: unknown) {
      console.error('Error updating CR:', error)
      const err = error as Error

      if (err.message === 'Project not found' || err.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })

        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update CR', details: err.message })
    }
  }

  async getSubDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(SubdocumentRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId, subDocName } = params.data

      if (!projectId || !crId || !subDocName) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID, CR ID, and sub-document name are required' })
        return
      }

      if (!await this.resolveVisibleProject(projectId, req, res)) {
        return
      }

      if (!this.ticketService) {
        res.status(501).json({ error: 'Ticket service not available' })
        return
      }

      const doc = await this.ticketService.getSubDocument(projectId, crId, subDocName)
      res.json(doc)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message === 'Project not found' || err.message === 'SubDocument not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
        return
      }
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get sub-document' })
    }
  }

  async getTraceStoreMetadata(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' })
        return
      }

      if (!await this.resolveVisibleProject(projectId, req, res)) {
        return
      }

      if (!this.ticketService) {
        res.status(501).json({ error: 'Ticket service not available' })
        return
      }

      const metadata = await this.ticketService.getTraceStoreMetadata(projectId, crId)
      res.setHeader('Cache-Control', 'no-store')
      res.json(metadata)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message === 'Project not found' || err.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get trace store metadata' })
    }
  }

  async getTraceStore(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' })
        return
      }

      if (!await this.resolveVisibleProject(projectId, req, res)) {
        return
      }

      if (!this.ticketService) {
        res.status(501).json({ error: 'Ticket service not available' })
        return
      }

      const result = await this.ticketService.getTraceStore(projectId, crId)
      res.setHeader('Cache-Control', 'no-store')
      res.json(result.store)
    }
    catch (error: unknown) {
      const err = error as Error
      if (err.message === 'Project not found' || err.message === 'CR not found' || err.message === 'TraceStore not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })
        return
      }

      if (err.message === 'TraceStore invalid') {
        res.status(422).json({ error: 'Unprocessable Entity', message: 'TraceStore invalid' })
        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get trace store' })
    }
  }

  async deleteCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const params = parseRequest(TicketRefParamsSchema, req.params, res, 'params')
      if (!params.success)
        return
      const { projectId, crId } = params.data

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.deleteCR(projectId, crId)

        res.json(result)

        return
      }

      res.status(501).json({ error: 'Ticket service not available for deleting CR' })
    }
    catch (error: unknown) {
      console.error('Error deleting CR:', error)
      const err = error as Error

      if (err.message === 'Project not found' || err.message === 'CR not found') {
        res.status(404).json({ error: 'Not Found', message: err.message })

        return
      }

      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete CR', details: err.message })
    }
  }

  async ensureProjectVisible(projectRef: string, req: Request, res: Response): Promise<boolean> {
    return Boolean(await this.resolveVisibleProject(projectRef, req, res))
  }

  private async resolveVisibleProject(projectRef: string, req: Request, res: Response): Promise<Project | null> {
    const query = parseRequest(BypassCacheQuerySchema, req.query, res, 'query')
    if (!query.success)
      return null
    const projects = await this.projectService.getAllProjects(query.data.bypassCache === 'true')
    const project = findProjectByRef(projects, projectRef)
    const access = getRequestAccess(req)

    if (!project || !isProjectVisibleToAccess(project, access)) {
      res.status(404).json({ error: 'Not Found', message: 'Project not found' })
      return null
    }

    return project
  }
}
