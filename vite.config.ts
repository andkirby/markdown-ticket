import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend logging state
let frontendSessionActive = false;
let frontendSessionStart = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const frontendLogs = [];
const MAX_FRONTEND_LOGS = 1000;
const streamClients = new Set(); // SSE clients

// Vite plugin for frontend logging endpoints
const frontendLoggingPlugin = () => ({
  name: 'frontend-logging',
  configureServer(server) {
    server.middlewares.use('/api/frontend/logs/status', (req, res, next) => {
      if (req.method === 'GET') {
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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), frontendLoggingPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})