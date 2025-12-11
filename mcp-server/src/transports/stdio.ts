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
      // Check if this is a validation error that should return an MCP error response
      const errorMessage = (error as Error).message;

      // List of validation errors that should return MCP error responses
      const validationErrorPatterns = [
        /not found/,
        /required for/,
        /Invalid operation/,
        /parameter is required/,
        /validation failed/,
        /No YAML frontmatter found/
      ];

      const isValidationError = validationErrorPatterns.some(pattern =>
        pattern.test(errorMessage)
      );

      // For validation errors in manage_cr_sections, return proper MCP error response
      // Other tools should continue using formatted content errors for backward compatibility
      if (isValidationError && name === 'manage_cr_sections') {
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
