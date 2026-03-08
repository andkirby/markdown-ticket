/**
 * Mobile Column Switcher E2E Tests
 *
 * Tests the mobile column dropdown functionality that allows switching between
 * kanban columns on mobile devices (<768px width).
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario, type ScenarioResult } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'
import { waitForBoardReady } from '../utils/helpers.js'

test.describe('Mobile Column Switcher', () => {
  let scenario: ScenarioResult

  test.beforeEach(async ({ page, e2eContext }) => {
    // Create isolated test data with tickets across all columns
    scenario = await buildScenario(e2eContext.projectFactory, 'medium')
  })

  test.describe('Mobile Viewport (<768px)', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should show only one column at a time on mobile', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Check that specific columns are not all visible
      const backlogColumn = page.locator(boardSelectors.columnByStatus('Proposed'))
      const openColumn = page.locator(boardSelectors.columnByStatus('Approved'))
      const inProgressColumn = page.locator(boardSelectors.columnByStatus('In Progress'))
      const doneColumn = page.locator(boardSelectors.columnByStatus('Implemented'))

      // At least one should be visible
      const anyVisible = await backlogColumn.isVisible() || await openColumn.isVisible() ||
                        await inProgressColumn.isVisible() || await doneColumn.isVisible()
      expect(anyVisible).toBe(true)

      // But not all of them should be visible simultaneously (mobile behavior)
      const allVisible = await backlogColumn.isVisible() && await openColumn.isVisible() &&
                        await inProgressColumn.isVisible() && await doneColumn.isVisible()
      expect(allVisible).toBe(false)
    })

    test('should display column switcher dropdown trigger on mobile', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      const trigger = page.locator(boardSelectors.mobileColumnSwitcherTrigger)
      await expect(trigger).toBeVisible()
    })

    test('should show dropdown menu with all columns when trigger is clicked', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Click the trigger
      await page.click(boardSelectors.mobileColumnSwitcherTrigger)

      // Wait for menu to appear
      await page.waitForTimeout(100)

      // Check that all column options are visible
      await expect(page.locator(boardSelectors.mobileColumnOption('backlog'))).toBeVisible()
      await expect(page.locator(boardSelectors.mobileColumnOption('open'))).toBeVisible()
      await expect(page.locator(boardSelectors.mobileColumnOption('in-progress'))).toBeVisible()
      await expect(page.locator(boardSelectors.mobileColumnOption('done'))).toBeVisible()
    })

    test('should highlight current column in dropdown menu', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Open dropdown
      await page.click(boardSelectors.mobileColumnSwitcherTrigger)
      await page.waitForTimeout(100)

      // The first visible column should be highlighted (has bg-accent class)
      const backlogOption = page.locator(boardSelectors.mobileColumnOption('backlog'))
      await expect(backlogOption).toHaveClass(/bg-accent/)
    })

    test('should show ticket counts in dropdown menu', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Open dropdown
      await page.click(boardSelectors.mobileColumnSwitcherTrigger)
      await page.waitForTimeout(100)

      // Check that ticket counts are displayed
      const backlogOption = page.locator(boardSelectors.mobileColumnOption('backlog'))
      const text = await backlogOption.textContent()

      // Should contain column name and ticket count
      expect(text).toMatch(/Backlog/)
      expect(text).toMatch(/\d+/)
    })

    test('should switch to different column when option is clicked', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Open dropdown and click "Open" column
      await page.click(boardSelectors.mobileColumnSwitcherTrigger)
      await page.waitForTimeout(100)
      await page.click(boardSelectors.mobileColumnOption('open'))

      // Wait for column to switch
      await page.waitForTimeout(200)

      // Verify only Open column is visible
      const openColumn = page.locator(boardSelectors.columnByStatus('Approved'))
      await expect(openColumn).toBeVisible()

      // Verify other columns are not visible
      const backlogColumn = page.locator(boardSelectors.columnByStatus('Proposed'))
      await expect(backlogColumn).not.toBeVisible()
    })

    test('should switch through all columns sequentially', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      const columns = [
        { name: 'open', status: 'Approved' },
        { name: 'in-progress', status: 'In Progress' },
        { name: 'done', status: 'Implemented' },
      ]

      for (const column of columns) {
        // Open dropdown
        await page.click(boardSelectors.mobileColumnSwitcherTrigger)
        await page.waitForTimeout(100)

        // Click column option
        await page.click(boardSelectors.mobileColumnOption(column.name))
        await page.waitForTimeout(200)

        // Verify correct column is visible
        const visibleColumn = page.locator(boardSelectors.columnByStatus(column.status))
        await expect(visibleColumn).toBeVisible()
      }
    })

    test('should close dropdown after selecting a column', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Open dropdown
      await page.click(boardSelectors.mobileColumnSwitcherTrigger)
      await page.waitForTimeout(100)

      // Verify dropdown is open
      await expect(page.locator(boardSelectors.mobileColumnOption('open'))).toBeVisible()

      // Click an option
      await page.click(boardSelectors.mobileColumnOption('open'))
      await page.waitForTimeout(200)

      // Dropdown should be closed
      await expect(page.locator(boardSelectors.mobileColumnOption('open'))).not.toBeVisible()
    })

    test('should maintain column visibility state after viewport resize', async ({ page }) => {
      // Start in mobile view
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Switch to "Open" column
      await page.click(boardSelectors.mobileColumnSwitcherTrigger)
      await page.waitForTimeout(100)
      await page.click(boardSelectors.mobileColumnOption('open'))
      await page.waitForTimeout(200)

      // Resize to desktop
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.waitForTimeout(200)

      // All columns should be visible on desktop
      const backlogColumn = page.locator(boardSelectors.columnByStatus('Proposed'))
      const openColumn = page.locator(boardSelectors.columnByStatus('Approved'))
      await expect(backlogColumn).toBeVisible()
      await expect(openColumn).toBeVisible()

      // Resize back to mobile
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(200)

      // Should still show only one column (not all visible)
      const allVisible = await backlogColumn.isVisible() && await openColumn.isVisible()
      expect(allVisible).toBe(false)
    })
  })

  test.describe('Desktop Viewport (≥768px)', () => {
    test.use({ viewport: { width: 1200, height: 800 } })

    test('should not show column switcher dropdown trigger on desktop', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      const trigger = page.locator(boardSelectors.mobileColumnSwitcherTrigger)
      await expect(trigger).not.toBeVisible()
    })

    test('should show all columns side-by-side on desktop', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // All columns should be visible on desktop
      const backlogColumn = page.locator(boardSelectors.columnByStatus('Proposed'))
      const openColumn = page.locator(boardSelectors.columnByStatus('Approved'))
      const inProgressColumn = page.locator(boardSelectors.columnByStatus('In Progress'))
      const doneColumn = page.locator(boardSelectors.columnByStatus('Implemented'))

      await expect(backlogColumn).toBeVisible()
      await expect(openColumn).toBeVisible()
      await expect(inProgressColumn).toBeVisible()
      await expect(doneColumn).toBeVisible()
    })

    test('should maintain all columns visibility when resizing from mobile to desktop', async ({ page }) => {
      // Start in mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Verify single column on mobile (not all visible)
      const backlogColumn = page.locator(boardSelectors.columnByStatus('Proposed'))
      const openColumn = page.locator(boardSelectors.columnByStatus('Approved'))
      const allVisibleMobile = await backlogColumn.isVisible() && await openColumn.isVisible()
      expect(allVisibleMobile).toBe(false)

      // Resize to desktop
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.waitForTimeout(200)

      // All columns should now be visible on desktop
      await expect(backlogColumn).toBeVisible()
      await expect(openColumn).toBeVisible()
      const inProgressColumn = page.locator(boardSelectors.columnByStatus('In Progress'))
      const doneColumn = page.locator(boardSelectors.columnByStatus('Implemented'))
      await expect(inProgressColumn).toBeVisible()
      await expect(doneColumn).toBeVisible()
    })
  })

  test.describe('Column Toggle Features', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should show On Hold toggle in In Progress column on mobile', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Switch to In Progress column
      await page.click(boardSelectors.mobileColumnSwitcherTrigger)
      await page.waitForTimeout(100)
      await page.click(boardSelectors.mobileColumnOption('in-progress'))
      await page.waitForTimeout(200)

      // On Hold toggle should be visible
      const onHoldToggle = page.getByRole('button', { name: /On Hold/ })
      await expect(onHoldToggle).toBeVisible()
    })

    test('should show Rejected toggle in Done column on mobile', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Switch to Done column
      await page.click(boardSelectors.mobileColumnSwitcherTrigger)
      await page.waitForTimeout(100)
      await page.click(boardSelectors.mobileColumnOption('done'))
      await page.waitForTimeout(200)

      // Rejected toggle should be visible
      const rejectedToggle = page.getByRole('button', { name: /Rejected/ })
      await expect(rejectedToggle).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('should be keyboard accessible', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Focus the trigger
      await page.focus(boardSelectors.mobileColumnSwitcherTrigger)

      // Press Enter to open dropdown
      await page.keyboard.press('Enter')
      await page.waitForTimeout(100)

      // Verify dropdown opened
      await expect(page.locator(boardSelectors.mobileColumnOption('open'))).toBeVisible()

      // Press Arrow Down to navigate
      await page.keyboard.press('ArrowDown')
      await page.waitForTimeout(50)

      // Press Enter to select
      await page.keyboard.press('Enter')
      await page.waitForTimeout(200)

      // Verify column switched
      const openColumn = page.locator(boardSelectors.columnByStatus('Approved'))
      await expect(openColumn).toBeVisible()
    })

    test('should close dropdown on Escape key', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Open dropdown
      await page.click(boardSelectors.mobileColumnSwitcherTrigger)
      await page.waitForTimeout(100)

      // Verify dropdown is open
      await expect(page.locator(boardSelectors.mobileColumnOption('open'))).toBeVisible()

      // Press Escape
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)

      // Verify dropdown is closed
      await expect(page.locator(boardSelectors.mobileColumnOption('open'))).not.toBeVisible()
    })
  })
})
