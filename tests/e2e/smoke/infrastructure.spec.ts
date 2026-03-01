/**
 * Infrastructure Smoke Tests
 *
 * Verifies that the E2E testing infrastructure is correctly set up:
 * 1. Backend API responds
 * 2. Frontend loads without errors
 * 3. Test scenario creation works
 * 4. Project appears in frontend
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario, type ScenarioResult } from '../setup/index.js'
import { commonSelectors } from '../utils/selectors.js'
import { verifyApiHealth, waitForBoardReady } from '../utils/helpers.js'

/**
 * Test suite for E2E infrastructure verification
 */
test.describe('E2E Infrastructure', () => {
  let scenarioResult: ScenarioResult | null = null

  test.describe.configure({ mode: 'serial' })

  test('backend API responds', async ({ e2eContext }) => {
    const { backendUrl } = e2eContext

    // Verify API health
    const isHealthy = await verifyApiHealth(backendUrl)
    expect(isHealthy).toBe(true)

    // Verify projects endpoint returns array
    const response = await fetch(`${backendUrl}/api/projects`)
    expect(response.ok).toBe(true)

    const data = await response.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('frontend loads without errors', async ({ page }) => {
    // Attach console listener BEFORE navigation to capture all errors
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Navigate to frontend
    await page.goto('/')

    // Wait for DOM + resources (not networkidle — SSE keeps connection alive forever)
    await page.waitForLoadState('load')

    // Check page title (verifies React rendered)
    await expect(page).toHaveTitle(/CR Task Board/)

    // Wait for loading state to clear (board OR empty-state, whichever renders)
    await page.waitForSelector(commonSelectors.loading, { state: 'hidden', timeout: 10000 }).catch(() => {
      // loading element may not exist in DOM at all — that's fine
    })

    // Verify no critical errors
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') && !e.includes('Warning:'),
    )
    expect(criticalErrors).toHaveLength(0)
  })

  test('test scenario creation works', async ({ e2eContext }) => {
    const { projectFactory } = e2eContext

    // Build simple scenario
    scenarioResult = await buildScenario(projectFactory, 'simple')

    // Verify scenario was created
    expect(scenarioResult).toBeDefined()
    expect(scenarioResult!.projectCode).toBeDefined()
    expect(scenarioResult!.projectName).toBe('Simple Test Project')
    expect(scenarioResult!.ticketCount).toBe(3)
    expect(scenarioResult!.crCodes).toHaveLength(3)

    // Verify CR codes follow expected format
    for (const code of scenarioResult!.crCodes) {
      expect(code).toMatch(/^[A-Z]+-\d+$/)
    }
  })

  test('project appears in frontend', async ({ page }) => {
    // Ensure scenario was created
    expect(scenarioResult).toBeDefined()

    // Navigate to frontend — the app auto-selects the first project
    await page.goto('/')
    await waitForBoardReady(page)

    // Project button is visible in the nav (the ProjectSelector renders one button per project)
    const projectOption = page.locator(
      `[data-testid="project-option-${scenarioResult!.projectCode}"]`,
    )
    await expect(projectOption).toBeVisible()

    // Verify tickets appear on board (auto-selected project loads its tickets)
    const ticketCards = page.locator('[data-testid="ticket-card"]')
    const count = await ticketCards.count()

    // Should have at least the tickets we created
    expect(count).toBeGreaterThanOrEqual(scenarioResult!.ticketCount)
  })
})
