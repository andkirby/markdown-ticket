/**
 * Event Listener Registry for Test Server Management
 *
 * Tracks and manages event listeners for child processes to ensure
 * proper cleanup and prevent memory leaks.
 */

import type { Buffer } from 'node:buffer'
import type { ChildProcess } from 'node:child_process'

/**
 * Registry for managing event listeners on child processes
 */
export class EventListenerRegistry {
  private stdoutHandlers: Map<string, (data: Buffer) => void> = new Map()
  private stderrHandlers: Map<string, (data: Buffer) => void> = new Map()
  private exitHandlers: Map<string, (code: number | null, signal: NodeJS.Signals | null) => void> = new Map()

  /**
   * Register event listeners for a server process
   * @param serverType - Server identifier (e.g., 'frontend', 'backend', 'mcp')
   * @param process - Child process to attach listeners to
   * @param stdout - Handler for stdout data
   * @param stderr - Handler for stderr data
   * @param exit - Handler for process exit
   */
  register(
    serverType: string,
    process: ChildProcess,
    stdout: (data: Buffer) => void,
    stderr: (data: Buffer) => void,
    exit: (code: number | null, signal: NodeJS.Signals | null) => void,
  ): void {
    // Attach event listeners
    process.stdout?.on('data', stdout)
    process.stderr?.on('data', stderr)
    process.on('exit', exit)

    // Store references for cleanup
    this.stdoutHandlers.set(serverType, stdout)
    this.stderrHandlers.set(serverType, stderr)
    this.exitHandlers.set(serverType, exit)
  }

  /**
   * Remove all event listeners for a specific server
   * @param serverType - Server identifier
   * @param process - Child process to remove listeners from
   */
  cleanup(serverType: string, process: ChildProcess): void {
    // Remove stdout handler
    const stdoutHandler = this.stdoutHandlers.get(serverType)
    if (process.stdout && stdoutHandler) {
      process.stdout.off('data', stdoutHandler)
      this.stdoutHandlers.delete(serverType)
    }

    // Remove stderr handler
    const stderrHandler = this.stderrHandlers.get(serverType)
    if (process.stderr && stderrHandler) {
      process.stderr.off('data', stderrHandler)
      this.stderrHandlers.delete(serverType)
    }

    // Remove exit handler
    const exitHandler = this.exitHandlers.get(serverType)
    if (exitHandler) {
      process.off('exit', exitHandler)
      this.exitHandlers.delete(serverType)
    }
  }

  /**
   * Remove all tracked event listeners
   */
  clear(): void {
    this.stdoutHandlers.clear()
    this.stderrHandlers.clear()
    this.exitHandlers.clear()
  }
}
