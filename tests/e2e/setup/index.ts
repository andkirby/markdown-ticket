/**
 * E2E Setup Module
 *
 * Re-exports all setup utilities for E2E tests.
 */

export {
  type E2EContext,
  getE2EContext,
  resetE2EContext,
  teardownE2EContext,
} from './e2e-context.js'

export {
  type ScenarioResult,
  type ScenarioType,
  buildScenario,
  getScenarioInfo,
} from './scenario-builder.js'
