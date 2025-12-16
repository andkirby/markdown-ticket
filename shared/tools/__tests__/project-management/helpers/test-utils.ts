/**
 * Test utilities for project management CLI tests
 * Provides common fixtures, cleanup functions, and test helpers
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { parse as parseToml } from 'toml';

const execAsync = promisify(exec);

// Test fixtures
export const TEST_PROJECTS = {
  valid: {
    name: 'Test Project',
    code: 'TEST',
    path: '/tmp/mdt-test-project'
  },
  invalidCodes: {
    tooShort: 'T',
    tooLong: 'TEST123',
    withNumbers: 'T3ST',
    withSpecial: 'TEST-123'
  },
  invalidPaths: {
    nonExistent: '/tmp/does-not-exist-12345',
    permissionDenied: '/root/forbidden'
  }
} as const;

// Global registry path helper
export const getGlobalRegistryPath = (): string => {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '/tmp';
  return join(homeDir, '.config', 'markdown-ticket', 'projects');
};

// Cleanup utilities
export const cleanupTestProject = async (projectPath: string): Promise<void> => {
  if (existsSync(projectPath)) {
    rmSync(projectPath, { recursive: true, force: true });
  }
};

export const cleanupGlobalRegistryEntry = async (projectId: string): Promise<void> => {
  const registryPath = getGlobalRegistryPath();
  const configFile = join(registryPath, `${projectId}.toml`);

  if (existsSync(configFile)) {
    unlinkSync(configFile);
  }
};

export const cleanupAllTestProjects = async (): Promise<void> => {
  // Clean up test project directories
  for (const project of Object.values(TEST_PROJECTS)) {
    if ('path' in project) {
      await cleanupTestProject(project.path);
    }
  }

  // Clean up global registry test entries
  const registryPath = getGlobalRegistryPath();
  if (existsSync(registryPath)) {
    const testFiles = ['TEST.toml', 'TST.toml', 'INVALID.toml'];
    for (const file of testFiles) {
      const filePath = join(registryPath, file);
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    }
  }
};

// CLI execution helpers
export const runProjectCreate = async (flags: Record<string, string>): Promise<CLIRunnerResult> => {
  const flagString = Object.entries(flags)
    .map(([key, value]) => `--${key} "${value}"`)
    .join(' ');

  const command = `npm run project:create -- ${flagString}`;

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 5000,
      cwd: process.cwd()
    });

    return {
      success: true,
      stdout,
      stderr,
      exitCode: 0
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1
    };
  }
};

export const runProjectList = async (): Promise<CLIRunnerResult> => {
  const command = 'npm run project:list';

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 5000,
      cwd: process.cwd()
    });

    return {
      success: true,
      stdout,
      stderr,
      exitCode: 0
    };
  } catch (error: any) {
    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1
    };
  }
};

// Configuration file helpers
export const readLocalConfig = (projectPath: string): any => {
  const configFile = join(projectPath, '.mdt-config.toml');
  if (!existsSync(configFile)) {
    return null;
  }

  const content = readFileSync(configFile, 'utf-8');
  return parseToml(content);
};

export const readGlobalRegistryEntry = (projectId: string): any => {
  const configFile = join(getGlobalRegistryPath(), `${projectId}.toml`);
  if (!existsSync(configFile)) {
    return null;
  }

  const content = readFileSync(configFile, 'utf-8');
  return parseToml(content);
};

export const configHasRequiredFields = (config: any): boolean => {
  if (!config || !config.project) {
    return false;
  }

  const { project } = config;
  return !!(
    typeof project.name === 'string' &&
    typeof project.code === 'string' &&
    typeof project.id === 'string' &&
    typeof project.active === 'boolean'
  );
};

export const configHasValidCode = (code: string): boolean => {
  return /^[A-Z]{2,5}$/.test(code);
};


// Types
export interface CLIRunnerResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

// Project existence check
export const projectExists = (projectPath: string): boolean => {
  return existsSync(projectPath) && statSync(projectPath).isDirectory();
};

// Test timeout helper
export const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Test timed out after ${timeoutMs}ms`)), timeoutMs);
    })
  ]);
};