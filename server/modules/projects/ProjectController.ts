/* eslint-disable ts/no-unsafe-type-assertion -- MDT-258 baseline: pre-existing casts, strip as they are rewritten */
import type { ProjectUpdateInput } from '@mdt/shared/tools/ProjectManager.js'
import type { Request, Response } from 'express'
import type { AuthenticatedRequest, FileWatcher, ProjectServiceExtension } from '../projects/types.js'
import { ProjectUpdateEnvelopeSchema, RegisterProjectInputSchema, UpdateProjectSharingInputSchema } from '@mdt/domain-contracts'
import { WorktreeService } from '@mdt/shared/services/WorktreeService.js'
import { ProjectManager } from '@mdt/shared/tools/ProjectManager.js'
import { ProjectValidator } from '@mdt/shared/tools/ProjectValidator.js'

import { DEFAULTS } from '@mdt/shared/utils/constants.js'
import { parseRequest } from '../../http/parseRequest.js'
import { createProjectAccess } from '../../http/projectAccess.js'
import { ProjectCodeParamsSchema } from '../../http/projectSchemas.js'
import { BypassCacheQuerySchema } from '../../http/readSchemas.js'
import { ProjectRefParamsSchema } from '../../http/ticketSchemas.js'

import { getRequestAccess } from '../../security/apiAuth.js'
import {
  filterProjectsForAccess,
  findProjectByRef,
  isProjectVisibleToAccess,
  isWriteAccess,
  sanitizeProjectForAccess,
  sanitizeProjectsForAccess,
  updateProjectSharing,
} from '../../security/projectSharing.js'

export class ProjectController {
  private access: ReturnType<typeof createProjectAccess>
  private resolveVisibleProject(...args: Parameters<typeof this.access.resolveVisibleProject>) { return this.access.resolveVisibleProject(...args) }
  private projectManager: ProjectManager
  private worktreeService: WorktreeService
  constructor(private projectService: ProjectServiceExtension, private fileWatcher: FileWatcher = {}, projectManager = new ProjectManager(true), worktreeService = new WorktreeService()) {
    this.projectManager = projectManager
    this.worktreeService = worktreeService
    this.access = createProjectAccess(projectService)
  }

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

      await this.projectService.clearCache?.()

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
}
