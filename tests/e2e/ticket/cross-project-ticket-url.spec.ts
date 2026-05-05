/**
 * Cross-project ticket URL bug E2E Test
 *
 * Bug: Navigating to /prj/DEVPT/ticket/MDT-055?view=documents showed
 * RouteErrorModal ("Ticket 'MDT-055' not found") instead of rendering
 * the documents view. The ticket lookup error blocked the entire page.
 *
 * Fix: Ticket-not-found is now shown inline in the TicketViewer modal,
 * not as a full-page RouteErrorModal. The underlying view always renders.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForDocumentsReady } from '../utils/helpers.js'
import { documentSelectors, ticketSelectors } from '../utils/selectors.js'

test.describe('Cross-project ticket URL handling', () => {
  test('documents view renders with unknown ticket key in URL', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to a valid project but with a ticket key that doesn't exist
    await page.goto(`/prj/${scenario.projectCode}/ticket/ZZZ-999?view=documents`)

    // The documents view should still render — not a full-page error modal
    const documentTree = page.locator(documentSelectors.documentTree).first()
    await expect(documentTree).toBeVisible({ timeout: 10_000 })

    // There should NOT be a full-page error overlay
    await expect(page.locator('[data-testid="route-error"]')).not.toBeVisible()

    // The ticket viewer should show inline not-found
    await expect(page.locator('[data-testid="ticket-not-found"]')).toBeVisible()
    await expect(page.locator('[data-testid="ticket-not-found"]')).toContainText('ZZZ-999')
  })

  test('board view renders with unknown ticket key in URL', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to project with a non-existent ticket key (no view param = board)
    await page.goto(`/prj/${scenario.projectCode}/ticket/ZZZ-999`)

    // Board or list view should render (depends on localStorage preference)
    await expect(page.locator('[data-testid="kanban-board"], [data-testid="ticket-table"], [data-testid="ticket-list"]')).toBeVisible({ timeout: 10_000 })

    // No full-page error
    await expect(page.locator('[data-testid="route-error"]')).not.toBeVisible()

    // Ticket viewer shows inline not-found
    await expect(page.locator('[data-testid="ticket-not-found"]')).toBeVisible()
  })

  test('closing ticket-not-found returns to the underlying view', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}/ticket/ZZZ-999?view=documents`)

    // Wait for documents view
    const documentTree = page.locator(documentSelectors.documentTree).first()
    await expect(documentTree).toBeVisible({ timeout: 10_000 })

    // Close the ticket viewer
    await page.locator(ticketSelectors.closeDetail).click()

    // Ticket viewer should close
    await expect(page.locator('[data-testid="ticket-detail"]')).not.toBeVisible()

    // Documents view should remain visible
    await expect(documentTree).toBeVisible()
  })
})
