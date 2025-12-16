/**
 * Test Environment Manager for MDT-092
 *
 * Provides isolated test sessions with unique temporary directories,
 * port allocation, and resource cleanup for testing with custom ports.
 */

import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { TestEnvironment as ITestEnvironment, TestFrameworkError } from '../types.js';
import { getPortConfig, validatePortConfig } from '../config/ports.js';

/**
 * Manages isolated test environments with unique temporary directories
 * and port configurations for MDT-092 testing framework
 */
export class TestEnvironment {
  private _id: string;
  private _tempDir: string | null = null;
  private _configDir: string | null = null;
  private _isInitialized = false;
  private _createdAt: Date;
  private _ports: ReturnType<typeof getPortConfig>;
  private _cleanupHandlers: Array<() => Promise<void>> = [];

  constructor() {
    this._id = randomUUID();
    this._createdAt = new Date();
    this._ports = getPortConfig();
    this.setupExitHandlers();
  }

  /** Initialize the test environment with temporary directories */
  async setup(): Promise<void> {
    if (this._isInitialized) {
      throw new TestFrameworkError('Test environment already initialized', 'ENV_ALREADY_SETUP');
    }

    try {
      validatePortConfig(this._ports);

      const tempBase = tmpdir();
      this._tempDir = join(tempBase, `mdt-test-${this._id}`);
      mkdirSync(this._tempDir, { recursive: true });

      if (!existsSync(this._tempDir)) {
        throw new TestFrameworkError(`Failed to create temporary directory: ${this._tempDir}`, 'TEMP_DIR_CREATE_FAILED');
      }

      this._configDir = join(this._tempDir, 'config');
      mkdirSync(this._configDir, { recursive: true });

      if (!existsSync(this._configDir)) {
        throw new TestFrameworkError(`Failed to create config directory: ${this._configDir}`, 'CONFIG_DIR_CREATE_FAILED');
      }

      process.env.CONFIG_DIR = this._configDir!;
      this._isInitialized = true;
    } catch (error) {
      await this.cleanup();
      if (error instanceof TestFrameworkError) throw error;
      throw new TestFrameworkError(`Setup failed: ${error instanceof Error ? error.message : String(error)}`, 'SETUP_FAILED');
    }
  }

  /** Get the test environment configuration */
  getEnvironment(): ITestEnvironment {
    if (!this._tempDir || !this._isInitialized) {
      throw new TestFrameworkError('Test environment not initialized. Call setup() first.', 'ENV_NOT_INITIALIZED');
    }

    return {
      id: this._id,
      tempDir: this._tempDir,
      ports: this._ports,
      isInitialized: this._isInitialized,
      createdAt: this._createdAt,
    };
  }

  /** Get the temporary directory path */
  getTempDirectory(): string {
    if (!this._tempDir || !this._isInitialized) {
      throw new TestFrameworkError('Test environment not initialized. Call setup() first.', 'ENV_NOT_INITIALIZED');
    }
    return this._tempDir;
  }

  /** Get the config directory path for MCP server */
  getConfigDirectory(): string {
    if (!this._configDir || !this._isInitialized) {
      throw new TestFrameworkError('Test environment not initialized. Call setup() first.', 'ENV_NOT_INITIALIZED');
    }
    return this._configDir;
  }

  /** Get the port configuration */
  getPortConfig() {
    return this._ports;
  }

  /** Get the unique test session ID */
  getId(): string {
    return this._id;
  }

  /** Register a cleanup handler */
  registerCleanupHandler(handler: () => Promise<void>): void {
    this._cleanupHandlers.push(handler);
  }

  /** Clean up all temporary files and directories */
  async cleanup(): Promise<void> {
    await Promise.allSettled(
      this._cleanupHandlers.map(async (handler) => {
        try { await handler(); } catch (error) { console.error('Cleanup handler failed:', error); }
      })
    );

    if (this._tempDir && existsSync(this._tempDir)) {
      try {
        const systemTempDir = tmpdir();
        if (!this._tempDir.startsWith(systemTempDir)) {
          throw new TestFrameworkError(`Refusing to delete outside system temp directory: ${this._tempDir}`, 'SAFETY_VIOLATION');
        }

        rmSync(this._tempDir, { recursive: true, force: true, maxRetries: 3 });

        if (existsSync(this._tempDir)) {
          console.warn(`Failed to completely remove temporary directory: ${this._tempDir}`);
        }
      } catch (error) {
        console.error('Test environment cleanup failed:', error instanceof Error ? error.message : String(error));
      } finally {
        this._tempDir = null;
        this._configDir = null;
        this._isInitialized = false;
        this._cleanupHandlers = [];
        delete process.env.CONFIG_DIR;
      }
    }
  }

  /** Setup exit handlers for cleanup on unexpected termination */
  private setupExitHandlers(): void {
    const cleanup = async () => {
      try { await this.cleanup(); } catch (error) { console.error('Error during emergency cleanup:', error); }
      process.exit(1);
    };

    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);
    process.once('SIGHUP', cleanup);
    process.once('uncaughtException', cleanup);
    process.once('unhandledRejection', cleanup);
  }

  /** Check if the test environment is properly initialized */
  isInitialized(): boolean {
    return this._isInitialized && this._tempDir !== null && this._configDir !== null && existsSync(this._tempDir);
  }
}