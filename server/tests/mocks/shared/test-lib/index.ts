/**
 * Re-export the real shared/test-lib for integration tests
 *
 * This allows integration tests to use the actual test infrastructure
 * from the @mdt/shared package while keeping the moduleNameMapper
 * for other shared modules (services, models, tools).
 *
 * The test-lib is a pure test utility that doesn't need to be mocked.
 */

// Use @mdt/shared path alias (mapped to ../shared/dist/* in tsconfig.json)
export { TestEnvironment } from '@mdt/shared/test-lib/core/test-environment';
export { TestServer } from '@mdt/shared/test-lib/core/test-server';
export { ProjectFactory } from '@mdt/shared/test-lib/core/project-factory';

// Re-export types
export type { ProjectConfig, ProjectData, TestScenario, TestCRResult } from '@mdt/shared/test-lib/core/project-factory';

// Re-export other utilities
export * from '@mdt/shared/test-lib';
