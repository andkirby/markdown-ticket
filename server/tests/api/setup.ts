/**
 * API Test Setup - MDT-106.
 *
 * Provides test environment lifecycle management for API integration tests.
 * Uses the shared test-lib infrastructure for isolated test environments.
 *
 * KEY: Sets CONFIG_DIR environment variable BEFORE importing the Express app
 * to ensure services use the test configuration directory.
 */

import type { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import type { Express } from 'express'
import type FileWatcherService from '../../services/fileWatcher/index.js'
import { existsSync, promises as fs, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'
import jestOpenAPI from 'jest-openapi'

// Initialize jest-openapi with OpenAPI spec (jest runs in CommonJS context)
const openApiSpecPath = join(__dirname, '../../openapi.yaml')

/** Initialize jest-openapi validator - also auto-called on module load */
function initJestOpenAPI(): void {
  jestOpenAPI(openApiSpecPath)
}
initJestOpenAPI()

/** Test environment context returned from setup */
interface TestContext {
  tempDir: string
  configDir: string
  app: Express
  fileWatcher: FileWatcherService
  /**
   * TestEnvironment from shared/test-lib.
   */
  testEnv: TestEnvironment
  /**
   * ProjectFactory from shared/test-lib.
   */
  projectFactory: ProjectFactory
}

interface MutableProjectConfig {
  project?: {
    document?: {
      maxDepth?: number
      paths?: string[]
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  [key: string]: unknown
}

// Global cache (shared across all test runs)
let cachedApp: Express | null = null
let cachedConfigDir: string | null = null
let cachedFileWatcher: FileWatcherService | null = null
let cachedTestEnv: TestEnvironment | null = null

/**
 * Setup test environment with isolated temporary directory and Express app.
 * IMPORTANT: Call BEFORE each test suite to ensure proper isolation.
 * The CONFIG_DIR is set before creating the Express app.
 */
export async function setupTestEnvironment(): Promise<TestContext> {
  const { TestEnvironment, ProjectFactory } = await import('@mdt/shared/test-lib')
  const testEnv = new TestEnvironment()
  await testEnv.setup()

  const tempDir = testEnv.getTempDirectory()
  const configDir = testEnv.getConfigDirectory()
  cachedTestEnv = testEnv

  let app: Express

  if (cachedApp && cachedConfigDir === configDir) {
    app = cachedApp
  }
  else {
    cachedApp = null
    const { createTestApp: createApp } = await import('./test-app-factory')
    const testApp = createApp()

    app = testApp.app
    cachedApp = app
    cachedConfigDir = configDir
    cachedFileWatcher = testApp.fileWatcher
  }

  if (!cachedFileWatcher) {
    throw new Error('Test file watcher was not initialized')
  }

  const projectFactory = new ProjectFactory(testEnv)

  return { tempDir, configDir, app, fileWatcher: cachedFileWatcher, testEnv, projectFactory }
}

/** Cleanup test environment after tests complete */
export async function cleanupTestEnvironment(tempDir: string): Promise<void> {
  cachedFileWatcher?.stop()
  cachedFileWatcher = null
  cachedApp = null
  cachedConfigDir = null
  const testEnv = cachedTestEnv
  cachedTestEnv = null

  if (testEnv) {
    await testEnv.cleanup()
    return
  }

  if (existsSync(tempDir) && tempDir.startsWith(tmpdir())) {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

/** Create a test project with a CR for API testing */
export async function createTestProjectWithCR(
  projectFactory: ProjectFactory,
  projectConfig?: { name?: string, code?: string, documentPaths?: string[] },
): Promise<{ projectCode: string, crCode: string }> {
  const project = await projectFactory.createProject('empty', projectConfig)
  const crResult = await projectFactory.createTestCR(project.key, {
    title: 'Test CR for API Testing',
    type: 'Feature Enhancement',
    content: 'Test content for API integration testing',
  })

  if (!crResult.success) {
    throw new Error(`Failed to create test CR: ${crResult.error}`)
  }

  return { projectCode: project.key, crCode: crResult.crCode! }
}

export async function setProjectDocumentMaxDepth(
  projectFactory: ProjectFactory,
  projectCode: string,
  maxDepth: number,
): Promise<void> {
  const configPath = join(projectFactory.getProjectsDir(), projectCode, '.mdt-config.toml')
  const content = await fs.readFile(configPath, 'utf8')
  const config = parseToml(content) as MutableProjectConfig

  if (!config.project) {
    config.project = {}
  }
  if (!config.project.document) {
    config.project.document = {}
  }

  config.project.document.maxDepth = maxDepth

  await fs.writeFile(configPath, stringify(config), 'utf8')
}

export async function setProjectDocumentPaths(
  projectFactory: ProjectFactory,
  projectCode: string,
  documentPaths: string[],
): Promise<void> {
  const configPath = join(projectFactory.getProjectsDir(), projectCode, '.mdt-config.toml')
  const content = await fs.readFile(configPath, 'utf8')
  const config = parseToml(content) as MutableProjectConfig

  if (!config.project) {
    config.project = {}
  }
  if (!config.project.document) {
    config.project.document = {}
  }

  config.project.document.paths = documentPaths

  await fs.writeFile(configPath, stringify(config), 'utf8')
}

/** Reset the test setup cache (useful for testing multiple isolated scenarios) */
function _resetTestSetupCache(): void {
  cachedFileWatcher?.stop()
  cachedFileWatcher = null
  cachedApp = null
  cachedConfigDir = null
  cachedTestEnv = null
}
