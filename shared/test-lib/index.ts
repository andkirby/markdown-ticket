/**
 * MDT-092 Test Library - Public API
 *
 * Provides a comprehensive test framework for isolated test environments with custom ports.
 * This library enables testing of markdown-ticket projects without conflicts with development servers.
 *
 * Key Features:
 * - Isolated test environments with unique temporary directories
 * - Custom port configuration to avoid development server conflicts
 * - Server lifecycle management (frontend, backend, MCP)
 * - Project and ticket creation utilities
 * - Process management with health checks
 * - Retry logic with exponential backoff
 *
 * @example
 * ```typescript
 * import { TestEnvironment, TestServer, ProjectFactory } from '@shared/test-lib';
 *
 * // Set up isolated test environment
 * const testEnv = new TestEnvironment();
 * await testEnv.setup();
 *
 * // Start servers with custom ports
 * const testServer = new TestServer(testEnv.getPortConfig());
 * await testServer.start('backend', testEnv.getTempDirectory());
 *
 * // Create test project and CRs
 * const projectFactory = new ProjectFactory(testEnv);
 * const project = await projectFactory.createProject();
 * const cr = await projectFactory.createTestCR(project.key, {
 *   title: 'Test Feature',
 *   type: 'Feature Enhancement',
 *   content: 'Test description'
 * });
 *
 * // Clean up
 * await testServer.stopAll();
 * await testEnv.cleanup();
 * ```
 */

// ============================================================================
// Core Classes
// ============================================================================

// These are frequently needed when working with the test library
export type {
  Ticket,
} from '../models/Ticket.js'
export {
  DEFAULT_TEST_PORTS,
  getPortConfig,
  type PortConfig as IPortConfig,
  isValidPort,
  validatePortConfig,
} from './config/ports.js'
export { EventListenerRegistry } from './core/event-listener-registry.js'
export { type ProjectConfig, type ProjectData, ProjectFactory, type TestCRResult, type TestScenario } from './core/project-factory.js'
export { ProjectFactoryError } from './core/project-factory.js'
export { ServerConfigFactory } from './core/server-config-factory.js'
export { TestEnvironment } from './core/test-environment.js'
export { TestServer } from './core/test-server.js'

// ============================================================================
// Types
// ============================================================================

export { FileTicketCreator, type TicketCreationConfig, type TicketCreationResult } from './ticket/file-ticket-creator.js'

export { TestProjectBuilder, type ProjectConfig as TestProjectBuilderConfig, TestProjectBuilderError, type ProjectData as TestProjectData } from './ticket/test-project-builder.js'

export { type TestCRData, TestTicketBuilder } from './ticket/test-ticket-builder.js'

// ============================================================================
// Configuration
// ============================================================================

export type {
  CRPriority,
  CRStatus,
  CRType,
  // Test framework types
  TestEnvironment as ITestEnvironment,
  LocalProjectConfig,
  // Re-exported shared types for convenience
  PortConfig,
  Project,

  ServerConfig,
  TestCase,
  TestOptions,
  ProjectConfig as TestProjectConfig,
  TestResult,
  TestSuite,

  // Ticket-related types
  TicketData,
} from './types.js'

// ============================================================================
// Utilities
// ============================================================================

// Export error classes
export {
  ServerStartupError,
  TestFrameworkError,
  TestTimeoutError,
} from './types.js'

// Process management
export {
  executeProcess,
  findProjectRoot,
  killProcessTree,
  ProcessHelper,
  processHelper,
  type ProcessOptions,
  type ProcessResult,
  spawnProcess,
} from './utils/process-helper.js'

// Retry helper
export {
  RetryError,
  RetryHelper,
  retryHelper,
  type RetryOptions,
  withRetry,
  withRetrySync,
} from './utils/retry-helper.js'

// ============================================================================
// Commonly Used Imports (Re-exports from shared models)
// ============================================================================

// Temporary directory management
export {
  cleanupTempDir,
  createTempDir,
  TempDirectoryManager,
  tempDirManager,
} from './utils/temp-dir.js'

// ============================================================================
// Version Information
// ============================================================================

/**
 * Test library version
 */
export const VERSION = '1.0.0'

/**
 * Default test configuration values
 */
export const DEFAULT_CONFIG = {
  timeout: 30000,
  cleanup: true,
  mode: 'isolated' as const,
  logLevel: 'info' as const,
} as const
