import type { Request, Response } from 'express'
import type { ProjectServiceExtension } from '../controllers/ProjectController.js'
import { Router } from 'express'
import { getRuntimeConfig } from '../config/runtimeConfig.js'
import { parseRequest } from '../http/parseRequest.js'
import { ShareParamsSchema } from '../http/sessionSchemas.js'
import { shouldUseSecureSessionCookie } from '../security/apiSession.js'
import { findProjectByShareId, sanitizeProjectForAccess } from '../security/projectSharing.js'
import { publicTokenExchangeRateLimit } from '../security/publicRateLimit.js'
import { appendMergedReadSessionCookie } from '../security/readSession.js'

export function createShareRouter(projectService: ProjectServiceExtension): Router {
  const router = Router()

  router.post('/:shareId/session', publicTokenExchangeRateLimit, async (req: Request, res: Response) => {
    const params = parseRequest(ShareParamsSchema, req.params, res, 'params')
    if (!params.success)
      return
    const { shareId } = params.data

    const projects = await projectService.getAllProjects(true)
    const project = findProjectByShareId(projects, shareId)
    if (!project) {
      res.status(404).json({ error: 'Not Found' })
      return
    }

    const runtimeConfig = getRuntimeConfig(req.app)
    const secret = runtimeConfig.readSessions.secret
    if (!secret) {
      res.status(500).json({ error: 'Sharing is not configured' })
      return
    }

    appendMergedReadSessionCookie({
      req,
      res,
      secret,
      shareIds: [shareId],
      secure: shouldUseSecureSessionCookie(req.secure, req.headers, runtimeConfig.nodeEnv),
    })

    res.json({
      project: sanitizeProjectForAccess(project, {
        canWrite: false,
        mode: 'read-only',
        projectRefs: [],
        shareIds: [shareId],
      }),
    })
  })

  return router
}
