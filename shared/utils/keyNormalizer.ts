/**
 * Key Normalization Utility (MDT-121, MDT-090)
 *
 * Single source of truth for CR key normalization.
 * Used by MCP server, REST API, CLI, and other consumers.
 *
 * Normalizes CR keys in various formats:
 * - Pure numeric: "5" → "{PROJECTCODE}-005" (pads to 3 digits)
 * - Numeric with leading zeros: "005" → "{PROJECTCODE}-005" (preserves format)
 * - Full format with prefix: "abc-12" → "ABC-012" (uppercase, pads to 3 digits)
 * - Full format with alphanumeric prefix: "tp0-12" → "TP0-012" (supports project codes with numbers)
 * - Full format preserved: "ABC-012" → "ABC-012" (already correct)
 *
 * Tickets are stored with 3-digit zero-padded numbers (MDT-001, MDT-002, etc.)
 * This utility matches the ticket format used throughout the system.
 */

import { PROJECT_CODE_PATTERN } from '@mdt/domain-contracts'

/**
 * Error class for key normalization failures
 */
export class KeyNormalizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KeyNormalizationError'
  }
}

/**
 * Format a CR key with dynamic zero-padding.
 * MDT-001 (3-digit), MDT-1000 (4-digit), MDT-10000 (5-digit)
 *
 * @param projectCode - The project code (e.g., 'MDT', 'API')
 * @param number - The ticket number
 * @returns Formatted CR key with dynamic padding
 */
export function formatCrKey(projectCode: string, number: number): string {
  const padding = Math.max(3, String(number).length)
  return `${projectCode}-${String(number).padStart(padding, '0')}`
}

/**
 * Normalize a CR key to the standard format {PROJECTCODE}-{NUMBER}
 *
 * @param key - The key to normalize (numeric shorthand or full format)
 * @param projectCode - The project code to use for numeric keys
 * @returns Normalized CR key in format {PROJECTCODE}-{NUMBER}
 * @throws KeyNormalizationError if key format is invalid
 */
export function normalizeKey(key: string, projectCode: string): string {
  if (!key || typeof key !== 'string') {
    throw new KeyNormalizationError('Key is required and must be a string')
  }

  const trimmed = key.trim()

  if (trimmed.length === 0) {
    throw new KeyNormalizationError('Key cannot be empty or whitespace only')
  }

  // Pattern 1: Pure numeric (e.g., "5", "005", "123")
  // Add project prefix and pad to 3 digits (matching ticket format)
  const numericPattern = /^\d+$/
  if (numericPattern.test(trimmed)) {
    // Pad to 3 digits and add project prefix
    return formatCrKey(projectCode, Number.parseInt(trimmed, 10))
  }

  // Pattern 2: Full format with project prefix (e.g., "abc-12", "MDT-005", "TP0-002")
  // Uses PROJECT_CODE_PATTERN from domain-contracts for validation
  // Must start with a letter, followed by alphanumeric characters
  const fullFormatPattern = /^([a-z][a-z0-9]*)-(\d+)$/i
  const match = trimmed.match(fullFormatPattern)

  if (match) {
    const [, prefix, numberStr] = match
    const uppercasedPrefix = prefix.toUpperCase()

    // Validate prefix matches PROJECT_CODE pattern (2-5 alphanumeric chars)
    if (!PROJECT_CODE_PATTERN.test(uppercasedPrefix)) {
      throw new KeyNormalizationError(
        `Invalid project code '${uppercasedPrefix}'. Project code must be 2-5 alphanumeric characters.`,
      )
    }

    // Pad to 3 digits (matching ticket storage format)
    return formatCrKey(uppercasedPrefix, Number.parseInt(numberStr, 10))
  }

  // Invalid format - provide helpful error message
  throw new KeyNormalizationError(
    `Invalid key format '${trimmed}'. Expected:\n`
    + `  • Numeric shorthand: "5" or "005" (resolves to ${projectCode}-005)\n`
    + `  • Full format: "ABC-012" or "abc-12" (normalizes to ABC-012)`,
  )
}
