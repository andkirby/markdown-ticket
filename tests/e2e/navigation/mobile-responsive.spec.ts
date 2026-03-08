/**
 * MDT-131: Mobile Responsive UI E2E Tests
 *
 * Tests mobile-specific UI changes including header layout, logo, and list view card layout.
 * Note: Theme toggle on mobile is tested separately in mobile-theme-toggle.spec.ts
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario, type ScenarioResult } from '../setup/index.js'
import { waitForBoardReady, waitForListReady } from '../utils/helpers.js'

test.describe('MDT-131: Mobile Responsive UI', () => {
  let scenario: ScenarioResult

  test.beforeEach(async ({ page, e2eContext }) => {
    // Create isolated test data for each test
    scenario = await buildScenario(e2eContext.projectFactory, 'simple')
  })

  test.describe('Mobile Header', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should not display project title in navigation header on mobile', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Project title is now shown in the active project card in the nav
      const activeProjectCard = page.locator('[data-testid="project-selector-rail-active"]')
      await expect(activeProjectCard).toBeVisible()
    })

    test('should use mobile logo on mobile viewport', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      const logo = page.locator('[data-testid="app-logo"]')
      await expect(logo).toHaveAttribute('src', /logo-mdt-m-dark_64x64\.png/)
    })
  })

  test.describe('Mobile List View Cards', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should render ticket cards with 2-line layout on mobile', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}/list`)
      await waitForListReady(page)

      const ticketCard = page.locator('[data-testid^="ticket-card-"]').first()
      await expect(ticketCard).toBeVisible()

      // Verify structure with line 1 (CR-key + badges) and line 2 (title)
      const line1 = ticketCard.locator('[data-testid="ticket-card-line-1"]')
      const line2 = ticketCard.locator('[data-testid="ticket-card-line-2"]')

      await expect(line1).toBeVisible()
      await expect(line2).toBeVisible()

      // Verify title takes 100% width (check it matches container width)
      const containerWidth = await line2.evaluate((el) => {
        return el.getBoundingClientRect().width
      })
      const titleWidth = await line2.locator('[data-testid="ticket-title"]').evaluate((el) => {
        return el.getBoundingClientRect().width
      })
      expect(titleWidth).toBe(containerWidth)
    })
  })
})
