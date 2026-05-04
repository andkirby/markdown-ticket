/**
 * Quick Search Modal E2E Tests (MDT-136)
 *
 * Tests verify quick search modal behavior:
 * 1. Cmd/Ctrl+K opens modal with auto-focused input
 * 2. Search filters tickets by key number or title substring
 * 3. Arrow keys navigate results
 * 4. Enter selects ticket and opens detail
 * 5. Escape closes modal without selection
 * 6. Click outside closes modal
 * 7. "No results" shown when no matches
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { quickSearchSelectors, ticketSelectors } from '../utils/selectors.js'

test.describe('Quick Search Modal', () => {
  test('opens modal with Cmd+K keyboard shortcut (BR-1, BR-2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Modal should be visible
    await expect(page.locator(quickSearchSelectors.modal)).toBeVisible()

    // Input should be focused
    await expect(page.locator(quickSearchSelectors.input)).toBeFocused()
  })

  test('filters tickets by key number (BR-3)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Type a partial key number
    await page.locator(quickSearchSelectors.input).fill('01')

    // Should show results containing "01" in key
    const results = page.locator(quickSearchSelectors.resultItem)
    await expect(results.first()).toBeVisible()
  })

  test('filters tickets by title substring with AND logic (BR-3, C4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Type multi-word query - all words must match
    // Medium scenario has "User Management Service" - search for "User Management"
    await page.locator(quickSearchSelectors.input).fill('User Management')

    // Results should only show tickets with both words in title
    const results = page.locator(quickSearchSelectors.resultItem)
    const count = await results.count()

    // Each result should contain both words (case-insensitive)
    for (let i = 0; i < count; i++) {
      const text = await results.nth(i).textContent()
      const lowerText = text?.toLowerCase() || ''
      expect(lowerText).toContain('user')
      expect(lowerText).toContain('management')
    }
  })

  test('navigates results with arrow keys (BR-4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Type to get results - "User" exists in "User Management Service"
    await page.locator(quickSearchSelectors.input).fill('User')

    const results = page.locator(quickSearchSelectors.resultItem)
    await expect(results.first()).toBeVisible()

    // First item should be selected by default or after pressing down
    await page.keyboard.press('ArrowDown')

    // Should have a selected item
    await expect(page.locator(quickSearchSelectors.selectedResult)).toBeVisible()

    // Navigate down then up
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowUp')

    // Should still have a selected item
    await expect(page.locator(quickSearchSelectors.selectedResult)).toBeVisible()
  })

  test('selects ticket and opens detail with Enter (BR-5)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Type to get results - "User" exists in "Add User Authentication"
    await page.locator(quickSearchSelectors.input).fill('User')

    const results = page.locator(quickSearchSelectors.resultItem)
    await expect(results.first()).toBeVisible()

    // Navigate to first result and press Enter
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    // Modal should close
    await expect(page.locator(quickSearchSelectors.modal)).not.toBeVisible()

    // Ticket detail should be visible
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()
  })

  test('closes modal with Escape key (BR-6)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    await expect(page.locator(quickSearchSelectors.modal)).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Modal should close
    await expect(page.locator(quickSearchSelectors.modal)).not.toBeVisible()

    // No ticket detail should open
    await expect(page.locator(ticketSelectors.detailPanel)).not.toBeVisible()
  })

  test('closes modal when clicking outside (BR-7)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    await expect(page.locator(quickSearchSelectors.modal)).toBeVisible()

    // Click on the backdrop (outside modal content)
    await page.locator(quickSearchSelectors.modal).click({ position: { x: 10, y: 10 } })

    // Modal should close
    await expect(page.locator(quickSearchSelectors.modal)).not.toBeVisible()
  })

  test('shows "No results" when no matches (BR-8)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Type a query that won't match anything
    await page.locator(quickSearchSelectors.input).fill('zzzzzzzzzzzznonexistent')

    // Should show no results message
    await expect(page.locator(quickSearchSelectors.noResults)).toBeVisible()
  })

  test('limits results to 10 items maximum (C2)', async ({ page, e2eContext }) => {
    // Create a complex scenario with many tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'complex')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open modal
    const isMac = process.platform === 'darwin'
    const modifier = isMac ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+k`)

    // Leave query empty to show all tickets (up to limit)
    // Empty query shows all tickets up to MAX_RESULTS

    // Wait for results
    const results = page.locator(quickSearchSelectors.resultItem)

    // Should show at most 10 results
    const count = await results.count()
    expect(count).toBeLessThanOrEqual(10)
  })
})

// ============================================================================
// MDT-152: Cross-Project Search Tests
// ============================================================================
//
// RED tests — will fail until cross-project search is implemented.
// Covers: BR-2.1–BR-2.7, BR-3.1–BR-3.5, BR-4.1–BR-4.2, BR-5.1–BR-5.2,
//          BR-6.1–BR-6.3, C4–C6, C8, Edge-1–Edge-6
//
// Selectors for cross-project elements will be added to selectors.ts during
// implementation. They are referenced here via data-testid attributes.
// ============================================================================

/**
 * Cross-project search selectors (MDT-152)
 * Will be added to selectors.ts during implementation.
 */
const crossSearchSelectors = {
  modeIndicator: '[data-testid="quick-search-mode-indicator"]',
  crossProjectResults: '[data-testid="quick-search-cross-project-results"]',
  crossProjectResultItem: '[data-testid="quick-search-cross-project-result-item"]',
  loadingSpinner: '[data-testid="quick-search-loading-spinner"]',
  loadingSkeleton: '[data-testid="quick-search-loading-skeleton"]',
  ticketNotFound: '[data-testid="quick-search-ticket-not-found"]',
  projectNotFound: '[data-testid="quick-search-project-not-found"]',
  networkError: '[data-testid="quick-search-network-error"]',
  retryButton: '[data-testid="quick-search-retry-button"]',
  crossProjectEmpty: '[data-testid="quick-search-cross-project-empty"]',
  projectLabel: '[data-testid="quick-search-project-label"]',
}

/** Helper to open QuickSearch modal */
async function openQuickSearch(page: any) {
  const isMac = process.platform === 'darwin'
  const modifier = isMac ? 'Meta' : 'Control'
  await page.keyboard.press(`${modifier}+k`)
  await expect(page.locator(quickSearchSelectors.modal)).toBeVisible()
}

test.describe('QuickSearch Cross-Project: Ticket Key Lookup (MDT-152 BR-2)', () => {
  test('detects ticket key and shows cross-project results with project context (BR-2.1, BR-2.4)', async ({ page, e2eContext }) => {
    const currentProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const otherProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const otherTickets = await e2eContext.projectFactory.getProjectTickets(otherProject.projectCode)
    const otherTicketCode = otherTickets[0]?.code
    if (!otherTicketCode) return

    await page.goto(`/prj/${currentProject.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill(otherTicketCode)

    // Should show loading state
    await expect(page.locator(crossSearchSelectors.loadingSpinner)).toBeVisible()

    // Should eventually show cross-project results with project label
    const crossResults = page.locator(crossSearchSelectors.crossProjectResultItem)
    await expect(crossResults.first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator(crossSearchSelectors.projectLabel).first()).toContainText(otherProject.projectCode)
  })

  test('shows loading spinner and skeleton cards during fetch (BR-2.3, C4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill('ABC-42')

    // Loading state should appear
    await expect(page.locator(crossSearchSelectors.loadingSpinner)).toBeVisible({ timeout: 10000 })
  })

  test('shows "Ticket not found" for non-existent ticket key (BR-2.7, Edge-2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill('XYZ-99999')

    await expect(page.locator(crossSearchSelectors.ticketNotFound)).toBeVisible({ timeout: 10000 })
    await expect(page.locator(crossSearchSelectors.ticketNotFound)).toContainText('not found')
  })

  test('shows network error with retry option (BR-2.5, BR-2.6, Edge-4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Simulate network failure
    await page.route('**/api/projects/search', (route) => route.abort())

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill('ABC-42')

    await expect(page.locator(crossSearchSelectors.networkError)).toBeVisible({ timeout: 10000 })
    await expect(page.locator(crossSearchSelectors.retryButton)).toBeVisible()
  })
})

test.describe('QuickSearch Cross-Project: @syntax Project-Scoped Search (MDT-152 BR-3)', () => {
  test('detects @CODE syntax and searches specified project (BR-3.1, BR-3.5)', async ({ page, e2eContext }) => {
    const currentProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const otherProject = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${currentProject.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill(`@${otherProject.projectCode} test`)

    const crossResults = page.locator(crossSearchSelectors.crossProjectResultItem)
    await expect(crossResults.first()).toBeVisible({ timeout: 10000 })

    // Results should only be from the specified project
    const count = await crossResults.count()
    for (let i = 0; i < count; i++) {
      await expect(crossResults.nth(i).locator(crossSearchSelectors.projectLabel)).toContainText(otherProject.projectCode)
    }
  })

  test('shows "Project not found" for invalid project code without triggering search (BR-3.2, BR-3.3, Edge-1)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill('@XYZZZZ test')

    await expect(page.locator(crossSearchSelectors.projectNotFound)).toBeVisible()
    await expect(page.locator(crossSearchSelectors.projectNotFound)).toContainText('not found')

    // No loading state — search was not triggered
    await expect(page.locator(crossSearchSelectors.loadingSpinner)).not.toBeVisible()
  })
})

test.describe('QuickSearch Cross-Project: Current Project Mode (MDT-152 BR-4)', () => {
  test('plain text stays in current project mode without cross-project section (BR-4.1)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill('User')

    // Should show current project results (existing MDT-136 behavior)
    const results = page.locator(quickSearchSelectors.resultItem)
    await expect(results.first()).toBeVisible()

    // Should NOT show cross-project section
    await expect(page.locator(crossSearchSelectors.crossProjectResults)).not.toBeVisible()
  })

  test('shows "In: CODE" mode indicator for current project (BR-4.2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill('test')

    await expect(page.locator(crossSearchSelectors.modeIndicator)).toBeVisible()
    await expect(page.locator(crossSearchSelectors.modeIndicator)).toContainText(`In: ${scenario.projectCode}`)
  })
})

test.describe('QuickSearch Cross-Project: Mode Indicators (MDT-152 BR-5)', () => {
  test('mode indicator shows "Searching: CODE-NUM" for ticket key (BR-5.1)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill('ABC-42')

    await expect(page.locator(crossSearchSelectors.modeIndicator)).toContainText('Searching: ABC-42')
  })

  test('mode indicator shows "In: CODE" for project-scoped search (BR-5.2)', async ({ page, e2eContext }) => {
    const currentProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const otherProject = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${currentProject.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill(`@${otherProject.projectCode} login`)

    await expect(page.locator(crossSearchSelectors.modeIndicator)).toContainText(`In: ${otherProject.projectCode}`)
  })
})

test.describe('QuickSearch Cross-Project: Keyboard Navigation (MDT-152 BR-6)', () => {
  test('arrow keys navigate across current and cross-project sections (BR-6.1, BR-6.3)', async ({ page, e2eContext }) => {
    const currentProject = await buildScenario(e2eContext.projectFactory, 'medium')
    const otherProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const otherTickets = await e2eContext.projectFactory.getProjectTickets(otherProject.projectCode)
    const otherTicketCode = otherTickets[0]?.code
    if (!otherTicketCode) return

    await page.goto(`/prj/${currentProject.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill(otherTicketCode)

    // Wait for cross-project results
    await expect(page.locator(crossSearchSelectors.crossProjectResultItem).first()).toBeVisible({ timeout: 10000 })

    // Arrow keys should navigate across sections
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('ArrowDown')

    // Something should be selected
    const selected = page.locator('[aria-selected="true"]')
    await expect(selected).toBeVisible()
  })

  test('Tab cycles between result sections (BR-6.2)', async ({ page, e2eContext }) => {
    const currentProject = await buildScenario(e2eContext.projectFactory, 'medium')
    const otherProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const otherTickets = await e2eContext.projectFactory.getProjectTickets(otherProject.projectCode)
    const otherTicketCode = otherTickets[0]?.code
    if (!otherTicketCode) return

    await page.goto(`/prj/${currentProject.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill(otherTicketCode)

    await expect(page.locator(crossSearchSelectors.crossProjectResultItem).first()).toBeVisible({ timeout: 10000 })

    await page.keyboard.press('Tab')

    // Modal should still be visible (Tab doesn't exit modal)
    await expect(page.locator(quickSearchSelectors.modal)).toBeVisible()
  })
})

test.describe('QuickSearch Cross-Project: Edge Cases (MDT-152)', () => {
  test('Edge-5: own-project ticket key shows only in current project section, not duplicated in cross-project', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')
    const ownTicketCode = scenario.crCodes[0]
    if (!ownTicketCode) return

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill(ownTicketCode)

    // Should find the ticket in current project results
    const results = page.locator(quickSearchSelectors.resultItem)
    await expect(results.first()).toBeVisible({ timeout: 5000 })

    // Should NOT appear in cross-project section (deduplicated)
    await expect(page.locator(crossSearchSelectors.crossProjectResultItem)).not.toBeVisible()
  })

  test('Edge-6: @current-project shows results in cross-project section (deduplicated from current)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill(`@${scenario.projectCode} `)

    // User explicitly scoped to current project — cross-project section should NOT
    // duplicate results (current project is filtered out of cross-project results)
    await expect(page.locator(crossSearchSelectors.crossProjectResultItem)).not.toBeVisible({ timeout: 5000 })
  })

  test('Edge-3: empty cross-project results show appropriate empty state', async ({ page, e2eContext }) => {
    const currentProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const otherProject = await buildScenario(e2eContext.projectFactory, 'empty')

    await page.goto(`/prj/${currentProject.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill(`@${otherProject.projectCode} nonexistentquery12345`)

    await expect(page.locator(crossSearchSelectors.crossProjectEmpty)).toBeVisible({ timeout: 10000 })
  })

  test('cross-project ticket key navigates to correct project URL', async ({ page, e2eContext }) => {
    const currentProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const otherProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const otherTicketCode = otherProject.crCodes[0]
    if (!otherTicketCode) return

    await page.goto(`/prj/${currentProject.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill(otherTicketCode)

    // Wait for cross-project results
    await expect(page.locator(crossSearchSelectors.crossProjectResultItem).first()).toBeVisible({ timeout: 10000 })

    // Press Enter to select
    await page.keyboard.press('Enter')

    // URL should navigate to the OTHER project, not the current one
    await expect(page).toHaveURL(new RegExp(`/prj/${otherProject.projectCode}/ticket/${otherTicketCode}`))
  })

  test('simplified ticket key (e.g., MDT-1) finds zero-padded ticket (MDT-001)', async ({ page, e2eContext }) => {
    const currentProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const otherProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const fullCode = otherProject.crCodes[0]
    if (!fullCode) return

    // Derive simplified key: TP0-001 → TP0-1
    const simplifiedMatch = fullCode.match(/^(\w+)-0*(\d+)$/)
    if (!simplifiedMatch) return
    const simplifiedKey = `${simplifiedMatch[1]}-${simplifiedMatch[2]}`

    await page.goto(`/prj/${currentProject.projectCode}`)
    await waitForBoardReady(page)

    await openQuickSearch(page)
    await page.locator(quickSearchSelectors.input).fill(simplifiedKey)

    // Should find the ticket via cross-project search even with simplified key
    await expect(page.locator(crossSearchSelectors.crossProjectResultItem).first()).toBeVisible({ timeout: 10000 })

    // The result should show the full (zero-padded) ticket code
    await expect(page.locator(crossSearchSelectors.crossProjectResultItem).first()).toContainText(fullCode)
  })
})
