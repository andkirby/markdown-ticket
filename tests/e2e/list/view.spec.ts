/**
 * List View E2E Tests
 *
 * Tests the list view functionality including:
 * 1. Table rendering with tickets
 * 2. Sorting by columns
 * 3. Clicking rows to open ticket details
 *
 * Desktop uses table view (ticket-table, ticket-row-*)
 * Mobile uses card view (ticket-list, ticket-card-*)
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { listSelectors, ticketSelectors } from '../utils/selectors.js'

test.describe('List View', () => {
  test.beforeEach(async () => {
    // Navigate to list view before each test - will be done in each test
    // Note: beforeEach doesn't have access to e2eContext, so tests navigate directly
  })

  test('table renders with tickets', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with multiple tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Act: Navigate to the project's list view
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForLoadState('load')

    // Wait for either table (desktop) or list (mobile) to be visible
    await page.waitForSelector(`${listSelectors.ticketTable}, ${listSelectors.ticketList}`, { state: 'visible', timeout: 10000 })

    // Assert: Verify ticket items are rendered (desktop rows or mobile cards)
    const ticketItems = page.locator(listSelectors.ticketItem)
    const itemCount = await ticketItems.count()

    // Should have at least the tickets we created
    expect(itemCount).toBeGreaterThanOrEqual(scenario.ticketCount)

    // Assert: Verify each item has expected data attributes
    for (const crCode of scenario.crCodes) {
      const item = page.locator(listSelectors.itemByCode(crCode))
      await expect(item.first()).toBeVisible()
    }
  })

  test('sort changes ticket order', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with multiple tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Navigate to list view
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForLoadState('load')
    await page.waitForSelector(`${listSelectors.ticketTable}, ${listSelectors.ticketList}`, { state: 'visible', timeout: 10000 })

    // Get initial order of tickets (using data-testid attributes)
    const getTicketCodes = async (): Promise<string[]> => {
      const items = page.locator(listSelectors.ticketItem)
      const count = await items.count()
      const codes: string[] = []
      for (let i = 0; i < count; i++) {
        const item = items.nth(i)
        const testId = await item.getAttribute('data-testid')
        // Extract code from testid like "ticket-row-ABC-1" or "ticket-card-ABC-1"
        const match = testId?.match(/ticket-(?:row|card)-([A-Z0-9-]+)/)
        if (match) {
          codes.push(match[1])
        }
      }
      return codes
    }

    const initialOrder = await getTicketCodes()
    expect(initialOrder.length).toBeGreaterThan(0)

    // Act: Select Title from sort dropdown (available option)
    const sortSelect = page.locator('[data-testid="sort-controls"] select')
    await sortSelect.selectOption({ label: 'Title' })

    // Wait for sorting to complete
    await page.waitForTimeout(500)

    // Assert: Verify order changed after sorting by title
    const sortedOrder = await getTicketCodes()
    expect(sortedOrder.length).toBe(initialOrder.length)

    // Verify that the order actually changed (not just the count)
    // This assertion will fail if sorting doesn't work
    expect(sortedOrder).not.toEqual(initialOrder)

    // Act: Toggle sort direction
    const directionToggle = page.locator('[data-testid="sort-controls"] button')
    await directionToggle.click()
    await page.waitForTimeout(500)

    // Assert: Verify order was reversed
    const reversedOrder = await getTicketCodes()
    expect(reversedOrder.length).toBe(initialOrder.length)

    // Verify that reversing the direction actually reversed the order
    expect(reversedOrder).toEqual([...sortedOrder].reverse())
  })

  test('click row opens ticket detail', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Navigate to list view
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForLoadState('load')
    await page.waitForSelector(`${listSelectors.ticketTable}, ${listSelectors.ticketList}`, { state: 'visible', timeout: 10000 })

    // Get the first ticket code
    const firstTicketCode = scenario.crCodes[0]

    // Act: Click on a ticket item (this navigates to ticket detail URL which opens modal)
    const ticketItem = page.locator(listSelectors.itemByCode(firstTicketCode))
    await ticketItem.first().click()

    // Wait for navigation to complete and modal to appear
    await page.waitForLoadState('load')
    await page.waitForTimeout(500) // Allow modal animation

    // Assert: Verify ticket detail modal/panel opens
    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await expect(detailPanel).toBeVisible({ timeout: 5000 })

    // Assert: Verify ticket code in detail panel (scope to detail panel to avoid strict mode violation)
    const detailCode = detailPanel.locator(ticketSelectors.code)
    await expect(detailCode).toBeVisible()
    await expect(detailCode).toContainText(firstTicketCode)

    // Assert: Verify ticket title in detail panel
    const detailTitle = detailPanel.locator(ticketSelectors.title)
    await expect(detailTitle).toBeVisible()

    // Cleanup: Close the detail panel
    await page.click(ticketSelectors.closeDetail)
    await page.waitForSelector(ticketSelectors.detailPanel, { state: 'hidden', timeout: 5000 })
  })
})
