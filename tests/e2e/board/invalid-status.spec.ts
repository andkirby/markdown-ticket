/**
 * Invalid Status Badge E2E Tests
 *
 * Tests visual highlighting and drag-drop behavior for tickets with invalid statuses.
 *
 * Coverage:
 * - Tickets with unknown/invalid status values (e.g., "In Review")
 * - Red border on ticket card
 * - Red badge with solid variant
 * - Free drag-drop between columns (no validation errors)
 * - Backend status update persists
 *
 * MDT-148: Invalid status support
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario, type ScenarioResult } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'
import { promises as fs } from 'fs'
import { join as pathJoin } from 'path'

test.describe('Invalid Status Badge', () => {
  let scenario: ScenarioResult

  /**
   * Scenario 1: Visual indicators for invalid status
   *
   * Verifies that tickets with invalid status show:
   * - Red border on ticket card (ticket-card--invalid)
   * - Red badge with solid variant (data-status="invalid")
   */
  test('shows red border and badge for ticket with invalid status', async ({ page, e2eContext }) => {
    // Arrange: Create a ticket with invalid status in markdown
    scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    const proposedTicketCode = scenario.crCodes[2]
    const ticketPath = pathJoin(scenario.projectDir, 'docs', 'CRs', `${proposedTicketCode}.md`)

    // Read current content and modify status to invalid value
    const content = await fs.readFile(ticketPath, 'utf-8')
    const invalidContent = content.replace(/^status: Proposed$/m, 'status: In Review')
    await fs.writeFile(ticketPath, invalidContent, 'utf-8')

    // Navigate to project board
    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForSelector(boardSelectors.board, { state: 'visible', timeout: 10000 })

    // Act: Locate ticket card
    const ticketCard = page.locator(boardSelectors.ticketByCode(proposedTicketCode))

    // Assert: Ticket card has red border (ticket-card--invalid class)
    await expect(ticketCard).toHaveClass(/ticket-card--invalid/)

    // Assert: Ticket card has data-invalid attribute
    await expect(ticketCard).toHaveAttribute('data-invalid', 'true')

    // Assert: Status badge exists
    const statusBadge = ticketCard.locator('[data-status="invalid"]')

    // Assert: Status badge is visible
    await expect(statusBadge).toBeVisible()

    // Assert: Status badge shows "In Review"
    await expect(statusBadge).toHaveText('In Review')

    // Assert: Status badge uses solid variant (red background, no border)
    const badgeClass = await statusBadge.getAttribute('class')
    expect(badgeClass).toContain('badge--invalid')
  })

  /**
   * Scenario 2: Drag ticket with invalid status without errors
   *
   * Verifies that tickets with invalid status can be moved between columns
   * without backend validation errors.
   */
  test('can drag ticket with invalid status to another column', async ({ page, e2eContext }) => {
    // Arrange: Same setup - ticket with "In Review" status
    scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    const proposedTicketCode = scenario.crCodes[2]
    const ticketPath = pathJoin(scenario.projectDir, 'docs', 'CRs', `${proposedTicketCode}.md`)

    // Modify status to invalid value
    const content = await fs.readFile(ticketPath, 'utf-8')
    const invalidContent = content.replace(/^status: Proposed$/m, 'status: In Review')
    await fs.writeFile(ticketPath, invalidContent, 'utf-8')

    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForSelector(boardSelectors.board, { state: 'visible', timeout: 10000 })

    const ticketCard = page.locator(boardSelectors.ticketByCode(proposedTicketCode))

    // Verify initial column is "Backlog" (Proposed tickets go here)
    const backLogColumn = page.locator(boardSelectors.columnByStatus('Backlog'))
    await expect(ticketCard).toHaveLocator('xpath=ancestor-or-self::*[data-testid="column-Backlog"]')

    // Act: Drag ticket to "In Progress" column
    const targetColumn = page.locator(boardSelectors.columnByStatus('In Progress'))

    await ticketCard.dragTo(targetColumn)

    // Wait for drop to complete and UI to update
    await page.waitForTimeout(1000)

    // Assert: No error toasts or alerts appeared
    const errorToast = page.locator('[data-testid="toast"]')
    const isVisible = await errorToast.isVisible().catch(() => false)
    expect(isVisible).toBe(false)

    // Assert: Ticket moved to "In Progress" column
    const inProgressColumn = page.locator(boardSelectors.columnByStatus('In Progress'))
    await expect(ticketCard).toHaveLocator('xpath=ancestor-or-self::*[data-testid="column-In Progress"]')

    // Assert: Ticket still shows invalid status badge (status not auto-corrected)
    const statusBadge = ticketCard.locator('[data-status="invalid"]')
    await expect(statusBadge).toHaveText('In Review')
  })

  /**
   * Scenario 3: Multiple tickets with different statuses
   *
   * Verifies that invalid status badges only affect specific tickets,
   * not all tickets on the board.
   */
  test('only highlights tickets with invalid status, not all tickets', async ({ page, e2eContext }) => {
    // Arrange: Create scenario with multiple tickets
    scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Modify one ticket to have invalid status
    const firstTicketCode = scenario.crCodes[0]
    const ticketPath = pathJoin(scenario.projectDir, 'docs', 'CRs', `${firstTicketCode}.md`)

    const content = await fs.readFile(ticketPath, 'utf-8')
    const invalidContent = content.replace(/^status: \w+$/m, 'status: In Review')
    await fs.writeFile(ticketPath, invalidContent, 'utf-8')

    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForSelector(boardSelectors.board, { state: 'visible', timeout: 10000 })

    // Act: Check all ticket cards on the board
    const allTicketCards = page.locator(boardSelectors.ticketCard)

    const ticketCount = await allTicketCards.count()

    let invalidBadgeCount = 0

    // Assert: Check each ticket for invalid status badge
    for (let i = 0; i < ticketCount; i++) {
      const card = allTicketCards.nth(i)
      const invalidBadge = card.locator('[data-status="invalid"]')

      const hasInvalidBadge = await invalidBadge.isVisible().catch(() => false)

      if (hasInvalidBadge) {
        invalidBadgeCount++
        // Assert: This specific ticket has red border
        await expect(card).toHaveClass(/ticket-card--invalid/)
      }
      else {
        // Assert: Valid tickets do NOT have red border
        await expect(card).not.toHaveClass(/ticket-card--invalid/)
      }
    }

    // Assert: Exactly one ticket has invalid badge
    expect(invalidBadgeCount).toBe(1)
  })

  /**
   * Scenario 4: Status persists after page refresh
   *
   * Verifies that invalid status badge remains visible after
   * refreshing the page (status is stored in file, not corrected).
   */
  test('invalid status badge persists after page refresh', async ({ page, e2eContext }) => {
    // Arrange: Create ticket with invalid status
    scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    const proposedTicketCode = scenario.crCodes[2]
    const ticketPath = pathJoin(scenario.projectDir, 'docs', 'CRs', `${proposedTicketCode}.md`)

    const content = await fs.readFile(ticketPath, 'utf-8')
    const invalidContent = content.replace(/^status: Proposed$/m, 'status: In Review')
    await fs.writeFile(ticketPath, invalidContent, 'utf-8')

    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForSelector(boardSelectors.board, { state: 'visible', timeout: 10000 })

    const ticketCard = page.locator(boardSelectors.ticketByCode(proposedTicketCode))

    // Assert: Invalid status badge is visible
    const statusBadge = ticketCard.locator('[data-status="invalid"]')
    await expect(statusBadge).toBeVisible()

    // Act: Refresh the page
    await page.reload()
    await page.waitForSelector(boardSelectors.board, { state: 'visible', timeout: 10000 })

    // Assert: Invalid status badge is still visible after refresh
    await expect(statusBadge).toBeVisible()

    // Assert: Ticket card still has red border
    await expect(ticketCard).toHaveClass(/ticket-card--invalid/)
  })

  /**
   * Scenario 5: Different invalid status values
   *
   * Tests that various invalid status values all show the same
   * warning indication.
   */
  test('various invalid status values all show warning badge', async ({ page, e2eContext }) => {
    const invalidStatuses = [
      'In Review',
      'Under Review',
      'Awaiting Approval',
      'Unknown',
      'Draft',
      'Archived',
    ]

    for (const invalidStatus of invalidStatuses) {
      // Arrange: Create ticket and set invalid status
      scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[2]
      const ticketPath = pathJoin(scenario.projectDir, 'docs', 'CRs', `${ticketCode}.md`)

      const content = await fs.readFile(ticketPath, 'utf-8')
      const invalidContent = content.replace(/^status: \w+$/m, `status: ${invalidStatus}`)
      await fs.writeFile(ticketPath, invalidContent, 'utf-8')

      await page.goto(`/prj/${scenario.projectCode}`)
      await page.waitForSelector(boardSelectors.board, { state: 'visible', timeout: 10000 })

      // Act: Check for invalid badge
      const ticketCard = page.locator(boardSelectors.ticketByCode(ticketCode))
      const statusBadge = ticketCard.locator('[data-status="invalid"]')

      // Assert: Invalid status badge is visible
      await expect(statusBadge).toBeVisible()

      // Assert: Badge text matches invalid status value
      await expect(statusBadge).toHaveText(invalidStatus)
    }
  })
})
