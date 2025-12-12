/**
 * Real MCP Client Wrapper
 *
 * Provides a unified interface for communicating with MCP server
 * through both stdio and HTTP transports using real JSON-RPC communication.
 */

import { TestEnvironment } from './test-environment';
import { StdioTransport, HttpTransport } from './mcp-transports';
import { MCPLogger } from './mcp-logger';

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  key?: string; // For CR creation responses
  error?: {
    code: number;
    message: string;
  };
}

export interface MCPClientOptions {
  transport?: 'stdio' | 'http';
  timeout?: number;
  retries?: number;
}

export class MCPClient {
  private testEnv: TestEnvironment;
  private options: MCPClientOptions;
  private transport?: StdioTransport | HttpTransport;
  private logger = MCPLogger.getInstance();
  private requestId = 0;

  constructor(testEnv: TestEnvironment, options: MCPClientOptions = {}) {
    this.testEnv = testEnv;
    this.options = {
      transport: options.transport || 'stdio',
      timeout: options.timeout || 10000,
      retries: options.retries || 3,
    };
    this.logger.info('MCPClient created', { transport: this.options.transport });
  }

  /**
   * Start the MCP client and server connection
   */
  async start(): Promise<void> {
    this.logger.info('Starting MCP client', { transport: this.options.transport });

    if (this.transport) {
      const error = new Error('Client already started');
      this.logger.error('MCP client already started', error);
      throw error;
    }

    try {
      if (this.options.transport === 'stdio') {
        this.transport = new StdioTransport(this.testEnv);
      } else {
        this.transport = new HttpTransport(this.testEnv);
      }

      await this.transport.start();
      this.logger.info('MCP client started successfully', { transport: this.options.transport });
    } catch (error) {
      this.transport = undefined;
      this.logger.error('Failed to start MCP client', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to start MCP client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop the MCP client and server connection
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping MCP client');

    if (this.transport) {
      try {
        await this.transport.stop();
        this.logger.info('MCP client stopped successfully');
      } catch (error) {
        this.logger.error('Error stopping transport', error instanceof Error ? error : new Error(String(error)));
      } finally {
        this.transport = undefined;
      }
    }
  }

  /**
   * Check if client is connected to server
   */
  async isConnected(): Promise<boolean> {
    return this.transport?.isConnected() || false;
  }

  /**
   * List available tools from MCP server
   */
  async listTools(): Promise<MCPTool[]> {
    const response = await this.callTool('tools/list', {});
    if (!response.success || !response.data) {
      return [];
    }

    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (response.data.tools && Array.isArray(response.data.tools)) {
      return response.data.tools;
    }

    return [];
  }

  /**
   * Call a specific MCP tool with retry logic
   */
  async callTool(toolName: string, params: any): Promise<MCPResponse> {
    const maxRetries = this.options.retries || 3;
    const retryDelay = 1000; // 1 second between retries

    this.logger.debug('Calling MCP tool', { toolName, params, maxRetries });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!this.transport || !this.transport.isConnected()) {
          const response = {
            success: false,
            error: {
              code: -1,
              message: 'Client not connected to server'
            }
          };
          this.logger.warn('Client not connected to server', { attempt, maxRetries });
          return response;
        }

        // Prepare JSON-RPC request
        const request = {
          jsonrpc: '2.0',
          id: ++this.requestId,
          method: toolName === 'tools/list' ? 'tools/list' : 'tools/call',
          params: toolName === 'tools/list' ? {} : {
            name: toolName,
            arguments: params
          }
        };

        // Send request and get response based on transport
        let response: any;
        if (this.options.transport === 'stdio') {
          response = await this.callToolStdio(request);
        } else {
          response = await this.callToolHttp(request);
        }

        // Parse response
        if (response.error) {
          const mcpResponse = {
            success: false,
            error: {
              code: response.error.code || -32000,
              message: response.error.message || 'RPC error'
            }
          };

          // Check if error is retryable
          if (!this.isRetryableError(mcpResponse.error.code) || attempt === maxRetries) {
            this.logger.warn('Tool call failed with non-retryable error', {
              toolName,
              error: mcpResponse.error
            });
            return mcpResponse;
          }

          // Wait before retrying
          this.logger.debug('Retrying tool call', {
            toolName,
            attempt,
            delay: retryDelay * attempt
          });
          await this.sleep(retryDelay * attempt);
          continue;
        }

        // Parse the result content first
        const content = this.parseResultContent(response.result);

        // Check if the content contains an error message in the expected format
        // Some tools (like get_cr, update_cr_status) return error messages as formatted content
        // with success=true, so we should NOT convert these to failures
        if (content && content.includes('❌ **Error in')) {
          // Check if this is a tool that returns errors as content
          const toolsWithContentErrors = ['get_cr', 'update_cr_status', 'create_cr', 'delete_cr', 'update_cr_attrs', 'manage_cr_sections', 'list_crs'];

          // Extract the tool name from the error message
          const toolNameMatch = content.match(/❌ \*\*Error in (\w+)\*\*/);
          const errorToolName = toolNameMatch ? toolNameMatch[1] : '';

          // If this is a tool that returns errors as content, treat it as success
          if (toolsWithContentErrors.includes(errorToolName)) {
            const mcpResponse = {
              success: true,
              data: content
            };
            this.logger.info('Tool returned error as formatted content', { toolName, errorToolName });
            return mcpResponse;
          }

          // For other tools, convert to failure
          const errorMatch = content.match(/❌ \*\*Error in .+\*\*[\s\S]*?\n\n(.+?)(?:\n\n|$)/);
          const errorMessage = errorMatch ? errorMatch[1] : content;

          const mcpResponse = {
            success: false,
            error: {
              code: -32000,
              message: errorMessage.trim()
            }
          };

          this.logger.warn('Tool call failed with error in content', {
            toolName,
            error: mcpResponse.error
          });
          return mcpResponse;
        }

        // Success - return the content
        const mcpResponse = {
          success: true,
          data: content
        };

        this.logger.info('Tool call successful', { toolName, attempt });
        return mcpResponse;

      } catch (error: any) {
        this.logger.warn('Tool call threw exception', {
          toolName,
          attempt,
          error: error.message || String(error)
        });

        // If this is the last attempt, return the error
        if (attempt === maxRetries) {
          const response = {
            success: false,
            error: {
              code: -1,
              message: error.message || 'Unknown error'
            }
          };
          this.logger.error('Tool call failed after all retries with exception',
            error instanceof Error ? error : new Error(String(error)),
            { toolName, maxRetries }
          );
          return response;
        }

        // Wait before retrying
        await this.sleep(retryDelay * attempt);
      }
    }

    // This should never be reached, but TypeScript requires it
    const response = {
      success: false,
      error: {
        code: -1,
        message: 'Max retries exceeded'
      }
    };
    this.logger.error('Unexpected error in callTool', new Error('Should not reach here'), { toolName, maxRetries });
    return response;
  }

  /**
   * Call tool via stdio transport
   */
  private async callToolStdio(request: any): Promise<any> {
    const serverProcess = (this.transport as StdioTransport).getProcess();

    return new Promise((resolve, reject) => {
      let responseData = '';
      const timeout = setTimeout(() => {
        reject(new Error(`Tool call timeout: ${request.method}`));
      }, this.options.timeout);

      serverProcess.stdout?.once('data', (data) => {
        clearTimeout(timeout);
        responseData = data.toString();

        try {
          const parsed = JSON.parse(responseData);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${responseData}`));
        }
      });

      serverProcess.stdout?.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      // Send the request
      serverProcess.stdin?.write(JSON.stringify(request) + '\n');
    });
  }

  /**
   * Call tool via HTTP transport
   */
  private async callToolHttp(request: any): Promise<any> {
    const baseUrl = (this.transport as HttpTransport).getBaseUrl();

    const response = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Parse result content from MCP response
   */
  private parseResultContent(result: any): any {
    if (!result) return null;

    // Handle MCP content array format: {content: [{text: "...", type: "text"}]}
    if (result.content && Array.isArray(result.content)) {
      const textItems = result.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text);

      return textItems.length === 1 ? textItems[0] : textItems.join('\n');
    }

    // Handle direct content
    return result.content || result;
  }

  /**
   * Check if an error code is retryable
   */
  private isRetryableError(errorCode?: number): boolean {
    if (!errorCode) return false;

    // Retry on connection errors and timeouts
    return errorCode === -1 || errorCode === -32000 || errorCode === -32001;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}