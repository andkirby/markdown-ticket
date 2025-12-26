/**
 * Test Server Manager for MDT-092
 *
 * Manages frontend, backend, and MCP server lifecycles with health checks,
 * retry logic with exponential backoff, and graceful shutdown handling.
 */

import { spawn, ChildProcess } from 'child_process';
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

      // Logging
      child.stdout?.on('data', (d) => console.debug(`[${serverType}] ${d.toString().trim()}`));
      child.stderr?.on('data', (d) => console.error(`[${serverType}] ${d.toString().trim()}`));

      // Handle process exit
      child.on('exit', (code, signal) => {
        console.warn(`Server ${serverType} exited with code ${code}, signal ${signal}`);
        this.processes.delete(serverType);
        config.state = 'stopped';
        config.pid = undefined;
      });

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

      if (process) {
        process.kill('SIGTERM');
        setTimeout(() => process && !process.killed && process.kill('SIGKILL'), 5000);
        await this.waitForProcessExit(process);
      }
    } catch (error) {
      console.error(`Error stopping ${serverType} server:`, error);
    } finally {
      this.processes.delete(serverType);
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
          healthEndpoint: '/api/health'
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
        (res: any) => res.statusCode === 200 ? resolve() : reject(new Error(`HTTP ${res.statusCode}`))
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Health check timeout')); });
      req.end();
    });
  }

  /** Wait for process to exit */
  private async waitForProcessExit(process: ChildProcess | undefined): Promise<void> {
    if (!process || process.killed) return;

    return new Promise((resolve) => {
      const cleanup = () => { process.off('exit', onExit); process.off('error', onError); };
      const onExit = () => { cleanup(); resolve(); };
      const onError = () => { cleanup(); resolve(); };
      process.once('exit', onExit);
      process.once('error', onError);
      setTimeout(() => { cleanup(); resolve(); }, 6000);
    });
  }
}