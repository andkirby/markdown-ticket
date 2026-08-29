/**
 * Playwright E2E Test Configuration — MDT-239
 *
 * Run via `bun run test:e2e` (scripts/e2e/run.ts), which allocates ephemeral
 * ports and the run-scoped CONFIG_DIR, then exports:
 *   TEST_BACKEND_PORT / TEST_FRONTEND_PORT / TEST_FRONTEND_URL / CONFIG_DIR
 *
 * Architecture: the test backend (scripts/e2e/backend.ts) runs as ONE
 * out-of-process webServer per run — never inside a Playwright worker — so
 * worker rotation after failures cannot race the backend port (the old
 * EADDRINUSE cascade; see research/e2e-suite-audit-2026-08-28/report.md).
 * Port defaults (6173/4001) only apply when running Playwright directly
 * without the wrapper.
 */

import process from 'node:process'
import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI

const backendPort = process.env.TEST_BACKEND_PORT ?? '4001'
const frontendPort = process.env.TEST_FRONTEND_PORT ?? '6173'
const baseURL = process.env.TEST_FRONTEND_URL ?? `http://localhost:${frontendPort}`

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

  // A hung run must self-terminate instead of hanging the agent/CI forever
  globalTimeout: 40 * 60 * 1000,

  // Reporter to use
  reporter: 'html',

  // Global expect timeout: heavy renders (mermaid, highlighting) can exceed
  // the 5s default when concurrent e2e runs share one machine (MDT-239).
  expect: { timeout: 10000 },

  // Shared settings for all projects
  use: {
    // Base URL for page.goto('/')
    baseURL,

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

  // Ordered webServers: backend first, then the vite proxy that targets it.
  // reuseExistingServer stays false: with wrapper-allocated ephemeral ports a
  // pre-existing listener means something is wrong — fail fast instead of
  // silently testing against a stale server.
  webServer: [
    {
      command: 'bun scripts/e2e/backend.ts',
      url: `http://localhost:${backendPort}/api/status`,
      reuseExistingServer: false,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `VITE_BACKEND_URL=http://localhost:${backendPort} bun run dev -- --port ${frontendPort} --strictPort`,
      url: baseURL,
      reuseExistingServer: false,
      timeout: 120 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
