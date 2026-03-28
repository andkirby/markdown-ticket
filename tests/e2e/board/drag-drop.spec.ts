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
import { waitForSSEEvent } from '../utils/sse-helpers.js'

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

    // Use the In Progress ticket so moving into Done exercises the resolution dialog.
    const inProgressTicketCode = scenario.crCodes[1] // "Add User Authentication" - In Progress status
    const targetStatus = 'Partially Implemented'

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Verify initial status
    const initialStatus = await getTicketStatus(page, inProgressTicketCode)
    expect(initialStatus).toBe('In Progress')

    // Drag ticket to Done and choose a specific resolution status.
    const ticket = page.locator(boardSelectors.ticketByCode(inProgressTicketCode))
    const doneColumn = page.locator(boardSelectors.columnByStatus('Implemented'))
    await ticket.dragTo(doneColumn)

    const resolutionDialog = page.locator(boardSelectors.resolutionDialog)
    await expect(resolutionDialog).toBeVisible()
    await page.click(boardSelectors.resolutionOption(targetStatus))

    // Verify ticket moved into Done and now shows the chosen resolution.
    const statusAfterDrag = await getTicketStatus(page, inProgressTicketCode)
    expect(statusAfterDrag).toBe('Implemented')
    await expect(page.locator(boardSelectors.ticketByCode(inProgressTicketCode))).toContainText(targetStatus)

    // Wait for SSE update to persist to backend
    await page.waitForTimeout(1500)

    // Refresh the page
    await page.reload()
    await waitForBoardReady(page)

    // Additional wait for data to load after refresh
    await page.waitForTimeout(500)

    // Verify ticket is still in Done after refresh and the chosen resolution persisted.
    const statusAfterRefresh = await getTicketStatus(page, inProgressTicketCode)
    expect(statusAfterRefresh).toBe('Implemented')
    await expect(page.locator(boardSelectors.ticketByCode(inProgressTicketCode))).toContainText(targetStatus)
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

    // Initialize file watcher for the test project's CRs folder
    const crsPath = `${scenario.projectDir}/docs/CRs/*.md`
    e2eContext.fileWatcher.initMultiProjectWatcher([
      { id: scenario.projectCode, path: crsPath },
    ])

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

      // Arm the SSE listener before the drag so the second page can't miss the broadcast.
      await Promise.all([
        waitForSSEEvent(secondPage, 'file-change', { filename: `${proposedTicketCode}.md` }),
        dragTicketToColumn(page, proposedTicketCode, targetStatus),
      ])

      // Give the second page time to process the event and update UI
      await secondPage.waitForTimeout(500)

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
