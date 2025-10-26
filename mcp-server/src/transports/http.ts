import express, { Request, Response } from 'express';
import { MCPTools } from '../tools/index.js';
import {
  JSONRPCResponse,
  JSONRPCError,
} from '@modelcontextprotocol/sdk/types.js';
import cors from 'cors';
import { SessionManager } from './sessionManager.js';
import {
  createAuthMiddleware,
  createOriginValidationMiddleware,
  createRateLimiter,
  createSessionValidationMiddleware
} from './middleware.js';

export interface HttpTransportConfig {
  port: number;
  host?: string;
  enableOriginValidation?: boolean;
  allowedOrigins?: string[];
  enableRateLimiting?: boolean;
  rateLimitMax?: number;
  rateLimitWindowMs?: number;
  enableAuth?: boolean;
  authToken?: string;
  sessionTimeoutMs?: number;
}

const MCP_PROTOCOL_VERSION = '2025-06-18';

/**
 * Start HTTP transport for MCP server
 * Implements MCP Streamable HTTP transport specification (2025-06-18)
 *
 * Phase 2 Features:
 * - Session management with Mcp-Session-Id
 * - SSE streaming (GET /mcp)
 * - Optional rate limiting
 * - Optional authentication
 * - Optional origin validation
 */
export async function startHttpTransport(
  mcpTools: MCPTools,
  config: HttpTransportConfig
): Promise<void> {
  const app = express();
  const host = config.host || '127.0.0.1';

  // Initialize session manager
  const sessionManager = new SessionManager(config.sessionTimeoutMs || 30 * 60 * 1000);

  // Parse JSON bodies
  app.use(express.json());

  // CORS middleware
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (config.enableOriginValidation && config.allowedOrigins) {
        if (config.allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Origin not allowed by CORS policy'));
        }
      } else {
        callback(null, true);
      }
    },
    credentials: true,
    exposedHeaders: ['Mcp-Session-Id', 'MCP-Protocol-Version']
  }));

  // Apply security middleware conditionally

  // Rate limiting (Phase 2 - optional)
  if (config.enableRateLimiting) {
    const limiter = createRateLimiter({
      windowMs: config.rateLimitWindowMs || 60 * 1000, // 1 minute default
      max: config.rateLimitMax || 100 // 100 requests per window
    });
    app.use('/mcp', limiter);
    console.error(`🛡️  Rate limiting enabled: ${config.rateLimitMax} requests per ${(config.rateLimitWindowMs || 60000) / 1000}s`);
  }

  // Origin validation (Phase 2 - optional)
  if (config.enableOriginValidation && config.allowedOrigins) {
    app.use('/mcp', createOriginValidationMiddleware(config.allowedOrigins));
    console.error(`🛡️  Origin validation enabled: ${config.allowedOrigins.join(', ')}`);
  }

  // Authentication (Phase 2 - optional)
  if (config.enableAuth && config.authToken) {
    app.use('/mcp', createAuthMiddleware(config.authToken));
    console.error('🛡️  Authentication enabled');
  }

  /**
   * POST /mcp - Handle client JSON-RPC requests
   *
   * Supports:
   * - Single JSON-RPC request
   * - Batch requests (array)
   * - Notifications (no response needed)
   *
   * Headers:
   * - Accept: application/json (required)
   * - Mcp-Session-Id: <uuid> (optional, for session tracking)
   * - Authorization: Bearer <token> (required if auth enabled)
   */
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      // Validate Accept header
      const accept = req.headers.accept || '';
      if (!accept.includes('application/json') && !accept.includes('*/*')) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request: Accept header must include application/json'
          }
        });
        return;
      }

      const body = req.body;

      // Handle empty body
      if (!body) {
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request: Empty body'
          }
        });
        return;
      }

      // Check if it's a notification or response (no response needed)
      if (isNotificationOrResponse(body)) {
        res.status(202).send(); // 202 Accepted, no body
        return;
      }

      // Handle batch requests
      if (Array.isArray(body)) {
        const responses = await Promise.all(
          body.map(request => handleJsonRpcRequest(mcpTools, request, sessionManager))
        );
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
        res.status(200).json(responses);
        return;
      }

      // Handle single request
      const response = await handleJsonRpcRequest(mcpTools, body, sessionManager);

      // Set headers
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);

      // If this is an initialize request, set session header
      if (body.method === 'initialize' && 'result' in response) {
        const sessionId = req.headers['mcp-session-id'] as string;
        if (!sessionId) {
          // Create new session
          const session = sessionManager.createSession({
            userAgent: req.headers['user-agent'],
            origin: req.headers.origin
          });
          res.setHeader('Mcp-Session-Id', session.id);
        }
      }

      res.status(200).json(response);

    } catch (error) {
      console.error('HTTP transport error:', error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: (error as Error).message
        }
      });
    }
  });

  /**
   * GET /mcp - Server-Sent Events endpoint (Phase 2)
   *
   * For server-initiated messages and notifications.
   * Clients can listen to this endpoint to receive real-time updates.
   *
   * Headers:
   * - Accept: text/event-stream (required)
   * - Mcp-Session-Id: <uuid> (required)
   */
  app.get('/mcp', (req: Request, res: Response) => {
    // Validate Accept header
    const accept = req.headers.accept || '';
    if (!accept.includes('text/event-stream') && !accept.includes('*/*')) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request: Accept header must include text/event-stream for SSE'
        }
      });
      return;
    }

    // Get session ID
    const sessionId = req.headers['mcp-session-id'] as string;
    if (!sessionId) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Bad Request: Mcp-Session-Id header is required for SSE streaming'
        }
      });
      return;
    }

    // Validate session
    if (!sessionManager.validateSession(sessionId)) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Session not found or expired. Please initialize a new session via POST /mcp'
        }
      });
      return;
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Session not found'
        }
      });
      return;
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
    res.flushHeaders();

    console.error(`📡 SSE connection established for session: ${sessionId}`);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      jsonrpc: '2.0',
      method: 'connected',
      params: {
        sessionId,
        timestamp: new Date().toISOString()
      }
    })}\n\n`);

    // Listen for events from session
    const eventHandler = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    session.eventEmitter.on('message', eventHandler);

    // Send keepalive every 30 seconds
    const keepaliveInterval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    // Handle client disconnect
    req.on('close', () => {
      console.error(`🔌 SSE connection closed for session: ${sessionId}`);
      clearInterval(keepaliveInterval);
      session.eventEmitter.off('message', eventHandler);
    });
  });

  /**
   * DELETE /mcp - Delete session (Phase 2)
   *
   * Allows clients to explicitly delete their session.
   *
   * Headers:
   * - Mcp-Session-Id: <uuid> (required)
   */
  app.delete('/mcp', (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string;

    if (!sessionId) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Bad Request: Mcp-Session-Id header is required'
        }
      });
      return;
    }

    const deleted = sessionManager.deleteSession(sessionId);

    if (deleted) {
      res.status(200).json({
        jsonrpc: '2.0',
        result: {
          message: 'Session deleted successfully',
          sessionId
        }
      });
    } else {
      res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Session not found'
        }
      });
    }
  });

  /**
   * GET /health - Health check endpoint
   */
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      transport: 'http',
      version: MCP_PROTOCOL_VERSION,
      features: {
        sse: true,
        sessions: true,
        rateLimit: config.enableRateLimiting || false,
        auth: config.enableAuth || false,
        originValidation: config.enableOriginValidation || false
      },
      sessions: {
        active: sessionManager.getSessionCount()
      }
    });
  });

  /**
   * GET /sessions - List active sessions (debug endpoint)
   * Only available if auth is disabled or in development
   */
  if (!config.enableAuth || process.env.NODE_ENV === 'development') {
    app.get('/sessions', (req: Request, res: Response) => {
      const sessions = sessionManager.getActiveSessions().map(s => ({
        id: s.id,
        createdAt: s.createdAt,
        lastActivity: s.lastActivity,
        clientInfo: s.clientInfo
      }));

      res.status(200).json({
        count: sessions.length,
        sessions
      });
    });
  }

  // Start HTTP server
  const httpServer = app.listen(config.port, host, () => {
    console.error(`✅ HTTP transport listening on http://${host}:${config.port}/mcp`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.error('🛑 SIGTERM received, shutting down HTTP transport...');
    sessionManager.shutdown();
    httpServer.close(() => {
      console.error('✅ HTTP transport shut down complete');
    });
  });

  return new Promise((resolve) => {
    httpServer.on('listening', () => resolve());
    httpServer.on('error', (error) => {
      console.error('❌ HTTP transport failed to start:', error);
      throw error;
    });
  });
}

/**
 * Check if the message is a notification or response (no reply needed)
 */
function isNotificationOrResponse(body: any): boolean {
  if (Array.isArray(body)) {
    return body.every(item => !item.id || item.result !== undefined || item.error !== undefined);
  }
  return !body.id || body.result !== undefined || body.error !== undefined;
}

/**
 * Handle a single JSON-RPC request
 * Calls the MCPTools directly instead of going through the Server
 */
async function handleJsonRpcRequest(
  mcpTools: MCPTools,
  request: any,
  sessionManager: SessionManager
): Promise<JSONRPCResponse | JSONRPCError> {
  try {
    // Validate JSON-RPC 2.0 format
    if (request.jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc must be "2.0"'
        }
      };
    }

    if (!request.method) {
      return {
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request: method is required'
        }
      };
    }

    // Route to appropriate handler based on method
    switch (request.method) {
      case 'tools/list': {
        const tools = mcpTools.getTools();
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: { tools }
        };
      }

      case 'tools/call': {
        const { name, arguments: args } = request.params;

        try {
          const result = await mcpTools.handleToolCall(name, args || {});
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: result
                }
              ]
            }
          };
        } catch (error) {
          return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `❌ **Error in ${name}**\n\n${(error as Error).message}\n\nPlease check your input parameters and try again.`
                }
              ]
            }
          };
        }
      }

      case 'initialize': {
        // Return server capabilities
        return {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: {
              tools: {},
              sse: true // Phase 2: SSE streaming support
            },
            serverInfo: {
              name: 'markdown-ticket',
              version: '1.0.0'
            }
          }
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id: request.id || null,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`
          }
        };
    }
  } catch (error) {
    return {
      jsonrpc: '2.0',
      id: request.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
        data: (error as Error).message
      }
    };
  }
}
