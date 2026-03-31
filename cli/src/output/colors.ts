/**
 * CLI Color Management (MDT-143)
 *
 * Terminal color definitions aligned with web UI badge.css categories.
 * Provides ANSI color codes gated by CLI configuration and TTY detection.
 * Color maps are keyed by canonical values from @mdt/domain-contracts.
 */

import { CRPriority, CRStatus, CRType } from '@mdt/domain-contracts/types'
import { getCliConfig } from '../utils/cliConfig.js'

/** Strip ANSI escape codes from a string */
function stripAnsi(s: string): string {
  return s.replace(/\x1B\[[0-9;]*m/g, '')
}

/** Pad string to target visible width (ignoring ANSI codes) */
export function visiblePadEnd(s: string, targetWidth: number): string {
  const visible = stripAnsi(s)
  const pad = targetWidth - visible.length
  if (pad <= 0) return s
  return s + ' '.repeat(pad)
}

/**
 * Abbreviated display labels for long values in list views.
 * Detail view (`formatTicketView`) always uses the full value.
 */
const STATUS_DISPLAY_LABELS: Record<string, string> = {
  'Partially Implemented': 'Part. Impl',
}

/** Get display label for a status value (returns abbreviated form if available) */
export function statusDisplayLabel(status: string): string {
  return STATUS_DISPLAY_LABELS[status] || status
}

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
  lightGray: '\x1B[37m',
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
  // NO_COLOR=0 explicitly enables color (overrides the NO_COLOR standard)
  if (process.env.NO_COLOR && process.env.NO_COLOR !== '0') {
    return false
  }

  // Check FORCE_COLOR environment variable
  if (process.env.FORCE_COLOR) {
    return true
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

// -------------------------------------------------------------------
// Status → color: keyed by CRStatus constants
// -------------------------------------------------------------------

const statusColorMap: Record<string, string> = {
  [CRStatus.PROPOSED]: ANSI.gray,
  [CRStatus.APPROVED]: ANSI.blue,
  [CRStatus.IN_PROGRESS]: ANSI.yellow,
  [CRStatus.IMPLEMENTED]: ANSI.green,
  [CRStatus.REJECTED]: ANSI.red,
  [CRStatus.ON_HOLD]: ANSI.dim + ANSI.yellow,
  [CRStatus.PARTIALLY_IMPLEMENTED]: ANSI.magenta,
}

/**
 * Colorize status value (aligned with badge.css)
 */
export function colorizeStatus(status: string): string {
  const colorCode = statusColorMap[status] || ANSI.gray
  return colorize(status, colorCode)
}

// -------------------------------------------------------------------
// Priority → color: keyed by CRPriority constants
// -------------------------------------------------------------------

const priorityColorMap: Record<string, string> = {
  [CRPriority.LOW]: ANSI.green,
  [CRPriority.MEDIUM]: ANSI.yellow,
  [CRPriority.HIGH]: ANSI.brightRed,
  [CRPriority.CRITICAL]: ANSI.bold + ANSI.brightRed,
}

/**
 * Colorize priority value (aligned with badge.css)
 */
export function colorizePriority(priority: string): string {
  const colorCode = priorityColorMap[priority] || ANSI.yellow
  return colorize(priority, colorCode)
}

// -------------------------------------------------------------------
// Type → color: keyed by CRType constants
// -------------------------------------------------------------------

const typeColorMap: Record<string, string> = {
  [CRType.ARCHITECTURE]: ANSI.magenta,
  [CRType.FEATURE_ENHANCEMENT]: ANSI.blue,
  [CRType.BUG_FIX]: ANSI.red,
  [CRType.TECHNICAL_DEBT]: ANSI.lightGray,
  [CRType.DOCUMENTATION]: ANSI.cyan,
  [CRType.RESEARCH]: ANSI.brightMagenta,
}

/** First-word → color mapping for list views (avoids full-value lookup miss) */
const typeFirstWordColorMap: Record<string, string> = {
  'Architecture': ANSI.magenta,
  'Feature': ANSI.blue,
  'Bug': ANSI.red,
  'Technical': ANSI.lightGray,
  'Documentation': ANSI.cyan,
  'Research': ANSI.brightMagenta,
}

/**
 * Colorize type value (aligned with badge.css)
 * Accepts full type or first-word abbreviation.
 */
export function colorizeType(type: string): string {
  const colorCode = typeColorMap[type] || typeFirstWordColorMap[type] || ANSI.blue
  return colorize(type, colorCode)
}

// -------------------------------------------------------------------
// Per-element color scheme (UAT Task 8)
// -------------------------------------------------------------------

/** Ticket title: white bold */
export function colorizeTitle(title: string): string {
  return colorize(title, ANSI.bold)
}

/** Ticket key (e.g., MDT-143): light-blue bold */
export function colorizeTicketKey(key: string): string {
  return colorize(key, ANSI.bold + ANSI.brightCyan)
}

/** Project code (e.g., MDT): dark cyan bold */
export function colorizeProjectCode(code: string): string {
  return colorize(code, ANSI.bold + ANSI.cyan)
}

/** Project ID (e.g., markdown-ticket): gray */
export function colorizeProjectId(id: string): string {
  return colorize(id, ANSI.gray)
}

/** File paths: gray */
export function colorizePath(path: string): string {
  return colorize(path, ANSI.gray)
}
