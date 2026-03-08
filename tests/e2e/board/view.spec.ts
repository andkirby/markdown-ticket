/**
 * Board View E2E Tests
 *
 * Tests the board view functionality including:
 * 1. Board rendering with tickets in columns
 * 2. Sorting tickets within columns
 *
 * RED phase: Tests may fail due to missing selectors or implementation.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'

test.describe('Board View', () => {
  test.beforeEach(async () => {
    // Note: beforeEach doesn't have access to e2eContext, so tests navigate directly
  })

  test('board renders with tickets in columns', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with multiple tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Act: Navigate to the project's board view (board is default, no suffix needed)
    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForLoadState('load')

    // Wait for board container to be visible
    await page.waitForSelector(boardSelectors.board, { state: 'visible', timeout: 10000 })

    // Assert: Verify board container exists
    const board = page.locator(boardSelectors.board)
    await expect(board).toBeVisible()

    // Assert: Verify ticket cards are rendered
    const ticketCards = page.locator(boardSelectors.ticketCard)
    const cardCount = await ticketCards.count()

    // Should have at least the tickets we created
    expect(cardCount).toBeGreaterThanOrEqual(scenario.ticketCount)

    // Assert: Verify expected tickets are visible
    for (const crCode of scenario.crCodes) {
      const card = page.locator(boardSelectors.ticketByCode(crCode))
      await expect(card).toBeVisible()
    }
  })

  test('sort changes ticket order within columns', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with multiple tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Navigate to board view
    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForLoadState('load')
    await page.waitForSelector(boardSelectors.board, { state: 'visible', timeout: 10000 })

    // Get initial order of tickets in the "Proposed" column
    const proposedColumn = page.locator(boardSelectors.columnByStatus('Proposed'))
    await expect(proposedColumn).toBeVisible()

    const getTicketCodesInColumn = async (column: typeof proposedColumn): Promise<string[]> => {
      const cards = column.locator(boardSelectors.ticketCard)
      const count = await cards.count()
      const codes: string[] = []
      for (let i = 0; i < count; i++) {
        const card = cards.nth(i)
        const testId = await card.getAttribute('data-testid')
        // Extract code from testid like "ticket-card ABC-123"
        const match = testId?.match(/ticket-[A-Z0-9-]+/)
        if (match) {
          codes.push(match[0].replace('ticket-', ''))
        }
      }
      return codes
    }

    const initialOrder = await getTicketCodesInColumn(proposedColumn)

    // Skip test if no tickets in Proposed column
    if (initialOrder.length === 0) {
      test.skip()
      return
    }

    // Act: Select Title from sort dropdown
    const sortSelect = page.locator('[data-testid="sort-controls"] select')
    await sortSelect.selectOption({ label: 'Title' })

    // Wait for sorting to complete
    await page.waitForTimeout(500)

    // Assert: Verify order changed after sorting by title
    const sortedOrder = await getTicketCodesInColumn(proposedColumn)
    expect(sortedOrder.length).toBe(initialOrder.length)

    // Verify that the order actually changed (not just the count)
    expect(sortedOrder).not.toEqual(initialOrder)

    // Act: Toggle sort direction
    const directionToggle = page.locator('[data-testid="sort-controls"] button')
    await directionToggle.click()
    await page.waitForTimeout(500)

    // Assert: Verify order was reversed
    const reversedOrder = await getTicketCodesInColumn(proposedColumn)
    expect(reversedOrder.length).toBe(initialOrder.length)

    // Verify that reversing the direction actually reversed the order
    expect(reversedOrder).toEqual([...sortedOrder].reverse())
  })

  test('sort applies to all columns simultaneously', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with tickets across multiple statuses
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Navigate to board view
    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForLoadState('load')
    await page.waitForSelector(boardSelectors.board, { state: 'visible', timeout: 10000 })

    // Get initial state across all columns
    const getAllTicketCodes = async (): Promise<string[]> => {
      const cards = page.locator(boardSelectors.ticketCard)
      const count = await cards.count()
      const codes: string[] = []
      for (let i = 0; i < count; i++) {
        const card = cards.nth(i)
        const testId = await card.getAttribute('data-testid')
        const match = testId?.match(/ticket-[A-Z0-9-]+/)
        if (match) {
          codes.push(match[0].replace('ticket-', ''))
        }
      }
      return codes
    }

    const initialOrder = await getAllTicketCodes()
    expect(initialOrder.length).toBeGreaterThan(0)

    // Act: Change sort attribute (use Title to ensure order change)
    const sortSelect = page.locator('[data-testid="sort-controls"] select')
    await sortSelect.selectOption({ label: 'Title' })

    // Wait for sorting to complete
    await page.waitForTimeout(500)

    // Assert: Verify all tickets are still present
    const sortedOrder = await getAllTicketCodes()
    expect(sortedOrder.length).toBe(initialOrder.length)

    // Verify that tickets were reordered
    expect(sortedOrder).not.toEqual(initialOrder)

    // Verify same tickets are present (just in different order)
    const sortedSet = new Set(sortedOrder)
    const initialSet = new Set(initialOrder)
    for (const ticket of initialSet) {
      expect(sortedSet.has(ticket)).toBe(true)
    }
  })
})
