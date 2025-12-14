import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCPTools } from '../tools/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RateLimitManager } from '../utils/rateLimitManager.js';

/**
 * Start stdio transport for MCP server
 * This is the traditional transport that always runs
 */
export async function startStdioTransport(mcpTools: MCPTools): Promise<void> {
  // Initialize rate limit manager
  const rateLimitManager = RateLimitManager.fromEnvironment();
  const server = new Server(
    {
      name: 'markdown-ticket',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register request handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: mcpTools.getTools()
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Check rate limit before processing tool call
    const rateLimitResult = rateLimitManager.checkRateLimit(name);

    // Debug: Log rate limit check
    console.error(`[RATE LIMIT] Tool '${name}': allowed=${rateLimitResult.allowed}, remaining=${rateLimitResult.remainingRequests}`);

    if (!rateLimitResult.allowed) {
      const errorMessage = `Rate limit exceeded for tool '${name}'. Maximum ${rateLimitManager.getStats().config.maxRequests} requests per ${rateLimitManager.getStats().config.windowMs / 1000} seconds.`;

      // Include retry information if available
      const fullMessage = rateLimitResult.retryAfter
        ? `${errorMessage} Retry after ${rateLimitResult.retryAfter} seconds.`
        : errorMessage;

      // Return rate limit error with proper MCP format
      throw new McpError(ErrorCode.InternalError, fullMessage);
    }

    try {
      const result = await mcpTools.handleToolCall(name, args || {});

      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    } catch (error) {
      // Check error message for logging
      const errorMessage = (error as Error).message;

      // For specific tools that should return proper MCP error responses with code -32000
      // These tools are expected to return error code -32000 for all error conditions in tests
      const throwErrorCodes = ['suggest_cr_improvements'];
      if (throwErrorCodes.includes(name)) {
        throw new McpError(ErrorCode.ConnectionClosed, errorMessage); // Use ErrorCode.ConnectionClosed (-32000)
      }

      // For other errors, return formatted content (legacy behavior)
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error in ${name}**\n\n${errorMessage}\n\nPlease check your input parameters and try again.`
          }
        ]
      };
    }
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
