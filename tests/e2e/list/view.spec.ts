/**
 * List View E2E Tests
 *
 * Tests the list view functionality including:
 * 1. Table rendering with tickets
 * 2. Sorting by columns
 * 3. Clicking rows to open ticket details
 *
 * RED phase: Tests may fail due to missing selectors or implementation.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { listSelectors, navSelectors, ticketSelectors } from '../utils/selectors.js'

test.describe('List View', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to list view before each test
    await page.click(navSelectors.listTab)
  })

  test('table renders with tickets', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with multiple tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Act: Navigate to the project's list view
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForLoadState('load')

    // Wait for list container to be visible
    await page.waitForSelector(listSelectors.ticketList, { state: 'visible', timeout: 10000 })

    // Assert: Verify ticket list container exists
    const ticketList = page.locator(listSelectors.ticketList)
    await expect(ticketList).toBeVisible()

    // Assert: Verify ticket rows are rendered
    const ticketRows = page.locator(listSelectors.ticketRow)
    const rowCount = await ticketRows.count()

    // Should have at least the tickets we created
    expect(rowCount).toBeGreaterThanOrEqual(scenario.ticketCount)

    // Assert: Verify each row has expected data attributes
    for (const crCode of scenario.crCodes) {
      const row = page.locator(listSelectors.rowByCode(crCode))
      await expect(row).toBeVisible()
    }
  })

  test('sort changes ticket order', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with multiple tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Navigate to list view
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForLoadState('load')
    await page.waitForSelector(listSelectors.ticketList, { state: 'visible', timeout: 10000 })

    // Get initial order of tickets
    const getTicketCodes = async (): Promise<string[]> => {
      const codes = await page.locator(listSelectors.ticketRow).allTextContents()
      // Extract ticket codes from row content (assuming format like "ABC-1: Title")
      return codes.map(text => text.split(':')[0].trim())
    }

    const initialOrder = await getTicketCodes()

    // Act: Click on a column header to sort (e.g., by status)
    const statusSortButton = page.locator(listSelectors.sortButton('status'))
    await statusSortButton.click()

    // Wait for sorting to complete
    await page.waitForTimeout(500)

    // Assert: Verify order changed
    const sortedOrder = await getTicketCodes()
    expect(sortedOrder).not.toEqual(initialOrder)

    // Act: Click again to reverse sort
    await statusSortButton.click()
    await page.waitForTimeout(500)

    // Assert: Verify order changed again
    const reversedOrder = await getTicketCodes()
    expect(reversedOrder).not.toEqual(sortedOrder)
  })

  test('click row opens ticket detail', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Navigate to list view
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForLoadState('load')
    await page.waitForSelector(listSelectors.ticketList, { state: 'visible', timeout: 10000 })

    // Get the first ticket code
    const firstTicketCode = scenario.crCodes[0]

    // Act: Click on a ticket row
    const ticketRow = page.locator(listSelectors.rowByCode(firstTicketCode))
    await ticketRow.click()

    // Assert: Verify ticket detail modal/panel opens
    await page.waitForSelector(ticketSelectors.detailPanel, { state: 'visible', timeout: 5000 })

    // Assert: Verify ticket code in detail panel
    const detailCode = page.locator(ticketSelectors.code)
    await expect(detailCode).toBeVisible()
    await expect(detailCode).toContainText(firstTicketCode)

    // Assert: Verify ticket title in detail panel
    const detailTitle = page.locator(ticketSelectors.title)
    await expect(detailTitle).toBeVisible()

    // Cleanup: Close the detail panel
    await page.click(ticketSelectors.closeDetail)
    await page.waitForSelector(ticketSelectors.detailPanel, { state: 'hidden', timeout: 5000 })
  })
})
