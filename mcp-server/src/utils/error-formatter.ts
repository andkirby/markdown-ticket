/**
 * Error Formatter Utilities
 *
 * This module provides standardized error formatting functions for the MCP server.
 * All handlers should import from here to ensure consistent error responses.
 *
 * Key features:
 * - LLM-friendly error messages with context
 * - Standardized JSON-RPC error responses
 * - Tool-specific error formatting
 * - HTTP status code mapping
 */

/**
 * Standard JSON-RPC error codes
 */
export const JSONRPC_CODES = {
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  PARSE_ERROR: -32700,
} as const;

/**
 * HTTP status codes for different error types
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Standard JSON-RPC error response structure
 */
export interface JSONRPCError {
  jsonrpc: '2.0';
  id: any;
  error: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Tool error response format for LLM-friendly output
 */
export interface ToolErrorResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
}

/**
 * Formats a JSON-RPC error response
 */
export function formatJSONRPCError(
  id: any,
  code: number,
  message: string,
  data?: any
): JSONRPCError {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      ...(data && { data })
    }
  };
}

/**
 * Formats an invalid request error
 */
export function formatInvalidRequestError(id: any, message: string): JSONRPCError {
  return formatJSONRPCError(
    id,
    JSONRPC_CODES.INVALID_REQUEST,
    `Invalid Request: ${message}`
  );
}

/**
 * Formats a method not found error
 */
export function formatMethodNotFoundError(id: any, method: string, availableMethods?: string[]): JSONRPCError {
  let message = `Method not found: ${method}`;
  if (availableMethods) {
    message += `. Available methods: ${availableMethods.join(', ')}`;
  }

  return formatJSONRPCError(
    id,
    JSONRPC_CODES.METHOD_NOT_FOUND,
    message
  );
}

/**
 * Formats an invalid parameters error
 */
export function formatInvalidParamsError(id: any, message: string): JSONRPCError {
  return formatJSONRPCError(
    id,
    JSONRPC_CODES.INVALID_PARAMS,
    `Invalid Parameters: ${message}`
  );
}

/**
 * Formats an internal error
 */
export function formatInternalError(id: any, error: Error | string): JSONRPCError {
  const message = typeof error === 'string' ? error : error.message;

  return formatJSONRPCError(
    id,
    JSONRPC_CODES.INTERNAL_ERROR,
    'Internal error',
    message
  );
}

/**
 * Formats an LLM-friendly tool error message
 * Used when tools throw errors and need to display user-friendly messages
 */
export function formatToolError(toolName: string, error: Error | string): ToolErrorResponse {
  const message = typeof error === 'string' ? error : error.message;

  return {
    content: [
      {
        type: 'text',
        text: `❌ **Error in ${toolName}**\n\n${message}\n\nPlease check your input parameters and try again.`
      }
    ]
  };
}

/**
 * Formats authentication-related errors
 */
export function formatAuthError(errorType: 'missing' | 'invalid_format' | 'invalid_token'): JSONRPCError {
  const messages = {
    missing: 'Missing Authorization header. Include "Authorization: Bearer <token>" in your request.',
    invalid_format: 'Invalid Authorization format. Use "Authorization: Bearer <token>"',
    invalid_token: 'Invalid token'
  };

  return formatJSONRPCError(
    null, // Auth errors typically don't have a request ID
    JSONRPC_CODES.INVALID_REQUEST,
    `Unauthorized: ${messages[errorType]}`
  );
}

/**
 * Formats origin validation errors
 */
export function formatOriginError(origin: string, allowedOrigins: string[]): JSONRPCError {
  return formatJSONRPCError(
    null,
    JSONRPC_CODES.INVALID_REQUEST,
    `Forbidden: Origin '${origin}' is not allowed. Allowed origins: ${allowedOrigins.join(', ')}`
  );
}

/**
 * Formats rate limit errors
 */
export function formatRateLimitError(maxRequests: number, windowSeconds: number): JSONRPCError {
  return formatJSONRPCError(
    null,
    JSONRPC_CODES.INVALID_REQUEST,
    `Rate limit exceeded. Maximum ${maxRequests} requests per ${windowSeconds} seconds. Please try again later.`
  );
}

/**
 * Formats session-related errors
 */
export function formatSessionError(errorType: 'missing' | 'not_found' | 'expired'): JSONRPCError {
  const messages = {
    missing: 'Mcp-Session-Id header is required',
    not_found: 'Session not found',
    expired: 'Session not found or expired. Please initialize a new session.'
  };

  return formatJSONRPCError(
    null,
    JSONRPC_CODES.INVALID_REQUEST,
    `Bad Request: ${messages[errorType]}`
  );
}

/**
 * Maps JSON-RPC error codes to HTTP status codes
 */
export function mapErrorToHttpStatus(errorCode: number): number {
  switch (errorCode) {
    case JSONRPC_CODES.INVALID_REQUEST:
    case JSONRPC_CODES.INVALID_PARAMS:
    case JSONRPC_CODES.PARSE_ERROR:
      return HTTP_STATUS.BAD_REQUEST;

    case JSONRPC_CODES.METHOD_NOT_FOUND:
      return HTTP_STATUS.NOT_FOUND;

    case JSONRPC_CODES.INTERNAL_ERROR:
      return HTTP_STATUS.INTERNAL_SERVER_ERROR;

    default:
      return HTTP_STATUS.INTERNAL_SERVER_ERROR;
  }
}

/**
 * Formats a complete HTTP error response with status code
 */
export function formatHTTPError(
  id: any,
  code: number,
  message: string,
  data?: any
): { status: number; body: JSONRPCError } {
  return {
    status: mapErrorToHttpStatus(code),
    body: formatJSONRPCError(id, code, message, data)
  };
}

/**
 * Creates an Express error response handler for common error types
 */
export function createErrorResponse(res: any, id: any, code: number, message: string, data?: any) {
  const { status, body } = formatHTTPError(id, code, message, data);
  return res.status(status).json(body);
}

/**
 * Error message templates for common scenarios
 */
export const ERROR_MESSAGES = {
  PROJECT_NOT_FOUND: (projectKey: string, availableProjects?: string[]) =>
    `Project '${projectKey}' not found${availableProjects ? `. Available projects: ${availableProjects.join(', ')}` : ''}`,

  CR_NOT_FOUND: (crKey: string, projectKey: string) =>
    `CR '${crKey}' not found in project '${projectKey}'`,

  INVALID_PROJECT_KEY: (projectKey: string) =>
    `Invalid project key format: '${projectKey}'. Project keys must be 2-10 uppercase letters.`,

  INVALID_CR_KEY: (crKey: string) =>
    `Invalid CR key format: '${crKey}'. Expected format: PROJ-NNN (e.g., MDT-001).`,

  MISSING_REQUIRED_FIELD: (fieldName: string) =>
    `Missing required field: ${fieldName}`,

  INVALID_ENUM_VALUE: (fieldName: string, value: string, validValues: string[]) =>
    `Invalid ${fieldName}: '${value}'. Must be one of: ${validValues.join(', ')}`,

  TOOL_NOT_FOUND: (toolName: string, availableTools: string[]) =>
    `Unknown tool '${toolName}'. Available tools: ${availableTools.join(', ')}`,

  SECTION_NOT_FOUND: (sectionName: string, availableSections?: string[]) =>
    `Section '${sectionName}' not found${availableSections ? `. Available sections: ${availableSections.join(', ')}` : ''}`,

  INVALID_OPERATION: (operation: string, validOperations: string[]) =>
    `Invalid operation '${operation}'. Must be one of: ${validOperations.join(', ')}`,

  VALIDATION_FAILED: (field: string, reason: string) =>
    `Validation failed for ${field}: ${reason}`,

  TEMPLATE_NOT_FOUND: (crType: string) =>
    `Template not found for CR type: ${crType}`,

  FILE_NOT_FOUND: (filePath: string) =>
    `File not found: ${filePath}`,

  PERMISSION_DENIED: (action: string, resource: string) =>
    `Permission denied: Cannot ${action} ${resource}`,

  DEPENDENCY_ERROR: (dependency: string) =>
    `Dependency error: ${dependency}`,

  CONCURRENT_MODIFICATION: (resource: string) =>
    `Concurrent modification detected: ${resource} was modified by another process`,

  QUOTA_EXCEEDED: (quota: string) =>
    `Quota exceeded: ${quota}`,
} as const;