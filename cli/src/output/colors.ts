/**
 * CLI Color Management (MDT-143)
 *
 * Terminal color definitions aligned with web UI badge.css categories.
 * Provides ANSI color codes gated by CLI configuration and TTY detection.
 */

import { getCliConfig } from '../utils/cliConfig.js'

/**
 * ANSI color codes
 */
const ANSI = {
  reset: '\x1B[0m',
  bold: '\x1B[1m',
  dim: '\x1B[2m',
  red: '\x1B[31m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  blue: '\x1B[34m',
  magenta: '\x1B[35m',
  cyan: '\x1B[36m',
  gray: '\x1B[90m',
  // Bright variants
  brightRed: '\x1B[91m',
  brightGreen: '\x1B[92m',
  brightYellow: '\x1B[93m',
  brightBlue: '\x1B[94m',
  brightMagenta: '\x1B[95m',
  brightCyan: '\x1B[96m',
} as const

/**
 * Check if colors should be used for output
 *
 * Checks:
 * 1. Config: getCliConfig().display.color
 * 2. TTY: process.stdout.isTTY
 * 3. NO_COLOR env var
 *
 * @returns true if colors should be used
 */
export function shouldUseColor(): boolean {
  // Check NO_COLOR environment variable (https://no-color.org/)
  if (process.env.NO_COLOR) {
    return false
  }

  // Check CLI configuration
  const config = getCliConfig()
  if (!config.display.color) {
    return false
  }

  // Check if output is a TTY
  if (!process.stdout.isTTY) {
    return false
  }

  return true
}

/**
 * Generic colorize function
 *
 * @param text - Text to colorize
 * @param color - ANSI color code
 * @returns Colorized text (or plain text if colors disabled)
 */
export function colorize(text: string, color: string): string {
  if (!shouldUseColor()) {
    return text
  }
  return `${color}${text}${ANSI.reset}`
}

/**
 * Create a badge-style label with optional coloring
 *
 * @param text - Badge text
 * @param colorFn - Optional color function to apply
 * @returns Formatted badge [text]
 */
export function badge(text: string, colorFn?: (s: string) => string): string {
  const colored = colorFn ? colorFn(text) : text
  return `[${colored}]`
}

/**
 * Colorize status value (aligned with badge.css)
 *
 * Status color mapping (from badge.css):
 * - Proposed: gray text
 * - Approved: blue text
 * - In Progress: yellow text
 * - Implemented: green text
 * - Rejected: red text
 * - On Hold: orange text (dim yellow)
 * - Partially Implemented: magenta text
 *
 * @param status - Status value
 * @returns Colorized status (or plain text if colors disabled)
 */
export function colorizeStatus(status: string): string {
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '-')

  const statusColorMap: Record<string, string> = {
    'proposed': ANSI.gray,
    'approved': ANSI.blue,
    'in-progress': ANSI.yellow,
    'implemented': ANSI.green,
    'rejected': ANSI.red,
    'on-hold': ANSI.dim + ANSI.yellow,
    'partially-implemented': ANSI.magenta,
    'superseded': ANSI.brightBlue,
    'deprecated': ANSI.gray,
    'duplicate': ANSI.gray,
  }

  const colorCode = statusColorMap[normalizedStatus] || ANSI.gray
  return colorize(status, colorCode)
}

/**
 * Colorize priority value (aligned with badge.css)
 *
 * Priority color mapping (from badge.css):
 * - Critical: bright red + bold
 * - High: bright red
 * - Medium: yellow
 * - Low: green
 *
 * @param priority - Priority value
 * @returns Colorized priority (or plain text if colors disabled)
 */
export function colorizePriority(priority: string): string {
  const normalizedPriority = priority.toLowerCase()

  const priorityColorMap: Record<string, string> = {
    'critical': ANSI.bold + ANSI.brightRed,
    'high': ANSI.brightRed,
    'medium': ANSI.yellow,
    'low': ANSI.green,
  }

  const colorCode = priorityColorMap[normalizedPriority] || ANSI.yellow
  return colorize(priority, colorCode)
}

/**
 * Colorize type value (aligned with badge.css)
 *
 * Type color mapping (from badge.css):
 * - Feature Enhancement: blue
 * - Bug Fix: red
 * - Architecture: magenta
 * - Technical Debt: gray
 * - Documentation: cyan
 * - Research: pink (bright magenta)
 *
 * @param type - Type value
 * @returns Colorized type (or plain text if colors disabled)
 */
export function colorizeType(type: string): string {
  const normalizedType = type.toLowerCase().replace(/\s+/g, '-')

  const typeColorMap: Record<string, string> = {
    'feature-enhancement': ANSI.blue,
    'bug-fix': ANSI.red,
    'architecture': ANSI.magenta,
    'technical-debt': ANSI.gray,
    'documentation': ANSI.cyan,
    'research': ANSI.brightMagenta,
  }

  const colorCode = typeColorMap[normalizedType] || ANSI.blue
  return colorize(type, colorCode)
}
