/**
 * MDT-131: View Mode Switcher E2E Tests
 *
 * Tests the merged Board|List toggle with hover overlay, Documents button visibility,
 * and localStorage persistence.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario, type ScenarioResult } from '../setup/index.js'
import { navSelectors } from '../utils/selectors.js'
import { waitForBoardReady, waitForListReady, waitForDocumentsReady } from '../utils/helpers.js'

test.describe('MDT-131: View Mode Switcher', () => {
  let scenario: ScenarioResult

  test.beforeEach(async ({ page, e2eContext }) => {
    // Create isolated test data for each test
    scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
  })

  test.describe('Initial View Display', () => {
    test('should display Board icon when application loads in board view', async ({ page }) => {
      await expect(page.locator(navSelectors.boardListToggle)).toBeVisible()
      await expect(page.locator(navSelectors.boardListToggle)).toHaveAttribute('data-current-mode', 'board')
    })

    test('should display List icon when application loads in list view', async ({ page }) => {
      // Navigate to list view first
      await page.click(navSelectors.boardListToggle)
      await page.waitForURL(`**/prj/${scenario.projectCode}/list`)

      // Reload to test initial state in list view
      await page.reload()
      await waitForListReady(page)

      await expect(page.locator(navSelectors.boardListToggle)).toHaveAttribute('data-current-mode', 'list')
    })

    test('should show last-used mode in documents view', async ({ page }) => {
      // Set board mode as last-used
      await page.click(navSelectors.boardListToggle)
      await page.click(navSelectors.boardListToggle)

      // Navigate to documents
      await page.click(navSelectors.documentsButton)
      await page.waitForURL(`**/prj/${scenario.projectCode}/documents`)

      // Verify board icon is shown (last-used mode)
      await expect(page.locator(navSelectors.boardListToggle)).toHaveAttribute('data-current-mode', 'board')
    })
  })

  test.describe('Desktop Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 })
    })

    test('should show both Board|List and Documents buttons on desktop', async ({ page }) => {
      await expect(page.locator(navSelectors.boardListToggle)).toBeVisible()
      await expect(page.locator(navSelectors.documentsButton)).toBeVisible()
    })
  })

  test.describe('Mobile Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
    })

    test('should show only Board|List button and hide Documents button on mobile', async ({ page }) => {
      await expect(page.locator(navSelectors.boardListToggle)).toBeVisible()
      await expect(page.locator(navSelectors.documentsButton)).not.toBeVisible()
    })
  })

  test.describe('Hover Overlay', () => {
    test('should show alternate view icon overlay when hovering in board/list view', async ({ page }) => {
      const overlay = page.locator(navSelectors.boardListToggleOverlay)

      // Hover and check overlay appears
      await page.locator(navSelectors.boardListToggle).hover()

      // Check that overlay is visible (Playwright retries automatically)
      await expect(overlay).toBeVisible()
    })

    test('should not show overlay when hovering in documents view', async ({ page }) => {
      await page.click(navSelectors.documentsButton)
      await waitForDocumentsReady(page)

      await page.locator(navSelectors.boardListToggle).hover()
      await expect(page.locator(navSelectors.boardListToggleOverlay)).not.toBeVisible()
    })
  })

  test.describe('Toggle Navigation', () => {
    test('should toggle from Board to List view and show Board icon on button', async ({ page }) => {
      const boardListButton = page.locator(navSelectors.boardListToggle)

      // Verify starting state
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'board')

      // Click to toggle
      await boardListButton.click()
      await page.waitForURL(`**/prj/${scenario.projectCode}/list`)

      // Verify button shows list mode
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'list')
    })

    test('should toggle from List to Board view and show List icon on button', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}/list`)
      await waitForListReady(page)

      const boardListButton = page.locator(navSelectors.boardListToggle)

      // Verify starting state
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'list')

      // Click to toggle
      await boardListButton.click()
      await page.waitForURL(`**/prj/${scenario.projectCode}`)

      // Verify button shows board mode
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'board')
    })

    test('should return to last-used view when clicking from documents view', async ({ page }) => {
      // Set list as last-used
      await page.click(navSelectors.boardListToggle)

      // Navigate to documents
      await page.click(navSelectors.documentsButton)

      // Click to return
      await page.click(navSelectors.boardListToggle)
      await page.waitForURL(`**/prj/${scenario.projectCode}/list`)
    })

    test('should navigate from Board to Documents view', async ({ page }) => {
      await page.click(navSelectors.documentsButton)
      await page.waitForURL(`**/prj/${scenario.projectCode}/documents`)

      // Verify Board icon is shown (last-used mode)
      await expect(page.locator(navSelectors.boardListToggle)).toHaveAttribute('data-current-mode', 'board')
    })

    test('should navigate from List to Documents view', async ({ page }) => {
      await page.click(navSelectors.boardListToggle)
      await page.click(navSelectors.documentsButton)
      await page.waitForURL(`**/prj/${scenario.projectCode}/documents`)

      // Verify List icon is shown (last-used mode)
      await expect(page.locator(navSelectors.boardListToggle)).toHaveAttribute('data-current-mode', 'list')
    })

    test('should complete circular navigation: Board → Documents → Board', async ({ page }) => {
      // Board → Documents
      await page.click(navSelectors.documentsButton)
      await page.waitForURL(`**/prj/${scenario.projectCode}/documents`)

      // Documents → Board
      await page.click(navSelectors.boardListToggle)
      await page.waitForURL(`**/prj/${scenario.projectCode}`)

      await expect(page.locator(navSelectors.boardListToggle)).toHaveAttribute('data-current-mode', 'board')
    })

    test('should complete circular navigation: List → Documents → List', async ({ page }) => {
      // Board → List
      await page.click(navSelectors.boardListToggle)

      // List → Documents
      await page.click(navSelectors.documentsButton)
      await page.waitForURL(`**/prj/${scenario.projectCode}/documents`)

      // Documents → List
      await page.click(navSelectors.boardListToggle)
      await page.waitForURL(`**/prj/${scenario.projectCode}/list`)

      await expect(page.locator(navSelectors.boardListToggle)).toHaveAttribute('data-current-mode', 'list')
    })
  })

  test.describe('Persistence', () => {
    test('should save last-used mode to localStorage when switching views', async ({ page }) => {
      await page.click(navSelectors.boardListToggle)

      const storedMode = await page.evaluate(() => {
        return localStorage.getItem('lastBoardListMode')
      })

      expect(storedMode).toBe('list')
    })

    test('should load last-used mode from localStorage on application load', async ({ page }) => {
      // Set localStorage
      await page.evaluate(() => {
        localStorage.setItem('lastBoardListMode', 'list')
      })

      // Reload and verify
      await page.reload()
      await waitForListReady(page)
      await page.waitForURL(`**/prj/${scenario.projectCode}/list`)

      await expect(page.locator(navSelectors.boardListToggle)).toHaveAttribute('data-current-mode', 'list')
    })
  })
})
