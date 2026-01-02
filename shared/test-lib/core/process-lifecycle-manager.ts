/**
 * Process Lifecycle Manager for MDT-092
 *
 * Manages server process lifecycle including spawning, health checks,
 * graceful shutdown, and cleanup. Extracted from TestServer to focus
 * solely on process management concerns.
 */

import { spawn, ChildProcess } from 'child_process';
import treeKill from 'tree-kill';
import { ServerConfig, ServerStartupError, TestFrameworkError } from '../types.js';
import { EventListenerRegistry } from './event-listener-registry.js';

// Default health check configuration
const HEALTH = { maxAttempts: 30, initialDelay: 100, maxDelay: 2000, backoffMultiplier: 1.5 };

/**
 * Manages server process lifecycle
 */
export class ProcessLifecycleManager {
  private processes: Map<string, ChildProcess> = new Map();
  private configs: Map<string, ServerConfig> = new Map();
  private sigkillTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private listeners: EventListenerRegistry = new EventListenerRegistry();

  /**
   * Start a server process with health checking
   * @param serverType - Server identifier (e.g., 'frontend', 'backend', 'mcp')
   * @param projectRoot - Root directory for the process
   * @param config - Server configuration
   */
  async start(serverType: string, projectRoot: string, config: ServerConfig): Promise<void> {
    if (this.processes.has(serverType)) {
      throw new TestFrameworkError(`Server ${serverType} is already running`, 'SERVER_ALREADY_RUNNING');
    }

    this.configs.set(serverType, config);

    try {
      const child = spawn(config.command, config.args, {
        cwd: projectRoot,
        env: { ...process.env, ...config.env },
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.processes.set(serverType, child);
      config.pid = child.pid;
      config.state = 'starting';

      // Create event handlers for process lifecycle tracking
      const stdoutHandler = (d: Buffer) => {
        // Optionally log: console.debug(`[${serverType}] ${d.toString().trim()}`);
      };
      const stderrHandler = (d: Buffer) => {
        // Optionally log: console.error(`[${serverType}] ${d.toString().trim()}`);
      };
      const exitHandler = (code: number | null, signal: NodeJS.Signals | null) => {
        // Optionally log: console.warn(`Server ${serverType} exited with code ${code}, signal ${signal}`);
        this.processes.delete(serverType);
        const serverConfig = this.configs.get(serverType);
        if (serverConfig) {
          serverConfig.state = 'stopped';
          serverConfig.pid = undefined;
        }
        // Clean up listeners when process exits naturally
        this.listeners.cleanup(serverType, child);
      };

      // Attach event listeners via EventListenerRegistry
      this.listeners.register(serverType, child, stdoutHandler, stderrHandler, exitHandler);

      await this.waitForHealthCheck(serverType);
      config.state = 'running';

    } catch (error) {
      this.processes.delete(serverType);
      config.state = 'error';
      throw new ServerStartupError(
        `Failed to start ${serverType} server: ${error instanceof Error ? error.message : String(error)}`,
        serverType
      );
    }
  }

  /**
   * Stop a server process with graceful shutdown
   * @param serverType - Server identifier
   */
  async stop(serverType: string): Promise<void> {
    const process = this.processes.get(serverType);
    const config = this.configs.get(serverType);

    if (!process && !config) return;

    try {
      if (config) {
        config.state = 'stopping';
      }

      // Clear any pending SIGKILL timeout
      const sigkillTimeout = this.sigkillTimeouts.get(serverType);
      if (sigkillTimeout) {
        clearTimeout(sigkillTimeout);
        this.sigkillTimeouts.delete(serverType);
      }

      if (process) {
        // Remove event listeners before killing process
        this.listeners.cleanup(serverType, process);

        // Close stdin/stdout/stderr streams to prevent hanging
        if (process.stdin && !process.stdin.destroyed) {
          process.stdin.end();
          process.stdin.destroy();
        }
        if (process.stdout && !process.stdout.destroyed) {
          process.stdout.destroy();
        }
        if (process.stderr && !process.stderr.destroyed) {
          process.stderr.destroy();
        }

        // Disconnect IPC channel if present
        if (typeof process.disconnect === 'function') {
          process.disconnect();
        }

        // Use tree-kill to kill the entire process tree
        if (process.pid) {
          const pid = process.pid;

          // Set up the exit listener before sending kill signal
          const exitPromise = this.waitForProcessExit(process);

          // Send SIGTERM to entire process tree
          await new Promise<void>((resolve) => {
            treeKill(pid, 'SIGTERM', (err) => {
              if (err) {
                treeKill(pid, 'SIGKILL', () => resolve());
              } else {
                resolve();
              }
            });
          });

          // Wait for the process to actually exit
          await exitPromise;
        }

        // Clean up the SIGKILL timeout after process exits
        const storedTimeout = this.sigkillTimeouts.get(serverType);
        if (storedTimeout) {
          clearTimeout(storedTimeout);
          this.sigkillTimeouts.delete(serverType);
        }
      }
    } catch (error) {
      console.error(`Error stopping ${serverType} server:`, error);
    } finally {
      this.processes.delete(serverType);
      // Clean up any remaining event listeners and timers
      const processRef = this.processes.get(serverType);
      if (processRef) {
        this.listeners.cleanup(serverType, processRef);
      }
      const sigkillTimeout = this.sigkillTimeouts.get(serverType);
      if (sigkillTimeout) {
        clearTimeout(sigkillTimeout);
        this.sigkillTimeouts.delete(serverType);
      }
      if (config) {
        config.state = 'stopped';
        config.pid = undefined;
      }
    }
  }

  /**
   * Stop all running servers
   */
  async stopAll(): Promise<void> {
    const servers = Array.from(this.processes.keys());
    await Promise.allSettled(servers.map(type => this.stop(type)));
  }

  /**
   * Check if a server is ready and responding
   * @param serverType - Server identifier
   */
  async isReady(serverType: string): Promise<boolean> {
    const config = this.configs.get(serverType);
    if (!config || config.state !== 'running') return false;

    try {
      await this.performHealthCheck(config);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get server configuration
   * @param serverType - Server identifier
   */
  getConfig(serverType: string): ServerConfig | undefined {
    return this.configs.get(serverType);
  }

  /**
   * Get server process
   * @param serverType - Server identifier
   */
  getProcess(serverType: string): ChildProcess | undefined {
    return this.processes.get(serverType);
  }

  /**
   * Wait for server health check with exponential backoff
   * @param serverType - Server identifier
   */
  private async waitForHealthCheck(serverType: string): Promise<void> {
    const config = this.configs.get(serverType);
    if (!config?.healthEndpoint) {
      throw new TestFrameworkError(`No health endpoint configured for ${serverType}`, 'NO_HEALTH_ENDPOINT');
    }

    let delay = HEALTH.initialDelay;

    for (let attempt = 1; attempt <= HEALTH.maxAttempts; attempt++) {
      try {
        await this.performHealthCheck(config);
        return;
      } catch (error) {
        if (attempt === HEALTH.maxAttempts) {
          throw new TestFrameworkError(
            `Health check failed for ${serverType} after ${attempt} attempts: ${error instanceof Error ? error.message : String(error)}`,
            'HEALTH_CHECK_FAILED'
          );
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * HEALTH.backoffMultiplier, HEALTH.maxDelay);
      }
    }
  }

  /**
   * Perform health check against server endpoint
   * @param config - Server configuration containing health endpoint details
   */
  private async performHealthCheck(config: ServerConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const http = require('http');
      const req = http.request(
        { hostname: 'localhost', port: config.port, path: config.healthEndpoint, method: 'GET', timeout: 1000 },
        (res: any) => {
          // Consume and destroy the response to ensure the socket is closed
          res.on('data', () => {});
          res.on('end', () => {
            res.destroy();
            req.destroy();
            if (res.statusCode === 200) {
              resolve();
            } else {
              reject(new Error(`HTTP ${res.statusCode}`));
            }
          });
        }
      );
      req.on('error', (err: Error) => {
        req.destroy();
        reject(err);
      });
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
      req.end();
    });
  }

  /**
   * Wait for process to exit
   * @param process - Child process to wait for
   */
  private async waitForProcessExit(process: ChildProcess | undefined): Promise<void> {
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
      }, 6000);
    });
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.listeners.clear();
    this.processes.clear();
    this.configs.clear();
    this.sigkillTimeouts.forEach(timeout => clearTimeout(timeout));
    this.sigkillTimeouts.clear();
  }
}
