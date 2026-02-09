/* eslint-disable node/prefer-global/process -- Build config, unused-imports/no-unused-vars -- Unused variables in config, unicorn/prefer-number-properties, node/handle-callback-err, style/multiline-ternary -- Config file patterns */
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Frontend logging state
let frontendSessionActive = false
let frontendSessionStart = null
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const frontendLogs = []
const MAX_FRONTEND_LOGS = 1000
const streamClients = new Set() // SSE clients

// DEV mode logging state
let devModeActive = false
let devModeStart = null
const DEV_MODE_TIMEOUT = 60 * 60 * 1000 // 1 hour
const devModeLogs = []
const MAX_DEV_MODE_LOGS = 1000
const DEV_MODE_RATE_LIMIT = 300 // 300 logs per minute
let devModeLogCount = 0
let devModeRateLimitStart = Date.now()
const devStreamClients = new Set() // DEV mode SSE clients

// Status endpoint rate limiting - reduced for development
const statusRequestTimes = new Map() // IP -> last request time
const STATUS_RATE_LIMIT = 2000 // 2 seconds minimum between requests (reduced from 10s)

// Vite plugin for frontend logging endpoints
function frontendLoggingPlugin() {
  return {
    name: 'frontend-logging',
    configureServer(server) {
      server.middlewares.use('/api/frontend/logs/status', (req, res, next) => {
        if (req.method === 'GET') {
        // Rate limiting for status endpoint - improved IP detection for Docker
          const clientIP = req.headers['x-forwarded-for']
            || req.headers['x-real-ip']
            || req.connection?.remoteAddress
            || req.socket?.remoteAddress
            || req.ip
            || 'unknown'
          const now = Date.now()
          void statusRequestTimes.get(clientIP) // Retrieved for potential rate limiting (currently disabled)

          // Temporarily disable rate limiting for development
          // if (lastRequest && (now - lastRequest) < STATUS_RATE_LIMIT) {
          //   const waitTime = STATUS_RATE_LIMIT - (now - lastRequest);
          //   console.log(`[Frontend Logs] Rate limited IP: ${clientIP}, Last: ${lastRequest}, Now: ${now}, Wait: ${waitTime}ms`);
          //   res.statusCode = 429;
          //   res.setHeader('Content-Type', 'application/json');
          //   res.setHeader('Retry-After', Math.ceil(waitTime / 1000).toString());
          //   res.end(JSON.stringify({
          //     error: 'Rate limited',
          //     waitTime: Math.ceil(waitTime / 1000),
          //     clientIP: clientIP,
          //     lastRequest: lastRequest,
          //     currentTime: now
          //   }));
          //   return;
          // }

          statusRequestTimes.set(clientIP, now)

          // Debug logging for rate limiting issues
          console.log(`[Frontend Logs] Status check from IP: ${clientIP}, Session active: ${frontendSessionActive}`)

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            active: frontendSessionActive,
            sessionStart: frontendSessionStart,
            timeRemaining: frontendSessionActive ? (SESSION_TIMEOUT - (Date.now() - frontendSessionStart)) : null,
            clientIP,
            rateLimit: STATUS_RATE_LIMIT,
          }))
        }
        else {
          next()
        }
      })

      server.middlewares.use('/api/frontend/logs/start', (req, res, next) => {
        if (req.method === 'POST') {
          frontendSessionActive = true
          frontendSessionStart = Date.now()
          console.log('🔍 Frontend logging session started')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ status: 'started', sessionStart: frontendSessionStart }))
        }
        else {
          next()
        }
      })

      server.middlewares.use('/api/frontend/logs/stop', (req, res, next) => {
        if (req.method === 'POST') {
          frontendSessionActive = false
          frontendSessionStart = null
          console.log('🔍 Frontend logging session stopped')
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ status: 'stopped' }))
        }
        else {
          next()
        }
      })

      // SSE streaming endpoint
      server.middlewares.use('/api/frontend/logs/stream', (req, res, next) => {
        if (req.method === 'GET') {
        // Set SSE headers
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
          })

          // Send initial connection event
          res.write(`data: {"type":"connection","status":"connected","timestamp":${Date.now()}}\n\n`)

          // Add client to stream
          streamClients.add(res)
          console.log(`SSE client connected. Total clients: ${streamClients.size}`)

          // Handle client disconnect
          req.on('close', () => {
            console.log('SSE client disconnected')
            streamClients.delete(res)
          })

          req.on('aborted', () => {
            console.log('SSE client aborted')
            streamClients.delete(res)
          })
        }
        else {
          next()
        }
      })

      // Cache clear endpoint
      server.middlewares.use('/api/cache/clear', (req, res, next) => {
        if (req.method === 'POST') {
        // Call backend to clear cache
          const backendUrl = process.env.DOCKER_BACKEND_URL || 'http://localhost:3001'
          fetch(`${backendUrl}/api/cache/clear`, { method: 'POST' })
            .then(response => response.json())
            .then(() => {
              console.log('🔄 Config cache cleared via frontend')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: true,
                message: 'Config cache cleared successfully',
                timestamp: new Date().toISOString(),
              }))
            })
            .catch(() => {
              console.log('⚠️ Backend cache clear failed, continuing anyway')
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({
                success: true,
                message: 'Cache clear requested (backend may be unavailable)',
                timestamp: new Date().toISOString(),
              }))
            })
        }
        else {
          next()
        }
      })

      // DEV mode rate limiting helper
      const checkDevModeRateLimit = () => {
        const now = Date.now()
        if (now - devModeRateLimitStart > 60000) {
          devModeLogCount = 0
          devModeRateLimitStart = now
        }
        return devModeLogCount < DEV_MODE_RATE_LIMIT
      }

      // DEV mode status endpoint
      server.middlewares.use('/api/frontend/dev-logs/status', (req, res, next) => {
        if (req.method === 'GET') {
          const now = Date.now()

          // Auto-disable after timeout
          if (devModeActive && devModeStart && (now - devModeStart) > DEV_MODE_TIMEOUT) {
            devModeActive = false
            devModeStart = null
            console.log('🛠️ DEV mode logging auto-disabled after 1 hour timeout')
          }

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            active: devModeActive,
            sessionStart: devModeStart,
            timeRemaining: devModeActive && devModeStart ? (DEV_MODE_TIMEOUT - (now - devModeStart)) : null,
            rateLimit: {
              limit: DEV_MODE_RATE_LIMIT,
              current: devModeLogCount,
              resetTime: devModeRateLimitStart + 60000,
            },
          }))
        }
        else {
          next()
        }
      })

      // DEV mode logs endpoint
      server.middlewares.use('/api/frontend/dev-logs', (req, res, next) => {
        if (req.method === 'POST') {
          if (!devModeActive) {
            res.statusCode = 403
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: 'DEV mode not active',
              message: 'DEV mode logging is not currently active',
            }))
            return
          }

          if (!checkDevModeRateLimit()) {
            res.statusCode = 429
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: 'Rate limit exceeded',
              message: 'DEV mode logging rate limit of 300 logs per minute exceeded',
            }))
            return
          }

          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            const { logs } = JSON.parse(body)
            if (logs && Array.isArray(logs)) {
              devModeLogs.push(...logs)
              devModeLogCount += logs.length
              if (devModeLogs.length > MAX_DEV_MODE_LOGS) {
                devModeLogs.splice(0, devModeLogs.length - MAX_DEV_MODE_LOGS)
              }
              console.log(`🛠️ DEV: Received ${logs.length} frontend log entries`)

              // Broadcast logs to DEV mode SSE clients
              logs.forEach((log) => {
                devStreamClients.forEach((client) => {
                  try {
                    client.write(`data: ${JSON.stringify({
                      type: 'dev-log',
                      timestamp: log.timestamp,
                      level: log.level,
                      message: log.message,
                      url: log.url,
                    })}\n\n`)
                  }
                  catch {
                    devStreamClients.delete(client)
                  }
                })
              })
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              received: logs?.length || 0,
              rateLimit: {
                remaining: DEV_MODE_RATE_LIMIT - devModeLogCount,
                resetTime: devModeRateLimitStart + 60000,
              },
            }))
          })
        }
        else if (req.method === 'GET') {
          if (!devModeActive) {
            res.statusCode = 403
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              error: 'DEV mode not active',
              message: 'DEV mode logging is not currently active',
            }))
            return
          }

          const url = new URL(req.url, `http://${req.headers.host}`)
          const lines = Math.min(Number.parseInt(url.searchParams.get('lines')) || 20, MAX_DEV_MODE_LOGS)
          const filter = url.searchParams.get('filter')

          let filteredLogs = devModeLogs
          if (filter) {
            filteredLogs = devModeLogs.filter(log =>
              log.message.toLowerCase().includes(filter.toLowerCase()),
            )
          }

          const recentLogs = filteredLogs.slice(-lines)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            logs: recentLogs,
            total: filteredLogs.length,
            devMode: true,
            timeRemaining: devModeStart ? (DEV_MODE_TIMEOUT - (Date.now() - devModeStart)) : null,
          }))
        }
        else {
          next()
        }
      })

      server.middlewares.use('/api/frontend/logs', (req, res, next) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            const { logs } = JSON.parse(body)
            if (logs && Array.isArray(logs)) {
              frontendLogs.push(...logs)
              if (frontendLogs.length > MAX_FRONTEND_LOGS) {
                frontendLogs.splice(0, frontendLogs.length - MAX_FRONTEND_LOGS)
              }
              console.log(`📝 Received ${logs.length} frontend log entries`)

              // Broadcast logs to SSE clients
              logs.forEach((log) => {
                streamClients.forEach((client) => {
                  try {
                    client.write(`data: ${JSON.stringify({
                      type: 'log',
                      timestamp: log.timestamp,
                      level: log.level,
                      message: log.message,
                      url: log.url,
                    })}\n\n`)
                  }
                  catch {
                  // Remove broken clients
                    streamClients.delete(client)
                  }
                })
              })
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ received: logs?.length || 0 }))
          })
        }
        else if (req.method === 'GET') {
          const url = new URL(req.url, `http://${req.headers.host}`)
          const lines = Math.min(Number.parseInt(url.searchParams.get('lines')) || 20, MAX_FRONTEND_LOGS)
          const filter = url.searchParams.get('filter')

          let filteredLogs = frontendLogs
          if (filter) {
            filteredLogs = frontendLogs.filter(log =>
              log.message.toLowerCase().includes(filter.toLowerCase()),
            )
          }

          const recentLogs = filteredLogs.slice(-lines)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ logs: recentLogs, total: filteredLogs.length }))
        }
        else {
          next()
        }
      })
    },
  }
}

// Plugin to inject environment variables into HTML
function envInjectionPlugin() {
  return {
    name: 'env-injection',
    transformIndexHtml(html, context) {
    // Access Vite's environment variables from the config
      const autoStartValue = context.server?.config?.env?.VITE_FRONTEND_LOGGING_AUTOSTART === 'true'
        || process.env.VITE_FRONTEND_LOGGING_AUTOSTART === 'true'

      // Debug: Uncomment the line below to debug environment variable injection
      // console.log('🔍 Environment variable debug:', { viteEnv: context.server?.config?.env?.VITE_FRONTEND_LOGGING_AUTOSTART, autoStartValue });

      const scriptTag = `    <script>
      // Inject environment variable for mcp-logger.js
      window.VITE_FRONTEND_LOGGING_AUTOSTART = ${JSON.stringify(autoStartValue)};
    </script>`

      // Insert the script tag before the mcp-logger.js script
      return html.replace(
        '    <!-- MCP Logger - loads before React, works even when app is broken -->',
        `    <!-- Environment variables injection -->
${scriptTag}
    <!-- MCP Logger - loads before React, works even when app is broken -->`,
      )
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(() => {
  // In Docker, use backend service name; otherwise use localhost
  const backendUrl = process.env.DOCKER_BACKEND_URL || 'http://localhost:3001'

  return {
    plugins: [react(), frontendLoggingPlugin(), envInjectionPlugin()],
    build: {
      chunkSizeWarningLimit: 1500,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@mdt/shared': path.resolve(__dirname, './shared/dist'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number(process.env.PORT) || 5173,
      allowedHosts: [
        '.loca.lt',
        '.trycloudflare.com',
        '.ngrok-free.app',
      ],
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
