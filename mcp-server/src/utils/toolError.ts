/**
 * Tool Error Types for MCP Server
 *
 * Distinguishes between protocol errors and tool execution errors
 * according to MCP specification requirements.
 */

/**
 * Error types for MCP server
 */
export enum ErrorType {
  /** Protocol errors - should return JSON-RPC error responses */
  PROTOCOL = 'protocol',

  /** Tool execution errors - should return { result: { content: [...], isError: true } } */
  TOOL_EXECUTION = 'tool_execution',
}

/**
 * JSON-RPC error codes
 */
export enum JsonRpcErrorCode {
  /** Invalid JSON was received by the server */
  /** JSON sent is not a valid request object */
  /** The method does not exist / is not available */
  MethodNotFound = -32601,

  /** Invalid method parameter(s) */
  InvalidParams = -32602,

  /** Internal JSON-RPC error */
  InternalError = -32603,

  /** Server error range (-32000 to -32099) */
}

/**
 * Custom error class for MCP tool errors
 *
 * Protocol errors (unknown tool, invalid params) will be thrown as ToolError
 * and converted to JSON-RPC error responses.
 *
 * Tool execution errors (business logic failures) will be thrown as ToolError
 * and converted to { result: { content: [...], isError: true } } responses.
 */
export class ToolError extends Error {
  public readonly type: ErrorType
  public readonly code?: JsonRpcErrorCode
  public readonly data?: any

  constructor(
    message: string,
    type: ErrorType = ErrorType.TOOL_EXECUTION,
    code?: JsonRpcErrorCode,
    data?: any,
  ) {
    super(message)
    this.name = 'ToolError'
    this.type = type
    this.code = code
    this.data = data

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ToolError)
    }
  }

  /**
   * Create a protocol error (unknown tool, invalid params)
   * These will be converted to JSON-RPC error responses
   */
  static protocol(message: string, code: JsonRpcErrorCode, data?: any): ToolError {
    return new ToolError(message, ErrorType.PROTOCOL, code, data)
  }

  /**
   * Create a tool execution error (business logic failure)
   * These will be converted to { result: { content: [...], isError: true } }
   */
  static toolExecution(message: string, data?: any): ToolError {
    return new ToolError(message, ErrorType.TOOL_EXECUTION, undefined, data)
  }

  /**
   * Check if this is a protocol error
   */
  isProtocolError(): boolean {
    return this.type === ErrorType.PROTOCOL
  }

  /**
   * Check if this is a tool execution error
   */
  isToolExecutionError(): boolean {
    return this.type === ErrorType.TOOL_EXECUTION
  }

  /**
   * Convert to JSON-RPC error response format
   * Only used for protocol errors
   */
  toJsonRpcError(): { code: number, message: string, data?: any } {
    if (!this.isProtocolError()) {
      throw new Error('Cannot convert tool execution error to JSON-RPC error')
    }

    return {
      code: this.code || JsonRpcErrorCode.InternalError,
      message: this.message,
      data: this.data,
    }
  }

  /**
   * Convert to MCP tool error result format
   * Only used for tool execution errors
   */
  toToolErrorResult(): { content: Array<{ type: string, text: string }>, isError: true } {
    if (!this.isToolExecutionError()) {
      throw new Error('Cannot convert protocol error to tool error result')
    }

    return {
      content: [
        {
          type: 'text',
          text: this.message,
        },
      ],
      isError: true,
    }
  }
}
