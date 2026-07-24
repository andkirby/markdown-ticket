/**
 * Board Filter Bar E2E (MDT-196)
 *
 * Verifies the faceted filter bar through the real app: applying a facet
 * narrows the board, the result count updates, chips render and remove,
 * Clear all resets, and filters persist across a page reload.
 *
 * The desktop filter is a compact "Filter · N" button inline in the header
 * that opens a popover with a two-column facet grid (Type | Status,
 * Priority | Assignee). Mobile entry is via the Hamburger Menu, which opens
 * a bottom-anchored filter sheet.
 *
 * Predicate semantics (AND/OR/empty/query) are covered exhaustively at the
 * unit level (src/utils/ticketFilters.test.ts). This file proves the chrome
 * is wired to the predicate end-to-end.
 *
 * Scenario data (simple):
 *   1. "Setup Project Structure"  — Architecture, Implemented, High
 *   2. "Add User Authentication"  — Feature Enhancement, In Progress, Medium
 *   3. "Fix Navigation Bug"       — Bug Fix, Proposed, High
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady, getTicketCount } from '../utils/helpers.js'

test.describe('Board Filter Bar (MDT-196)', () => {
  test.describe.configure({ mode: 'serial' })

  test('desktop: applying a status facet narrows the board', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const initialCount = await getTicketCount(page)
    expect(initialCount).toBe(3)

    // Open the filter popover via the compact Filter button.
    await page.getByTestId('filter-button').click()
    await expect(page.getByTestId('filter-popover')).toBeVisible()

    // The popover renders a two-column facet grid with 4 sections.
    await expect(page.getByTestId('facet-section')).toHaveCount(4)

    // Toggle "Proposed" in the Status facet.
    await page.getByTestId('facet-section').filter({ hasText: 'Status' })
      .getByTestId('facet-option-checkbox').filter({ hasText: 'Proposed' }).click()

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

    // Apply a priority filter via the popover.
    await page.getByTestId('filter-button').click()
    await page.getByTestId('facet-section').filter({ hasText: 'Priority' })
      .getByTestId('facet-option-checkbox').filter({ hasText: 'High' }).click()

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
    await page.getByTestId('filter-button').click()
    await page.getByTestId('facet-section').filter({ hasText: 'Type' })
      .getByTestId('facet-option-checkbox').filter({ hasText: 'Bug Fix' }).click()

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
    await page.getByTestId('filter-button').click()
    await page.getByTestId('facet-section').filter({ hasText: 'Type' })
      .getByTestId('facet-option-checkbox').filter({ hasText: 'Feature Enhancement' }).click()

    // "Add User Authentication" is Feature Enhancement and matches the query.
    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 1 of 3')
  })

  test('desktop: two-column facet grid renders all four sections', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await page.getByTestId('filter-button').click()

    // All four facet sections are present and labeled.
    const sections = page.getByTestId('facet-section')
    await expect(sections).toHaveCount(4)
    await expect(sections.filter({ hasText: 'Type' })).toBeVisible()
    await expect(sections.filter({ hasText: 'Status' })).toBeVisible()
    await expect(sections.filter({ hasText: 'Priority' })).toBeVisible()
    await expect(sections.filter({ hasText: 'Assignee' })).toBeVisible()
  })

  test('persistence: filters survive a page reload', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Apply a status filter.
    await page.getByTestId('filter-button').click()
    await page.getByTestId('facet-section').filter({ hasText: 'Status' })
      .getByTestId('facet-option-checkbox').filter({ hasText: 'In Progress' }).click()

    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 1 of 3')

    // Reload — the filter should be restored from localStorage.
    await page.reload()
    await waitForBoardReady(page)

    await expect(page.getByTestId('filter-result-count')).toContainText('Showing 1 of 3')
  })

  test('mobile: filter sheet opens from Hamburger Menu and applies a facet', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Set a mobile viewport (< 640px = below the sm breakpoint).
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open the Hamburger Menu, then tap the Filter row.
    await page.getByTestId('hamburger-menu').click()
    const filterRow = page.getByTestId('hamburger-filter-row')
    await expect(filterRow).toBeVisible()
    await filterRow.click()

    // The bottom-anchored filter sheet opens.
    const sheet = page.getByTestId('mobile-filter-sheet')
    await expect(sheet).toBeVisible()

    // Apply a status facet via the sheet checkbox.
    await sheet.getByTestId('facet-section').filter({ hasText: 'Status' })
      .getByTestId('facet-option-checkbox').first().click()
    await page.getByTestId('mobile-filter-done').click()

    // The mobile chip strip shows under the column header.
    await expect(page.getByTestId('mobile-chip-strip')).toBeVisible()
    await expect(page.getByTestId('mobile-filter-chip')).toHaveCount(1)
  })

  test('mobile: Filter row is wrapped in separators', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await page.getByTestId('hamburger-menu').click()

    // The Filter row container has border-t and border-b classes (separator).
    const filterContainer = page.locator('[data-testid="hamburger-filter-row"]').locator('..')
    await expect(filterContainer).toHaveClass(/border-t/)
    await expect(filterContainer).toHaveClass(/border-b/)
  })
})
