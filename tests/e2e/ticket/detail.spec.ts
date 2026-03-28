/**
 * Ticket Detail Modal E2E Tests
 *
 * RED phase - Tests verify ticket detail modal behavior:
 * 1. Click card opens modal
 * 2. All attributes display (title, code, status, type, priority, assignee)
 * 3. Markdown content renders
 * 4. Close button returns to view
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady, openTicketDetail, closeTicketDetail } from '../utils/helpers.js'
import { boardSelectors, ticketSelectors } from '../utils/selectors.js'

test.describe('Ticket Detail Modal', () => {
  test('click card opens modal', async ({ page, e2eContext }) => {
    // Create isolated test data
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to board
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Click first ticket card
    const firstTicket = page.locator(boardSelectors.ticketCard).first()
    await firstTicket.click()

    // Verify detail panel appears
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()
  })

  test('all attributes display', async ({ page, e2eContext }) => {
    // Create isolated test data
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to board
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open first ticket detail
    const firstTicketCode = scenario.crCodes[0]
    await openTicketDetail(page, firstTicketCode)

    // Scope selectors to detail panel to avoid strict mode violations
    const detailPanel = page.locator(ticketSelectors.detailPanel)

    // Verify all ticket attributes are visible within detail panel
    await expect(detailPanel.locator(ticketSelectors.title)).toBeVisible()
    await expect(detailPanel.locator(ticketSelectors.code)).toBeVisible()
    await expect(detailPanel.locator(ticketSelectors.statusBadge)).toBeVisible()
    await expect(detailPanel.locator(ticketSelectors.typeBadge)).toBeVisible()
    await expect(detailPanel.locator(ticketSelectors.priorityBadge)).toBeVisible()
  })

  test('markdown content renders', async ({ page, e2eContext }) => {
    // Create isolated test data
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to board
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open first ticket detail
    const firstTicketCode = scenario.crCodes[0]
    await openTicketDetail(page, firstTicketCode)

    // Verify content area is visible
    await expect(page.locator(ticketSelectors.content)).toBeVisible()

    // Wait for markdown to render — content may be empty initially while fetching
    const content = page.locator(ticketSelectors.content)
    await expect(content.locator('h1, h2, h3, p, ul, ol').first()).toBeVisible({ timeout: 5000 })

    // Verify markdown elements are rendered (headers, lists, etc.)
    const hasMarkdownElements = await content.evaluate((el) => {
      return el.innerHTML.includes('<h') || // headers
             el.innerHTML.includes('<p') ||  // paragraphs
             el.innerHTML.includes('<ul') || // unordered lists
             el.innerHTML.includes('<ol')    // ordered lists
    })

    expect(hasMarkdownElements).toBe(true)
  })

  test('close button returns to view', async ({ page, e2eContext }) => {
    // Create isolated test data
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to board
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open first ticket detail
    const firstTicketCode = scenario.crCodes[0]
    await openTicketDetail(page, firstTicketCode)

    // Verify detail panel is open
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()

    // Close detail panel
    await closeTicketDetail(page)

    // Verify detail panel is closed
    await expect(page.locator(ticketSelectors.detailPanel)).not.toBeVisible()

    // Verify board is still visible
    await expect(page.locator(boardSelectors.board)).toBeVisible()
  })
})
