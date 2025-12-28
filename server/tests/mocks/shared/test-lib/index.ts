/**
 * Re-export the real shared/test-lib for integration tests
 *
 * This allows integration tests to use the actual test infrastructure
 * from the @mdt/shared package while keeping the moduleNameMapper
 * for other shared modules (services, models, tools).
 *
 * The test-lib is a pure test utility that doesn't need to be mocked.
 */

// Use relative path to actual shared package source to avoid ESM issues with dist
export { TestEnvironment } from '../../../../../shared/test-lib/core/test-environment.js';
export { TestServer } from '../../../../../shared/test-lib/core/test-server.js';
export { ProjectFactory } from '../../../../../shared/test-lib/core/project-factory.js';

// Re-export types
export type { ProjectConfig, ProjectData, TestScenario, TestCRResult } from '../../../../../shared/test-lib/core/project-factory.js';

// Re-export other utilities
export * from '../../../../../shared/test-lib.js';
