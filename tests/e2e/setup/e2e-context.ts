/**
 * E2E Context Manager
 *
 * Singleton that manages the isolated E2E testing environment:
 * - TestEnvironment: Temporary directories and CONFIG_DIR
 * - ProjectFactory: Dynamic project/CR creation
 * - In-process backend using createTestApp()
 */

import type { Express } from 'express'
import type { Server } from 'node:http'
import type { PortConfig, ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { createServer } from 'node:http'

// Lazy-loaded to ensure CONFIG_DIR is set before import
let _createTestApp: (() => Express) | null = null

async function loadCreateTestApp(): Promise<() => Express> {
  if (!_createTestApp) {
    const module = await import('../../../server/tests/api/test-app-factory.js')
    _createTestApp = module.createTestApp
  }
  return _createTestApp
}

/**
 * E2E Context containing all test infrastructure
 */
export interface E2EContext {
  /** Test environment instance */
  testEnv: TestEnvironment
  /** Project factory for creating projects/CRs */
  projectFactory: ProjectFactory
  /** Express app (in-process) */
  app: Express
  /** HTTP server on backend port */
  server: Server
  /** Port configuration */
  ports: PortConfig
  /** Backend URL for API calls */
  backendUrl: string
  /** Frontend URL for browser tests */
  frontendUrl: string
}

/** Singleton E2E context */
let _e2eContext: E2EContext | null = null

/**
 * Get or create the E2E context singleton
 *
 * This sets up:
 * 1. TestEnvironment with CONFIG_DIR
 * 2. ProjectFactory for test data
 * 3. In-process Express backend
 */
export async function getE2EContext(): Promise<E2EContext> {
  if (_e2eContext) {
    return _e2eContext
  }

  // Dynamic imports to avoid circular dependencies
  const { TestEnvironment, ProjectFactory } = await import('@mdt/shared/test-lib')

  // 1. Setup test environment (sets CONFIG_DIR)
  const testEnv = new TestEnvironment()
  await testEnv.setup()
  const ports = testEnv.getPortConfig()

  // 2. Create project factory
  const projectFactory = new ProjectFactory(testEnv)

  // 3. Create in-process backend
  const createTestApp = await loadCreateTestApp()
  const app = createTestApp()
  const server = createServer(app)

  // Start backend server
  await new Promise<void>((resolve, reject) => {
    server.listen(ports.backend, () => {
      resolve()
    })
    server.on('error', reject)
  })

  _e2eContext = {
    testEnv,
    projectFactory,
    app,
    server,
    ports,
    backendUrl: `http://localhost:${ports.backend}`,
    frontendUrl: `http://localhost:${ports.frontend}`,
  }

  return _e2eContext
}

/**
 * Teardown the E2E context
 *
 * Cleanup order:
 * 1. Close HTTP server
 * 2. Cleanup test environment (removes temp directory)
 */
export async function teardownE2EContext(): Promise<void> {
  if (!_e2eContext) {
    return
  }

  const { server, testEnv } = _e2eContext

  // Close server first
  await new Promise<void>((resolve) => {
    server.close(() => resolve())
  })

  // Cleanup test environment (removes temp directory)
  await testEnv.cleanup()

  _e2eContext = null
}

/**
 * Reset the E2E context between tests (if needed)
 *
 * This keeps the server running but clears test data.
 * For full isolation, use teardownE2EContext and getE2EContext again.
 */
export async function resetE2EContext(): Promise<void> {
  if (!_e2eContext) {
    return
  }

  // ProjectFactory creates fresh projects each time
  // No additional reset needed
}
