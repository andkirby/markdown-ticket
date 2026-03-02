/**
 * Navigation Smoke Tests
 *
 * Verifies critical UI navigation paths:
 * 1. Root path redirects to first project
 * 2. View mode switching works (board/list/documents)
 * 3. Project selector switches projects
 * 4. Direct ticket URL opens modal
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario, type ScenarioResult } from '../setup/index.js'
import { navSelectors, ticketSelectors, commonSelectors } from '../utils/selectors.js'
import { waitForBoardReady } from '../utils/helpers.js'

/**
 * Test suite for navigation functionality
 */
test.describe('Navigation', () => {
  test.describe('Root path redirect', () => {
    test('redirects to first project', async ({ page, e2eContext }) => {
      // Create a project
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

      // Navigate to root path
      await page.goto('/')

      // Wait for redirect and board to load
      await waitForBoardReady(page)

      // Verify URL was redirected to project
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}`)

      // Verify board is visible
      await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible()
    })
  })

  test.describe('View mode switching', () => {
    let scenario: ScenarioResult | null = null

    test.beforeEach(async ({ page, e2eContext }) => {
      // Create a project for each test
      scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)
    })

    test('switches from board to list view', async ({ page }) => {
      // Click list tab
      await page.click(navSelectors.listTab)

      // Verify list view is visible
      await expect(page.locator('[data-testid="ticket-list"]')).toBeVisible()

      // Verify board is hidden or not the main view
      await expect(page.locator('[data-testid="kanban-board"]')).not.toBeVisible()
    })

    test('switches from board to documents view', async ({ page }) => {
      // Click documents tab
      await page.click(navSelectors.documentsTab)

      // Verify documents view is visible
      await expect(page.locator('[data-testid="document-tree"]')).toBeVisible()

      // Verify board is hidden or not the main view
      await expect(page.locator('[data-testid="kanban-board"]')).not.toBeVisible()
    })

    test('switches from list back to board view', async ({ page }) => {
      // First switch to list view
      await page.click(navSelectors.listTab)
      await expect(page.locator('[data-testid="ticket-list"]')).toBeVisible()

      // Then switch back to board view
      await page.click(navSelectors.boardTab)
      await waitForBoardReady(page)

      // Verify board is visible again
      await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible()

      // Verify list is hidden
      await expect(page.locator('[data-testid="ticket-list"]')).not.toBeVisible()
    })

    test('switches from documents back to board view', async ({ page }) => {
      // First switch to documents view
      await page.click(navSelectors.documentsTab)
      await expect(page.locator('[data-testid="document-tree"]')).toBeVisible()

      // Then switch back to board view
      await page.click(navSelectors.boardTab)
      await waitForBoardReady(page)

      // Verify board is visible again
      await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible()

      // Verify documents tree is hidden
      await expect(page.locator('[data-testid="document-tree"]')).not.toBeVisible()
    })
  })

  test.describe('Project switching', () => {
    test('switches between two projects', async ({ page, e2eContext }) => {
      // Create first project
      const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')

      // Create second project with a different code
      const secondProject = await e2eContext.projectFactory.createProject('empty', {
        name: 'Second Test Project',
        code: 'TST2',
      })

      // Add a ticket to the second project so we can verify it loaded
      const secondProjectTicket = await e2eContext.projectFactory.createTestCR(secondProject.key, {
        title: 'Second Project Ticket',
        type: 'Feature Enhancement',
        status: 'Proposed',
        priority: 'Medium',
        content: 'This ticket belongs to the second project.',
      })

      // Navigate to first project
      await page.goto(`/prj/${firstProject.projectCode}`)
      await waitForBoardReady(page)

      // Verify first project tickets are visible
      await expect(page.locator(`[data-testid="ticket-${firstProject.crCodes[0]}"]`)).toBeVisible()

      // Click second project option
      await page.click(`[data-testid="project-option-${secondProject.key}"]`)
      await waitForBoardReady(page)

      // Verify URL changed to second project
      await expect(page).toHaveURL(`/prj/${secondProject.key}`)

      // Verify second project ticket is visible (using the actual created CR code)
      await expect(page.locator(`[data-testid="ticket-${secondProjectTicket}"]`)).toBeVisible()

      // Verify first project tickets are not visible
      await expect(page.locator(`[data-testid="ticket-${firstProject.crCodes[0]}"]`)).not.toBeVisible()
    })

    test('project button is active for current project', async ({ page, e2eContext }) => {
      // Create two projects
      const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
      const secondProject = await e2eContext.projectFactory.createProject('empty', {
        name: 'Second Project',
      })

      // Navigate to first project
      await page.goto(`/prj/${firstProject.projectCode}`)
      await waitForBoardReady(page)

      // Verify first project button has active state
      const firstProjectButton = page.locator(`[data-testid="project-option-${firstProject.projectCode}"]`)
      await expect(firstProjectButton).toHaveAttribute('data-active', 'true')

      // Verify second project button does not have active state
      const secondProjectButton = page.locator(`[data-testid="project-option-${secondProject.key}"]`)
      await expect(secondProjectButton).not.toHaveAttribute('data-active', 'true')

      // Switch to second project
      await secondProjectButton.click()
      await waitForBoardReady(page)

      // Verify second project button now has active state
      await expect(secondProjectButton).toHaveAttribute('data-active', 'true')

      // Verify first project button no longer has active state
      await expect(firstProjectButton).not.toHaveAttribute('data-active', 'true')
    })
  })

  test.describe('Direct ticket URLs', () => {
    test('opens ticket modal from direct URL', async ({ page, e2eContext }) => {
      // Create a project with tickets
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0] // e.g., 'TEST-1'

      // Navigate directly to ticket URL
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await page.waitForLoadState('load')

      // Wait for modal to appear
      await expect(page.locator(commonSelectors.modal)).toBeVisible()

      // Verify ticket detail panel is open
      await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()

      // Verify ticket code is displayed
      await expect(page.locator(ticketSelectors.code)).toContainText(ticketCode)
    })

    test('closing modal returns to board view', async ({ page, e2eContext }) => {
      // Create a project with tickets
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Navigate directly to ticket URL
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await page.waitForLoadState('load')

      // Wait for modal to appear
      await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()

      // Close the modal
      await page.click(ticketSelectors.closeDetail)

      // Verify modal is closed
      await expect(page.locator(ticketSelectors.detailPanel)).not.toBeVisible()

      // Verify board is still visible
      await expect(page.locator('[data-testid="kanban-board"]')).toBeVisible()

      // Verify URL no longer contains ticket path
      await expect(page).toHaveURL(`/prj/${scenario.projectCode}`)
    })

    test('opening different tickets updates modal content', async ({ page, e2eContext }) => {
      // Create a project with multiple tickets
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const [firstTicket, secondTicket] = scenario.crCodes

      // Navigate to first ticket
      await page.goto(`/prj/${scenario.projectCode}/ticket/${firstTicket}`)
      await page.waitForLoadState('load')
      await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()

      // Verify first ticket code is shown
      await expect(page.locator(ticketSelectors.code)).toContainText(firstTicket)

      // Navigate to second ticket (by updating URL)
      await page.goto(`/prj/${scenario.projectCode}/ticket/${secondTicket}`)
      await page.waitForLoadState('load')

      // Verify second ticket code is now shown
      await expect(page.locator(ticketSelectors.code)).toContainText(secondTicket)
    })
  })
})
