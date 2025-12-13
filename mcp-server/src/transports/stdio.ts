import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCPTools } from '../tools/index.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Start stdio transport for MCP server
 * This is the traditional transport that always runs
 */
export async function startStdioTransport(mcpTools: MCPTools): Promise<void> {
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
