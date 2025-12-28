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

export { TestEnvironment } from './core/test-environment.js';
export { TestServer } from './core/test-server.js';
export { ProjectFactory, type ProjectConfig, type ProjectData, type TestScenario, type TestCRResult } from './core/project-factory.js';
export { FileTicketCreator, type TicketCreationConfig, type TicketCreationResult } from './ticket/file-ticket-creator.js';

// ============================================================================
// Types
// ============================================================================

export type {
  // Test framework types
  TestEnvironment as ITestEnvironment,
  TestOptions,
  TestResult,
  TestSuite,
  TestCase,
  ServerConfig,
  ProjectConfig as TestProjectConfig,

  // Re-exported shared types for convenience
  PortConfig,
  Project,
  LocalProjectConfig,
  CRStatus,
  CRType,
  CRPriority,

  // Ticket-related types
  TicketData
} from './types.js';

// Export error classes
export {
  TestFrameworkError,
  ServerStartupError,
  TestTimeoutError
} from './types.js';

export { ProjectFactoryError } from './core/project-factory.js';

// ============================================================================
// Configuration
// ============================================================================

export {
  DEFAULT_TEST_PORTS,
  getPortConfig,
  validatePortConfig,
  isValidPort,
  type PortConfig as IPortConfig
} from './config/ports.js';

// ============================================================================
// Utilities
// ============================================================================

// Process management
export {
  ProcessHelper,
  processHelper,
  spawnProcess,
  executeProcess,
  killProcessTree,
  findProjectRoot,
  type ProcessOptions,
  type ProcessResult
} from './utils/process-helper.js';

// Temporary directory management
export {
  TempDirectoryManager,
  tempDirManager,
  createTempDir,
  cleanupTempDir
} from './utils/temp-dir.js';

// Retry helper
export {
  RetryHelper,
  retryHelper,
  withRetry,
  withRetrySync,
  RetryError,
  type RetryOptions
} from './utils/retry-helper.js';

// ============================================================================
// Commonly Used Imports (Re-exports from shared models)
// ============================================================================

// These are frequently needed when working with the test library
export type {
  Ticket
} from '../models/Ticket.js';

// ============================================================================
// Version Information
// ============================================================================

/**
 * Test library version
 */
export const VERSION = '1.0.0';

/**
 * Default test configuration values
 */
export const DEFAULT_CONFIG = {
  timeout: 30000,
  cleanup: true,
  mode: 'isolated' as const,
  logLevel: 'info' as const
} as const;