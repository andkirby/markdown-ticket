/**
 * API Test Setup - MDT-106
 *
 * Provides test environment lifecycle management for API integration tests.
 * Uses the shared test-lib infrastructure for isolated test environments.
 *
 * KEY: Sets CONFIG_DIR environment variable BEFORE importing the Express app
 * to ensure services use the test configuration directory.
 */

import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Express } from 'express';

/**
 * Test environment context returned from setup
 */
export interface TestContext {
  tempDir: string;
  configDir: string;
  app: Express;
  projectFactory: any; // ProjectFactory from shared/test-lib
}

// Global cache (shared across all test runs)
let cachedApp: Express | null = null;
let cachedConfigDir: string | null = null;

/**
 * Setup test environment with isolated temporary directory and Express app
 *
 * IMPORTANT: This function must be called BEFORE each test suite to ensure
 * proper isolation. The CONFIG_DIR is set before creating the Express app.
 *
 * @returns TestContext with temp directory, configured Express app, and project factory
 */
export async function setupTestEnvironment(): Promise<TestContext> {
  // 1. Create temporary directory for test isolation
  const tempDir = mkdtempSync(join(tmpdir(), 'mdt-test-'));
  const configDir = join(tempDir, 'config');
  mkdirSync(configDir, { recursive: true });

  // 2. Create projects subdirectory in config (required by ProjectRegistry)
  const projectsRegistryDir = join(configDir, 'projects');
  mkdirSync(projectsRegistryDir, { recursive: true });

  // 3. CRITICAL: Set CONFIG_DIR environment variable BEFORE creating the app
  // This ensures all services use the test configuration directory
  process.env.CONFIG_DIR = configDir;

  // 4. Create the Express app
  // If we already have an app with the same config dir, reuse it
  // Otherwise, create a new one (which will pick up the new CONFIG_DIR)
  let app: Express;
  if (cachedApp && cachedConfigDir === configDir) {
    app = cachedApp;
  } else {
    // Clear the cache if config dir changed
    cachedApp = null;

    // Import test-app-factory which will import server.ts with the new CONFIG_DIR
    const { createTestApp: createApp } = await import('./test-app-factory');
    app = createApp();

    // Only cache if we successfully created an app
    cachedApp = app;
    cachedConfigDir = configDir;
  }

  // 5. Import and initialize ProjectFactory from shared/test-lib
  const { TestEnvironment, ProjectFactory } = await import('@mdt/shared/test-lib');

  // Create a test environment (for port management and cleanup)
  const testEnv = new TestEnvironment();
  await testEnv.setup();

  // Create project factory for creating test projects and CRs
  const projectFactory = new ProjectFactory(testEnv);

  return {
    tempDir,
    configDir,
    app,
    projectFactory,
  };
}

/**
 * Cleanup test environment after tests complete
 *
 * @param tempDir - Temporary directory to remove
 */
export async function cleanupTestEnvironment(tempDir: string): Promise<void> {
  if (existsSync(tempDir) && tempDir.startsWith(tmpdir())) {
    rmSync(tempDir, { recursive: true, force: true });
  }
  // Don't delete process.env.CONFIG_DIR as it may affect other tests
  // The next setupTestEnvironment call will set it to the new temp dir
}

/**
 * Create a test project with a CR for API testing
 */
export async function createTestProjectWithCR(
  projectFactory: any,
  projectConfig?: { name?: string; code?: string }
): Promise<{ projectCode: string; crCode: string }> {
  const project = await projectFactory.createProject('empty', projectConfig);

  const crResult = await projectFactory.createTestCR(project.key, {
    title: 'Test CR for API Testing',
    type: 'Feature Enhancement',
    content: 'Test content for API integration testing',
  });

  if (!crResult.success) {
    throw new Error(`Failed to create test CR: ${crResult.error}`);
  }

  return {
    projectCode: project.key,
    crCode: crResult.crCode!,
  };
}

/**
 * Reset the test setup cache (useful for testing multiple isolated scenarios)
 */
export function resetTestSetupCache(): void {
  cachedApp = null;
  cachedConfigDir = null;
}
