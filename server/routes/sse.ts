import { Router, Request } from 'express';
import FileWatcherService from '../fileWatcherService.js';

interface _ResponseLike {
  write(data: string): void;
  on(event: string, callback: (...args: any[]) => void): void;
  headersSent: boolean;
  destroyed?: boolean;
  closed?: boolean;
  end?(): void;
}

/**
 * Router for Server-Sent Events endpoints
 * @param fileWatcher - File watcher service instance
 * @returns Express router
 */
export function createSSERouter(fileWatcher: FileWatcherService): Router {
  const router = Router();

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
  router.get('/', (req: Request, res: any) => {
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial connection event
    res.write('data: {"type":"connection","data":{"status":"connected","timestamp":' + Date.now() + '}}\n\n');

    // Add client to file watcher service
    fileWatcher.addClient(res);

    console.log(`SSE client connected. Total clients: ${fileWatcher.getClientCount()}`);

    // Handle client disconnect
    req.on('close', () => {
      console.log('SSE client disconnected');
      fileWatcher.removeClient(res);
    });

    req.on('aborted', () => {
      console.log('SSE client aborted');
      fileWatcher.removeClient(res);
    });
  });

  return router;
}