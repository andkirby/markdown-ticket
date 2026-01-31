/**
 * Core Type Definitions for MDT-092 Test Framework
 *
 * Provides TypeScript interfaces for isolated test environment management,
 * server lifecycle, and test execution with custom port configuration.
 */

import type { CRPriorityValue as CRPriority, CRTypeValue as CRType } from '@mdt/domain-contracts'
import type { LocalProjectConfig, Project } from '../models/Project.js'
import type { TicketData } from '../models/Ticket.js'
import type { CRStatus } from '../models/Types.js'
import type { PortConfig } from './config/ports.js'

/**
 * Isolated test environment session configuration
 */
export interface TestEnvironment {
  /** Unique identifier for this test session */
  id: string
  /** Temporary directory path for test isolation */
  tempDir: string
  /** Port configuration for all servers */
  ports: PortConfig
  /** Whether environment is initialized */
  isInitialized: boolean
  /** Test session creation timestamp */
  createdAt: Date
}

/**
 * Test project configuration extending base project types
 */
export interface ProjectConfig extends LocalProjectConfig {
  /** Project-specific port overrides */
  ports?: Partial<PortConfig>
  /** Test-specific metadata */
  testMetadata?: {
    /** Test data templates to use */
    templates?: string[]
    /** Whether to use sample data */
    useSamples?: boolean
    /** Custom test fixtures */
    fixtures?: Record<string, unknown>
  }
}

/**
 * Server process configuration and state
 */
export interface ServerConfig {
  /** Server type identifier */
  type: 'frontend' | 'backend' | 'mcp'
  /** Port number for this server */
  port: number
  /** Command to start the server */
  command: string
  /** Arguments for the command */
  args: string[]
  /** Environment variables */
  env?: Record<string, string>
  /** Process ID if running */
  pid?: number
  /** Current server state */
  state: 'stopped' | 'starting' | 'running' | 'stopping' | 'error'
  /** Server URL for HTTP requests */
  url?: string
  /** Health check endpoint */
  healthEndpoint?: string
}

/**
 * Test execution options and configuration
 */
export interface TestOptions {
  /** Test timeout in milliseconds */
  timeout?: number
  /** Whether to cleanup after test */
  cleanup?: boolean
  /** Test run mode */
  mode?: 'isolated' | 'integrated'
  /** Logging level */
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug'
  /** Custom test data */
  testData?: Record<string, unknown>
  /** Whether to skip server startup */
  skipServerStart?: boolean
}

/**
 * Test execution result metadata
 */
export interface TestResult {
  /** Test identifier */
  id: string
  /** Whether test passed */
  passed: boolean
  /** Test execution duration in milliseconds */
  duration: number
  /** Error message if test failed */
  error?: string
  /** Test output/logs */
  output?: string[]
  /** Additional metadata */
  metadata?: {
    /** Server processes used */
    servers?: ServerConfig[]
    /** Test coverage metrics */
    coverage?: unknown
    /** Performance metrics */
    performance?: Record<string, number>
  }
}

/**
 * Test suite configuration
 */
export interface TestSuite {
  /** Suite identifier */
  name: string
  /** List of test cases */
  tests: TestCase[]
  /** Global suite configuration */
  config?: TestOptions
  /** Setup and teardown hooks */
  hooks?: {
    beforeAll?: () => Promise<void>
    afterAll?: () => Promise<void>
    beforeEach?: () => Promise<void>
    afterEach?: () => Promise<void>
  }
}

/**
 * Individual test case definition
 */
export interface TestCase {
  /** Test name/description */
  name: string
  /** Test function or identifier */
  test: string | (() => Promise<void>)
  /** Test-specific options */
  options?: TestOptions
  /** Expected test CR metadata */
  expectedCR?: {
    title?: string
    type?: CRType
    status?: CRStatus
    priority?: CRPriority
  }
}

/**
 * Test framework error types
 */
export class TestFrameworkError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'TestFrameworkError'
  }
}

/**
 * Server startup error
 */
export class ServerStartupError extends TestFrameworkError {
  constructor(message: string, public readonly serverType: string) {
    super(message)
    this.name = 'ServerStartupError'
  }
}

/**
 * Test timeout error
 */
export class TestTimeoutError extends TestFrameworkError {
  constructor(testId: string, timeout: number) {
    super(`Test ${testId} timed out after ${timeout}ms`)
    this.name = 'TestTimeoutError'
  }
}

// Export all types for use in other modules
export type {
  CRStatus,
  LocalProjectConfig,
  PortConfig,
  Project,
  TicketData,
}
export type { CRPriorityValue as CRPriority, CRTypeValue as CRType } from '@mdt/domain-contracts'
