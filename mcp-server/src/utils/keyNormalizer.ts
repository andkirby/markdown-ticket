/**
 * Key Normalization Utility - MCP Server Wrapper (MDT-121, MDT-090)
 *
 * Wraps the shared normalizeKey function with MCP-specific error handling.
 * The actual normalization logic is in shared/utils/keyNormalizer.ts.
 */

import { KeyNormalizationError, normalizeKey as sharedNormalizeKey } from '@mdt/shared/utils/keyNormalizer.js'
import { JsonRpcErrorCode, ToolError } from './toolError.js'

/**
 * Normalize a CR key to the standard format {PROJECTCODE}-{NUMBER}
 *
 * @param key - The key to normalize (numeric shorthand or full format)
 * @param projectCode - The project code to use for numeric keys
 * @returns Normalized CR key in format {PROJECTCODE}-{NUMBER}
 * @throws ToolError if key format is invalid
 */
export function normalizeKey(key: string, projectCode: string): string {
  try {
    return sharedNormalizeKey(key, projectCode)
  }
  catch (error) {
    if (error instanceof KeyNormalizationError) {
      // Convert to MCP-specific ToolError for JSON-RPC protocol
      throw ToolError.protocol(error.message, JsonRpcErrorCode.InvalidParams)
    }
    throw error
  }
}

// Re-export for convenience
export { KeyNormalizationError }
