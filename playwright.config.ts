import { defineConfig, devices } from '@playwright/test'

// Get test port configuration with environment variable support
const ports = {
  frontend: process.env.TEST_FRONTEND_PORT ? Number.parseInt(process.env.TEST_FRONTEND_PORT, 10) : 6173,
  backend: process.env.TEST_BACKEND_PORT ? Number.parseInt(process.env.TEST_BACKEND_PORT, 10) : 4001,
  mcp: process.env.TEST_MCP_PORT ? Number.parseInt(process.env.TEST_MCP_PORT, 10) : 4002,
}

// Validate ports
Object.values(ports).forEach((port) => {
  if (isNaN(port) || port < 1024 || port > 65535) {
    throw new Error(`Invalid port number: ${port}. Must be between 1024 and 65535.`)
  }
})

// Ensure ports are unique
const portValues = Object.values(ports)
const uniquePorts = new Set(portValues)
if (uniquePorts.size !== portValues.length) {
  throw new Error('All ports must be unique. Found duplicate ports in configuration.')
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`.
     * Uses isolated test port (6173) to avoid conflicts with dev server (5173).
     * Override with TEST_FRONTEND_PORT environment variable if needed. */
    baseURL: `http://localhost:${ports.frontend}`,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Environment variables for tests */
    extraHTTPHeaders: {
      'X-Test-Mode': 'true',
    },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests.
   * Uses isolated test ports to avoid conflicts with development servers.
   * Frontend: 6173 (dev uses 5173), Backend: 4001 (dev uses 3001)
   * Override with TEST_FRONTEND_PORT or TEST_BACKEND_PORT environment variables. */
  webServer: process.env.PWTEST_SKIP_WEB_SERVER ? undefined : [
    {
      // Frontend server - use npx vite directly with port override
      command: `npx vite --port ${ports.frontend}`,
      url: `http://localhost:${ports.frontend}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
    {
      // Backend server - disable auto-discovery to speed up startup
      command: `PORT=${ports.backend} MDT_AUTO_SCAN=false npm run dev:server`,
      url: `http://localhost:${ports.backend}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
})
