/**
 * Real MCP Client Wrapper
 *
 * Provides a unified interface for communicating with MCP server
 * through both stdio and HTTP transports using proper MCP protocol.
 */

import { TestEnvironment } from './test-environment';
import { StdioTransport, HttpTransport } from './mcp-transports';
import { MCPLogger } from './mcp-logger';
import { spawn, ChildProcess } from 'child_process';

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
  private serverProcess?: ChildProcess;
  private pendingRequests: Map<number, { resolve: Function; reject: Function }> = new Map();

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
        // Use MCP SDK client for stdio transport
        await this.startStdioClient();
      } else {
        // Use HTTP transport (existing implementation)
        this.transport = new HttpTransport(this.testEnv);
        await this.transport.start();
      }
      this.logger.info('MCP client started successfully', { transport: this.options.transport });
    } catch (error) {
      this.transport = undefined;
      this.logger.error('Failed to start MCP client', error instanceof Error ? error : new Error(String(error)));
      throw new Error(`Failed to start MCP client: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Start stdio client with proper MCP protocol handling
   */
  private async startStdioClient(): Promise<void> {
    // Use the existing StdioTransport which spawns the server correctly
    this.transport = new StdioTransport(this.testEnv);
    await this.transport.start();

    // Get reference to the spawned process for direct communication
    this.serverProcess = (this.transport as StdioTransport).getProcess();

    // Set up proper stdio communication that handles MCP protocol
    this.setupStdioCommunication();
  }

  /**
   * Set up stdio communication to handle MCP protocol properly
   */
  private setupStdioCommunication(): void {
    if (!this.serverProcess) {
      throw new Error('Server process not available');
    }

    // The MCP server using StdioServerTransport expects JSON-RPC messages
    // Each message should be sent as a separate line followed by \n
    // We need to ensure proper message framing

    // Buffer for incoming data
    let buffer = '';

    this.serverProcess.stdout?.on('data', (data) => {
      buffer += data.toString();

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      // Process each complete JSON-RPC message
      lines.forEach(line => {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            // Handle the message appropriately
            this.handleServerMessage(message);
          } catch (e) {
            this.logger.warn('Failed to parse server message', { line: line.trim() });
          }
        }
      });
    });
  }

  /**
   * Handle incoming messages from the MCP server
   */
  private handleServerMessage(message: any): void {
    // Handle JSON-RPC response
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        // Create a custom error that preserves the error code
        const error = new Error(message.error.message || 'RPC error') as any;
        error.code = message.error.code;
        reject(error);
      } else {
        resolve(message);
      }
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
        this.serverProcess = undefined;
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

        // Prepare JSON-RPC request with unique ID using timestamp + counter
        const uniqueId = Date.now() * 1000 + (++this.requestId); // Ensure uniqueness even in concurrent calls
        const request = {
          jsonrpc: '2.0',
          id: uniqueId,
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

          // Special handling for rate limit errors - throw them for test compatibility
          if (response.error.message &&
              (response.error.message.toLowerCase().includes('rate limit') ||
               response.error.message.includes('Rate limit'))) {
            this.logger.warn('Rate limit error encountered', {
              toolName,
              error: mcpResponse.error
            });
            // Create a proper Error object for the test
            const rateLimitError = new Error(response.error.message);
            (rateLimitError as any).code = response.error.code;
            throw rateLimitError;
          }

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

        // Check if the response indicates an error according to MCP spec
        if (response.result && response.result.isError === true) {
          // According to MCP spec, this is a tool execution error
          // The error message should be in the content array
          let errorMessage = 'Tool execution error';
          if (response.result.content && Array.isArray(response.result.content)) {
            const textContent = response.result.content.find((c: any) => c.type === 'text');
            if (textContent && textContent.text) {
              errorMessage = textContent.text;
            }
          }

          const mcpResponse = {
            success: false,
            error: {
              code: -32000, // Server error for tool execution errors
              message: errorMessage
            }
          };

          this.logger.warn('Tool returned error with isError=true', {
            toolName,
            error: mcpResponse.error
          });
          return mcpResponse;
        }

        // Check if the content contains an error message in the expected format
        // Some tools (like get_cr, update_cr_status) return error messages as formatted content
        // with success=true, so we should NOT convert these to failures
        // Only check for errors if content is a string
        if (content && typeof content === 'string' && content.includes('❌ **Error in')) {
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
          // Preserve the error code from the server
          // Protocol errors should maintain their original codes (-32601, -32602, etc.)
          // Tool execution errors will have code -32000 by default
          const errorCode = error.code || -1;

          const response = {
            success: false,
            error: {
              code: errorCode,
              message: error.message || 'Unknown error'
            }
          };
          this.logger.error('Tool call failed after all retries with exception',
            error instanceof Error ? error : new Error(String(error)),
            { toolName, maxRetries, errorCode }
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
   * Call tool via stdio transport with proper MCP protocol
   */
  private async callToolStdio(request: any): Promise<any> {
    if (!this.serverProcess) {
      throw new Error('Server process not available');
    }

    return new Promise((resolve, reject) => {
      const requestId = request.id;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Tool call timeout: ${request.method}`));
      }, this.options.timeout);

      // Store the promise callbacks for response handling
      this.pendingRequests.set(requestId, {
        resolve: (response: any) => {
          clearTimeout(timeout);
          resolve(response);
        },
        reject: (error: any) => {
          clearTimeout(timeout);
          reject(error);
        }
      });

      // Send the request as a JSON-RPC message
      const message = JSON.stringify(request) + '\n';
      this.serverProcess?.stdin?.write(message);

      // Set up error handling
      this.serverProcess?.on('error', (error) => {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      });
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

      const text = textItems.length === 1 ? textItems[0] : textItems.join('\n');

      return text;
    }

    // Handle direct content
    const content = result.content || result;

    // If content is not a string, convert it appropriately
    if (typeof content !== 'string' && typeof content !== 'undefined') {
      // For tools/list, we expect an array of tools
      if (Array.isArray(content)) {
        return content;
      }
      // For other non-string content, return as-is (could be parsed JSON already)
      return content;
    }

    // Return content as-is without automatic JSON parsing
    return content;
  }

  /**
   * Check if an error code is retryable
   */
  private isRetryableError(errorCode?: number): boolean {
    if (!errorCode) return false;

    // Retry on connection errors and timeouts
    // Note: Rate limit errors (-32001) should NOT be retried as they are intentional
    return errorCode === -1 || errorCode === -32000;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Register a project for testing
   * This is a no-op method for test compatibility
   */
  registerProject(projectCode: string, projectInfo: { name: string; path: string; description?: string }): void {
    // In the actual MCP server implementation, projects are discovered
    // through the configuration system, not registered at runtime
    // This method exists for test compatibility only
    this.logger.debug('Project registration requested (no-op)', { projectCode, projectInfo });
  }
}