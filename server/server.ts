import * as path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { DEFAULT_PORTS } from '@mdt/shared/utils/constants.js'
import { parsePortEnv } from '@mdt/shared/utils/env.js'
import { logger } from '@mdt/shared/utils/server-logger.js'
import { config } from 'dotenv'
import { createApplication } from './app.js'
import { setupLogInterception } from './modules/system/devtools.js'
import { createDocsRouter } from './modules/system/docs.js'

// Explicit environment loading belongs to the executable only.
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
config({ path: path.resolve(rootDir, '.env.local') })
config({ path: path.resolve(rootDir, '.env') })

if (import.meta.url === `file://${process.argv[1]}`) {
  setupLogInterception()
  const handle = createApplication({ docsRouter: createDocsRouter() })
  const port = parsePortEnv('BACKEND_PORT', 'PORT', DEFAULT_PORTS.BACKEND)
  const host = process.env.API_BIND_ADDRESS?.trim() || '127.0.0.1'
  const sockets = new Set<import('node:net').Socket>()
  const server = handle.app.listen(port, host)
  server.timeout = 0
  server.keepAliveTimeout = 0
  server.requestTimeout = 0
  server.headersTimeout = 0
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
  })
  let stopping: Promise<void> | undefined
  function stop(): Promise<void> {
    stopping ??= (async () => {
      const closed = new Promise<void>(resolve => server.close(() => resolve()))
      for (const socket of sockets)
        socket.destroy()
      await handle.runtime.stop()
      await closed
    })()
    return stopping
  }
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      void stop().then(() => process.exit(0), (error) => {
        logger.error('Shutdown failed', error)
        process.exit(1)
      })
    })
  }
  server.once('listening', () => {
    logger.info(`Ticket board server running at http://${host}:${port}`)
    void handle.runtime.start().catch(async (error) => {
      logger.error('Runtime startup failed', error)
      await stop()
      process.exitCode = 1
    })
  })
  server.once('error', (error) => {
    logger.error('HTTP listener failed', error)
    void stop().finally(() => {
      process.exitCode = 1
    })
  })
}
