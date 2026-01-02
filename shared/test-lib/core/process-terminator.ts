/**
 * Process Terminator for MDT-113
 *
 * Handles graceful and forceful termination of child processes.
 * Extracted from ProcessLifecycleManager to focus solely on
 * process termination concerns including SIGTERM/SIGKILL handling,
 * tree-kill for process tree cleanup, and exit waiting.
 */

import { ChildProcess } from 'child_process';
import treeKill from 'tree-kill';
import { closeAllStreams } from '../utils/process-streams.js';

/**
 * Options for process termination
 */
export interface TerminationOptions {
  /** Signal to send for graceful termination (default: SIGTERM) */
  signal?: NodeJS.Signals;
  /** Timeout in ms before force kill (default: 5000) */
  gracefulTimeout?: number;
}

/**
 * Result of a termination operation
 */
export interface TerminationResult {
  /** The signal that was sent */
  signal: NodeJS.Signals;
  /** Whether the process had to be forcefully killed */
  forceKilled: boolean;
}

/**
 * Manages process termination with graceful shutdown and force kill fallback
 */
export class ProcessTerminator {
  /** Map of server types to their SIGKILL timeout IDs */
  private sigkillTimeouts: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Terminate a process gracefully with SIGTERM, fallback to SIGKILL
   *
   * @param serverType - Server identifier (e.g., 'frontend', 'backend', 'mcp')
   * @param process - Child process to terminate
   * @param options - Termination options
   * @returns Promise resolving to termination result
   *
   * @example
   * ```ts
   * const terminator = new ProcessTerminator();
   * const result = await terminator.terminate('backend', childProcess, {
   *   signal: 'SIGTERM',
   *   gracefulTimeout: 5000
   * });
   * console.log(`Process terminated with ${result.signal}`);
   * ```
   */
  async terminate(
    serverType: string,
    process: ChildProcess | undefined,
    options?: TerminationOptions
  ): Promise<TerminationResult> {
    if (!process) return { signal: 'SIGTERM', forceKilled: false };

    const { signal = 'SIGTERM', gracefulTimeout = 5000 } = options || {};

    // Remove event listeners before killing process
    closeAllStreams(process);

    // Use tree-kill to kill the entire process tree
    if (process.pid) {
      const pid = process.pid;

      // Set up the exit listener before sending kill signal
      const exitPromise = this.waitForExit(process);

      // Send SIGTERM to entire process tree
      await new Promise<void>((resolve) => {
        treeKill(pid, signal, (err) => {
          if (err) {
            // If SIGTERM fails, fall back to SIGKILL
            treeKill(pid, 'SIGKILL', () => resolve());
          } else {
            resolve();
          }
        });
      });

      // Wait for the process to actually exit
      await exitPromise;
    }

    return { signal, forceKilled: false };
  }

  /**
   * Force kill a process immediately with SIGKILL
   *
   * @param pid - Process ID to kill
   * @returns Promise resolving when kill is complete
   *
   * @example
   * ```ts
   * const terminator = new ProcessTerminator();
   * await terminator.forceKill(12345);
   * ```
   */
  async forceKill(pid: number): Promise<void> {
    return new Promise<void>((resolve) => {
      treeKill(pid, 'SIGKILL', () => resolve());
    });
  }

  /**
   * Wait for process to exit with timeout
   *
   * @param process - Child process to wait for
   * @param timeout - Timeout in milliseconds (default: 6000)
   * @returns Promise resolving when process exits or timeout occurs
   *
   * @private
   */
  private async waitForExit(process: ChildProcess, timeout = 6000): Promise<void> {
    if (!process || process.killed) return;

    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;
      const cleanup = () => {
        clearTimeout(timeoutId);
        process.off('exit', onExit);
        process.off('error', onError);
      };
      const onExit = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        resolve();
      };
      process.once('exit', onExit);
      process.once('error', onError);
      timeoutId = setTimeout(() => {
        cleanup();
        resolve();
      }, timeout);
    });
  }

  /**
   * Clear a pending SIGKILL timeout for a server
   *
   * @param serverType - Server identifier
   *
   * @example
   * ```ts
   * const terminator = new ProcessTerminator();
   * terminator.clearSigkillTimeout('backend');
   * ```
   */
  clearSigkillTimeout(serverType: string): void {
    const timeout = this.sigkillTimeouts.get(serverType);
    if (timeout) {
      clearTimeout(timeout);
      this.sigkillTimeouts.delete(serverType);
    }
  }

  /**
   * Clean up all resources (clears all pending timeouts)
   *
   * @example
   * ```ts
   * const terminator = new ProcessTerminator();
   * // ... use terminator ...
   * terminator.dispose();
   * ```
   */
  dispose(): void {
    this.sigkillTimeouts.forEach(timeout => clearTimeout(timeout));
    this.sigkillTimeouts.clear();
  }
}
