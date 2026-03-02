/**
 * Board Drag-Drop E2E Tests
 *
 * Tests drag-and-drop functionality on the Kanban board:
 * 1. Drag ticket between columns - Basic drag from "Proposed" to "In Progress"
 * 2. Ticket persists after page refresh - Verify move persists across page reloads
 * 3. SSE event received after drop - Use 2 browser contexts to verify real-time sync
 *
 * RED phase: Tests may fail due to missing data-testid attributes (dragHandle, dropZone)
 * that need to be added to TicketCard and KanbanBoard components.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'
import { dragTicketToColumn, getTicketStatus, waitForBoardReady } from '../utils/helpers.js'

test.describe('Board Drag-Drop', () => {
  test.describe.configure({ mode: 'serial' })

  /**
   * Scenario 1: Drag ticket between columns
   *
   * Prerequisites:
   * - TicketCard component needs data-testid="drag-handle" on the drag handle element
   * - TicketCard component needs data-testid="ticket-{code}" on the ticket card element
   * - KanbanBoard column needs data-testid="column-{status}" for each status column
   */
  test('drags ticket from Proposed to In Progress column', async ({ page, e2eContext }) => {
    // Create test data with simple scenario (3 tickets: Implemented, In Progress, Proposed)
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Find the Proposed ticket (third ticket in simple scenario)
    const proposedTicketCode = scenario.crCodes[2] // "Fix Navigation Bug" - Proposed status
    const targetStatus = 'In Progress'

    // Navigate directly to project to ensure correct project is selected
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Verify ticket is in Proposed column before drag
    const initialStatus = await getTicketStatus(page, proposedTicketCode)
    expect(initialStatus).toBe('Proposed')

    // Drag ticket to target column using dragHandle selector
    const ticketSelector = boardSelectors.ticketByCode(proposedTicketCode)
    const targetColumnSelector = boardSelectors.columnByStatus(targetStatus)

    const ticket = page.locator(ticketSelector)
    const targetColumn = page.locator(targetColumnSelector)

    // Use the drag handle if available, otherwise fall back to ticket card
    const dragHandle = ticket.locator(boardSelectors.dragHandle)
    const sourceElement = (await dragHandle.count()) > 0 ? dragHandle : ticket

    await sourceElement.dragTo(targetColumn)

    // Wait for drop to complete and UI to update
    await page.waitForTimeout(500)

    // Verify ticket is now in the target column
    const newStatus = await getTicketStatus(page, proposedTicketCode)
    expect(newStatus).toBe(targetStatus)
  })

  /**
   * Scenario 2: Ticket persists after page refresh
   *
   * Verifies that status changes are persisted to the backend
   * and survive page reloads.
   */
  test('ticket move persists after page refresh', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Use the Proposed ticket
    const proposedTicketCode = scenario.crCodes[2] // "Fix Navigation Bug" - Proposed status
    const targetStatus = 'Implemented'

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Verify initial status
    const initialStatus = await getTicketStatus(page, proposedTicketCode)
    expect(initialStatus).toBe('Proposed')

    // Drag ticket to Implemented column
    await dragTicketToColumn(page, proposedTicketCode, targetStatus)

    // Verify ticket moved in UI
    const statusAfterDrag = await getTicketStatus(page, proposedTicketCode)
    expect(statusAfterDrag).toBe(targetStatus)

    // Refresh the page
    await page.reload()
    await waitForBoardReady(page)

    // Verify ticket is still in the new column after refresh
    const statusAfterRefresh = await getTicketStatus(page, proposedTicketCode)
    expect(statusAfterRefresh).toBe(targetStatus)
  })

  /**
   * Scenario 3: SSE event received after drop (real-time sync)
   *
   * Uses 2 browser contexts to verify that changes made in one context
   * are immediately reflected in another context via SSE events.
   *
   * Prerequisites:
   * - SSE connection must be established on page load
   * - Backend must broadcast ticket updates via SSE
   * - Frontend must handle SSE events and update UI
   */
  test('SSE event syncs ticket move across browser contexts', async ({ page, context, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    const proposedTicketCode = scenario.crCodes[2] // "Fix Navigation Bug" - Proposed status
    const targetStatus = 'In Progress'

    // Create second browser context and page
    const secondContext = await context.browser()?.newContext()
    if (!secondContext) {
      throw new Error('Failed to create second browser context')
    }

    const secondPage = await secondContext.newPage()

    try {
      // Navigate both pages to the same project
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      await secondPage.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(secondPage)

      // Verify both pages show the ticket in Proposed column
      const firstPageInitialStatus = await getTicketStatus(page, proposedTicketCode)
      const secondPageInitialStatus = await getTicketStatus(secondPage, proposedTicketCode)

      expect(firstPageInitialStatus).toBe('Proposed')
      expect(secondPageInitialStatus).toBe('Proposed')

      // Drag ticket in first page
      await dragTicketToColumn(page, proposedTicketCode, targetStatus)

      // Wait for SSE event to propagate and second page to update
      // The timeout accounts for network latency and UI rendering
      await page.waitForTimeout(1000)

      // Verify second page shows the updated status via SSE
      const secondPageUpdatedStatus = await getTicketStatus(secondPage, proposedTicketCode)
      expect(secondPageUpdatedStatus).toBe(targetStatus)

      // Verify first page also shows updated status
      const firstPageUpdatedStatus = await getTicketStatus(page, proposedTicketCode)
      expect(firstPageUpdatedStatus).toBe(targetStatus)
    }
    finally {
      // Clean up second context
      await secondContext.close()
    }
  })
})
