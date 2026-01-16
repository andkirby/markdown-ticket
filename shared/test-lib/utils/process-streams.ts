import type { ChildProcess } from 'node:child_process'

/**
 * Closes all streams (stdin, stdout, stderr) and disconnects IPC for a ChildProcess.
 *
 * This function performs cleanup on a child process by:
 * - Closing stdin (calling end() then destroy() if not already destroyed)
 * - Closing stdout (calling destroy() if not already destroyed)
 * - Closing stderr (calling destroy() if not already destroyed)
 * - Disconnecting the IPC channel if the process has a disconnect method
 *
 * @param process - The ChildProcess instance to clean up
 *
 * @example
 * ```ts
 * const childProcess = spawn('node', ['script.js']);
 * // ... use process ...
 * closeAllStreams(childProcess);
 * ```
 *
 * @remarks
 * This function safely handles cases where streams may already be destroyed
 * or may not exist. It checks the `destroyed` property before attempting
 * to close each stream.
 */
export function closeAllStreams(process: ChildProcess): void {
  // Close stdin if it exists and is not destroyed
  if (process.stdin && !process.stdin.destroyed) {
    process.stdin.end()
    process.stdin.destroy()
  }

  // Close stdout if it exists and is not destroyed
  if (process.stdout && !process.stdout.destroyed) {
    process.stdout.destroy()
  }

  // Close stderr if it exists and is not destroyed
  if (process.stderr && !process.stderr.destroyed) {
    process.stderr.destroy()
  }

  // Disconnect IPC channel if the method exists
  if (typeof process.disconnect === 'function') {
    process.disconnect()
  }
}
