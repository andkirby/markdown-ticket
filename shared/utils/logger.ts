/**
 * Shared logging utilities
 * Provides quiet mode logging for all services
 */

/**
 * Log to stderr unless quiet mode is enabled
 * @param quiet - Whether quiet mode is enabled
 * @param message - Message to log
 * @param args - Additional arguments to log
 */
export function logQuiet(quiet: boolean, message: string, ...args: unknown[]): void {
  if (!quiet) {
    console.error(message, ...args)
  }
}

/**
 * Create a quiet logger function with bound quiet state
 * @param quiet - Whether quiet mode is enabled
 * @returns A logging function that respects the quiet state
 */
export function createQuietLogger(quiet: boolean = false): (message: string, ...args: unknown[]) => void {
  return (message: string, ...args: unknown[]): void => {
    logQuiet(quiet, message, ...args)
  }
}
