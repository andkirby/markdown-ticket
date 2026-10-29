import type { Project } from '@mdt/shared/models/Project.js'
import type { Request, Response } from 'express'
import { getRequestAccess } from '../security/apiAuth.js'
import { findProjectByRef, isProjectVisibleToAccess } from '../security/projectSharing.js'
import { parseRequest } from './parseRequest.js'
import { BypassCacheQuerySchema } from './readSchemas.js'

export function createProjectAccess(catalog: { getAllProjects: (bypassCache?: boolean) => Promise<Project[]> }) {
  async function resolveVisibleProject(projectRef: string, req: Request, res: Response): Promise<Project | null> {
    const query = parseRequest(BypassCacheQuerySchema, req.query, res, 'query')
    if (!query.success)
      return null
    const projects = await catalog.getAllProjects(query.data.bypassCache === 'true')
    const project = findProjectByRef(projects, projectRef)
    const access = getRequestAccess(req)

    if (!project || !isProjectVisibleToAccess(project, access)) {
      res.status(404).json({ error: 'Not Found', message: 'Project not found' })
      return null
    }

    return project
  }
  return { resolveVisibleProject, ensureProjectVisible: async (ref: string, req: Request, res: Response) => Boolean(await resolveVisibleProject(ref, req, res)) }
}
export type ProjectAccess = ReturnType<typeof createProjectAccess>
