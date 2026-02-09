/**
 * Mock of @mdt/shared/utils/server-logger for testing
 * Provides minimal implementation for test environment
 * NOTE: Keep in sync with shared/utils/server-logger.ts
 */

/**
 * Mock logger for testing - all methods are no-ops to avoid cluttering test output
 */
export const logger = {
  debug: (..._args: unknown[]) => {
    // No-op in tests
  },
  info: (..._args: unknown[]) => {
    // No-op in tests
  },
  warn: (..._args: unknown[]) => {
    // No-op in tests
  },
  error: (..._args: unknown[]) => {
    // No-op in tests
  },
}

/**
 * Mock setLevel function for testing
 */
export function setLevel(_level: 'debug' | 'info' | 'warn' | 'error'): void {
  // No-op in tests
}

/**
 * Mock getLevel function for testing
 */
export function getLevel(): 'debug' | 'info' | 'warn' | 'error' {
  return 'info'
}

/**
 * Mock getLevels function for testing
 */
export function getLevels(): readonly ('debug' | 'info' | 'warn' | 'error')[] {
  return ['debug', 'info', 'warn', 'error']
}
