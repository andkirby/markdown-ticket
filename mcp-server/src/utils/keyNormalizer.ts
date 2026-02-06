/**
 * Key Normalization Utility for MCP Server (MDT-121)
 *
 * Normalizes CR keys in various formats:
 * - Pure numeric: "5" → "{PROJECTCODE}-5"
 * - Numeric with leading zeros: "005" → "{PROJECTCODE}-5"
 * - Full format with prefix: "abc-12" → "ABC-12" (uppercase)
 * - Full format preserved: "ABC-12" → "ABC-12"
 *
 * This utility handles string normalization only - no file system or MCP logic.
 */

import { ToolError } from './toolError.js'
import { JsonRpcErrorCode } from './toolError.js'

/**
 * Normalize a CR key to the standard format {PROJECTCODE}-{NUMBER}
 *
 * @param key - The key to normalize (numeric shorthand or full format)
 * @param projectCode - The project code to use for numeric keys
 * @returns Normalized CR key in format {PROJECTCODE}-{NUMBER}
 * @throws ToolError if key format is invalid
 */
export function normalizeKey(key: string, projectCode: string): string {
  if (!key || typeof key !== 'string') {
    throw ToolError.protocol(
      'Key is required and must be a string',
      JsonRpcErrorCode.InvalidParams,
    )
  }

  const trimmed = key.trim()

  // Pattern 1: Pure numeric (e.g., "5", "005", "123")
  // Add project prefix and strip leading zeros
  const numericPattern = /^\d+$/
  if (numericPattern.test(trimmed)) {
    // Strip leading zeros and add project prefix
    const number = String(Number.parseInt(trimmed, 10))
    return `${projectCode}-${number}`
  }

  // Pattern 2: Full format with project prefix (e.g., "abc-12", "MDT-005", "XYZ-123")
  // Uppercase the prefix and strip leading zeros from the number
  const fullFormatPattern = /^([a-zA-Z]+)-(\d+)$/
  const match = trimmed.match(fullFormatPattern)

  if (match) {
    const [, prefix, numberStr] = match
    const uppercasedPrefix = prefix.toUpperCase()
    // Strip leading zeros from the number
    const number = String(Number.parseInt(numberStr, 10))
    return `${uppercasedPrefix}-${number}`
  }

  // Invalid format - provide helpful error message
  throw ToolError.protocol(
    `Invalid key format '${trimmed}'. Expected:\n` +
    `  • Numeric shorthand: "5" or "005" (resolves to ${projectCode}-5)\n` +
    `  • Full format: "ABC-12" or "abc-12" (normalizes to ABC-12)`,
    JsonRpcErrorCode.InvalidParams,
  )
}
