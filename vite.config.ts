import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend logging state
let frontendSessionActive = false;
let frontendSessionStart = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const frontendLogs = [];
const MAX_FRONTEND_LOGS = 1000;
const streamClients = new Set(); // SSE clients

// DEV mode logging state
let devModeActive = false;
let devModeStart = null;
const DEV_MODE_TIMEOUT = 60 * 60 * 1000; // 1 hour
const devModeLogs = [];
const MAX_DEV_MODE_LOGS = 1000;
const DEV_MODE_RATE_LIMIT = 300; // 300 logs per minute
let devModeLogCount = 0;
let devModeRateLimitStart = Date.now();
const devStreamClients = new Set(); // DEV mode SSE clients

// Status endpoint rate limiting
const statusRequestTimes = new Map(); // IP -> last request time
const STATUS_RATE_LIMIT = 10000; // 10 seconds minimum between requests

// Vite plugin for frontend logging endpoints
const frontendLoggingPlugin = () => ({
  name: 'frontend-logging',
  configureServer(server) {
    server.middlewares.use('/api/frontend/logs/status', (req, res, next) => {
      if (req.method === 'GET') {
        // Rate limiting for status endpoint
        const clientIP = req.connection?.remoteAddress || 'unknown';
        const now = Date.now();
        const lastRequest = statusRequestTimes.get(clientIP);
        
        if (lastRequest && (now - lastRequest) < STATUS_RATE_LIMIT) {
          res.statusCode = 429;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Rate limited' }));
          return;
        }
        
        statusRequestTimes.set(clientIP, now);
        
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ 
          active: frontendSessionActive,
          sessionStart: frontendSessionStart,
          timeRemaining: frontendSessionActive ? (SESSION_TIMEOUT - (Date.now() - frontendSessionStart)) : null
        }));
      } else {
        next();
      }
    });

    server.middlewares.use('/api/frontend/logs/start', (req, res, next) => {
      if (req.method === 'POST') {
        frontendSessionActive = true;
        frontendSessionStart = Date.now();
        console.log('🔍 Frontend logging session started');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'started', sessionStart: frontendSessionStart }));
      } else {
        next();
      }
    });

    server.middlewares.use('/api/frontend/logs/stop', (req, res, next) => {
      if (req.method === 'POST') {
        frontendSessionActive = false;
        frontendSessionStart = null;
        console.log('🔍 Frontend logging session stopped');
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'stopped' }));
      } else {
        next();
      }
    });

    // SSE streaming endpoint
    server.middlewares.use('/api/frontend/logs/stream', (req, res, next) => {
      if (req.method === 'GET') {
        // Set SSE headers
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Send initial connection event
        res.write('data: {"type":"connection","status":"connected","timestamp":' + Date.now() + '}\n\n');

        // Add client to stream
        streamClients.add(res);
        console.log(`SSE client connected. Total clients: ${streamClients.size}`);

        // Handle client disconnect
        req.on('close', () => {
          console.log('SSE client disconnected');
          streamClients.delete(res);
        });

        req.on('aborted', () => {
          console.log('SSE client aborted');
          streamClients.delete(res);
        });
      } else {
        next();
      }
    });

    // Cache clear endpoint
    server.middlewares.use('/api/cache/clear', (req, res, next) => {
      if (req.method === 'POST') {
        // Call backend to clear cache
        fetch('http://localhost:3001/api/cache/clear', { method: 'POST' })
          .then(response => response.json())
          .then(data => {
            console.log('🔄 Config cache cleared via frontend');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Config cache cleared successfully',
              timestamp: new Date().toISOString()
            }));
          })
          .catch(error => {
            console.log('⚠️ Backend cache clear failed, continuing anyway');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              success: true, 
              message: 'Cache clear requested (backend may be unavailable)',
              timestamp: new Date().toISOString()
            }));
          });
      } else {
        next();
      }
    });

    // DEV mode rate limiting helper
    const checkDevModeRateLimit = () => {
      const now = Date.now();
      if (now - devModeRateLimitStart > 60000) {
        devModeLogCount = 0;
        devModeRateLimitStart = now;
      }
      return devModeLogCount < DEV_MODE_RATE_LIMIT;
    };

    // DEV mode status endpoint
    server.middlewares.use('/api/frontend/dev-logs/status', (req, res, next) => {
      if (req.method === 'GET') {
        const now = Date.now();

        // Auto-disable after timeout
        if (devModeActive && devModeStart && (now - devModeStart) > DEV_MODE_TIMEOUT) {
          devModeActive = false;
          devModeStart = null;
          console.log('🛠️ DEV mode logging auto-disabled after 1 hour timeout');
        }

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          active: devModeActive,
          sessionStart: devModeStart,
          timeRemaining: devModeActive && devModeStart ? (DEV_MODE_TIMEOUT - (now - devModeStart)) : null,
          rateLimit: {
            limit: DEV_MODE_RATE_LIMIT,
            current: devModeLogCount,
            resetTime: devModeRateLimitStart + 60000
          }
        }));
      } else {
        next();
      }
    });

    // DEV mode logs endpoint
    server.middlewares.use('/api/frontend/dev-logs', (req, res, next) => {
      if (req.method === 'POST') {
        if (!devModeActive) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'DEV mode not active',
            message: 'DEV mode logging is not currently active'
          }));
          return;
        }

        if (!checkDevModeRateLimit()) {
          res.statusCode = 429;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'Rate limit exceeded',
            message: 'DEV mode logging rate limit of 300 logs per minute exceeded'
          }));
          return;
        }

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const { logs } = JSON.parse(body);
          if (logs && Array.isArray(logs)) {
            devModeLogs.push(...logs);
            devModeLogCount += logs.length;
            if (devModeLogs.length > MAX_DEV_MODE_LOGS) {
              devModeLogs.splice(0, devModeLogs.length - MAX_DEV_MODE_LOGS);
            }
            console.log(`🛠️ DEV: Received ${logs.length} frontend log entries`);

            // Broadcast logs to DEV mode SSE clients
            logs.forEach(log => {
              devStreamClients.forEach(client => {
                try {
                  client.write(`data: ${JSON.stringify({
                    type: 'dev-log',
                    timestamp: log.timestamp,
                    level: log.level,
                    message: log.message,
                    url: log.url
                  })}\n\n`);
                } catch (error) {
                  devStreamClients.delete(client);
                }
              });
            });
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            received: logs?.length || 0,
            rateLimit: {
              remaining: DEV_MODE_RATE_LIMIT - devModeLogCount,
              resetTime: devModeRateLimitStart + 60000
            }
          }));
        });
      } else if (req.method === 'GET') {
        if (!devModeActive) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'DEV mode not active',
            message: 'DEV mode logging is not currently active'
          }));
          return;
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const lines = Math.min(parseInt(url.searchParams.get('lines')) || 20, MAX_DEV_MODE_LOGS);
        const filter = url.searchParams.get('filter');

        let filteredLogs = devModeLogs;
        if (filter) {
          filteredLogs = devModeLogs.filter(log =>
            log.message.toLowerCase().includes(filter.toLowerCase())
          );
        }

        const recentLogs = filteredLogs.slice(-lines);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          logs: recentLogs,
          total: filteredLogs.length,
          devMode: true,
          timeRemaining: devModeStart ? (DEV_MODE_TIMEOUT - (Date.now() - devModeStart)) : null
        }));
      } else {
        next();
      }
    });

    server.middlewares.use('/api/frontend/logs', (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const { logs } = JSON.parse(body);
          if (logs && Array.isArray(logs)) {
            frontendLogs.push(...logs);
            if (frontendLogs.length > MAX_FRONTEND_LOGS) {
              frontendLogs.splice(0, frontendLogs.length - MAX_FRONTEND_LOGS);
            }
            console.log(`📝 Received ${logs.length} frontend log entries`);

            // Broadcast logs to SSE clients
            logs.forEach(log => {
              streamClients.forEach(client => {
                try {
                  client.write(`data: ${JSON.stringify({
                    type: 'log',
                    timestamp: log.timestamp,
                    level: log.level,
                    message: log.message,
                    url: log.url
                  })}\n\n`);
                } catch (error) {
                  // Remove broken clients
                  streamClients.delete(client);
                }
              });
            });
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ received: logs?.length || 0 }));
        });
      } else if (req.method === 'GET') {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const lines = Math.min(parseInt(url.searchParams.get('lines')) || 20, MAX_FRONTEND_LOGS);
        const filter = url.searchParams.get('filter');

        let filteredLogs = frontendLogs;
        if (filter) {
          filteredLogs = frontendLogs.filter(log =>
            log.message.toLowerCase().includes(filter.toLowerCase())
          );
        }

        const recentLogs = filteredLogs.slice(-lines);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ logs: recentLogs, total: filteredLogs.length }));
      } else {
        next();
      }
    });
  }
});

// Plugin to inject environment variables into HTML
const envInjectionPlugin = () => ({
  name: 'env-injection',
  transformIndexHtml(html, context) {
    // Access Vite's environment variables from the config
    const autoStartValue = context.server?.config?.env?.VITE_FRONTEND_LOGGING_AUTOSTART === 'true' ||
                          process.env.VITE_FRONTEND_LOGGING_AUTOSTART === 'true';

    // Debug: Uncomment the line below to debug environment variable injection
    // console.log('🔍 Environment variable debug:', { viteEnv: context.server?.config?.env?.VITE_FRONTEND_LOGGING_AUTOSTART, autoStartValue });

    const scriptTag = `    <script>
      // Inject environment variable for mcp-logger.js
      window.VITE_FRONTEND_LOGGING_AUTOSTART = ${JSON.stringify(autoStartValue)};
    </script>`;

    // Insert the script tag before the mcp-logger.js script
    return html.replace(
      '    <!-- MCP Logger - loads before React, works even when app is broken -->',
      `    <!-- Environment variables injection -->
${scriptTag}
    <!-- MCP Logger - loads before React, works even when app is broken -->`
    );
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), frontendLoggingPlugin(), envInjectionPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})