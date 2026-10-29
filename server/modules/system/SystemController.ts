/* eslint-disable ts/no-unsafe-type-assertion -- MDT-258 baseline: pre-existing casts, strip as they are rewritten */
import type { Response } from 'express'
import type { AuthenticatedRequest, ProjectServiceExtension, TreeServiceInterface } from '../projects/index.js'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import process from 'node:process'
import { GlobalConfigSchema } from '@mdt/domain-contracts'

import { parseToml } from '@mdt/shared/utils/toml.js'
import { getRuntimeConfig } from '../../config/runtimeConfig.js'
import { parseRequest } from '../../http/parseRequest.js'
import { FilesystemPathQuerySchema, ProjectRefQuerySchema } from '../../http/readSchemas.js'
import { authorizeFilesystemPath, FilesystemAccessDeniedError, getProjectRoots } from '../../security/filesystemAccess.js'

export class SystemController {
  constructor(private projectService: ProjectServiceExtension, private treeService: TreeServiceInterface) {}
  async getSystemDirectories(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const query = parseRequest(FilesystemPathQuerySchema, req.query, res, 'query')
      if (!query.success)
        return
      const { path: requestPath } = query.data
      const configPath = `${getRuntimeConfig(req.app).configDir}/config.toml`
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

      const runtimeConfig = getRuntimeConfig(req.app)
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
}
