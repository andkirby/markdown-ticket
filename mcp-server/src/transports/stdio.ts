import type { MCPTools } from '../tools/index.js'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js'
import { RateLimitManager } from '../utils/rateLimitManager.js'
import { Sanitizer } from '../utils/sanitizer.js'
import { ToolError } from '../utils/toolError.js'

/**
 * Start stdio transport for MCP server
 * This is the traditional transport that always runs
 */
export async function startStdioTransport(mcpTools: MCPTools): Promise<void> {
  // Initialize rate limit manager
  const rateLimitManager = RateLimitManager.fromEnvironment()
  const server = new Server(
    {
      name: 'markdown-ticket',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // Register request handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: mcpTools.getTools(),
    }
  })

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    // Check rate limit before processing tool call
    const rateLimitResult = rateLimitManager.checkRateLimit(name)

    // Debug: Log rate limit check
    console.error(`[RATE LIMIT] Tool '${name}': allowed=${rateLimitResult.allowed}, remaining=${rateLimitResult.remainingRequests}`)

    if (!rateLimitResult.allowed) {
      const errorMessage = `Rate limit exceeded for tool '${name}'. Maximum ${rateLimitManager.getStats().config.maxRequests} requests per ${rateLimitManager.getStats().config.windowMs / 1000} seconds.`

      // Include retry information if available
      const fullMessage = rateLimitResult.retryAfter
        ? `${errorMessage} Retry after ${rateLimitResult.retryAfter} seconds.`
        : errorMessage

      // Debug: Log that we're returning the error
      console.error(`[STDIO] Returning rate limit error: ${fullMessage}`)

      // For stdio transport, we need to throw the McpError which the SDK will convert to a JSON-RPC error
      throw new McpError(ErrorCode.RequestTimeout, fullMessage) // -32001 is appropriate for rate limiting
    }

    try {
      const result = await mcpTools.handleToolCall(name, args || {})

      // Sanitize the result content if sanitization is enabled
      const sanitizedResult = Sanitizer.sanitize(result)

      return {
        content: [
          {
            type: 'text',
            text: sanitizedResult,
          },
        ],
      }
    }
    catch (error) {
      // Handle ToolError instances
      if (error instanceof ToolError) {
        if (error.isProtocolError()) {
          // Protocol errors should return JSON-RPC error responses
          const jsonRpcError = error.toJsonRpcError()
          throw new McpError(
            jsonRpcError.code as ErrorCode,
            jsonRpcError.message,
            jsonRpcError.data,
          )
        }
        else {
          // Tool execution errors should return { result: { content: [...], isError: true } }
          const toolErrorResult = error.toToolErrorResult()
          return toolErrorResult
        }
      }

      // Handle other error types for backward compatibility
      const errorMessage = (error as Error).message

      // Path traversal attempts and other security issues
      if (errorMessage.includes('../')
        || errorMessage.includes('..\\')
        || errorMessage.includes('path traversal')
        || errorMessage.includes('outside project')) {
        throw new McpError(ErrorCode.InternalError, errorMessage)
      }

      // Rate limiting is already handled above, so no need to check here

      // For backward compatibility, convert other errors to McpError
      throw new McpError(ErrorCode.InternalError, errorMessage)
    }
  })

  // Connect to stdio transport
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
