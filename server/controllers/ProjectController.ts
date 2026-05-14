import type { Ticket as DomainTicket, SearchMode } from '@mdt/domain-contracts'
import type { Project, ProjectConfig } from '@mdt/shared/models/Project.js'
import type { TicketMetadata } from '@mdt/shared/models/Ticket.js'
import type { ProjectCreateInput, ProjectUpdateInput } from '@mdt/shared/tools/ProjectManager.js'
import type { Request, Response } from 'express'
import type { CRData, TicketService } from '../services/TicketService.js'
import type { TreeNode } from '../types/tree.js'

import { SearchRequestSchema } from '@mdt/domain-contracts'
import { WorktreeService } from '@mdt/shared/services/WorktreeService.js'
import { ProjectManager } from '@mdt/shared/tools/ProjectManager.js'
import { ProjectValidator } from '@mdt/shared/tools/ProjectValidator.js'
import { DEFAULTS } from '@mdt/shared/utils/constants.js'

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
  params: {
    projectId?: string
    code?: string
    crId?: string
  }
  query: {
    projectId?: string
    path?: string
    bypassCache?: string
  }
  body: unknown
}

// Extended interfaces for methods not in shared ProjectService
// These methods are now provided by ProjectManager
export interface ProjectServiceExtension {
  getAllProjects: (bypassCache?: boolean) => Promise<Project[]>
  getProjectConfig: (path: string) => ProjectConfig | null
  getProjectCRs: (path: string) => Promise<Ticket[]>
  getProjectCRsMetadata: (path: string) => Promise<TicketMetadata[]>
  getSystemDirectories: (path?: string) => Promise<DirectoryListing>
  configureDocuments: (projectId: string, documentPaths: string[]) => Promise<void>
  updateProject?: (projectId: string, updates: ProjectUpdateInput) => void
  updateProjectByPath?: (projectId: string, projectPath: string, updates: ProjectUpdateInput) => void
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

  /**
   * Search tickets across projects. MDT-152.
   */
  async search(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body against schema
      const parseResult = SearchRequestSchema.safeParse(req.body)
      if (!parseResult.success) {
        const firstIssue = parseResult.error.issues[0]
        const message = firstIssue?.message ?? 'Validation error'
        res.status(400).json({ error: 'Bad Request', message })
        return
      }

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
      const bypassCache = req.query.bypassCache === 'true'
      const projects = await this.projectService.getAllProjects(bypassCache)
      // Filter out inactive projects (MDT-001)
      const activeProjects = projects.filter(project => project.project.active === true)

      res.json(activeProjects)
    }
    catch {
      res.status(500).json({ error: 'Failed to get projects' })
    }
  }

  /**
   * Get project configuration.
   */
  async getProjectConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { projectId } = req.params

    if (!projectId) {
      res.status(400).json({ error: 'Project ID is required' })

      return
    }

    try {
      // Get project by ID first, then get config using project path
      const projects = await this.projectService.getAllProjects()
      const project = projects.find(p => p.id === projectId || p.project.code === projectId)

      if (!project) {
        res.status(404).json({ error: 'Not Found', message: 'Project not found' })

        return
      }

      const config = this.projectService.getProjectConfig(project.project.path)

      if (!config) {
        res.status(404).json({ error: 'Not Found', message: 'Project configuration not found' })

        return
      }

      const result = { project, config }

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
      const result = await this.projectManager.createProject(req.body as ProjectCreateInput)

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
      const { code } = req.params

      if (!code) {
        res.status(400).json({ error: 'Bad Request', message: 'Project code is required' })

        return
      }

      const updates = req.body as ProjectUpdateInput
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

        try {
          this.projectService.updateProject(project.id, validatedUpdates)
        }
        catch (error) {
          if (!this.projectService.updateProjectByPath) {
            throw error
          }

          this.projectService.updateProjectByPath(project.id, project.project.path, validatedUpdates)
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

  /**
   * Enable project.
   */
  async enableProject(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { code } = req.params

      if (!code) {
        res.status(400).json({ error: 'Bad Request', message: 'Project code is required' })

        return
      }

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
      const { code } = req.params

      if (!code) {
        res.status(400).json({ error: 'Project code is required' })

        return
      }

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
      const { path: requestPath } = req.query
      const result = await this.projectService.getSystemDirectories(requestPath as string)

      res.json(result)
    }
    catch (error: unknown) {
      console.error('Error listing directories:', error)
      const err = error as Error
      if (err.message.includes('Access denied')) {
        res.status(403).json({ error: err.message })
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
      const { projectId } = req.query

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
    const { projectId, documentPaths } = req.body

    if (!projectId || !Array.isArray(documentPaths)) {
      res.status(400).json({ error: 'Project ID and document paths are required' })

      return
    }

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
      const { projectId } = req.params

      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })

        return
      }

      // Get project by ID first, supporting bypassCache query param
      const bypassCache = req.query.bypassCache === 'true'
      const projects = await this.projectService.getAllProjects(bypassCache)
      const project = projects.find(p => p.id === projectId || p.project.code === projectId)

      if (!project) {
        res.status(404).json({ error: 'Not Found', message: 'Project not found' })

        return
      }

      // MDT-094: Return metadata-only for list endpoint (reduces payload)
      const crs = await this.projectService.getProjectCRsMetadata(project.project.path)

      res.json(crs)
    }
    catch (error: unknown) {
      console.error('Error getting project CRs:', error)
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to get project CRs' })
    }
  }

  async getCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, crId } = req.params

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' })

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
      const { projectId } = req.params
      const crData = req.body as CRData

      if (!projectId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID is required' })

        return
      }

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.createCR(projectId, crData as CRData)

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
      const { projectId, crId } = req.params
      const updates = req.body as Record<string, unknown>

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' })

        return
      }

      if (!updates || Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'Bad Request', message: 'No update data provided' })

        return
      }

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
      const { projectId, crId } = req.params
      const crData = req.body as Record<string, unknown>

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' })

        return
      }

      // Use TicketService if available
      if (this.ticketService) {
        const result = await this.ticketService.updateCRPartial(projectId, crId, crData as Record<string, unknown>)

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
      const { projectId, crId } = req.params
      const subDocName = (req.params as Record<string, string>).subDocName

      if (!projectId || !crId || !subDocName) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID, CR ID, and sub-document name are required' })
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

  async deleteCR(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { projectId, crId } = req.params

      if (!projectId || !crId) {
        res.status(400).json({ error: 'Bad Request', message: 'Project ID and CR ID are required' })

        return
      }

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
}
