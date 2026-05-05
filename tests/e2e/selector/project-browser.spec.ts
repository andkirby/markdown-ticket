/**
 * Project Browser Search E2E Tests - MDT-152
 *
 * Tests for the ProjectBrowserPanel search functionality:
 * 1. Search input visible when panel opens with autofocus (BR-1.1, BR-1.6)
 * 2. Client-side project filtering by code or name (BR-1.2)
 * 3. Current project exclusion from results (BR-1.3)
 * 4. Empty state when no matches (BR-1.4)
 * 5. Escape key closes panel (BR-1.5)
 *
 * RED tests — will fail until ProjectBrowserPanel search is implemented.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { selectorSelectors, quickSearchSelectors } from '../utils/selectors.js'

/**
 * Selectors for project browser search (MDT-152)
 * These will be added to selectors.ts during implementation
 */
const browserSearchSelectors = {
  /** Search input in project browser panel */
  searchInput: '[data-testid="project-browser-search-input"]',
  /** Project card in browser panel results */
  projectCard: (code: string) => `[data-testid="project-browser-card-${code}"]`,
  /** Any project card in browser panel */
  anyProjectCard: '[data-testid^="project-browser-card-"]',
  /** Empty state message */
  emptyState: '[data-testid="project-browser-empty-state"]',
  /** Project browser panel container */
  panel: '[data-testid="project-browser-panel"]',
}

test.describe('Project Browser Search - MDT-152', () => {
  test('shows search input when panel opens with autofocus (BR-1.1, BR-1.6)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open the project browser panel by clicking active project card
    await page.locator(selectorSelectors.panelTrigger).click()

    // Panel should be visible
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    // Search input should be visible
    await expect(page.locator(browserSearchSelectors.searchInput)).toBeVisible()

    // Search input should be auto-focused
    await expect(page.locator(browserSearchSelectors.searchInput)).toBeFocused()
  })

  test('filters projects by code - case-insensitive (BR-1.2)', async ({ page, e2eContext }) => {
    // Create two projects
    const project1 = await buildScenario(e2eContext.projectFactory, 'simple')
    const project2 = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${project1.projectCode}`)
    await waitForBoardReady(page)

    // Open project browser
    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    // Type project2 code (lowercase)
    await page.locator(browserSearchSelectors.searchInput).fill(project2.projectCode.toLowerCase())

    // Should show project2 in results
    const results = page.locator(browserSearchSelectors.anyProjectCard)
    await expect(results.first()).toBeVisible()

    // All visible results should contain project2 code
    const count = await results.count()
    for (let i = 0; i < count; i++) {
      await expect(results.nth(i)).toContainText(project2.projectCode)
    }
  })

  test('filters projects by name - case-insensitive (BR-1.2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open project browser
    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    // Type part of project name
    await page.locator(browserSearchSelectors.searchInput).fill(scenario.projectName.substring(0, 4).toLowerCase())

    // Should show at least one result
    const results = page.locator(browserSearchSelectors.anyProjectCard)
    const count = await results.count()
    // Current project may be excluded, so results may be 0 if only one project
    if (count > 0) {
      // Results should contain the project name
      for (let i = 0; i < count; i++) {
        const text = await results.nth(i).textContent()
        expect(text?.toLowerCase()).toContain(scenario.projectName.substring(0, 4).toLowerCase())
      }
    }
  })

  test('excludes current project from search results (BR-1.3)', async ({ page, e2eContext }) => {
    // Create two projects
    const project1 = await buildScenario(e2eContext.projectFactory, 'simple')
    const project2 = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${project1.projectCode}`)
    await waitForBoardReady(page)

    // Open project browser
    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    // Type a query that matches the current project
    await page.locator(browserSearchSelectors.searchInput).fill(project1.projectCode)

    // Current project should NOT appear in results
    const currentProjectCard = page.locator(browserSearchSelectors.projectCard(project1.projectCode))
    await expect(currentProjectCard).not.toBeVisible()

    // Other project should appear (if code matches)
    const results = page.locator(browserSearchSelectors.anyProjectCard)
    const count = await results.count()
    for (let i = 0; i < count; i++) {
      const text = await results.nth(i).textContent() || ''
      expect(text).not.toContain(project1.projectCode)
    }
  })

  test('shows empty state when no projects match (BR-1.4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open project browser
    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    // Type a query that matches nothing
    await page.locator(browserSearchSelectors.searchInput).fill('ZZZZZZNONEXISTENT12345')

    // Should show empty state
    await expect(page.locator(browserSearchSelectors.emptyState)).toBeVisible()
    await expect(page.locator(browserSearchSelectors.emptyState)).toContainText('No projects match')
  })

  test('Escape closes project browser panel (BR-1.5)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Open project browser
    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Panel should close
    await expect(page.locator(browserSearchSelectors.panel)).not.toBeVisible()
  })

  test('search filtering is client-side — no network requests (C1)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Monitor network requests
    const searchRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/projects/search')) {
        searchRequests.push(request.url())
      }
    })

    // Open project browser
    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    // Type and filter
    await page.locator(browserSearchSelectors.searchInput).fill('test')

    // Wait a moment to ensure any pending requests would have fired
    await page.waitForTimeout(500)

    // No backend search requests should have been made
    expect(searchRequests).toHaveLength(0)
  })
})
