// Jest setup file for E2E tests
// This runs before all E2E test suites

import process from 'node:process'

// Set default test timeout
jest.setTimeout(30000)

// Configure environment for testing
process.env.NODE_ENV = 'test'

// Suppress console logs during tests unless explicitly needed
// Note: We only mock warn/error since ESLint no-console rule only allows these
if (process.env.SHOW_TEST_LOGS !== 'true') {
  console.warn = jest.fn()
  console.error = jest.fn()
}
