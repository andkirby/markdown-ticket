/**
 * MDT-131 / MDT-206: View Mode Switcher E2E Tests
 *
 * The switcher is now four dedicated buttons — Board (flat), Epics
 * (swimlanes), List, Documents — each carrying data-view-mode and
 * data-active. The old merged Board|List toggle with a hover overlay no
 * longer exists; these tests cover the current component contract.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario, type ScenarioResult } from '../setup/index.js'
import { navSelectors } from '../utils/selectors.js'
import { waitForBoardReady, waitForDocumentsReady, waitForListReady } from '../utils/helpers.js'

test.describe('MDT-131: View Mode Switcher', () => {
  let scenario: ScenarioResult

  test.beforeEach(async ({ page, e2eContext }) => {
    // Create isolated test data for each test
    scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
  })

  test.describe('Initial View Display', () => {
    test('shows all four mode buttons with board active on load', async ({ page }) => {
      await expect(page.locator(navSelectors.viewModeSwitcher)).toBeVisible()
      await expect(page.locator(navSelectors.boardModeFlatToggle)).toBeVisible()
      await expect(page.locator(navSelectors.boardModeEpicsToggle)).toBeVisible()
      await expect(page.locator(navSelectors.viewModeListToggle)).toBeVisible()
      await expect(page.locator(navSelectors.documentsButton)).toBeVisible()

      await expect(page.locator(navSelectors.boardModeFlatToggle)).toHaveAttribute('data-active', 'true')
      await expect(page.locator(navSelectors.viewModeListToggle)).toHaveAttribute('data-active', 'false')
    })

    test('shows list button active when loading list view directly', async ({ page }) => {
      await page.click(navSelectors.viewModeListToggle)
      await page.waitForURL(`/prj/${scenario.projectCode}/list`)

      // Reload to test initial state in list view
      await page.reload()
      await waitForListReady(page)

      await expect(page.locator(navSelectors.viewModeListToggle)).toHaveAttribute('data-active', 'true')
      await expect(page.locator(navSelectors.boardModeFlatToggle)).toHaveAttribute('data-active', 'false')
    })

    test('persists the last-used board/list mode while documents is active', async ({ page }) => {
      // Switch to list first, then documents — the last board/list choice is
      // persisted (lastBoardListMode) even while documents is active.
      await page.click(navSelectors.viewModeListToggle)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}/list`)

      await page.click(navSelectors.documentsButton)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}/documents`)

      await expect(page.locator(navSelectors.documentsButton)).toHaveAttribute('data-active', 'true')
      const lastBoardListMode = await page.evaluate(() => localStorage.getItem('lastBoardListMode'))
      expect(lastBoardListMode).toBe('list')
    })
  })

  test.describe('Desktop Navigation', () => {
    test.use({ viewport: { width: 1280, height: 800 } })

    test('renders the full switcher in the header on desktop', async ({ page }) => {
      await expect(page.locator(navSelectors.viewModeSwitcher)).toBeVisible()
      for (const selector of [
        navSelectors.boardModeFlatToggle,
        navSelectors.boardModeEpicsToggle,
        navSelectors.viewModeListToggle,
        navSelectors.documentsButton,
      ])
        await expect(page.locator(selector)).toBeVisible()
    })

    test('switches from Board to List and back via dedicated buttons', async ({ page }) => {
      await page.click(navSelectors.viewModeListToggle)
      await page.waitForURL(`/prj/${scenario.projectCode}/list`)
      await waitForListReady(page)
      await expect(page.locator(navSelectors.viewModeListToggle)).toHaveAttribute('data-active', 'true')

      await page.click(navSelectors.boardModeFlatToggle)
      await waitForBoardReady(page)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}`)
      await expect(page.locator(navSelectors.boardModeFlatToggle)).toHaveAttribute('data-active', 'true')
    })

    test('switches to Epics (swimlane) mode via the epics button', async ({ page }) => {
      await page.click(navSelectors.boardModeEpicsToggle)
      await page.waitForURL(`/prj/${scenario.projectCode}/epics`)
      await expect(page.locator(navSelectors.boardModeEpicsToggle)).toHaveAttribute('data-active', 'true')
      await expect(page.locator(navSelectors.boardModeFlatToggle)).toHaveAttribute('data-active', 'false')
    })

    test('returns to the last-used board/list view from documents', async ({ page }) => {
      await page.click(navSelectors.documentsButton)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}/documents`)
      await waitForDocumentsReady(page)

      // Board was the last-used board/list mode — the board button returns there.
      await page.click(navSelectors.boardModeFlatToggle)
      await waitForBoardReady(page)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}`)
    })

    test('navigates from Board to Documents view', async ({ page }) => {
      await page.click(navSelectors.documentsButton)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}/documents`)
      await waitForDocumentsReady(page)
      await expect(page.locator(navSelectors.documentsButton)).toHaveAttribute('data-active', 'true')
    })

    test('navigates from List to Documents view', async ({ page }) => {
      await page.click(navSelectors.viewModeListToggle)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}/list`)

      await page.click(navSelectors.documentsButton)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}/documents`)
      await waitForDocumentsReady(page)
    })

    test('completes circular navigation: Board → Documents → Board', async ({ page }) => {
      await page.click(navSelectors.documentsButton)
      await waitForDocumentsReady(page)
      await page.click(navSelectors.boardModeFlatToggle)
      await waitForBoardReady(page)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}`)
    })

    test('completes circular navigation: List → Documents → List', async ({ page }) => {
      await page.click(navSelectors.viewModeListToggle)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}/list`)

      await page.click(navSelectors.documentsButton)
      await waitForDocumentsReady(page)

      await page.click(navSelectors.viewModeListToggle)
      await waitForListReady(page)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}/list`)
    })
  })

  test.describe('Mobile Viewport (< 768px)', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('keeps the switcher available on mobile', async ({ page }) => {
      await expect(page.locator(navSelectors.viewModeSwitcher)).toBeVisible()
      await expect(page.locator(navSelectors.boardModeFlatToggle)).toBeVisible()
      await expect(page.locator(navSelectors.viewModeListToggle)).toBeVisible()
      await expect(page.locator(navSelectors.documentsButton)).toBeVisible()
    })

    test('switches to list view on mobile', async ({ page }) => {
      await page.click(navSelectors.viewModeListToggle)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}/list`)
      await waitForListReady(page)
      await expect(page.locator(navSelectors.viewModeListToggle)).toHaveAttribute('data-active', 'true')
    })
  })

  test.describe('Persistence', () => {
    test('saves last-used mode to localStorage when switching views', async ({ page }) => {
      await page.click(navSelectors.viewModeListToggle)
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}/list`)

      const lastBoardListMode = await page.evaluate(() => localStorage.getItem('lastBoardListMode'))
      expect(lastBoardListMode).toBe('list')

      const lastViewMode = await page.evaluate(() => localStorage.getItem('lastViewMode'))
      expect(lastViewMode).toBe('list')
    })

    test('loads last-used mode from localStorage on application load', async ({ page }) => {
      await page.evaluate((code) => {
        // The bare /prj/:code redirect follows the Settings "Default View"
        // preference (kept in sync by the switcher), not lastViewMode.
        localStorage.setItem('mdt-settings-default-view', 'list')
        window.location.href = `/prj/${code}`
      }, scenario.projectCode)

      // The bare /prj/:code route initializes the last-used view mode without
      // rewriting the URL — assert on the rendered view, not the URL.
      await waitForListReady(page)
      await expect(page.locator(navSelectors.viewModeListToggle)).toHaveAttribute('data-active', 'true')
    })
  })
})
