/* eslint-disable ts/no-unsafe-type-assertion -- MDT-258 baseline: pre-existing casts, strip as they are rewritten */
import type { Request, Response } from 'express'
import type { FileWatcher, ProjectServiceExtension } from '../projects/index.js'
import { ConfigureDocumentsInputSchema } from '@mdt/domain-contracts'

import { DEFAULTS } from '@mdt/shared/utils/constants.js'
import { parseRequest } from '../../http/parseRequest.js'

export class DocumentConfigurationController {
  constructor(private projectService: ProjectServiceExtension, private fileWatcher: FileWatcher) {}
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
}
