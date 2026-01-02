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

const EXIT_SIGNALS = ['SIGINT', 'SIGTERM', 'SIGHUP', 'uncaughtException', 'unhandledRejection'] as const;
const ERR_NOT_INIT = 'Test environment not initialized. Call setup() first.';

/** Manages isolated test environments with unique temporary directories and port configurations */
export class TestEnvironment {
  private _id: string;
  private _tempDir: string | null = null;
  private _configDir: string | null = null;
  private _isInitialized = false;
  private _createdAt: Date;
  private _ports: ReturnType<typeof getPortConfig>;
  private _cleanupHandlers: Array<() => Promise<void>> = [];
  private _exitHandler: (() => void) | null = null;

  constructor() {
    this._id = randomUUID();
    this._createdAt = new Date();
    this._ports = getPortConfig();
    this._setupExitHandlers();
  }

  /** Initialize the test environment with temporary directories */
  async setup(): Promise<void> {
    if (this._isInitialized) throw new TestFrameworkError('Test environment already initialized', 'ENV_ALREADY_SETUP');
    try {
      validatePortConfig(this._ports);
      const tempBase = tmpdir();
      this._tempDir = join(tempBase, `mdt-test-${this._id}`);
      this._configDir = join(this._tempDir, 'config');
      mkdirSync(this._tempDir, { recursive: true });
      if (!existsSync(this._tempDir)) throw new TestFrameworkError(`Failed to create temp directory: ${this._tempDir}`, 'TEMP_DIR_CREATE_FAILED');
      mkdirSync(this._configDir, { recursive: true });
      if (!existsSync(this._configDir)) throw new TestFrameworkError(`Failed to create config directory`, 'CONFIG_DIR_CREATE_FAILED');
      process.env.CONFIG_DIR = this._configDir;
      this._isInitialized = true;
    } catch (error) {
      await this.cleanup();
      if (error instanceof TestFrameworkError) throw error;
      throw new TestFrameworkError(`Setup failed: ${error instanceof Error ? error.message : String(error)}`, 'SETUP_FAILED');
    }
  }

  getEnvironment(): ITestEnvironment { this._ensureInitialized(); return { id: this._id, tempDir: this._tempDir!, ports: this._ports, isInitialized: this._isInitialized, createdAt: this._createdAt }; }
  getTempDirectory(): string { this._ensureInitialized(); return this._tempDir!; }
  getConfigDirectory(): string { this._ensureInitialized(); return this._configDir!; }
  getPortConfig() { return this._ports; }
  getId(): string { return this._id; }
  registerCleanupHandler(handler: () => Promise<void>): void { this._cleanupHandlers.push(handler); }
  isInitialized(): boolean { return this._isInitialized && this._tempDir !== null && this._configDir !== null && existsSync(this._tempDir); }

  /** Clean up all temporary files and directories */
  async cleanup(): Promise<void> {
    this._removeExitHandlers();
    await Promise.allSettled(this._cleanupHandlers.map(async (handler) => { try { await handler(); } catch (error) { console.error('Cleanup handler failed:', error); } }));
    if (!this._tempDir) return;
    try {
      const systemTempDir = tmpdir();
      if (!this._tempDir.startsWith(systemTempDir)) throw new TestFrameworkError(`Refusing to delete outside system temp directory: ${this._tempDir}`, 'SAFETY_VIOLATION');
      rmSync(this._tempDir, { recursive: true, force: true, maxRetries: 3 });
      if (existsSync(this._tempDir)) console.warn(`Failed to completely remove temporary directory: ${this._tempDir}`);
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

  private _ensureInitialized(): void { if (!this._tempDir || !this._isInitialized) throw new TestFrameworkError(ERR_NOT_INIT, 'ENV_NOT_INITIALIZED'); }
  private _setupExitHandlers(): void {
    this._exitHandler = async () => { try { await this.cleanup(); } catch (error) { console.error('Error during emergency cleanup:', error); } process.exit(1); };
    for (const signal of EXIT_SIGNALS) process.once(signal, this._exitHandler);
  }
  private _removeExitHandlers(): void { if (!this._exitHandler) return; for (const signal of EXIT_SIGNALS) process.removeListener(signal, this._exitHandler); this._exitHandler = null; }
}