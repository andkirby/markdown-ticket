import type {
  JSONRPCError,
  JSONRPCResponse,
} from '@modelcontextprotocol/sdk/types.js'
import type { Request, Response } from 'express'
import type { MCPTools } from '../tools/index.js'

import process from 'node:process'

import cors from 'cors'
import express from 'express'

import { RateLimitManager } from '../utils/rateLimitManager.js'
import { Sanitizer } from '../utils/sanitizer.js'
import { ToolError } from '../utils/toolError.js'
import { createAuthMiddleware, createOriginValidationMiddleware } from './middleware.js'
import { SessionManager } from './sessionManager.js'

export interface HttpTransportConfig {
  port: number
  host?: string
  enableOriginValidation?: boolean
  allowedOrigins?: string[]
  enableRateLimiting?: boolean
  rateLimitMax?: number
  rateLimitWindowMs?: number
  enableAuth?: boolean
  authToken?: string
  sessionTimeoutMs?: number
}

const MCP_PROTOCOL_VERSION = '2025-06-18'

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
  config: HttpTransportConfig,
): Promise<void> {
  const app = express()
  const host = config.host || '127.0.0.1'

  // Initialize session manager
  const sessionManager = new SessionManager(config.sessionTimeoutMs || 30 * 60 * 1000)

  // Initialize centralized rate limit manager
  const rateLimitManager = RateLimitManager.fromEnvironment()

  // Log all incoming requests BEFORE body parsing (simplified)
  app.use((req, res, next) => {
    console.error(`📨 ${req.method} ${req.url} from ${req.headers['user-agent'] || 'Unknown'} (PRE-BODY-PARSE)`)
    next()
  })

  // Set up standard JSON parsing like Python FastAPI
  app.use(express.json({
    limit: '10mb',
  }))

  // Log after raw body setup
  app.use((req, res, next) => {
    console.error(`📨 ${req.method} ${req.url} from ${req.headers['user-agent'] || 'Unknown'} (RAW-BODY-READY)`)
    next()
  })

  // CORS middleware
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin)
        return callback(null, true)

      if (config.enableOriginValidation && config.allowedOrigins) {
        if (config.allowedOrigins.includes(origin)) {
          callback(null, true)
        }
        else {
          callback(new Error('Origin not allowed by CORS policy'))
        }
      }
      else {
        callback(null, true)
      }
    },
    credentials: true,
    exposedHeaders: ['Mcp-Session-Id', 'MCP-Protocol-Version'],
  }))

  // Apply security middleware conditionally

  // Note: Rate limiting is now handled per-tool using centralized RateLimitManager
  // The old express-rate-limit middleware has been removed for more granular control

  // Origin validation (Phase 2 - optional)
  if (config.enableOriginValidation && config.allowedOrigins) {
    app.use('/mcp', createOriginValidationMiddleware(config.allowedOrigins))
    console.error(`🛡️  Origin validation enabled: ${config.allowedOrigins.join(', ')}`)
  }

  // Authentication (Phase 2 - optional)
  if (config.enableAuth && config.authToken) {
    app.use('/mcp', createAuthMiddleware(config.authToken))
    console.error('🛡️  Authentication enabled')
  }

  /**
   * POST /mcp - Handle client JSON-RPC requests (Simple like Python)
   *
   * Matches Python server exactly:
   * - No Accept header validation
   * - Simple JSON parsing
   * - No session management complexity
   */
  app.post('/mcp', async (req: Request, res: Response) => {
    try {
      console.error(`📨 POST /mcp request from: ${req.headers['user-agent'] || 'Unknown'}`)

      // Simple request data extraction like Python: data = await request.json()
      const data = req.body
      const request_id = data.id
      const method = data.method
      const params = data.params || {}

      console.error(`📨 Method: ${method}, ID: ${request_id}`)

      // Handle JSON-RPC 2.0 requests exactly like Python server
      if (method === 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id: request_id,
          result: {
            protocolVersion: '2025-06-18',
            capabilities: {
              tools: {},
              logging: {},
            },
            serverInfo: {
              name: 'markdown-ticket',
              version: '1.0.0',
            },
          },
        }
        console.error(`📤 Sending initialize response`)
        return res.status(200).json(response)
      }

      else if (method === 'tools/list') {
        const tools = mcpTools.getTools()
        const response = {
          jsonrpc: '2.0',
          id: request_id,
          result: { tools },
        }
        console.error(`📤 Sending tools list response`)
        return res.status(200).json(response)
      }

      else if (method === 'tools/call') {
        const tool_name = params.name
        const tool_args = params.arguments || {}

        // Check rate limit before processing tool call
        const rateLimitResult = rateLimitManager.checkRateLimit(tool_name)
        if (!rateLimitResult.allowed) {
          const errorMessage = `Rate limit exceeded for tool '${tool_name}'. Maximum ${rateLimitManager.getStats().config.maxRequests} requests per ${rateLimitManager.getStats().config.windowMs / 1000} seconds.`

          // Include retry information if available
          const fullMessage = rateLimitResult.retryAfter
            ? `${errorMessage} Retry after ${rateLimitResult.retryAfter} seconds.`
            : errorMessage

          const response = {
            jsonrpc: '2.0',
            id: request_id,
            error: {
              code: -32000,
              message: fullMessage,
            },
          }

          // Add retry-after header if available
          if (rateLimitResult.retryAfter) {
            res.setHeader('Retry-After', rateLimitResult.retryAfter)
          }

          console.error(`🚫 Rate limit exceeded for tool ${tool_name}`)
          return res.status(429).json(response)
        }

        try {
          const result = await mcpTools.handleToolCall(tool_name, tool_args)

          // Sanitize the result content if sanitization is enabled
          const sanitizedResult = Sanitizer.sanitize(result)

          const response = {
            jsonrpc: '2.0',
            id: request_id,
            result: {
              content: [
                {
                  type: 'text',
                  text: sanitizedResult,
                },
              ],
            },
          }
          console.error(`📤 Sending tool call response for ${tool_name}`)
          return res.status(200).json(response)
        }
        catch (error) {
          // Handle ToolError instances
          if (error instanceof ToolError) {
            if (error.isProtocolError()) {
              // Protocol errors should return JSON-RPC error responses
              const jsonRpcError = error.toJsonRpcError()
              const response = {
                jsonrpc: '2.0',
                id: request_id,
                error: {
                  code: jsonRpcError.code,
                  message: jsonRpcError.message,
                  ...(jsonRpcError.data && typeof jsonRpcError.data === 'object' ? { data: jsonRpcError.data } : {}),
                },
              }
              console.error(`📤 Sending protocol error response for ${tool_name} with code ${jsonRpcError.code}`)
              return res.status(200).json(response)
            }
            else {
              // Tool execution errors should return { result: { content: [...], isError: true } }
              const toolErrorResult = error.toToolErrorResult()
              const response = {
                jsonrpc: '2.0',
                id: request_id,
                result: toolErrorResult,
              }
              console.error(`📤 Sending tool execution error response for ${tool_name}`)
              return res.status(200).json(response)
            }
          }

          // Handle other error types for backward compatibility
          const errorMessage = (error as Error).message
          let errorCode = -32000 // Default internal error

          // Convert JavaScript errors to proper JSON-RPC error codes
          if (errorMessage.includes('Unknown tool') || errorMessage.includes('Available tools:')) {
            errorCode = -32601 // Method not found
          }
          else if (errorMessage.includes('Invalid params')
            || errorMessage.includes('validation')
            || errorMessage.includes('required')
            || errorMessage.includes('must be')
            || errorMessage.includes('is required')
            || errorMessage.includes('invalid')) {
            errorCode = -32602 // Invalid params
          }
          else if (errorMessage.includes('not found')
            || errorMessage.includes('does not exist')
            || errorMessage.includes('No such file')
            || errorMessage.includes('ENOENT')) {
            errorCode = -32000 // Resource not found
          }

          const response = {
            jsonrpc: '2.0',
            id: request_id,
            error: {
              code: errorCode,
              message: errorMessage,
            },
          }
          console.error(`📤 Sending tool error response for ${tool_name} with code ${errorCode}`)
          return res.status(200).json(response)
        }
      }

      else if (method === 'logging/setLevel') {
        // Handle logging level setting like Python server
        const level = params.level || 'info'
        console.error(`🔧 Logging level set to: ${level}`)
        const response = {
          jsonrpc: '2.0',
          id: request_id,
          result: {},
        }
        console.error(`📤 Sending logging/setLevel response`)
        return res.status(200).json(response)
      }

      else {
        // Method not found - like Python server
        const response = {
          jsonrpc: '2.0',
          id: request_id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        }
        console.error(`📤 Sending method not found response for ${method}`)
        return res.status(200).json(response)
      }
    }
    catch (error) {
      console.error('❌ HTTP transport error:', error)
      const response = {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal error',
          data: (error as Error).message,
        },
      }
      return res.status(500).json(response)
    }
  })

  /**
   * GET /mcp - Server-Sent Events endpoint
   *
   * Allows clients to open an SSE stream to receive server-initiated messages.
   * Per spec (lines 119-136): Session ID is optional. If provided, the stream is
   * associated with that session. If not provided, this is a standalone stream for
   * server-initiated notifications.
   *
   * Headers:
   * - Accept: text/event-stream (required)
   * - Mcp-Session-Id: <uuid> (optional)
   */
  app.get('/mcp', (req: Request, res: Response) => {
    // Log connection attempt
    console.error(`📨 GET /mcp request from: ${req.headers['user-agent'] || 'Unknown'}`)
    console.error(`📨 Accept header: ${req.headers.accept}`)
    console.error(`📨 Session ID: ${req.headers['mcp-session-id'] || 'None'}`)

    // Validate Accept header
    const accept = req.headers.accept || ''
    if (!accept.includes('text/event-stream') && !accept.includes('*/*')) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request: Accept header must include text/event-stream for SSE',
        },
      })
      return
    }

    // Get session ID (optional per spec)
    const sessionId = req.headers['mcp-session-id'] as string
    let session = null

    if (sessionId) {
      // If session ID provided, validate it
      if (!sessionManager.validateSession(sessionId)) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Session not found or expired. Please initialize a new session via POST /mcp',
          },
        })
        return
      }

      session = sessionManager.getSession(sessionId)
      if (!session) {
        res.status(404).json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Session not found',
          },
        })
        return
      }
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION)
    res.flushHeaders()

    const connectionId = sessionId || `standalone-${Date.now()}`
    console.error(`📡 SSE connection established: ${connectionId}`)

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      jsonrpc: '2.0',
      method: 'connected',
      params: {
        sessionId: sessionId || undefined,
        timestamp: new Date().toISOString(),
      },
    })}\n\n`)

    // Listen for events from session (if session exists)
    const eventHandler = session
      ? (data: unknown) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`)
        }
      : null

    if (session && eventHandler) {
      session.eventEmitter.on('message', eventHandler)
    }

    // Send keepalive every 5 seconds to prevent client timeouts
    const keepaliveInterval = setInterval(() => {
      try {
        res.write(': keepalive\n\n')
      }
      catch (error) {
        console.error(`⚠️  Failed to write keepalive for session ${sessionId}:`, error)
        clearInterval(keepaliveInterval)
      }
    }, 5000)

    // Handle client disconnect
    const cleanup = () => {
      console.error(`🔌 SSE connection closed: ${connectionId}`)
      clearInterval(keepaliveInterval)
      if (session && eventHandler) {
        session.eventEmitter.off('message', eventHandler)
      }
    }

    req.on('close', cleanup)
    req.on('error', (error) => {
      console.error(`❌ SSE connection error for ${connectionId}:`, error)
      cleanup()
    })
    res.on('error', (error) => {
      console.error(`❌ SSE response error for ${connectionId}:`, error)
      cleanup()
    })
  })

  /**
   * DELETE /mcp - Delete session (Phase 2)
   *
   * Allows clients to explicitly delete their session.
   *
   * Headers:
   * - Mcp-Session-Id: <uuid> (required)
   */
  app.delete('/mcp', (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string

    if (!sessionId) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Bad Request: Mcp-Session-Id header is required',
        },
      })
      return
    }

    const deleted = sessionManager.deleteSession(sessionId)

    if (deleted) {
      res.status(200).json({
        jsonrpc: '2.0',
        result: {
          message: 'Session deleted successfully',
          sessionId,
        },
      })
    }
    else {
      res.status(404).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Session not found',
        },
      })
    }
  })

  /**
   * GET /health - Health check endpoint
   */
  app.get('/health', (req: Request, res: Response) => {
    const rateLimitStats = rateLimitManager.getStats()

    res.status(200).json({
      status: 'ok',
      transport: 'http',
      version: MCP_PROTOCOL_VERSION,
      features: {
        sse: true,
        sessions: true,
        rateLimit: rateLimitStats.enabled,
        auth: config.enableAuth || false,
        originValidation: config.enableOriginValidation || false,
      },
      sessions: {
        active: sessionManager.getSessionCount(),
      },
      rateLimit: {
        enabled: rateLimitStats.enabled,
        maxRequests: rateLimitStats.config.maxRequests,
        windowMs: rateLimitStats.config.windowMs,
        activeTools: rateLimitStats.activeTools,
      },
    })
  })

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
        clientInfo: s.clientInfo,
      }))

      res.status(200).json({
        count: sessions.length,
        sessions,
      })
    })
  }

  // Start HTTP server
  const httpServer = app.listen(config.port, host, () => {
    console.error(`✅ HTTP transport listening on http://${host}:${config.port}/mcp`)
  })

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.error('🛑 SIGTERM received, shutting down HTTP transport...')
    sessionManager.shutdown()
    httpServer.close(() => {
      console.error('✅ HTTP transport shut down complete')
    })
  })

  return new Promise((resolve) => {
    httpServer.on('listening', () => resolve())
    httpServer.on('error', (error) => {
      console.error('❌ HTTP transport failed to start:', error)
      throw error
    })
  })
}

/**
 * Check if the message is a notification or response (no reply needed)
 */
function _isNotificationOrResponse(body: unknown): boolean {
  if (Array.isArray(body)) {
    return body.every((item) => {
      const record = item as Record<string, unknown>
      return !record.id || record.result !== undefined || record.error !== undefined
    })
  }
  const record = body as Record<string, unknown>
  return !record.id || record.result !== undefined || record.error !== undefined
}

/**
 * Handle a single JSON-RPC request
 * Calls the MCPTools directly instead of going through the Server
 */
async function _handleJsonRpcRequest(
  mcpTools: MCPTools,
  request: Record<string, unknown>,
  _sessionManager: SessionManager,
): Promise<JSONRPCResponse | JSONRPCError> {
  console.error(`🔧 _handleJsonRpcRequest called with:`, `${JSON.stringify(request).substring(0, 100)}...`)

  try {
    // Validate JSON-RPC 2.0 format
    if (request.jsonrpc !== '2.0') {
      console.error(`❌ Invalid jsonrpc version: ${request.jsonrpc}`)
      return {
        jsonrpc: '2.0',
        id: ((request.id as string | number | undefined) || null) as string | number | undefined,
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc must be "2.0"',
        },
      } as JSONRPCError
    }

    if (!request.method) {
      return {
        jsonrpc: '2.0',
        id: ((request.id as string | number | undefined) || null) as string | number | undefined,
        error: {
          code: -32600,
          message: 'Invalid Request: method is required',
        },
      } as JSONRPCError
    }

    // Route to appropriate handler based on method
    switch (request.method) {
      case 'tools/list': {
        const tools = mcpTools.getTools()
        return {
          jsonrpc: '2.0',
          id: request.id as string | number,
          result: { tools },
        }
      }

      case 'tools/call': {
        const params = request.params as Record<string, unknown> | undefined
        const { name, arguments: args } = (params || {}) as { name?: string, arguments?: Record<string, unknown> }

        try {
          const result = await mcpTools.handleToolCall(name || '', args || {})

          // Sanitize the result content if sanitization is enabled
          const sanitizedResult = Sanitizer.sanitize(result)

          return {
            jsonrpc: '2.0',
            id: request.id as string | number,
            result: {
              content: [
                {
                  type: 'text',
                  text: sanitizedResult,
                },
              ],
            },
          }
        }
        catch (error) {
          // Handle ToolError instances
          if (error instanceof ToolError) {
            if (error.isProtocolError()) {
              // Protocol errors should return JSON-RPC error responses
              const jsonRpcError = error.toJsonRpcError()
              return {
                jsonrpc: '2.0',
                id: request.id as string | number,
                error: {
                  code: jsonRpcError.code,
                  message: jsonRpcError.message,
                  ...(jsonRpcError.data && typeof jsonRpcError.data === 'object' ? { data: jsonRpcError.data } : {}),
                },
              }
            }
            else {
              // Tool execution errors should return { result: { content: [...], isError: true } }
              const toolErrorResult = error.toToolErrorResult()
              return {
                jsonrpc: '2.0',
                id: request.id as string | number,
                result: toolErrorResult,
              }
            }
          }

          // Handle other error types for backward compatibility
          const errorMessage = (error as Error).message
          let errorCode = -32000 // Default internal error

          // Convert JavaScript errors to proper JSON-RPC error codes
          if (errorMessage.includes('Unknown tool') || errorMessage.includes('Available tools:')) {
            errorCode = -32601 // Method not found
          }
          else if (errorMessage.includes('Invalid params')
            || errorMessage.includes('validation')
            || errorMessage.includes('required')
            || errorMessage.includes('must be')
            || errorMessage.includes('is required')
            || errorMessage.includes('invalid')) {
            errorCode = -32602 // Invalid params
          }
          else if (errorMessage.includes('not found')
            || errorMessage.includes('does not exist')
            || errorMessage.includes('No such file')
            || errorMessage.includes('ENOENT')) {
            errorCode = -32000 // Resource not found
          }

          return {
            jsonrpc: '2.0',
            id: request.id as string | number,
            error: {
              code: errorCode,
              message: errorMessage,
            },
          }
        }
      }

      case 'initialize': {
        // Return server capabilities
        return {
          jsonrpc: '2.0',
          id: request.id as string | number,
          result: {
            protocolVersion: MCP_PROTOCOL_VERSION,
            capabilities: {
              tools: {},
              logging: {}, // Logging support like Python server
            },
            serverInfo: {
              name: 'markdown-ticket',
              version: '1.0.0',
            },
          },
        }
      }

      case 'logging/setLevel': {
        // Handle logging level setting like Python server
        const params = request.params as Record<string, unknown> | undefined
        const level = (params?.level as string) || 'info'
        console.error(`🔧 Logging level set to: ${level}`)
        // In a real implementation, you would set the logging level here
        return {
          jsonrpc: '2.0',
          id: request.id as string | number,
          result: {},
        }
      }

      default:
        return {
          jsonrpc: '2.0',
          id: ((request.id as string | number | undefined) || null) as string | number | undefined,
          error: {
            code: -32601,
            message: `Method not found: ${String(request.method)}`,
          },
        } as JSONRPCError
    }
  }
  catch (error) {
    return {
      jsonrpc: '2.0',
      id: ((request.id as string | number | undefined) || null) as string | number | undefined,
      error: {
        code: -32603,
        message: 'Internal error',
        data: (error as Error).message,
      },
    } as JSONRPCError
  }
}
