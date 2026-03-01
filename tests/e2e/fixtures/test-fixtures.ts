/**
 * Playwright Test Fixtures
 *
 * Extends Playwright base test with E2E context fixtures.
 * The E2E context is a singleton, so test scope is sufficient.
 */

import type { E2EContext } from '../setup/index.js'
import { test as base } from '@playwright/test'
import { getE2EContext } from '../setup/index.js'

/**
 * Extended test with E2E fixtures
 *
 * Usage:
 * ```typescript
 * import { test, expect } from './fixtures/test-fixtures'
 *
 * test('my test', async ({ page, e2eContext }) => {
 *   // e2eContext.testEnv - TestEnvironment instance
 *   // e2eContext.projectFactory - for creating projects/CRs
 *   // e2eContext.backendUrl - 'http://localhost:4001'
 *   // e2eContext.frontendUrl - 'http://localhost:6173'
 * })
 * ```
 */
export const test = base.extend<{
  /** E2E context with test environment and backend */
  e2eContext: E2EContext
}>({
  // Test-scoped fixture - getE2EContext is a singleton so reuse is automatic
  e2eContext: async ({}, use: (ctx: E2EContext) => Promise<void>) => {
    // Get or create singleton E2E context
    const context = await getE2EContext()

    // Provide to tests
    await use(context)
  },
})

/**
 * Re-export expect for convenience
 */
export { expect } from '@playwright/test'
