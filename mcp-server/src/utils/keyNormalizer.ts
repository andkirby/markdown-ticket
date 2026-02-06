/**
 * Key Normalization Utility for MCP Server (MDT-121)
 *
 * Normalizes CR keys in various formats:
 * - Pure numeric: "5" → "{PROJECTCODE}-005" (pads to 3 digits)
 * - Numeric with leading zeros: "005" → "{PROJECTCODE}-005" (preserves format)
 * - Full format with prefix: "abc-12" → "ABC-012" (uppercase, pads to 3 digits)
 * - Full format preserved: "ABC-012" → "ABC-012" (already correct)
 *
 * Tickets are stored with 3-digit zero-padded numbers (MDT-001, MDT-002, etc.)
 * This utility matches the ticket format used throughout the system.
 *
 * This utility handles string normalization only - no file system or MCP logic.
 */

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
  if (!key || typeof key !== 'string') {
    throw ToolError.protocol(
      'Key is required and must be a string',
      JsonRpcErrorCode.InvalidParams,
    )
  }

  const trimmed = key.trim()

  // Pattern 1: Pure numeric (e.g., "5", "005", "123")
  // Add project prefix and pad to 3 digits (matching ticket format)
  const numericPattern = /^\d+$/
  if (numericPattern.test(trimmed)) {
    // Pad to 3 digits and add project prefix
    const number = String(Number.parseInt(trimmed, 10)).padStart(3, '0')
    return `${projectCode}-${number}`
  }

  // Pattern 2: Full format with project prefix (e.g., "abc-12", "MDT-005", "XYZ-123")
  // Uppercase the prefix and pad the number to 3 digits (matching ticket format)
  const fullFormatPattern = /^([a-z]+)-(\d+)$/i
  const match = trimmed.match(fullFormatPattern)

  if (match) {
    const [, prefix, numberStr] = match
    const uppercasedPrefix = prefix.toUpperCase()
    // Pad to 3 digits (matching ticket storage format)
    const number = String(Number.parseInt(numberStr, 10)).padStart(3, '0')
    return `${uppercasedPrefix}-${number}`
  }

  // Invalid format - provide helpful error message
  throw ToolError.protocol(
    `Invalid key format '${trimmed}'. Expected:\n`
    + `  • Numeric shorthand: "5" or "005" (resolves to ${projectCode}-005)\n`
    + `  • Full format: "ABC-012" or "abc-12" (normalizes to ABC-012)`,
    JsonRpcErrorCode.InvalidParams,
  )
}
