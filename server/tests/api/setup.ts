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
import jestOpenAPI from 'jest-openapi';

// Initialize jest-openapi with OpenAPI spec (jest runs in CommonJS context)
const openApiSpecPath = join(__dirname, '../../openapi.yaml');

/** Initialize jest-openapi validator - also auto-called on module load */
function initJestOpenAPI(): void {
  jestOpenAPI(openApiSpecPath);
}
initJestOpenAPI();

/** Test environment context returned from setup */
export interface TestContext {
  tempDir: string;
  configDir: string;
  app: Express;
  testEnv: any; // TestEnvironment from shared/test-lib
  projectFactory: any; // ProjectFactory from shared/test-lib
}

// Global cache (shared across all test runs)
let cachedApp: Express | null = null;
let cachedConfigDir: string | null = null;

/**
 * Setup test environment with isolated temporary directory and Express app.
 * IMPORTANT: Call BEFORE each test suite to ensure proper isolation.
 * The CONFIG_DIR is set before creating the Express app.
 */
export async function setupTestEnvironment(): Promise<TestContext> {
  const tempDir = mkdtempSync(join(tmpdir(), 'mdt-test-'));
  const configDir = join(tempDir, 'config');
  mkdirSync(join(configDir, 'projects'), { recursive: true });

  // CRITICAL: Set CONFIG_DIR BEFORE creating the app
  process.env.CONFIG_DIR = configDir;

  let app: Express;
  if (cachedApp && cachedConfigDir === configDir) {
    app = cachedApp;
  } else {
    cachedApp = null;
    const { createTestApp: createApp } = await import('./test-app-factory');
    app = createApp();
    cachedApp = app;
    cachedConfigDir = configDir;
  }

  const { TestEnvironment, ProjectFactory } = await import('@mdt/shared/test-lib');
  const testEnv = new TestEnvironment();
  await testEnv.setup();
  const projectFactory = new ProjectFactory(testEnv);

  return { tempDir, configDir, app, testEnv, projectFactory };
}

/** Cleanup test environment after tests complete */
export async function cleanupTestEnvironment(tempDir: string): Promise<void> {
  if (existsSync(tempDir) && tempDir.startsWith(tmpdir())) {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

/** Create a test project with a CR for API testing */
export async function createTestProjectWithCR(
  projectFactory: any,
  projectConfig?: { name?: string; code?: string; documentPaths?: string[] }
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
  return { projectCode: project.key, crCode: crResult.crCode! };
}

/** Reset the test setup cache (useful for testing multiple isolated scenarios) */
function resetTestSetupCache(): void {
  cachedApp = null;
  cachedConfigDir = null;
}
