/**
 * Process Spawner for MDT-092 Test Framework
 *
 * Handles spawning child processes with configuration, stdio setup,
 * and event handler attachment. Extracted from ProcessLifecycleManager
 * to focus solely on process spawning concerns.
 */

import type { Buffer } from 'node:buffer'
import type { ChildProcess } from 'node:child_process'
import type { ServerConfig } from '../types.js'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { EventListenerRegistry } from './event-listener-registry.js'

/**
 * Event handlers for process lifecycle events
 */
export interface ProcessHandlers {
  /** Handler for stdout data */
  stdout?: (data: Buffer) => void
  /** Handler for stderr data */
  stderr?: (data: Buffer) => void
  /** Handler for process exit */
  exit?: (code: number | null, signal: NodeJS.Signals | null) => void
}

/**
 * Manages spawning child processes and attaching event handlers
 */
export class ProcessSpawner {
  private listeners: EventListenerRegistry

  constructor() {
    this.listeners = new EventListenerRegistry()
  }

  /**
   * Spawn a new process with the given configuration
   * @param config - Server configuration containing command, args, and environment
   * @param projectRoot - Root directory for the process
   * @returns The spawned child process
   * @throws {Error} If spawning fails
   */
  spawn(config: ServerConfig, projectRoot: string): ChildProcess {
    const child = spawn(config.command, config.args, {
      cwd: projectRoot,
      env: { ...process.env, ...config.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    return child
  }

  /**
   * Attach event handlers to a process
   * @param serverType - Server identifier for cleanup tracking (e.g., 'frontend', 'backend', 'mcp')
   * @param process - Child process to attach handlers to
   * @param handlers - Event handlers to attach for stdout, stderr, and exit events
   */
  attachHandlers(
    serverType: string,
    process: ChildProcess,
    handlers: ProcessHandlers,
  ): void {
    const stdoutHandler = handlers.stdout || ((_d: Buffer) => {})
    const stderrHandler = handlers.stderr || ((_d: Buffer) => {})
    const exitHandler = handlers.exit || ((_code: number | null, _signal: NodeJS.Signals | null) => {})

    this.listeners.register(serverType, process, stdoutHandler, stderrHandler, exitHandler)
  }

  /**
   * Clean up event listeners for a process
   * @param serverType - Server identifier
   * @param process - Child process to cleanup listeners for
   */
  cleanupHandlers(serverType: string, process: ChildProcess): void {
    this.listeners.cleanup(serverType, process)
  }

  /**
   * Clean up all event listeners
   */
  dispose(): void {
    this.listeners.clear()
  }
}
