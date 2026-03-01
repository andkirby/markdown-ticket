/**
 * Playwright E2E Test Configuration
 *
 * Configures isolated E2E testing infrastructure for the markdown-ticket application.
 * Uses ports 6173 (frontend) and 4001 (backend) to avoid conflicts with dev servers.
 */

import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

/**
 * Read environment variables
 */
const isCI = !!process.env.CI

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Run tests in files in parallel
  fullyParallel: false, // Sequential for shared environment

  // Fail the build on CI if you accidentally left test.only in source code
  forbidOnly: isCI,

  // Retry on CI only
  retries: isCI ? 2 : 0,

  // Workers - use 1 for shared environment isolation
  workers: 1,

  // Reporter to use
  reporter: 'html',

  // Shared settings for all projects
  use: {
    // Base URL for page.goto('/')
    baseURL: 'http://localhost:6173',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Run local dev server before tests
  webServer: {
    command: 'VITE_BACKEND_URL=http://localhost:4001 npm run dev -- --port 6173 --strictPort',
    url: 'http://localhost:6173',
    reuseExistingServer: !isCI,
    timeout: 120 * 1000, // 2 minutes
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
