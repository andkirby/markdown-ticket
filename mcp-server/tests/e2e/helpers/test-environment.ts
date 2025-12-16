/**
 * Test Environment Helper - Facade
 *
 * This is a facade that maintains backward compatibility for existing tests.
 * The actual implementation is now in shared/test-lib.
 *
 * New tests should import directly from '@mdt/shared/test-lib':
 * import { TestEnvironment } from '@mdt/shared/test-lib';
 */

import { TestEnvironment as SharedTestEnvironment } from '@mdt/shared/test-lib';
import { existsSync, mkdirSync, rmSync, writeFileSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';


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
  private sharedTestEnv: SharedTestEnvironment;
  private projectDirs: Map<string, string> = new Map();

  constructor() {
    this.sharedTestEnv = new SharedTestEnvironment();
  }

  /**
   * Set up the test environment with temporary directories
   * @throws {TestEnvironmentError} If setup fails or already initialized
   */
  async setup(): Promise<void> {
    try {
      await this.sharedTestEnv.setup();
    } catch (error) {
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
    try {
      return this.sharedTestEnv.getTempDirectory();
    } catch (error) {
      throw new TestEnvironmentError(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get the config directory path
   * @throws {TestEnvironmentError} If environment not initialized
   */
  getConfigDir(): string {
    try {
      return this.sharedTestEnv.getConfigDirectory();
    } catch (error) {
      throw new TestEnvironmentError(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Get the project root directory
   * @returns Absolute path to the project root
   */
  getProjectRoot(): string {
    // Assuming tests are run from the mcp-server directory
    return process.cwd();
  }

  /**
   * Create a project directory within the temp environment
   * @param projectName - Name of the project directory
   * @returns Absolute path to the project directory
   * @throws {TestEnvironmentError} If environment not initialized or directory creation fails
   */
  createProjectDir(projectName: string): string {
    if (!this.isInitialized()) {
      throw new TestEnvironmentError('Test environment not initialized. Call setup() first.');
    }

    // Validate project name
    if (!projectName || projectName.trim().length === 0) {
      throw new TestEnvironmentError('Project name cannot be empty');
    }

    // Sanitize project name for cross-platform compatibility
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');

    try {
      const projectDir = join(this.getTempDir(), 'projects', sanitizedName);
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
    if (!this.isInitialized()) {
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
    try {
      await this.sharedTestEnv.cleanup();
      this.projectDirs.clear();
    } catch (error) {
      // Log error but don't throw - cleanup failures shouldn't crash tests
      console.error('Test environment cleanup failed:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Check if the test environment is properly initialized
   * @returns True if setup has been called successfully
   */
  isInitialized(): boolean {
    return this.sharedTestEnv.isInitialized();
  }
}