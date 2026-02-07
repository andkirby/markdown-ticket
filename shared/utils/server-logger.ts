/**
 * Lightweight structured logger for server-side operations.
 *
 * This logger uses console.error() for debug/info levels, which is allowed by
 * the ESLint configuration (no-console rule permits warn and error).
 *
 * Log levels: debug (0) < info (1) < warn (2) < error (3)
 * Default level: info
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const

type LogLevel = keyof typeof LOG_LEVELS

let currentLevel: (typeof LOG_LEVELS)[LogLevel] = LOG_LEVELS.info

/**
 * Check if a message at the given level should be logged based on current level.
 */
function shouldLog(level: LogLevel): boolean {
  return currentLevel <= LOG_LEVELS[level]
}

/**
 * Structured logger with level-based filtering.
 *
 * - debug: Detailed debugging information
 * - info: General informational messages
 * - warn: Warning messages
 * - error: Error messages
 */
export const logger = {
  /**
   * Log debug-level messages (lowest level, most verbose).
   * Only shown when log level is set to 'debug'.
   */
  debug: (...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.error('[DEBUG]', ...args)
    }
  },

  /**
   * Log informational messages (default level).
   * Shown for debug, info, warn, and error levels.
   */
  info: (...args: unknown[]) => {
    if (shouldLog('info')) {
      console.error('[INFO]', ...args)
    }
  },

  /**
   * Log warning messages.
   * Always shown regardless of log level.
   */
  warn: (...args: unknown[]) => {
    console.warn(...args)
  },

  /**
   * Log error messages.
   * Always shown regardless of log level.
   */
  error: (...args: unknown[]) => {
    console.error(...args)
  },
}

/**
 * Set the minimum log level.
 *
 * Messages below this level will be silenced.
 * For example, setLevel('warn') will silence debug and info messages.
 *
 * @param level - The minimum log level (debug, info, warn, error)
 * @throws Error if an invalid level is provided
 */
export function setLevel(level: LogLevel): void {
  if (!(level in LOG_LEVELS)) {
    throw new Error(
      `Invalid log level: "${level}". Valid levels are: ${Object.keys(LOG_LEVELS).join(', ')}`,
    )
  }
  currentLevel = LOG_LEVELS[level]
}

/**
 * Get the current log level.
 */
export function getLevel(): LogLevel {
  return (Object.keys(LOG_LEVELS).find(
    key => LOG_LEVELS[key as LogLevel] === currentLevel,
  ) as LogLevel) || 'info'
}

/**
 * Get all available log levels.
 */
export function getLevels(): readonly LogLevel[] {
  return Object.keys(LOG_LEVELS) as LogLevel[]
}
