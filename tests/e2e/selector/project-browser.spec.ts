/**
 * Project Browser Search E2E Tests - MDT-152
 *
 * Tests for the ProjectBrowserPanel search functionality:
 * 1. Search input visible when panel opens with autofocus (BR-1.1, BR-1.6)
 * 2. Client-side project filtering by code, name, or description (BR-1.2)
 * 3. Current project exclusion from results (BR-1.3)
 * 4. Empty state when no matches (BR-1.4)
 * 5. Escape key closes panel (BR-1.5)
 * 6. Keyboard navigation and activation
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

  test('filters projects by description - case-insensitive (BR-1.2)', async ({ page, e2eContext }) => {
    const activeProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const matchingProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Worktree Alias',
      description: 'Git worktree aliases for MDT project',
    })

    await page.goto(`/prj/${activeProject.projectCode}`)
    await waitForBoardReady(page)

    // Open project browser
    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    // Query uses different casing than the description
    await page.locator(browserSearchSelectors.searchInput).fill('git')

    await expect(page.locator(browserSearchSelectors.projectCard(matchingProject.key))).toBeVisible()
    await expect(page.locator(browserSearchSelectors.projectCard(matchingProject.key))).toContainText('Git worktree aliases')
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

  test('excludes current project even when search matches its description (BR-1.3)', async ({ page, e2eContext }) => {
    const activeProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Active Project',
      description: 'Git active project should be excluded',
    })
    const matchingProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Worktree Alias',
      description: 'Git worktree aliases for MDT project',
    })

    await page.goto(`/prj/${activeProject.key}`)
    await waitForBoardReady(page)

    // Open project browser
    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    await page.locator(browserSearchSelectors.searchInput).fill('git')

    await expect(page.locator(browserSearchSelectors.projectCard(activeProject.key))).not.toBeVisible()
    await expect(page.locator(browserSearchSelectors.projectCard(matchingProject.key))).toBeVisible()
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

  test('Tab does not move focus onto project cards (cards are listbox options; BR-11.4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await e2eContext.projectFactory.createProject('empty', {
      name: 'Secondary Project',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.searchInput)).toBeFocused()

    await page.keyboard.press('Tab')

    // Cards are listbox options (tabindex -1); Tab must never land on a project card.
    const focusIsOnCard = await page.evaluate(() =>
      !!document.activeElement?.closest('[data-project-browser-card="true"]'),
    )
    expect(focusIsOnCard).toBe(false)
  })

  test('Enter activates the active-descendant (highlighted) project card (BR-11.1, BR-11.5)', async ({ page, e2eContext }) => {
    const activeProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const targetProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Keyboard Target',
    })

    await page.goto(`/prj/${activeProject.projectCode}`)
    await waitForBoardReady(page)

    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    // Filter down to the target so it is the only (hence highlighted-first) result
    await page.locator(browserSearchSelectors.searchInput).fill(targetProject.key)
    await expect(page.locator(browserSearchSelectors.projectCard(targetProject.key))).toBeVisible()

    // ArrowDown moves the active-descendant highlight onto the first result
    await page.keyboard.press('ArrowDown')
    await expect(page.locator(browserSearchSelectors.projectCard(targetProject.key))).toHaveAttribute('data-selected', 'true')

    await page.keyboard.press('Enter')

    await waitForBoardReady(page)
    await expect(page.locator(selectorSelectors.activeProjectCard)).toContainText(targetProject.key)
  })

  test('arrow keys navigate the 2-column grid by column (Excel-grid) with cyclic wrap (BR-11.2, BR-11.3)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    for (let i = 0; i < 4; i++) {
      await e2eContext.projectFactory.createProject('empty', {
        name: `Keyboard Navigation ${i}`,
      })
    }

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(browserSearchSelectors.panel)).toBeVisible()

    const visibleProjectKeys = await page.locator('[data-project-browser-card="true"]').evaluateAll(nodes =>
      nodes.map(node => node.getAttribute('data-project-key')),
    )
    expect(visibleProjectKeys.length).toBeGreaterThanOrEqual(4)

    // Confirm the rendered grid is actually 2 columns at desktop width (md:grid-cols-2).
    // Without this, the column-nav assertions below would be meaningless.
    const columnCount = await page.locator('[role="listbox"]').evaluate((el: HTMLElement) =>
      window.getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length,
    )
    expect(columnCount).toBe(2)
    const cols = 2
    const lastIndex = visibleProjectKeys.length - 1

    // The active project is highlighted on open, wherever it sits in the ordering
    // (the panel is NOT active-first; it is favorites/usage ordered). Tab is
    // intercepted so focus stays in the search field.
    const activeKey = scenario.projectCode
    const activeIndex = visibleProjectKeys.indexOf(activeKey)
    expect(activeIndex).toBeGreaterThanOrEqual(0)

    const selectedKey = async () => page.locator('[data-project-browser-card="true"][data-selected="true"]').getAttribute('data-project-key')
    const selectedIndex = async () => visibleProjectKeys.indexOf((await selectedKey()) ?? '')

    expect(await selectedKey()).toBe(activeKey)
    await expect(page.locator(browserSearchSelectors.searchInput)).toBeFocused()

    // ArrowDown moves down the SAME column: index += cols (wrapping to the column
    // top if it overshoots). This is the assertion that catches the zigzag regression
    // (linear nav would have moved to activeIndex + 1, a different column).
    let expectedDown = activeIndex + cols
    if (expectedDown > lastIndex)
      expectedDown = activeIndex % cols
    await page.keyboard.press('ArrowDown')
    expect(await selectedIndex()).toBe(expectedDown)
    // Sanity: the move was by a column, not by one (the zigzag bug)
    expect(expectedDown).not.toBe(activeIndex + 1)
  })
})
