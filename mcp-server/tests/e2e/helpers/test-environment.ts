/**
 * Test Environment Helper
 *
 * Provides isolated temporary directories for E2E testing
 * with proper cleanup mechanisms for both Windows and Unix systems
 *
 * Features:
 * - Creates unique temporary directories for each test run
 * - Provides isolated config directories for MCP server testing
 * - Automatic cleanup of all temporary files
 * - Cross-platform path handling (Windows/Unix)
 * - Project structure creation with directories and files
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

export interface ProjectStructure {
  [key: string]: boolean | string; // Directory (true) or file content (string)
}

/**
 * Error thrown when test environment operations fail
 */
export class TestEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TestEnvironmentError';
  }
}

export class TestEnvironment {
  private tempDir: string | null = null;
  private configDir: string | null = null;
  private projectDirs: Map<string, string> = new Map();
  private isSetup = false;

  /**
   * Set up the test environment with temporary directories
   * @throws {TestEnvironmentError} If setup fails or already initialized
   */
  async setup(): Promise<void> {
    if (this.isSetup) {
      throw new TestEnvironmentError('Test environment already setup. Cannot setup twice.');
    }

    try {
      // Create unique temporary directory
      const tempBase = tmpdir();
      const uniqueId = randomUUID();
      this.tempDir = join(tempBase, `mcp-test-${uniqueId}`);

      // Create temp directory
      mkdirSync(this.tempDir, { recursive: true });

      // Verify directory was created
      if (!existsSync(this.tempDir)) {
        throw new TestEnvironmentError(`Failed to create temporary directory: ${this.tempDir}`);
      }

      // Create config directory within temp
      this.configDir = join(this.tempDir, 'config');
      mkdirSync(this.configDir, { recursive: true });

      // Verify config directory was created
      if (!existsSync(this.configDir)) {
        throw new TestEnvironmentError(`Failed to create config directory: ${this.configDir}`);
      }

      this.isSetup = true;

    // Set CONFIG_DIR environment variable for MCP server
    process.env.CONFIG_DIR = this.configDir!;
  } catch (error) {
      // Cleanup on failure
      await this.cleanup();
      if (error instanceof TestEnvironmentError) {
        throw error;
      }
      throw new TestEnvironmentError(`Setup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the temporary directory path
   * @throws {TestEnvironmentError} If environment not initialized
   */
  getTempDir(): string {
    if (!this.tempDir || !this.isSetup) {
      throw new TestEnvironmentError('Test environment not initialized. Call setup() first.');
    }
    return this.tempDir;
  }

  /**
   * Get the config directory path
   * @throws {TestEnvironmentError} If environment not initialized
   */
  getConfigDir(): string {
    if (!this.configDir || !this.isSetup) {
      throw new TestEnvironmentError('Test environment not initialized. Call setup() first.');
    }
    return this.configDir;
  }

  /**
   * Create a project directory within the temp environment
   * @param projectName - Name of the project directory
   * @returns Absolute path to the project directory
   * @throws {TestEnvironmentError} If environment not initialized or directory creation fails
   */
  createProjectDir(projectName: string): string {
    if (!this.isSetup) {
      throw new TestEnvironmentError('Test environment not initialized. Call setup() first.');
    }

    // Validate project name
    if (!projectName || projectName.trim().length === 0) {
      throw new TestEnvironmentError('Project name cannot be empty');
    }

    // Sanitize project name for cross-platform compatibility
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');

    try {
      const projectDir = join(this.tempDir!, 'projects', sanitizedName);
      mkdirSync(projectDir, { recursive: true });

      // Verify directory was created
      if (!existsSync(projectDir)) {
        throw new TestEnvironmentError(`Failed to create project directory: ${projectDir}`);
      }

      // Store reference for cleanup
      this.projectDirs.set(projectName, projectDir);

      return projectDir;
    } catch (error) {
      if (error instanceof TestEnvironmentError) {
        throw error;
      }
      throw new TestEnvironmentError(`Failed to create project directory: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a project structure with directories and files
   * @param projectName - Name of the project
   * @param structure - Object defining directories (true) and files (content string)
   * @throws {TestEnvironmentError} If structure creation fails
   */
  createProjectStructure(projectName: string, structure: ProjectStructure): void {
    if (!this.isSetup) {
      throw new TestEnvironmentError('Test environment not initialized. Call setup() first.');
    }

    if (!structure || typeof structure !== 'object') {
      throw new TestEnvironmentError('Project structure must be a valid object');
    }

    try {
      const projectDir = this.projectDirs.get(projectName) || this.createProjectDir(projectName);

      for (const [path, value] of Object.entries(structure)) {
        // Validate path
        if (!path || typeof path !== 'string') {
          throw new TestEnvironmentError(`Invalid path in structure: ${path}`);
        }

        const fullPath = join(projectDir, path);

        if (value === true) {
          // It's a directory
          mkdirSync(fullPath, { recursive: true });

          // Verify directory was created
          if (!existsSync(fullPath)) {
            throw new TestEnvironmentError(`Failed to create directory: ${fullPath}`);
          }
        } else if (typeof value === 'string') {
          // It's a file - create parent directories if needed
          const parentDir = resolve(fullPath, '..');
          mkdirSync(parentDir, { recursive: true });

          writeFileSync(fullPath, value, 'utf8');

          // Verify file was created
          if (!existsSync(fullPath)) {
            throw new TestEnvironmentError(`Failed to create file: ${fullPath}`);
          }
        } else {
          throw new TestEnvironmentError(`Invalid value for path "${path}". Expected true for directory or string for file content.`);
        }
      }
    } catch (error) {
      if (error instanceof TestEnvironmentError) {
        throw error;
      }
      throw new TestEnvironmentError(`Failed to create project structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up all temporary files and directories
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanup(): Promise<void> {
    if (this.tempDir && existsSync(this.tempDir)) {
      try {
        // Verify we're in a temp directory before deleting (safety check)
        const tempDirStat = statSync(this.tempDir);
        if (!tempDirStat.isDirectory()) {
          throw new TestEnvironmentError(`Temp path is not a directory: ${this.tempDir}`);
        }

        // Additional safety check: ensure we're deleting within the system temp directory
        const systemTempDir = tmpdir();
        if (!this.tempDir.startsWith(systemTempDir)) {
          throw new TestEnvironmentError(`Refusing to delete outside system temp directory: ${this.tempDir}`);
        }

        // Remove temporary directory and all its contents
        rmSync(this.tempDir, { recursive: true, force: true, maxRetries: 3 });

        // Verify cleanup succeeded
        if (existsSync(this.tempDir)) {
          throw new TestEnvironmentError(`Failed to completely remove temporary directory: ${this.tempDir}`);
        }
      } catch (error) {
        // Log error but don't throw - cleanup failures shouldn't crash tests
        console.error('Test environment cleanup failed:', error instanceof Error ? error.message : String(error));
      } finally {
        // Always reset state
        this.tempDir = null;
        this.configDir = null;
        this.isSetup = false;
        this.projectDirs.clear();
      }
    }
  }

  /**
   * Get the project root directory (the mcp-server directory)
   * @returns Absolute path to the project root
   */
  getProjectRoot(): string {
    // Assuming tests are run from the mcp-server directory
    return process.cwd();
  }

  /**
   * Check if the test environment is properly initialized
   * @returns True if setup has been called successfully
   */
  isInitialized(): boolean {
    return this.isSetup && this.tempDir !== null && this.configDir !== null;
  }
}