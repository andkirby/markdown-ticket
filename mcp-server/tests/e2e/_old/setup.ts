// Jest setup file for E2E tests
// This runs before all E2E test suites

// Set default test timeout
jest.setTimeout(30000);

// Configure environment for testing
process.env.NODE_ENV = 'test';

// Suppress console logs during tests unless explicitly needed
if (process.env.SHOW_TEST_LOGS !== 'true') {
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
}