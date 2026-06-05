import type { Request } from 'express'
import type { OriginPolicy } from '../security/originPolicy.js'
import type { ProjectServiceExtension } from '../controllers/ProjectController.js'
import type FileWatcherService from '../services/fileWatcher/index.js'
import { logger } from '@mdt/shared/utils/server-logger.js'
import { Router } from 'express'
import { getRequestAccess } from '../security/apiAuth.js'
import { createDefaultOriginPolicy } from '../security/originPolicy.js'
import { filterProjectsForAccess } from '../security/projectSharing.js'

interface _ResponseLike {
  write: (data: string) => void
  on: (event: string, callback: (...args: unknown[]) => void) => void
  headersSent: boolean
  destroyed?: boolean
  closed?: boolean
  end?: () => void
}

/**
 * Router for Server-Sent Events endpoints.
 *
 * @param fileWatcher - File watcher service instance.
 * @returns Express router.
 */
export function createSSERouter(
  fileWatcher: FileWatcherService,
  originPolicy: OriginPolicy = createDefaultOriginPolicy(),
  projectService?: ProjectServiceExtension,
): Router {
  const router = Router()

  /**
   * @openapi
   * /api/events:
   *   get:
   *     summary: Server-Sent Events stream
   *     tags: [Events]
   *     description: Real-time file change notifications via SSE
   *     responses:
   *       200:
   *         description: SSE event stream
   *         content:
   *           text/event-stream:
   *             schema:
   *               type: string
   *               description: SSE formatted events
   */

  router.get('/', async (req: Request, res: any) => {
    const accessControlAllowOrigin = originPolicy.getAccessControlAllowOrigin(req.headers.origin)
    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Headers': 'Cache-Control',
    }

    if (accessControlAllowOrigin) {
      headers['Access-Control-Allow-Origin'] = accessControlAllowOrigin
      headers.Vary = 'Origin'
    }

    if (req.headers.origin && !accessControlAllowOrigin) {
      logger.warn('SSE stream request from disallowed origin', { origin: req.headers.origin })
    }

    const access = getRequestAccess(req)
    const projectRefs = await resolveSseProjectRefs(projectService, access)

    // Set SSE headers
    res.writeHead(200, headers)

    // Disable all timeouts for long-lived SSE connections
    // Node.js defaults: requestTimeout=300s, headersTimeout=60s, keepAliveTimeout=5s
    // These will kill SSE connections if not disabled
    req.setTimeout(0)
    res.setTimeout(0)
    if (req.socket) {
      req.socket.setTimeout(0)
      req.socket.setKeepAlive(true)
    }

    // Add client to file watcher service first (so it's tracked before sending data)
    fileWatcher.addClient(res, {
      canWrite: access.canWrite,
      projectRefs,
    })

    // Send initial connection event on next tick to ensure stream is ready
    // This is critical for test environments where data listeners are attached asynchronously
    setImmediate(() => {
      res.write(`data: {"type":"connection","data":{"status":"connected","timestamp":${Date.now()}}}\n\n`)
      // Flush the stream to ensure data is sent immediately
      if (typeof res.flush === 'function') {
        res.flush()
      }
    })

    logger.info(`SSE client connected. Total clients: ${fileWatcher.getClientCount()}`)

    // Handle client disconnect
    req.on('close', () => {
      logger.info('SSE client disconnected')
      fileWatcher.removeClient(res)
    })

    req.on('aborted', () => {
      logger.info('SSE client aborted')
      fileWatcher.removeClient(res)
    })
  })

  return router
}

async function resolveSseProjectRefs(
  projectService: ProjectServiceExtension | undefined,
  access: ReturnType<typeof getRequestAccess>,
): Promise<string[]> {
  if (access.canWrite || !projectService) {
    return []
  }

  const projects = await projectService.getAllProjects()
  return filterProjectsForAccess(projects, access).flatMap(project => [project.id, project.project.code])
}
