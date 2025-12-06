import { Router, Request, Response, NextFunction } from 'express';

// Type definitions
interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
}

interface FrontendLogEntry extends LogEntry {
  source?: string;
  type?: string;
  url?: string;
  line?: number;
  column?: number;
}

interface FrontendSessionStatus {
  active: boolean;
  sessionStart: number | null;
  timeRemaining: number | null;
}

interface DevModeStatus {
  active: boolean;
  sessionStart: number | null;
  timeRemaining: number | null;
  rateLimit: {
    limit: number;
    current: number;
    resetTime: number;
  };
}

// In-memory log buffer for development
const logBuffer: LogEntry[] = [];
const MAX_LOG_ENTRIES = 100;

// Frontend logging session management
let frontendSessionActive = false;
let frontendSessionStart: number | null = null;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const frontendLogs: FrontendLogEntry[] = [];
const MAX_FRONTEND_LOGS = 1000;

// DEV mode logging state management
let devModeActive = false;
let devModeStart: number | null = null;
const DEV_MODE_TIMEOUT = 60 * 60 * 1000; // 1 hour
const devModeLogs: FrontendLogEntry[] = [];
const MAX_DEV_MODE_LOGS = 1000;
const DEV_MODE_RATE_LIMIT = 300; // 300 logs per minute
let devModeLogCount = 0;
let devModeRateLimitStart = Date.now();

interface AuthenticatedRequest extends Request {
  query: {
    lines?: string;
    filter?: string;
  };
  body: {
    logs?: FrontendLogEntry[];
  };
}

/**
 * Add log entry to buffer
 * @param level - Log level (info, error, warn)
 * @param args - Log arguments
 */
function addToLogBuffer(level: string, ...args: any[]): void {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

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
export function setupLogInterception(): void {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args: any[]) => {
    addToLogBuffer('info', ...args);
    originalLog(...args);
  };

  console.error = (...args: any[]) => {
    addToLogBuffer('error', ...args);
    originalError(...args);
  };

  console.warn = (...args: any[]) => {
    addToLogBuffer('warn', ...args);
    originalWarn(...args);
  };
}

/**
 * Rate limiting middleware for DEV endpoints
 */
function devModeRateLimit(req: Request, res: Response, next: NextFunction): void {
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
export function createDevToolsRouter(): Router {
  const router = Router();

  // ============================================================================
  // Server Logs API
  // ============================================================================

  /**
   * @openapi
   * /api/devtools/logs:
   *   get:
   *     tags: [DevTools]
   *     summary: Get server logs
   *     parameters:
   *       - name: lines
   *         in: query
   *         schema: { type: integer, default: 20, maximum: 100 }
   *       - name: filter
   *         in: query
   *         schema: { type: string }
   *         description: Case-insensitive text filter
   *     responses:
   *       200:
   *         description: Array of log entries
   *         content:
   *           application/json:
   *             schema: { type: array, items: { $ref: '#/components/schemas/LogEntry' } }
   */
  router.get('/logs', (req: AuthenticatedRequest, res: Response) => {
    const lines = Math.min(parseInt(req.query.lines || '20'), MAX_LOG_ENTRIES);
    const filter = req.query.filter;

    let logs = logBuffer.slice(-lines);

    if (filter) {
      logs = logs.filter(log =>
        log.message.toLowerCase().includes(filter.toLowerCase())
      );
    }

    res.json(logs);
  });

  /**
   * @openapi
   * /api/devtools/logs/stream:
   *   get:
   *     tags: [DevTools]
   *     summary: Stream server logs via SSE
   *     description: Server-Sent Events stream for real-time log monitoring
   *     parameters:
   *       - name: filter
   *         in: query
   *         schema: { type: string }
   *         description: Case-insensitive filter for log messages
   *     responses:
   *       200:
   *         description: SSE stream with log events and heartbeats
   *         content:
   *           text/event-stream:
   *             schema:
   *               type: string
   *               example: 'data: {"type":"connected","message":"Log stream connected"}'
   */
  router.get('/logs/stream', (req: Request, res: Response) => {
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

  /**
   * @openapi
   * /api/devtools/frontend/logs/status:
   *   get:
   *     tags: [DevTools]
   *     summary: Get frontend logging session status
   *     description: Check if frontend logging session is active and time remaining
   *     responses:
   *       200:
   *         description: Session status
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/FrontendSessionStatus' }
   */
  router.get('/frontend/logs/status', (req: Request, res: Response) => {
    const status: FrontendSessionStatus = {
      active: frontendSessionActive,
      sessionStart: frontendSessionStart,
      timeRemaining: frontendSessionActive ? (SESSION_TIMEOUT - (Date.now() - (frontendSessionStart || 0))) : null
    };
    res.json(status);
  });

  /**
   * @openapi
   * /api/devtools/frontend/logs/start:
   *   post:
   *     tags: [DevTools]
   *     summary: Start frontend logging session
   *     description: Activate frontend log collection (30-minute timeout)
   *     responses:
   *       200:
   *         description: Session started
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, example: 'started' }
   *                 sessionStart: { type: integer, example: 1701234567890 }
   */
  router.post('/frontend/logs/start', (req: Request, res: Response) => {
    frontendSessionActive = true;
    frontendSessionStart = Date.now();
    console.log('🔍 Frontend logging session started');
    res.json({ status: 'started', sessionStart: frontendSessionStart });
  });

  /**
   * @openapi
   * /api/devtools/frontend/logs/stop:
   *   post:
   *     tags: [DevTools]
   *     summary: Stop frontend logging session
   *     description: Deactivate frontend log collection
   *     responses:
   *       200:
   *         description: Session stopped
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status: { type: string, example: 'stopped' }
   */
  router.post('/frontend/logs/stop', (req: Request, res: Response) => {
    frontendSessionActive = false;
    frontendSessionStart = null;
    console.log('🔍 Frontend logging session stopped');
    res.json({ status: 'stopped' });
  });

  /**
   * @openapi
   * /api/devtools/frontend/logs:
   *   post:
   *     tags: [DevTools]
   *     summary: Receive frontend logs
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               logs: { type: array, items: { $ref: '#/components/schemas/FrontendLogEntry' } }
   *     responses:
   *       200:
   *         description: Logs received
   *         content:
   *           application/json:
   *             schema: { type: object, properties: { received: { type: integer } } }
   */
  router.post('/frontend/logs', (req: AuthenticatedRequest, res: Response) => {
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

  /**
   * @openapi
   * /api/devtools/frontend/logs:
   *   get:
   *     tags: [DevTools]
   *     summary: Get frontend logs
   *     parameters:
   *       - name: lines
   *         in: query
   *         schema: { type: integer, default: 20, maximum: 1000 }
   *       - name: filter
   *         in: query
   *         schema: { type: string }
   *         description: Case-insensitive text filter
   *     responses:
   *       200:
   *         description: Frontend logs
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/FrontendLogsResponse' }
   */
  router.get('/frontend/logs', (req: AuthenticatedRequest, res: Response) => {
    const lines = Math.min(parseInt(req.query.lines || '20'), MAX_FRONTEND_LOGS);
    const filter = req.query.filter;

    let filteredLogs = frontendLogs;
    if (filter) {
      filteredLogs = frontendLogs.filter(log =>
        log.message.toLowerCase().includes(filter.toLowerCase())
      );
    }

    const recentLogs = filteredLogs.slice(-lines);
    res.json({ logs: recentLogs, total: filteredLogs.length });
  });

  // ============================================================================
  // DEV Mode Logging API
  // ============================================================================

  /**
   * @openapi
   * /api/devtools/frontend/dev-logs/status:
   *   get:
   *     tags: [DevTools]
   *     summary: Get DEV mode logging status
   *     description: Check DEV mode session status and rate limit info
   *     responses:
   *       200:
   *         description: DEV mode status with rate limit info
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/DevModeStatus' }
   */
  router.get('/frontend/dev-logs/status', (req: Request, res: Response) => {
    const now = Date.now();

    // Auto-disable after timeout
    if (devModeActive && devModeStart && (now - devModeStart) > DEV_MODE_TIMEOUT) {
      devModeActive = false;
      devModeStart = null;
      console.log('🔍 DEV mode logging auto-disabled after 1 hour timeout');
    }

    const status: DevModeStatus = {
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

  /**
   * @openapi
   * /api/devtools/frontend/dev-logs:
   *   post:
   *     tags: [DevTools]
   *     summary: Receive DEV mode logs (rate limited, 300/min)
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               logs: { type: array, items: { $ref: '#/components/schemas/FrontendLogEntry' } }
   *     responses:
   *       200:
   *         description: Logs received
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/DevModeLogResponse' }
   *       403: { $ref: '#/components/responses/DevModeInactive' }
   */
  router.post('/frontend/dev-logs', devModeRateLimit, (req: AuthenticatedRequest, res: Response) => {
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

  /**
   * @openapi
   * /api/devtools/frontend/dev-logs:
   *   get:
   *     tags: [DevTools]
   *     summary: Get DEV mode logs
   *     parameters:
   *       - name: lines
   *         in: query
   *         schema: { type: integer, default: 20, maximum: 1000 }
   *       - name: filter
   *         in: query
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: DEV mode logs
   *         content:
   *           application/json:
   *             schema: { $ref: '#/components/schemas/DevModeLogsResponse' }
   *       403: { $ref: '#/components/responses/DevModeInactive' }
   */
  router.get('/frontend/dev-logs', (req: AuthenticatedRequest, res: Response) => {
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
      filteredLogs = devModeLogs.filter(log =>
        log.message.toLowerCase().includes(filter.toLowerCase())
      );
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