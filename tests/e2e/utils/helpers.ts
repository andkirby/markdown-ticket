/**
 * Test Helpers
 *
 * Utility functions for E2E tests.
 */

import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { boardSelectors, commonSelectors, listSelectors, ticketSelectors } from './selectors.js'

/** Default timeout for board ready state */
const BOARD_READY_TIMEOUT = 10000

/** Default timeout for API responses */
const API_TIMEOUT = 5000

/**
 * Wait for the board to be ready (loading complete)
 *
 * Waits for:
 * 1. Loading to disappear
 * 2. Board to be visible
 * 3. At least one ticket card to appear (if tickets exist)
 */
export async function waitForBoardReady(page: Page, timeout = BOARD_READY_TIMEOUT): Promise<void> {
  // Wait for loading to disappear
  await page.waitForSelector(commonSelectors.loading, { state: 'hidden', timeout })

  // Wait for board to appear
  await page.waitForSelector(boardSelectors.board, { state: 'visible', timeout })

  // Wait for ticket cards to appear (with short timeout since some tests may have 0 tickets)
  try {
    await page.waitForSelector(boardSelectors.ticketCard, { state: 'attached', timeout: 3000 })
  } catch {
    // Some tests/views may legitimately have 0 tickets, continue
  }
}

/**
 * Wait for list view to be ready (loading complete)
 *
 * Waits for:
 * 1. Loading to disappear
 * 2. Ticket list to be visible (desktop table OR mobile card list)
 */
export async function waitForListReady(page: Page, timeout = BOARD_READY_TIMEOUT): Promise<void> {
  await page.waitForSelector(commonSelectors.loading, { state: 'hidden', timeout })
  // Wait for either desktop table or mobile list container to be visible
  // Use Promise.race because waitForSelector with comma picks first DOM match, not first visible
  await Promise.race([
    page.locator(listSelectors.ticketTable).waitFor({ state: 'visible', timeout }),
    page.locator(listSelectors.ticketList).waitFor({ state: 'visible', timeout }),
  ])
}

/**
 * Wait for documents view to be ready (loading complete)
 *
 * Waits for:
 * 1. Loading to disappear
 * 2. Document tree to be visible
 */
export async function waitForDocumentsReady(page: Page, timeout = BOARD_READY_TIMEOUT): Promise<void> {
  await page.waitForSelector(commonSelectors.loading, { state: 'hidden', timeout })
  await page.waitForSelector('[data-testid="document-tree"]', { state: 'visible', timeout })
}

/**
 * Get the current ticket count displayed on the board
 */
export async function getTicketCount(page: Page): Promise<number> {
  const cards = await page.$$(boardSelectors.ticketCard)
  return cards.length
}

/**
 * Open ticket detail by clicking on a ticket card
 */
export async function openTicketDetail(page: Page, ticketCode: string): Promise<void> {
  const ticketSelector = boardSelectors.ticketByCode(ticketCode)
  await page.click(ticketSelector)

  // Wait for detail panel to open
  await page.waitForSelector(ticketSelectors.detailPanel, { state: 'visible' })
}

/**
 * Close ticket detail panel
 */
export async function closeTicketDetail(page: Page): Promise<void> {
  await page.click(ticketSelectors.closeDetail)

  // Wait for detail panel to close
  await page.waitForSelector(ticketSelectors.detailPanel, { state: 'hidden' })
}

/**
 * Get ticket status from the board
 */
export async function getTicketStatus(page: Page, ticketCode: string): Promise<string | null> {
  const ticketSelector = boardSelectors.ticketByCode(ticketCode)

  // Find the column containing this ticket
  const ticket = await page.$(ticketSelector)
  if (!ticket) return null

  // Walk up to find the column
  const column = await ticket.evaluateHandle((el) => {
    let parent = el.parentElement
    while (parent && !parent.dataset.testid?.startsWith('column-')) {
      parent = parent.parentElement
    }
    return parent
  })

  const columnId = await column.evaluate((el) => el?.dataset.testid || null)
  return columnId ? columnId.replace('column-', '') : null
}

/**
 * Navigate to board view
 */
export async function navigateToBoard(page: Page): Promise<void> {
  // Check current mode and click toggle if needed
  const currentMode = await page.getAttribute('[data-testid="board-list-toggle"]', 'data-current-mode')
  if (currentMode !== 'board') {
    await page.click('[data-testid="board-list-toggle"]')
  }
  await waitForBoardReady(page)
}

/**
 * Navigate to list view
 */
export async function navigateToList(page: Page): Promise<void> {
  // Check current mode and click toggle if needed
  const currentMode = await page.getAttribute('[data-testid="board-list-toggle"]', 'data-current-mode')
  if (currentMode !== 'list') {
    await page.click('[data-testid="board-list-toggle"]')
  }
  // Wait for list to load
  await page.waitForSelector('[data-testid="ticket-list"]', { state: 'visible' })
}

/**
 * Navigate to documents view
 */
export async function navigateToDocuments(page: Page): Promise<void> {
  await page.click('[data-testid="documents-button"]')
  // Wait for document tree to load
  await page.waitForSelector('[data-testid="document-tree"]', { state: 'visible' })
}

/**
 * Select a project from the project selector
 */
export async function selectProject(page: Page, projectName: string): Promise<void> {
  // Click launcher to open panel
  await page.click('[data-testid="project-selector-launcher"]')

  // Wait for panel and click project card
  await page.click(`[data-testid="project-selector-card-${projectName}"]`)

  // Wait for board to reload
  await waitForBoardReady(page)
}

/**
 * Verify API is responding
 */
export async function verifyApiHealth(backendUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${backendUrl}/api/projects`, {
      method: 'GET',
      signal: AbortSignal.timeout(API_TIMEOUT),
    })
    return response.ok
  }
  catch {
    return false
  }
}

/**
 * Assert that a ticket exists on the board
 */
export async function assertTicketExists(page: Page, ticketCode: string): Promise<void> {
  const selector = boardSelectors.ticketByCode(ticketCode)
  await expect(page.locator(selector)).toBeVisible()
}

/**
 * Assert ticket count in a specific column
 */
export async function assertColumnTicketCount(
  page: Page,
  status: string,
  expectedCount: number,
): Promise<void> {
  const columnSelector = boardSelectors.columnByStatus(status)
  const column = page.locator(columnSelector)
  const tickets = column.locator(boardSelectors.ticketCard)
  await expect(tickets).toHaveCount(expectedCount)
}

/**
 * Drag and drop a ticket to a new status column
 */
export async function dragTicketToColumn(
  page: Page,
  ticketCode: string,
  targetStatus: string,
): Promise<void> {
  const ticketSelector = boardSelectors.ticketByCode(ticketCode)
  const targetColumnStatus = ['Implemented', 'Partially Implemented', 'Rejected'].includes(targetStatus)
    ? 'Implemented'
    : targetStatus
  const targetColumnSelector = boardSelectors.columnByStatus(targetColumnStatus)

  const ticket = page.locator(ticketSelector)
  const targetColumn = page.locator(targetColumnSelector)

  await ticket.dragTo(targetColumn)

  const resolutionDialog = page.locator(boardSelectors.resolutionDialog)
  if (await resolutionDialog.isVisible().catch(() => false)) {
    await page.click(boardSelectors.resolutionOption(targetStatus))
  }

  // Wait for drop to complete
  await page.waitForTimeout(500)
}
