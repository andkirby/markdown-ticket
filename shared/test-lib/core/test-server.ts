/**
 * Test Server Manager for MDT-092
 *
 * Manages frontend, backend, and MCP server lifecycles with health checks,
 * retry logic with exponential backoff, and graceful shutdown handling.
 */

import { spawn, ChildProcess } from 'child_process';
import treeKill from 'tree-kill';
import { ServerConfig, ServerStartupError, TestFrameworkError } from '../types.js';
import { PortConfig } from '../config/ports.js';

// Default health check configuration
const HEALTH = { maxAttempts: 30, initialDelay: 100, maxDelay: 2000, backoffMultiplier: 1.5 };

/**
 * Manages server processes for isolated test environments
 */
export class TestServer {
  private processes: Map<string, ChildProcess> = new Map();
  private configs: Map<string, ServerConfig> = new Map();
  private healthServers: Map<string, any> = new Map();
  private ports: PortConfig;

  // Track event listeners for proper cleanup
  private stdoutHandlers: Map<string, (data: Buffer) => void> = new Map();
  private stderrHandlers: Map<string, (data: Buffer) => void> = new Map();
  private exitHandlers: Map<string, (code: number | null, signal: NodeJS.Signals | null) => void> = new Map();
  private sigkillTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(ports: PortConfig) {
    this.ports = ports;
  }

  /** Start a server process with health checking */
  async start(serverType: 'frontend' | 'backend' | 'mcp', projectRoot: string): Promise<void> {
    if (this.processes.has(serverType)) {
      throw new TestFrameworkError(`Server ${serverType} is already running`, 'SERVER_ALREADY_RUNNING');
    }

    const config = this.createServerConfig(serverType, projectRoot);
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

      // Create and store event handler references for cleanup
      const stdoutHandler = (d: Buffer) => {
        // Optionally log: console.debug(`[${serverType}] ${d.toString().trim()}`);
      };
      const stderrHandler = (d: Buffer) => {
        // Optionally log: console.error(`[${serverType}] ${d.toString().trim()}`);
      };
      const exitHandler = (code: number | null, signal: NodeJS.Signals | null) => {
        // Optionally log: console.warn(`Server ${serverType} exited with code ${code}, signal ${signal}`);
        this.processes.delete(serverType);
        config.state = 'stopped';
        config.pid = undefined;
        // Clean up handlers when process exits naturally
        this.cleanupEventListeners(serverType);
      };

      // Attach event listeners
      child.stdout?.on('data', stdoutHandler);
      child.stderr?.on('data', stderrHandler);
      child.on('exit', exitHandler);

      // Store references for cleanup
      this.stdoutHandlers.set(serverType, stdoutHandler);
      this.stderrHandlers.set(serverType, stderrHandler);
      this.exitHandlers.set(serverType, exitHandler);

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

  /** Stop a server process with graceful shutdown */
  async stop(serverType: 'frontend' | 'backend' | 'mcp'): Promise<void> {
    const process = this.processes.get(serverType);
    const config = this.configs.get(serverType);
    const healthServer = this.healthServers.get(serverType);

    if (!process && !config) return;

    try {
      config!.state = 'stopping';

      if (healthServer) {
        healthServer.close();
        this.healthServers.delete(serverType);
      }

      // Clear any pending SIGKILL timeout
      const sigkillTimeout = this.sigkillTimeouts.get(serverType);
      if (sigkillTimeout) {
        clearTimeout(sigkillTimeout);
        this.sigkillTimeouts.delete(serverType);
      }

      if (process) {
        // Remove event listeners before killing process
        this.cleanupEventListeners(serverType);

        // Close stdin/stdout/stderr streams to prevent hanging
        // Note: We remove listeners first, so destroying streams won't cause issues
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

        // Disconnect IPC channel if present (only for IPC-enabled processes)
        if (typeof process.disconnect === 'function') {
          process.disconnect();
        }

        // console.debug(`[${serverType}] Killing process tree for PID ${process.pid}`);

        // Use tree-kill to kill the entire process tree (npm -> tsx -> node)
        // This ensures child processes like nodemon/tsx don't linger
        if (process.pid) {
          const pid = process.pid;

          // First, set up the exit listener before sending kill signal
          const exitPromise = this.waitForProcessExit(process);

          // Send SIGTERM to entire process tree
          await new Promise<void>((resolve) => {
            treeKill(pid, 'SIGTERM', (err) => {
              if (err) {
                // console.debug(`[${serverType}] tree-kill SIGTERM failed, trying SIGKILL: ${err.message}`);
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
      this.cleanupEventListeners(serverType);
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

  /** Stop all running servers */
  async stopAll(): Promise<void> {
    const servers = Array.from(this.processes.keys());
    await Promise.allSettled(
      servers.map(type => this.stop(type as 'frontend' | 'backend' | 'mcp'))
    );
  }

  /** Clean up event listeners for a specific server */
  private cleanupEventListeners(serverType: string): void {
    const process = this.processes.get(serverType);
    if (!process) return;

    // Remove stdout handler
    const stdoutHandler = this.stdoutHandlers.get(serverType);
    if (process.stdout && stdoutHandler) {
      process.stdout.off('data', stdoutHandler);
      this.stdoutHandlers.delete(serverType);
    }

    // Remove stderr handler
    const stderrHandler = this.stderrHandlers.get(serverType);
    if (process.stderr && stderrHandler) {
      process.stderr.off('data', stderrHandler);
      this.stderrHandlers.delete(serverType);
    }

    // Remove exit handler
    const exitHandler = this.exitHandlers.get(serverType);
    if (exitHandler) {
      process.off('exit', exitHandler);
      this.exitHandlers.delete(serverType);
    }
  }

  /** Check if a server is ready and responding */
  async isReady(serverType: 'frontend' | 'backend' | 'mcp'): Promise<boolean> {
    const config = this.configs.get(serverType);
    if (!config || config.state !== 'running') return false;

    try {
      await this.performHealthCheck(config);
      return true;
    } catch {
      return false;
    }
  }

  /** Get server configuration */
  getConfig(serverType: 'frontend' | 'backend' | 'mcp'): ServerConfig | undefined {
    return this.configs.get(serverType);
  }

  /** Get server URL */
  getUrl(serverType: 'frontend' | 'backend' | 'mcp'): string {
    const config = this.configs.get(serverType);
    if (!config?.url) {
      throw new TestFrameworkError(`Server ${serverType} not configured`, 'SERVER_NOT_CONFIGURED');
    }
    return config.url;
  }

  /** Create server configuration based on type */
  private createServerConfig(serverType: 'frontend' | 'backend' | 'mcp', projectRoot: string): ServerConfig {
    const port = this.ports[serverType];
    const base = { port, command: 'npm', state: 'stopped' as const };

    // Get CONFIG_DIR from current process.env (set by TestEnvironment.setup())
    // This ensures the child process uses the isolated test config directory
    const configDir = process.env.CONFIG_DIR;

    switch (serverType) {
      case 'frontend':
        return { ...base, type: 'frontend', args: ['run', 'dev'], env: { PORT: port.toString() }, url: `http://localhost:${port}`, healthEndpoint: '/' };
      case 'backend':
        return {
          ...base,
          type: 'backend',
          args: ['run', 'dev:server'],
          env: {
            PORT: port.toString(),
            ...(configDir && { CONFIG_DIR: configDir }), // Pass CONFIG_DIR to child process
          },
          url: `http://localhost:${port}`,
          healthEndpoint: '/api/status'
        };
      case 'mcp':
        return {
          ...base,
          type: 'mcp',
          args: ['run', 'dev'],
          env: {
            MCP_HTTP_ENABLED: 'true',
            MCP_HTTP_PORT: port.toString(),
            MCP_BIND_ADDRESS: '127.0.0.1',
            ...(configDir && { CONFIG_DIR: configDir }) // Pass CONFIG_DIR to child process
          },
          url: `http://localhost:${port}/mcp`,
          healthEndpoint: '/health'
        };
      default:
        throw new TestFrameworkError(`Unknown server type: ${serverType}`, 'UNKNOWN_SERVER_TYPE');
    }
  }

  /** Wait for server health check with exponential backoff */
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

  /** Perform health check against server endpoint */
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
            req.destroy(); // Also destroy the request
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

  /** Wait for process to exit */
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
        // console.debug(`Process ${process.pid} exited with code: ${process.exitCode}`);
        cleanup();
        resolve();
      };
      const onError = () => {
        // console.debug(`Process ${process.pid} error`);
        cleanup();
        resolve();
      };
      process.once('exit', onExit);
      process.once('error', onError);
      timeoutId = setTimeout(() => {
        // console.debug(`Process ${process.pid} exit timeout`);
        cleanup();
        resolve();
      }, 6000);
    });
  }
}