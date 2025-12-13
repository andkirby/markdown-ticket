/**
 * MCP Transport Implementations
 *
 * Separates transport-specific logic from the main MCP client
 */

import { spawn, ChildProcess } from 'child_process';
import { TestEnvironment } from './test-environment';

export interface MCPTransport {
  start(): Promise<void>;
  stop(): Promise<void>;
  isConnected(): boolean;
}

export class StdioTransport implements MCPTransport {
  private process?: ChildProcess;
  private connected = false;

  constructor(private testEnv: TestEnvironment) {}

  /**
   * Get the spawned server process
   */
  getProcess(): ChildProcess {
    if (!this.process) {
      throw new Error('Transport not started');
    }
    return this.process;
  }

  async start(): Promise<void> {
    // Use built server for tests to avoid module caching issues
    const serverScript = 'dist/index.js';

    this.process = spawn('node', [serverScript], {
      cwd: this.testEnv.getProjectRoot(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MCP_HTTP_ENABLED: 'false',  // Ensure only stdio is enabled
        NODE_ENV: 'test',
        // Pass the test config directory to MCP server
        CONFIG_DIR: this.testEnv.getConfigDir()
      }
    });

    await this.waitForStart();
    this.connected = true;
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = undefined;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.process !== undefined;
  }

  private waitForStart(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Stdio transport start timeout'));
      }, 5000);

      if (!this.process) {
        clearTimeout(timeout);
        reject(new Error('Process not initialized'));
        return;
      }

      this.process.on('spawn', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.process.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }
}

export class HttpTransport implements MCPTransport {
  private process?: ChildProcess;
  private connected = false;
  private readonly port = 3002;

  constructor(private testEnv: TestEnvironment) {}

  async start(): Promise<void> {
    // Use built server for tests to avoid module caching issues
    const serverScript = 'dist/index.js';

    this.process = spawn('node', [serverScript], {
      cwd: this.testEnv.getProjectRoot(),
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MCP_HTTP_ENABLED: 'true',
        MCP_HTTP_PORT: this.port.toString(),
        NODE_ENV: 'test',
        // Pass the test config directory to MCP server
        CONFIG_DIR: this.testEnv.getConfigDir()
      }
    });

    await this.waitForStart();
    this.connected = true;
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = undefined;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.process !== undefined;
  }

  private waitForStart(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('HTTP transport start timeout'));
      }, 5000);

      if (!this.process) {
        clearTimeout(timeout);
        reject(new Error('Process not initialized'));
        return;
      }

      this.process.on('spawn', () => {
        // Wait a bit more for HTTP server to be ready
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            clearTimeout(timeout);
            resolve();
          } else {
            reject(new Error('Server process failed to start'));
          }
        }, 1000);
      });

      this.process.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  getBaseUrl(): string {
    return `http://localhost:${this.port}`;
  }
}