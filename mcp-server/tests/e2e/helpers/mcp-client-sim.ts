/**
 * MCP Client Wrapper
 *
 * Provides a unified interface for communicating with MCP server
 * through both stdio and HTTP transports using the real MCP SDK.
 */

import type { StdioTransport } from './mcp-transports'
import type { TestEnvironment } from './test-environment'
import process from 'node:process'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { MCPLogger } from './mcp-logger'
import { HttpTransport } from './mcp-transports'

export interface MCPTool {
  name: string
  description?: string
  inputSchema?: any
}

export interface MCPResponse {
  success: boolean
  data?: any
  error?: {
    code: number
    message: string
  }
}

interface JSONRPCResponse {
  result?: {
    tools?: any[]
    content?: any
  }
  error?: {
    code?: number
    message?: string
  }
}

export interface MCPClientOptions {
  transport?: 'stdio' | 'http'
  timeout?: number
  retries?: number
}

export class MCPClient {
  private testEnv: TestEnvironment
  private options: MCPClientOptions
  private client?: Client
  private transportWrapper?: StdioTransport | HttpTransport | {
    isConnected: () => boolean
    start: () => Promise<void>
    stop: () => Promise<void>
  }

  private mcpTransport?: StdioClientTransport
  private logger = MCPLogger.getInstance()

  constructor(testEnv: TestEnvironment, options: MCPClientOptions = {}) {
    this.testEnv = testEnv
    this.options = {
      transport: options.transport || 'stdio',
      timeout: options.timeout || 10000,
      retries: options.retries || 3,
    }
    this.logger.info('MCPClient created', { transport: this.options.transport })
  }

  /**
   * Start the MCP client and server connection
   */
  async start(): Promise<void> {
    this.logger.info('Starting MCP client', { transport: this.options.transport })

    if (this.client || this.mcpTransport) {
      const error = new Error('Client already started')
      this.logger.error('MCP client already started', error)
      throw error
    }

    try {
      if (this.options.transport === 'stdio') {
        await this.startStdioClient()
      }
      else {
        await this.startHttpClient()
      }

      this.logger.info('MCP client started successfully', { transport: this.options.transport })
    }
    catch (error) {
      await this.cleanup()
      this.logger.error('Failed to start MCP client', error instanceof Error ? error : new Error(String(error)))
      throw new Error(`Failed to start MCP client: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Start stdio-based MCP client
   */
  private async startStdioClient(): Promise<void> {
    // Create MCP client first
    this.client = new Client(
      {
        name: 'mcp-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    )

    // Use built server for tests to avoid module caching issues
    const serverScript = 'dist/index.js'

    // Create stdio transport directly
    this.mcpTransport = new StdioClientTransport({
      command: 'node',
      args: [serverScript],
      cwd: this.testEnv.getProjectRoot(),
      env: {
        ...process.env,
        MCP_HTTP_ENABLED: 'false', // Ensure only stdio is enabled
        NODE_ENV: 'test',
        // Pass the test config directory to MCP server
        CONFIG_DIR: this.testEnv.getConfigDir(),
      },
    })

    // Connect to server
    await this.client.connect(this.mcpTransport)

    // Store transport info for cleanup
    this.transportWrapper = {
      isConnected: () => this.mcpTransport !== undefined,
      start: async () => {}, // Already started
      stop: async () => {
        if (this.mcpTransport) {
          await this.mcpTransport.close()
        }
      },
    }
  }

  /**
   * Start HTTP-based MCP client
   */
  private async startHttpClient(): Promise<void> {
    // Start the server process
    this.transportWrapper = new HttpTransport(this.testEnv)
    await this.transportWrapper.start()

    // For HTTP transport, we'll use fetch to communicate directly
    // The MCP SDK doesn't have a built-in HTTP client transport yet
    this.client = new Client(
      {
        name: 'mcp-test-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      },
    )

    // For HTTP, we don't use MCP SDK transport, we'll handle it manually
    this.logger.info('HTTP client started (using manual fetch)')
  }

  /**
   * Stop the MCP client and server connection
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping MCP client')

    await this.cleanup()

    this.logger.info('MCP client stopped successfully')
  }

  /**
   * Clean up resources
   */
  private async cleanup(): Promise<void> {
    if (this.mcpTransport) {
      try {
        await this.mcpTransport.close()
      }
      catch (error) {
        this.logger.warn('Error closing MCP transport', error instanceof Error ? error : new Error(String(error)))
      }
      this.mcpTransport = undefined
    }

    if (this.client) {
      try {
        await this.client.close()
      }
      catch (error) {
        this.logger.warn('Error closing MCP client', error instanceof Error ? error : new Error(String(error)))
      }
      this.client = undefined
    }

    if (this.transportWrapper) {
      try {
        await this.transportWrapper.stop()
      }
      catch (error) {
        this.logger.warn('Error stopping transport wrapper', error instanceof Error ? error : new Error(String(error)))
      }
      this.transportWrapper = undefined
    }
  }

  /**
   * Check if client is connected to server
   */
  async isConnected(): Promise<boolean> {
    if (this.options.transport === 'http' && this.transportWrapper) {
      return this.transportWrapper.isConnected()
    }
    return this.client !== undefined
  }

  /**
   * List available tools from MCP server
   */
  async listTools(): Promise<MCPTool[]> {
    if (this.options.transport === 'http') {
      return this.listToolsHttp()
    }

    if (!this.client) {
      return []
    }

    try {
      const result = await this.client.listTools()
      return result.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }))
    }
    catch (error) {
      this.logger.error('Failed to list tools', error instanceof Error ? error : new Error(String(error)))
      return []
    }
  }

  /**
   * Call a specific MCP tool
   */
  async callTool(toolName: string, params: any): Promise<MCPResponse> {
    const maxRetries = this.options.retries || 3
    const retryDelay = 1000 // 1 second between retries

    this.logger.debug('Calling MCP tool', { toolName, params, maxRetries })

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.options.transport === 'http') {
          return await this.callToolHttp(toolName, params)
        }

        if (!this.client) {
          const response = {
            success: false,
            error: {
              code: -1,
              message: 'Client not connected to server',
            },
          }
          this.logger.warn('Client not connected to server', { attempt, maxRetries })
          return response
        }

        // Call tool using MCP SDK
        const result = await this.client.callTool({
          name: toolName,
          arguments: params,
        })

        const response = {
          success: true,
          data: result.content,
        }

        this.logger.info('Tool call successful', { toolName, attempt })
        return response
      }
      catch (error: any) {
        this.logger.warn('Tool call threw exception', {
          toolName,
          attempt,
          error: error.message || String(error),
        })

        // Parse MCP error
        const errorCode = error.code || -1
        const isRetryable = this.isRetryableError(errorCode)

        // If this is the last attempt or error is not retryable, return it
        if (attempt === maxRetries || !isRetryable) {
          const response = {
            success: false,
            error: {
              code: errorCode,
              message: error.message || 'Unknown error',
            },
          }
          this.logger.error('Tool call failed', error instanceof Error ? error : new Error(String(error)), {
            toolName,
            maxRetries,
            finalAttempt: attempt,
          })
          return response
        }

        // Wait before retrying
        this.logger.debug('Retrying tool call', { toolName, attempt, delay: retryDelay * attempt })
        await this.sleep(retryDelay * attempt)
      }
    }

    // This should never be reached, but TypeScript requires it
    const response = {
      success: false,
      error: {
        code: -1,
        message: 'Max retries exceeded',
      },
    }
    this.logger.error('Unexpected error in callTool', new Error('Should not reach here'), { toolName, maxRetries })
    return response
  }

  /**
   * List tools using HTTP transport
   */
  private async listToolsHttp(): Promise<MCPTool[]> {
    const baseUrl = (this.transportWrapper as HttpTransport).getBaseUrl()

    try {
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {},
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json() as JSONRPCResponse

      if (result.error) {
        throw new Error(result.error!.message || 'RPC error')
      }

      return result.result?.tools || []
    }
    catch (error) {
      this.logger.error('Failed to list tools via HTTP', error instanceof Error ? error : new Error(String(error)))
      return []
    }
  }

  /**
   * Call tool using HTTP transport
   */
  private async callToolHttp(toolName: string, params: any): Promise<MCPResponse> {
    const baseUrl = (this.transportWrapper as HttpTransport).getBaseUrl()

    try {
      const response = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: params,
          },
        }),
      })

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: response.status,
            message: `HTTP ${response.status}: ${response.statusText}`,
          },
        }
      }

      const result = await response.json() as JSONRPCResponse

      if (result.error) {
        return {
          success: false,
          error: {
            code: result.error!.code || -32000,
            message: result.error!.message || 'RPC error',
          },
        }
      }

      return {
        success: true,
        data: result.result?.content,
      }
    }
    catch (error: any) {
      return {
        success: false,
        error: {
          code: -1,
          message: error.message || 'HTTP request failed',
        },
      }
    }
  }

  /**
   * Check if an error code is retryable
   */
  private isRetryableError(errorCode?: number): boolean {
    if (!errorCode)
      return false

    // Retry on connection errors and timeouts
    return errorCode === -1 || errorCode === -32000 || errorCode === -32001
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
