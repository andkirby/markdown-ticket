import { Router } from 'express';
// In-memory log buffer for development
const logBuffer = [];
const MAX_LOG_ENTRIES = 100;
// Frontend logging session management
let frontendSessionActive = false;
let frontendSessionStart = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const frontendLogs = [];
const MAX_FRONTEND_LOGS = 1000;
// DEV mode logging state management
let devModeActive = false;
let devModeStart = null;
const DEV_MODE_TIMEOUT = 60 * 60 * 1000; // 1 hour
const devModeLogs = [];
const MAX_DEV_MODE_LOGS = 1000;
const DEV_MODE_RATE_LIMIT = 300; // 300 logs per minute
let devModeLogCount = 0;
let devModeRateLimitStart = Date.now();
/**
 * Add log entry to buffer
 * @param level - Log level (info, error, warn)
 * @param args - Log arguments
 */
function addToLogBuffer(level, ...args) {
    const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
    logBuffer.push({
        timestamp: Date.now(),
        level,
        message
    });
    // Keep only last MAX_LOG_ENTRIES
    if (logBuffer.length > MAX_LOG_ENTRIES) {
        logBuffer.shift();
    }
}
/**
 * Intercept console methods to capture logs
 */
export function setupLogInterception() {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    console.log = (...args) => {
        addToLogBuffer('info', ...args);
        originalLog(...args);
    };
    console.error = (...args) => {
        addToLogBuffer('error', ...args);
        originalError(...args);
    };
    console.warn = (...args) => {
        addToLogBuffer('warn', ...args);
        originalWarn(...args);
    };
}
/**
 * Rate limiting middleware for DEV endpoints
 */
function devModeRateLimit(req, res, next) {
    const now = Date.now();
    // Reset counter every minute
    if (now - devModeRateLimitStart > 60000) {
        devModeLogCount = 0;
        devModeRateLimitStart = now;
    }
    // Check rate limit
    if (devModeLogCount >= DEV_MODE_RATE_LIMIT) {
        res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'DEV mode logging rate limit of 300 logs per minute exceeded'
        });
        return;
    }
    next();
}
/**
 * Router for development tools and logging endpoints
 * @returns Express router
 */
export function createDevToolsRouter() {
    const router = Router();
    // ============================================================================
    // Server Logs API
    // ============================================================================
    // API endpoint for getting server logs (polling)
    router.get('/logs', (req, res) => {
        const lines = Math.min(parseInt(req.query.lines || '20'), MAX_LOG_ENTRIES);
        const filter = req.query.filter;
        let logs = logBuffer.slice(-lines);
        if (filter) {
            logs = logs.filter(log => log.message.toLowerCase().includes(filter.toLowerCase()));
        }
        res.json(logs);
    });
    // SSE endpoint for log streaming
    router.get('/logs/stream', (req, res) => {
        const filter = req.query.filter;
        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        // Send initial connection message
        res.write(`data: ${JSON.stringify({
            type: 'connected',
            message: 'Log stream connected',
            filter: filter || null
        })}\n\n`);
        // Handle client disconnect
        req.on('close', () => {
            console.log('SSE client disconnected');
        });
        // Send periodic heartbeat
        const heartbeat = setInterval(() => {
            res.write(`data: ${JSON.stringify({
                type: 'heartbeat',
                timestamp: Date.now()
            })}\n\n`);
        }, 30000);
        req.on('close', () => {
            clearInterval(heartbeat);
        });
    });
    // ============================================================================
    // Frontend Logging API
    // ============================================================================
    // Frontend session status
    router.get('/frontend/logs/status', (req, res) => {
        const status = {
            active: frontendSessionActive,
            sessionStart: frontendSessionStart,
            timeRemaining: frontendSessionActive ? (SESSION_TIMEOUT - (Date.now() - (frontendSessionStart || 0))) : null
        };
        res.json(status);
    });
    // Start frontend logging session
    router.post('/frontend/logs/start', (req, res) => {
        frontendSessionActive = true;
        frontendSessionStart = Date.now();
        console.log('🔍 Frontend logging session started');
        res.json({ status: 'started', sessionStart: frontendSessionStart });
    });
    // Stop frontend logging session
    router.post('/frontend/logs/stop', (req, res) => {
        frontendSessionActive = false;
        frontendSessionStart = null;
        console.log('🔍 Frontend logging session stopped');
        res.json({ status: 'stopped' });
    });
    // Receive frontend logs
    router.post('/frontend/logs', (req, res) => {
        const { logs } = req.body;
        if (logs && Array.isArray(logs)) {
            frontendLogs.push(...logs);
            // Trim buffer if too large
            if (frontendLogs.length > MAX_FRONTEND_LOGS) {
                frontendLogs.splice(0, frontendLogs.length - MAX_FRONTEND_LOGS);
            }
            console.log(`📝 Received ${logs.length} frontend log entries`);
        }
        res.json({ received: logs?.length || 0 });
    });
    // Get frontend logs
    router.get('/frontend/logs', (req, res) => {
        const lines = Math.min(parseInt(req.query.lines || '20'), MAX_FRONTEND_LOGS);
        const filter = req.query.filter;
        let filteredLogs = frontendLogs;
        if (filter) {
            filteredLogs = frontendLogs.filter(log => log.message.toLowerCase().includes(filter.toLowerCase()));
        }
        const recentLogs = filteredLogs.slice(-lines);
        res.json({ logs: recentLogs, total: filteredLogs.length });
    });
    // ============================================================================
    // DEV Mode Logging API
    // ============================================================================
    // DEV mode logging status
    router.get('/frontend/dev-logs/status', (req, res) => {
        const now = Date.now();
        // Auto-disable after timeout
        if (devModeActive && devModeStart && (now - devModeStart) > DEV_MODE_TIMEOUT) {
            devModeActive = false;
            devModeStart = null;
            console.log('🔍 DEV mode logging auto-disabled after 1 hour timeout');
        }
        const status = {
            active: devModeActive,
            sessionStart: devModeStart,
            timeRemaining: devModeActive && devModeStart ? (DEV_MODE_TIMEOUT - (now - devModeStart)) : null,
            rateLimit: {
                limit: DEV_MODE_RATE_LIMIT,
                current: devModeLogCount,
                resetTime: devModeRateLimitStart + 60000
            }
        };
        res.json(status);
    });
    // Receive DEV mode frontend logs
    router.post('/frontend/dev-logs', devModeRateLimit, (req, res) => {
        const { logs } = req.body;
        if (!devModeActive) {
            res.status(403).json({
                error: 'DEV mode not active',
                message: 'DEV mode logging is not currently active'
            });
            return;
        }
        if (logs && Array.isArray(logs)) {
            devModeLogs.push(...logs);
            devModeLogCount += logs.length;
            // Trim buffer if too large
            if (devModeLogs.length > MAX_DEV_MODE_LOGS) {
                devModeLogs.splice(0, devModeLogs.length - MAX_DEV_MODE_LOGS);
            }
            console.log(`🛠️ DEV: Received ${logs.length} frontend log entries`);
        }
        res.json({
            received: logs?.length || 0,
            rateLimit: {
                remaining: DEV_MODE_RATE_LIMIT - devModeLogCount,
                resetTime: devModeRateLimitStart + 60000
            }
        });
    });
    // Get DEV mode frontend logs
    router.get('/frontend/dev-logs', (req, res) => {
        if (!devModeActive) {
            res.status(403).json({
                error: 'DEV mode not active',
                message: 'DEV mode logging is not currently active'
            });
            return;
        }
        const lines = Math.min(parseInt(req.query.lines || '20'), MAX_DEV_MODE_LOGS);
        const filter = req.query.filter;
        let filteredLogs = devModeLogs;
        if (filter) {
            filteredLogs = devModeLogs.filter(log => log.message.toLowerCase().includes(filter.toLowerCase()));
        }
        const recentLogs = filteredLogs.slice(-lines);
        res.json({
            logs: recentLogs,
            total: filteredLogs.length,
            devMode: true,
            timeRemaining: devModeStart ? (DEV_MODE_TIMEOUT - (Date.now() - devModeStart)) : null
        });
    });
    return router;
}
//# sourceMappingURL=devtools.js.map