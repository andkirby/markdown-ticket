/**
 * Board Filter Bar E2E (MDT-196)
 *
 * Verifies the faceted filter bar through the real app: applying a facet
 * narrows the board, the result count updates, chips render and remove,
 * Clear all resets, and filters persist across a page reload.
 *
 * Predicate semantics (AND/OR/empty/query) are covered exhaustively at the
 * unit level (src/utils/ticketFilters.test.ts). This file proves the chrome
 * is wired to the predicate end-to-end.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady, getTicketCount } from '../utils/helpers.js'

test.describe('Board Filter Bar (MDT-196)', () => {
  test.describe.configure({ mode: 'serial' })

  test('desktop: applying a status facet narrows the board', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    // simple scenario: Implemented, In Progress, Proposed (3 tickets)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const initialCount = await getTicketCount(page)
    expect(initialCount).toBe(3)

    // Open the status facet dropdown and toggle "Proposed".
    await page.getByTestId('facet-dropdown-trigger').first().click()
    await page.getByTestId('facet-option').filter({ hasText: 'Proposed' }).click()
    // Close the dropdown by pressing Escape (Radix closes on Escape).
    await page.keyboard.press('Escape')

    // Only the Proposed ticket should be visible now.
    const filteredCount = await getTicketCount(page)
    expect(filteredCount).toBe(1)

    // Result count text reflects the filter.
    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 1 of 3')
  })

  test('desktop: chip remove widens the board', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Apply a priority filter via the dropdown.
    const priorityTrigger = page.getByTestId('facet-dropdown').filter({ hasText: /Priority/ }).getByTestId('facet-dropdown-trigger')
    await priorityTrigger.click()
    await page.getByTestId('facet-option').filter({ hasText: 'High' }).click()
    await page.keyboard.press('Escape')

    // Two tickets have priority High (Setup Project Structure, Fix Navigation Bug).
    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 2 of 3')

    // Remove the chip.
    await page.getByTestId('active-filter-chip-remove').first().click()

    // Board widens back to all tickets.
    await expect(page.getByTestId('filter-result-count')).toContainText('Showing all 3')
  })

  test('desktop: Clear all resets to the full set', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Apply a type filter.
    const typeTrigger = page.getByTestId('facet-dropdown').filter({ hasText: /^Type$/ }).getByTestId('facet-dropdown-trigger')
    await typeTrigger.click()
    await page.getByTestId('facet-option').filter({ hasText: 'Bug Fix' }).click()
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 1 of 3')

    // Clear all.
    await page.getByTestId('clear-all-filters').click()

    // Everything visible again, no chips.
    await expect(page.getByTestId('filter-result-count')).toContainText('Showing all 3')
    await expect(page.getByTestId('active-filter-chips')).toHaveCount(0)
  })

  test('desktop: free-text query AND-combines with facets', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Type a query that matches one ticket title.
    await page.getByTestId('search-input').fill('Authentication')

    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 1 of 3')

    // Now also filter by type — the query AND the facet must both match.
    const typeTrigger = page.getByTestId('facet-dropdown').filter({ hasText: /^Type$/ }).getByTestId('facet-dropdown-trigger')
    await typeTrigger.click()
    await page.getByTestId('facet-option').filter({ hasText: 'Feature Enhancement' }).click()
    await page.keyboard.press('Escape')

    // "Add User Authentication" is Feature Enhancement and matches the query.
    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 1 of 3')
  })

  test('persistence: filters survive a page reload', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Apply a status filter.
    await page.getByTestId('facet-dropdown-trigger').first().click()
    await page.getByTestId('facet-option').filter({ hasText: 'In Progress' }).click()
    await page.keyboard.press('Escape')

    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 1 of 3')

    // Reload — the filter should be restored from localStorage.
    await page.reload()
    await waitForBoardReady(page)

    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 1 of 3')
  })

  test('mobile: filter popover opens from the trigger and applies a facet', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Set a mobile viewport (< 640px = below the sm breakpoint).
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // The mobile filter trigger is visible (desktop bar hidden at this width).
    await page.getByTestId('mobile-filter-trigger').click()

    // The popover opens.
    await expect(page.getByTestId('mobile-filter-popover')).toBeVisible()

    // Apply a status facet via the popover checkbox.
    await page.getByTestId('facet-option-checkbox').first().click()
    await page.getByTestId('mobile-filter-done').click()

    // The mobile chip strip shows under the column header.
    await expect(page.getByTestId('mobile-chip-strip')).toBeVisible()
    await expect(page.getByTestId('mobile-filter-chip')).toHaveCount(1)
  })
})
