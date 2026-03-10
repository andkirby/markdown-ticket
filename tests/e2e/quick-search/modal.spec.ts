/**
 * Quick Search Modal E2E Tests (MDT-136)
 *
 * Tests verify quick search modal behavior:
 * 1. Cmd/Ctrl+K opens modal with auto-focused input
 * 2. Search filters tickets by key number or title substring
 * 3. Arrow keys navigate results
 * 4. Enter selects ticket and opens detail
 * 5. Escape closes modal without selection
 * 6. Click outside closes modal
 * 7. "No results" shown when no matches
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { quickSearchSelectors, ticketSelectors } from '../utils/selectors.js'

test.describe('Quick Search Modal', () => {
  test('opens modal with Cmd+K keyboard shortcut (BR-1, BR-2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Modal should be visible
    await expect(page.locator(quickSearchSelectors.modal)).toBeVisible()

    // Input should be focused
    await expect(page.locator(quickSearchSelectors.input)).toBeFocused()
  })

  test('filters tickets by key number (BR-3)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Type a partial key number
    await page.locator(quickSearchSelectors.input).fill('01')

    // Should show results containing "01" in key
    const results = page.locator(quickSearchSelectors.resultItem)
    await expect(results.first()).toBeVisible()
  })

  test('filters tickets by title substring with AND logic (BR-3, C4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Type multi-word query - all words must match
    // Medium scenario has "User Management Service" - search for "User Management"
    await page.locator(quickSearchSelectors.input).fill('User Management')

    // Results should only show tickets with both words in title
    const results = page.locator(quickSearchSelectors.resultItem)
    const count = await results.count()

    // Each result should contain both words (case-insensitive)
    for (let i = 0; i < count; i++) {
      const text = await results.nth(i).textContent()
      const lowerText = text?.toLowerCase() || ''
      expect(lowerText).toContain('user')
      expect(lowerText).toContain('management')
    }
  })

  test('navigates results with arrow keys (BR-4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Type to get results - "User" exists in "User Management Service"
    await page.locator(quickSearchSelectors.input).fill('User')

    const results = page.locator(quickSearchSelectors.resultItem)
    await expect(results.first()).toBeVisible()

    // First item should be selected by default or after pressing down
    await page.keyboard.press('ArrowDown')

    // Should have a selected item
    await expect(page.locator(quickSearchSelectors.selectedResult)).toBeVisible()

    // Navigate down then up
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')

    // Should still have a selected item
    await expect(page.locator(quickSearchSelectors.selectedResult)).toBeVisible()
  })

  test('selects ticket and opens detail with Enter (BR-5)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Type to get results - "User" exists in "Add User Authentication"
    await page.locator(quickSearchSelectors.input).fill('User')

    const results = page.locator(quickSearchSelectors.resultItem)
    await expect(results.first()).toBeVisible()

    // Navigate to first result and press Enter
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    // Modal should close
    await expect(page.locator(quickSearchSelectors.modal)).not.toBeVisible()

    // Ticket detail should be visible
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()
  })

  test('closes modal with Escape key (BR-6)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    await expect(page.locator(quickSearchSelectors.modal)).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Modal should close
    await expect(page.locator(quickSearchSelectors.modal)).not.toBeVisible()

    // No ticket detail should open
    await expect(page.locator(ticketSelectors.detailPanel)).not.toBeVisible()
  })

  test('closes modal when clicking outside (BR-7)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    await expect(page.locator(quickSearchSelectors.modal)).toBeVisible()

    // Click on the backdrop (outside modal content)
    await page.locator(quickSearchSelectors.modal).click({ position: { x: 10, y: 10 } })

    // Modal should close
    await expect(page.locator(quickSearchSelectors.modal)).not.toBeVisible()
  })

  test('shows "No results" when no matches (BR-8)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Type a query that won't match anything
    await page.locator(quickSearchSelectors.input).fill('zzzzzzzzzzzznonexistent')

    // Should show no results message
    await expect(page.locator(quickSearchSelectors.noResults)).toBeVisible()
  })

  test('limits results to 10 items maximum (C2)', async ({ page, e2eContext }) => {
    // Create a complex scenario with many tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'complex')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Leave query empty to show all tickets (up to limit)
    // Empty query shows all tickets up to MAX_RESULTS

    // Wait for results
    const results = page.locator(quickSearchSelectors.resultItem)

    // Should show at most 10 results
    const count = await results.count()
    expect(count).toBeLessThanOrEqual(10)
  })
})
