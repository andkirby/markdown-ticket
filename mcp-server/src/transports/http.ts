import express, { Request, Response } from 'express';
import { MCPTools } from '../tools/index.js';
import {
  JSONRPCResponse,
  JSONRPCError,
} from '@modelcontextprotocol/sdk/types.js';
import cors from 'cors';

export interface HttpTransportConfig {
  port: number;
  host?: string;
  enableOriginValidation?: boolean;
  allowedOrigins?: string[];
}

const MCP_PROTOCOL_VERSION = '2025-06-18';

/**
 * Start HTTP transport for MCP server
 * Implements MCP Streamable HTTP transport specification (2025-06-18)
 */
export async function startHttpTransport(
  mcpTools: MCPTools,
  config: HttpTransportConfig
): Promise<void> {
  const app = express();
  const host = config.host || '127.0.0.1';

  // Parse JSON bodies
  app.use(express.json());

  // CORS middleware for browser clients (optional)
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
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
    credentials: true
  }));

  /**
   * POST /mcp - Handle client JSON-RPC requests
   *
   * Accepts:
   * - Single JSON-RPC request
   * - Array of JSON-RPC requests (batch)
   * - JSON-RPC response
   * - JSON-RPC notification
   *
   * Returns:
   * - 200 OK with application/json for successful requests
   * - 202 Accepted (no body) for notifications/responses
   * - 400 Bad Request for invalid requests
   * - 500 Internal Server Error for server errors
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

      // Origin validation (DNS rebinding protection)
      if (config.enableOriginValidation) {
        const origin = req.headers.origin;
        if (origin && config.allowedOrigins && !config.allowedOrigins.includes(origin)) {
          res.status(403).json({
            jsonrpc: '2.0',
            error: {
              code: -32600,
              message: 'Forbidden: Origin not allowed'
            }
          });
          return;
        }
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
          body.map(request => handleJsonRpcRequest(mcpTools, request))
        );
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
        res.status(200).json(responses);
        return;
      }

      // Handle single request
      const response = await handleJsonRpcRequest(mcpTools, body);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('MCP-Protocol-Version', MCP_PROTOCOL_VERSION);
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
   * GET /mcp - Server-Sent Events endpoint (optional, Phase 2)
   * For server-initiated messages and notifications
   */
  app.get('/mcp', (req: Request, res: Response) => {
    // Phase 1: Return 501 Not Implemented
    // Phase 2: Implement SSE streaming
    res.status(501).json({
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: 'SSE streaming not yet implemented (Phase 2 feature)'
      }
    });
  });

  /**
   * Health check endpoint
   */
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      transport: 'http',
      version: MCP_PROTOCOL_VERSION
    });
  });

  // Start HTTP server
  return new Promise((resolve, reject) => {
    const httpServer = app.listen(config.port, host, () => {
      console.error(`✅ HTTP transport listening on http://${host}:${config.port}/mcp`);
      resolve();
    });

    httpServer.on('error', (error) => {
      console.error('❌ HTTP transport failed to start:', error);
      reject(error);
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
  request: any
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
              tools: {}
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
