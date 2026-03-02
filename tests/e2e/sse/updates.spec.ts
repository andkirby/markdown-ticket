/**
 * SSE Real-time Updates E2E Tests - MDT-128 Task 9
 *
 * Tests Server-Sent Events (SSE) real-time updates when ticket files
 * are modified on disk via file system operations (not API calls).
 *
 * This is the RED phase - tests will fail until:
 * 1. SSE helper utilities are implemented (Task #11)
 * 2. File watching works correctly
 * 3. Frontend properly handles SSE events
 *
 * @see tests/e2e/AGENTS.md for test patterns
 * @see docs/CRs/MDT-106*.md for SSE architecture
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario, type ScenarioResult } from '../setup/index.js'
import { boardSelectors, ticketSelectors } from '../utils/selectors.js'
import { waitForBoardReady } from '../utils/helpers.js'
import * as fs from 'node:fs/promises'
import { join as pathJoin } from 'node:path'

/**
 * SSE Helper Utilities (TO BE IMPLEMENTED IN TASK #11)
 *
 * These placeholder imports will be replaced with actual implementations:
 *
 * import { modifyTicketFile } from '../utils/sse-helpers.js'
 * import { waitForSSEEvent } from '../utils/sse-helpers.js'
 *
 * For now, we use inline implementations marked with TODO comments.
 */

/**
 * Test suite for SSE real-time updates via file system modifications
 */
test.describe('SSE Real-time Updates - File System Modifications', () => {
  let scenario: ScenarioResult

  /**
   * Setup: Create test scenario once for all tests in this suite
   */
  test.beforeAll(async ({ e2eContext }) => {
    scenario = await buildScenario(e2eContext.projectFactory, 'simple')
  })

  /**
   * Scenario 1: File content update reflects immediately
   *
   * Modify ticket title on disk, verify board updates via SSE
   */
  test('file content update reflects immediately', async ({ page }) => {
    const { projectCode, crCodes, projectDir } = scenario
    const ticketCode = crCodes[0]
    const newTitle = 'Updated Title via File System'

    // Navigate to project
    await page.goto(`/prj/${projectCode}`)
    await waitForBoardReady(page)

    // Get initial ticket element
    const ticketSelector = boardSelectors.ticketByCode(ticketCode)
    const initialTicket = page.locator(ticketSelector)

    // Verify initial state
    await expect(initialTicket).toBeVisible()

    // TODO: Replace with actual SSE helper when available
    // const waitForUpdate = waitForSSEEvent(page, 'file-change', { ticketCode })

    // Modify ticket file on disk
    // TODO: Replace with modifyTicketFile helper
    await modifyTicketFileOnDisk(projectDir, ticketCode, { title: newTitle })

    // Wait for SSE event and verify update
    // TODO: await waitForUpdate
    await page.waitForTimeout(1000) // Placeholder - should wait for actual SSE event

    // Verify title updated on board
    await expect(initialTicket).toContainText(newTitle)
  })

  /**
   * Scenario 2: Status change moves ticket via SSE
   *
   * Modify status in frontmatter on disk, verify ticket moves to correct column
   */
  test('status change moves ticket via SSE', async ({ page }) => {
    const { projectCode, crCodes, projectDir } = scenario
    const ticketCode = crCodes[1]
    const newStatus = 'Implemented'

    // Navigate to project
    await page.goto(`/prj/${projectCode}`)
    await waitForBoardReady(page)

    // Get ticket element
    const ticketSelector = boardSelectors.ticketByCode(ticketCode)
    const ticket = page.locator(ticketSelector)

    // Verify initial position (should NOT be in Implemented column)
    const implementedColumn = page.locator(boardSelectors.columnByStatus(newStatus))
    const initialCount = await implementedColumn.locator(boardSelectors.ticketCard).count()

    // TODO: Replace with actual SSE helper when available
    // const waitForMove = waitForSSEEvent(page, 'file-change', { ticketCode, status: newStatus })

    // Modify status in ticket file on disk
    // TODO: Replace with modifyTicketFile helper
    await modifyTicketFileOnDisk(projectDir, ticketCode, { status: newStatus })

    // Wait for SSE event and verify move
    // TODO: await waitForMove
    await page.waitForTimeout(1000) // Placeholder - should wait for actual SSE event

    // Verify ticket moved to Implemented column
    const finalCount = await implementedColumn.locator(boardSelectors.ticketCard).count()
    expect(finalCount).toBe(initialCount + 1)

    // Verify ticket is now in the correct column
    await expect(ticket).toBeVisible()
    const ticketParent = await ticket.evaluateHandle(el => el.parentElement)
    const columnId = await ticketParent.evaluate(el => el?.getAttribute('data-testid'))
    expect(columnId).toBe(`column-${newStatus}`)
  })

  /**
   * Scenario 3: Bulk updates appear synchronously
   *
   * Modify 3 files on disk in quick succession, verify all updates appear
   */
  test('bulk updates appear synchronously', async ({ page, context }) => {
    const { projectCode, crCodes, projectDir } = scenario

    // Create second browser context to observe updates
    const secondContext = await context.browser()?.newContext()
    const secondPage = await secondContext?.newPage()
    if (!secondPage) {
      throw new Error('Failed to create second page')
    }

    try {
      // Both pages navigate to the same project
      await page.goto(`/prj/${projectCode}`)
      await secondPage.goto(`/prj/${projectCode}`)
      await waitForBoardReady(page)
      await waitForBoardReady(secondPage)

      // Get initial ticket count on first page
      const initialTickets = page.locator(boardSelectors.ticketCard)
      const initialCount = await initialTickets.count()

      // Prepare updates for 3 tickets
      const updates = [
        { code: crCodes[0], title: 'Bulk Update 1' },
        { code: crCodes[1], title: 'Bulk Update 2' },
        { code: crCodes[2], title: 'Bulk Update 3' },
      ]

      // TODO: Replace with actual SSE helper when available
      // const waitForBulkUpdates = Promise.all(
      //   updates.map(u => waitForSSEEvent(page, 'file-change', { ticketCode: u.code }))
      // )

      // Modify all 3 files in quick succession
      // TODO: Replace with modifyTicketFile helper
      await Promise.all(
        updates.map(update => modifyTicketFileOnDisk(projectDir, update.code, { title: update.title })),
      )

      // Wait for all SSE events
      // TODO: await waitForBulkUpdates
      await page.waitForTimeout(2000) // Placeholder - should wait for actual SSE events

      // Verify all updates reflected on first page
      for (const update of updates) {
        const ticketSelector = boardSelectors.ticketByCode(update.code)
        await expect(page.locator(ticketSelector)).toContainText(update.title)
      }

      // Verify second page also received all updates (multi-tab SSE)
      for (const update of updates) {
        const ticketSelector = boardSelectors.ticketByCode(update.code)
        await expect(secondPage.locator(ticketSelector)).toContainText(update.title)
      }

      // Ticket count should remain the same
      const finalCount = await initialTickets.count()
      expect(finalCount).toBe(initialCount)
    }
    finally {
      await secondContext?.close()
    }
  })

  /**
   * Scenario 4: Modal updates during external file change
   *
   * With modal open, modify file on disk, verify modal handles update gracefully
   */
  test('modal updates during external file change', async ({ page }) => {
    const { projectCode, crCodes, projectDir } = scenario
    const ticketCode = crCodes[0]
    const newTitle = 'Updated While Modal Open'

    // Navigate to project
    await page.goto(`/prj/${projectCode}`)
    await waitForBoardReady(page)

    // Click on ticket to open modal
    const ticketSelector = boardSelectors.ticketByCode(ticketCode)
    await page.click(ticketSelector)

    // Wait for modal to open
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()

    // Get initial title in modal
    const titleElement = page.locator(ticketSelectors.title)

    // TODO: Replace with actual SSE helper when available
    // const waitForModalUpdate = waitForSSEEvent(page, 'file-change', { ticketCode })

    // Modify ticket file on disk while modal is open
    // TODO: Replace with modifyTicketFile helper
    await modifyTicketFileOnDisk(projectDir, ticketCode, { title: newTitle })

    // Wait for SSE event
    // TODO: await waitForModalUpdate
    await page.waitForTimeout(1000) // Placeholder - should wait for actual SSE event

    // Verify modal updates with new title
    // (Implementation depends on how frontend handles modal updates during external changes)
    await expect(titleElement).toHaveText(newTitle, { timeout: 2000 })

    // Close modal
    await page.click(ticketSelectors.closeDetail)
    await expect(page.locator(ticketSelectors.detailPanel)).toBeHidden()

    // Verify board also shows updated title
    await expect(page.locator(ticketSelector)).toContainText(newTitle)
  })
})

/**
 * TEMPORARY FILE SYSTEM HELPER (TO BE REPLACED IN TASK #11)
 *
 * This is a placeholder implementation that will be replaced by
 * proper SSE helper utilities in tests/e2e/utils/sse-helpers.ts
 *
 * TODO: Move this to dedicated SSE helper module in Task #11
 */

interface TicketModification {
  title?: string
  status?: string
  priority?: string
  type?: string
}

/**
 * Modify ticket file on disk
 *
 * @param projectDir - Project directory path
 * @param ticketCode - Ticket code (e.g., 'TABC-1')
 * @param modifications - Fields to modify
 */
async function modifyTicketFileOnDisk(
  projectDir: string,
  ticketCode: string,
  modifications: TicketModification,
): Promise<void> {
  const ticketsPath = pathJoin(projectDir, 'docs', 'CRs', `${ticketCode}.md`)

  // Read existing file
  const content = await fs.readFile(ticketsPath, 'utf-8')

  // Parse frontmatter and content
  const frontmatterMatch = content.match(/^---\n([\s\S]+?)\n---/)
  if (!frontmatterMatch) {
    throw new Error(`Invalid ticket file format: ${ticketsPath}`)
  }

  const frontmatter = frontmatterMatch[1]
  const bodyContent = content.slice(frontmatterMatch[0].length).trimStart()

  // Parse YAML frontmatter (simple implementation for common fields)
  let updatedFrontmatter = frontmatter

  if (modifications.title) {
    updatedFrontmatter = updatedFrontmatter.replace(
      /title: ["'](.+?)["']/,
      `title: "${modifications.title}"`,
    )
  }

  if (modifications.status) {
    updatedFrontmatter = updatedFrontmatter.replace(
      /status: ["']?(.+?)["']?$/,
      `status: "${modifications.status}"`,
    )
  }

  if (modifications.priority) {
    updatedFrontmatter = updatedFrontmatter.replace(
      /priority: ["']?(.+?)["']?$/,
      `priority: "${modifications.priority}"`,
    )
  }

  if (modifications.type) {
    updatedFrontmatter = updatedFrontmatter.replace(
      /type: ["']?(.+?)["']?$/,
      `type: "${modifications.type}"`,
    )
  }

  // Reconstruct file with modified frontmatter
  const updatedContent = `---\n${updatedFrontmatter}---\n\n${bodyContent}`

  // Write back to disk (this triggers the file watcher)
  await fs.writeFile(ticketsPath, updatedContent, 'utf-8')
}
