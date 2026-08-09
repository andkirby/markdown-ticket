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
import type { SuperAgentTest } from 'supertest'
import type FileWatcherService from '../../services/fileWatcher/index.js'
import { existsSync, promises as fs, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { parseToml, stringify } from '@mdt/shared/utils/toml.js'
import jestOpenAPI from 'jest-openapi'
import request from 'supertest'

// Initialize jest-openapi with OpenAPI spec (jest runs in CommonJS context)
const openApiSpecPath = join(__dirname, '../../openapi.yaml')

/** Initialize jest-openapi validator - also auto-called on module load */
function initJestOpenAPI(): void {
  jestOpenAPI(openApiSpecPath)
}
initJestOpenAPI()

/**
 * Shared admin token for API tests that exercise protected routes.
 *
 * MDT-157 auth is ON by design in NODE_ENV=test (the loopback owner bypass
 * defaults OFF so auth stays genuinely enforced). Suites that hit protected
 * routes use {@link setupAuthenticatedTestEnvironment} to build an app with
 * auth enabled against this token, and {@link withAuth} to obtain a supertest
 * agent that carries the Bearer credential. This keeps the auth contract
 * tests (`api-auth.test.ts` etc.) meaningful — they set their own env/token
 * and are unaffected.
 */
export const API_TEST_ADMIN_TOKEN = 'mdt-api-test-admin-token'

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

/**
 * Context for authenticated API tests. `authRequest` is a supertest agent
 * pre-bound to the admin Bearer token; use it like `request(app)`.
 */
export interface AuthenticatedTestContext extends TestContext {
  authRequest: SuperAgentTest
}

/**
 * Build an app with MDT-157 auth enabled against {@link API_TEST_ADMIN_TOKEN}
 * and return a credentialed supertest agent alongside the standard context.
 *
 * Sets the env BEFORE app construction (the auth config is captured once at
 * build time by `buildRuntimeConfig`). Call {@link cleanupAuthenticatedTestEnvironment}
 * in `afterEach` to restore the prior env.
 */
export async function setupAuthenticatedTestEnvironment(): Promise<AuthenticatedTestContext> {
  const originalEnv = { ...process.env }
  process.env.NODE_ENV = 'test'
  process.env.API_SECURITY_AUTH = 'true'
  process.env.API_AUTH_TOKEN = API_TEST_ADMIN_TOKEN

  const context = await setupTestEnvironment()
  // Agent-level `.set()` persists the header across every request issued by
  // the agent (it returns the per-request builder in the typings, so we set
  // it as a side effect and keep the agent reference).
  const authRequest = request.agent(context.app)
  authRequest.set('Authorization', `Bearer ${API_TEST_ADMIN_TOKEN}`)

  // Stash the original env on the agent so cleanup can restore it without
  // forcing every suite to thread a separate variable.
  ;(authRequest as unknown as { __originalEnv?: NodeJS.ProcessEnv }).__originalEnv = originalEnv

  return { ...context, authRequest }
}

/**
 * Wrap a supertest `request(app)` call so it carries the admin Bearer token.
 *
 * Prefer {@link setupAuthenticatedTestEnvironment}'s `authRequest` agent for
 * whole suites; use this for one-off credentialed requests against an app
 * that was built with auth enabled.
 */
export function withAuth(app: Express): SuperAgentTest {
  const agent = request.agent(app)
  agent.set('Authorization', `Bearer ${API_TEST_ADMIN_TOKEN}`)
  return agent
}

/**
 * Cleanup for authenticated environments: restores the process env captured
 * by {@link setupAuthenticatedTestEnvironment} and tears down the temp dir.
 */
export async function cleanupAuthenticatedTestEnvironment(
  authRequest: SuperAgentTest,
  tempDir: string,
): Promise<void> {
  const originalEnv = (authRequest as unknown as { __originalEnv?: NodeJS.ProcessEnv }).__originalEnv
  await cleanupTestEnvironment(tempDir)
  if (originalEnv) {
    process.env = originalEnv
  }
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
