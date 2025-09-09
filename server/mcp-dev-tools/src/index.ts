#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const server = new Server(
  {
    name: 'mdt-dev-tools',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_logs',
        description: 'Get recent application logs with optional filtering',
        inputSchema: {
          type: 'object',
          properties: {
            lines: {
              type: 'number',
              description: 'Number of recent lines to retrieve (default: 20, max: 100)',
              default: 20
            },
            filter: {
              type: 'string',
              description: 'Text filter to match in log messages'
            }
          }
        }
      },
      {
        name: 'stream_logs',
        description: 'Get SSE endpoint URL for real-time log streaming',
        inputSchema: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              description: 'Text filter for SSE stream'
            }
          }
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'get_logs': {
      const lines = (args?.lines as number) || 20;
      const filter = args?.filter as string;
      
      try {
        const url = new URL('/api/logs', BACKEND_URL);
        url.searchParams.set('lines', lines.toString());
        if (filter) {
          url.searchParams.set('filter', filter);
        }

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`Backend responded with ${response.status}`);
        }

        const logs = await response.json();
        return {
          content: [
            {
              type: 'text',
              text: `📋 **Recent Logs** (${logs.length} entries)\n\n${logs.map((log: any) => 
                `[${new Date(log.timestamp).toLocaleTimeString()}] ${log.message}`
              ).join('\n')}`
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ **Error getting logs**: ${error instanceof Error ? error.message : 'Unknown error'}\n\nIs the backend server running at ${BACKEND_URL}?`
            }
          ]
        };
      }
    }

    case 'stream_logs': {
      const filter = args?.filter as string;
      const url = new URL('/api/logs/stream', BACKEND_URL);
      if (filter) {
        url.searchParams.set('filter', filter);
      }

      return {
        content: [
          {
            type: 'text',
            text: `🔄 **SSE Log Stream URL**: ${url.toString()}\n\nSubscribe to this endpoint for real-time log updates${filter ? ` filtered by: "${filter}"` : ''}`
          }
        ]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Dev Tools server running');
}

main().catch(console.error);
