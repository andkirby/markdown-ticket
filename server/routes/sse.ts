import type { Request } from 'express'
import type FileWatcherService from '../fileWatcherService.js'
import { logger } from '@mdt/shared/utils/server-logger.js'
import { Router } from 'express'

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
export function createSSERouter(fileWatcher: FileWatcherService): Router {
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
  // eslint-disable-next-line ts/no-explicit-any
  router.get('/', (req: Request, res: any) => {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    })

    // Add client to file watcher service first (so it's tracked before sending data)
    fileWatcher.addClient(res)

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
