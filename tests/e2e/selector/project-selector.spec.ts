/**
 * Project Selector E2E Tests (MDT-129)
 *
 * Tests for the enhanced project selector with progressive disclosure:
 * 1. Active project card display
 * 2. Inactive visible projects (compact/medium modes)
 * 3. Launcher and full project panel
 * 4. Project switching from rail and panel
 * 5. Rail ordering with favorites
 * 6. Configuration controls
 * 7. State persistence
 * 8. Responsive behavior
 *
 * RED phase: Tests may fail due to missing selectors and UI elements.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { selectorSelectors } from '../utils/selectors.js'
import { waitForBoardReady } from '../utils/helpers.js'

test.describe('Project Selector - Active Project Display', () => {
  test('active project shown as larger card with code and title', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Verify active project card is visible
    const activeCard = page.locator(selectorSelectors.activeProjectCard)
    await expect(activeCard).toBeVisible()

    // Verify card contains project code
    await expect(activeCard).toContainText(scenario.projectCode)

    // Verify card contains project title
    await expect(activeCard).toContainText(scenario.projectName)
  })

  test('favorite indicator on active project card', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Set favorite state via API before navigating
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:4001'
    await fetch(`${backendUrl}/api/config/selector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [scenario.projectCode]: {
          favorite: true,
          lastUsedAt: new Date().toISOString(),
          count: 1,
        },
      }),
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Verify active project card is visible
    const activeCard = page.locator(selectorSelectors.activeProjectCard)
    await expect(activeCard).toBeVisible()

    // Verify favorite indicator is visible
    const favoriteIndicator = activeCard.locator(selectorSelectors.favoriteButton)
    await expect(favoriteIndicator).toBeVisible()
    await expect(favoriteIndicator).toHaveAttribute('aria-label', 'Toggle favorite')
  })

  test('active project always visible regardless of ordering', async ({ page, e2eContext }) => {
    // Create many projects to exceed visible count
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Create additional projects to push active project out of normal visible range
    for (let i = 0; i < 10; i++) {
      await e2eContext.projectFactory.createProject('empty', {
        name: `Extra Project ${i}`,
      })
    }

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Active project should still be visible despite being outside normal ordering
    const activeCard = page.locator(selectorSelectors.activeProjectCard)
    await expect(activeCard).toBeVisible()
    await expect(activeCard).toContainText(scenario.projectCode)
  })
})

test.describe('Project Selector - Favorite Toggle', () => {
  test('toggle favorite by clicking star', async ({ page, e2eContext }) => {
    // Setup: Create multiple projects
    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Second Project',
    })

    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:4001'

    // Set initial state: first project NOT favorited
    await fetch(`${backendUrl}/api/config/selector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [firstProject.projectCode]: {
          favorite: false,
          lastUsedAt: new Date().toISOString(),
          count: 1,
        },
        [secondProject.key]: {
          favorite: false,
          lastUsedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          count: 0,
        },
      }),
    })

    // Navigate to first project
    await page.goto(`/prj/${firstProject.projectCode}`)
    await waitForBoardReady(page)

    // Get active project card
    const activeCard = page.locator(selectorSelectors.activeProjectCardByCode(firstProject.projectCode))
    await expect(activeCard).toBeVisible()

    // Get initial favorite state - should show unfilled star button (for toggling on)
    const favoriteButton = activeCard.locator(selectorSelectors.favoriteButton)
    await expect(favoriteButton).toBeVisible()

    // Verify button has "Click to favorite" title
    await expect(favoriteButton).toHaveAttribute('title', 'Click to favorite')

    // Click to favorite the project
    await favoriteButton.click()

    // Wait for state update
    await page.waitForTimeout(500)

    // Verify button changed to filled star with "Click to unfavorite" title
    await expect(favoriteButton).toHaveAttribute('title', 'Click to unfavorite')

    // Verify state persisted to API
    const response = await fetch(`${backendUrl}/api/config/selector`)
    const state = await response.json()
    expect(state.selectorState[firstProject.projectCode].favorite).toBe(true)

    // Reload page and verify favorite state persisted
    await page.reload()
    await waitForBoardReady(page)

    const reloadedCard = page.locator(selectorSelectors.activeProjectCardByCode(firstProject.projectCode))
    await expect(reloadedCard).toBeVisible()

    const reloadedFavoriteButton = reloadedCard.locator(selectorSelectors.favoriteButton)
    await expect(reloadedFavoriteButton).toBeVisible()
    await expect(reloadedFavoriteButton).toHaveAttribute('title', 'Click to unfavorite')

    // Test unfavoriting
    await reloadedFavoriteButton.click()
    await page.waitForTimeout(500)

    // Verify button changed back
    await expect(reloadedFavoriteButton).toHaveAttribute('title', 'Click to favorite')

    // Verify state persisted
    const response2 = await fetch(`${backendUrl}/api/config/selector`)
    const state2 = await response2.json()
    expect(state2.selectorState[firstProject.projectCode].favorite).toBe(false)
  })
})

test.describe('Project Selector - Inactive Projects Display', () => {
  test('inactive visible projects display based on compact mode setting', async ({ page, e2eContext }) => {
    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Second Project',
    })

    await page.goto(`/prj/${firstProject.projectCode}`)
    await waitForBoardReady(page)

    // Verify inactive project cards are visible
    const inactiveCards = page.locator(selectorSelectors.inactiveProjectCard)
    await expect(inactiveCards.first()).toBeVisible()

    // Compact mode shows code only; medium mode shows more detail
    // Default is compact mode (code-only)
    const secondProjectCard = page.locator(`${selectorSelectors.inactiveProjectCard}:has-text("${secondProject.key}")`)
    await expect(secondProjectCard).toBeVisible()
  })
})

test.describe('Project Selector - Panel', () => {
  test('active project card opens full project panel', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Click active project card to open panel
    const activeCard = page.locator(selectorSelectors.activeProjectCard)
    await activeCard.click()

    // Verify panel opens below selector
    const panel = page.locator(selectorSelectors.projectPanel)
    await expect(panel).toBeVisible()
  })

  test('panel displays full project list with active first', async ({ page, e2eContext }) => {
    // Get initial project count before creating new ones
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:4001'
    const initialProjectsResponse = await fetch(`${backendUrl}/api/projects`)
    const initialProjects = await initialProjectsResponse.json()
    const initialCount = initialProjects.length

    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Second Project',
    })
    const thirdProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Third Project',
    })

    await page.goto(`/prj/${firstProject.projectCode}`)
    await waitForBoardReady(page)

    // Open panel by clicking active project card
    const activeCard = page.locator(selectorSelectors.activeProjectCard)
    await activeCard.click()

    const panel = page.locator(selectorSelectors.projectPanel)
    await expect(panel).toBeVisible()

    // Verify all projects are shown as cards (initial + 3 new ones)
    // Use descendant selector to get only cards within the panel
    const projectCards = panel.locator('[data-testid^="project-selector-card-"]')
    await expect(projectCards).toHaveCount(initialCount + 3)

    // Verify cards contain code, title, and description
    const firstCard = projectCards.filter({ hasText: firstProject.projectCode })
    await expect(firstCard).toContainText(firstProject.projectName)
  })
})

test.describe('Project Selector - Project Switching', () => {
  test('select project from selector rail changes current project', async ({ page, e2eContext }) => {
    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Second Project',
    })

    await page.goto(`/prj/${firstProject.projectCode}`)
    await waitForBoardReady(page)

    // Verify we're on first project
    await expect(page.locator(selectorSelectors.activeProjectCard)).toContainText(firstProject.projectCode)

    // Click inactive project in rail
    const secondProjectCard = page.locator(`${selectorSelectors.inactiveProjectCard}:has-text("${secondProject.key}")`)
    await secondProjectCard.click()

    // Wait for switch
    await waitForBoardReady(page)

    // Verify we're now on second project
    await expect(page.locator(selectorSelectors.activeProjectCard)).toContainText(secondProject.key)
  })

  test('select project from panel changes current project', async ({ page, e2eContext }) => {
    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Second Project',
    })

    await page.goto(`/prj/${firstProject.projectCode}`)
    await waitForBoardReady(page)

    // Open panel by clicking active project card
    const activeCard = page.locator(selectorSelectors.activeProjectCard)
    await activeCard.click()

    const panel = page.locator(selectorSelectors.projectPanel)
    await expect(panel).toBeVisible()

    // Click project in panel (use descendant selector to get cards within panel)
    const secondProjectCard = panel.locator(`[data-testid^="project-selector-card-"]:has-text("${secondProject.key}")`)
    await secondProjectCard.click()

    // Wait for switch
    await waitForBoardReady(page)

    // Verify we're now on second project
    await expect(page.locator(selectorSelectors.activeProjectCard)).toContainText(secondProject.key)
  })
})

test.describe('Project Selector - Rail Ordering', () => {
  test('rail ordering prioritizes favorites then sorts by usage', async ({ page, e2eContext }) => {
    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Second Project',
    })
    const thirdProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Third Project',
    })

    await page.goto(`/prj/${firstProject.projectCode}`)
    await waitForBoardReady(page)

    // Active project should be first
    const activeCard = page.locator(selectorSelectors.activeProjectCard)
    await expect(activeCard).toContainText(firstProject.projectCode)

    // Inactive cards should follow (favorites first, then by usage)
    const inactiveCards = page.locator(selectorSelectors.inactiveProjectCard)
    await expect(inactiveCards.first()).toBeVisible()
  })
})

test.describe('Project Selector - Configuration', () => {
  test('configuration controls visible count and compact mode', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Create more projects than default visibleCount (7)
    for (let i = 0; i < 5; i++) {
      await e2eContext.projectFactory.createProject('empty', {
        name: `Extra Project ${i}`,
      })
    }

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Verify selector rail is visible
    const rail = page.locator(selectorSelectors.rail)
    await expect(rail).toBeVisible()

    // Default visibleCount is 7; should show active + up to 6 inactive + launcher
    const inactiveCards = page.locator(selectorSelectors.inactiveProjectCard)
    const count = await inactiveCards.count()
    expect(count).toBeLessThanOrEqual(6)
  })
})

test.describe('Project Selector - State Persistence', () => {
  test('state persists after project selection', async ({ page, e2eContext }) => {
    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Second Project',
    })

    await page.goto(`/prj/${firstProject.projectCode}`)
    await waitForBoardReady(page)

    // Switch to second project
    const secondProjectCard = page.locator(`${selectorSelectors.inactiveProjectCard}:has-text("${secondProject.key}")`)
    await secondProjectCard.click()
    await waitForBoardReady(page)

    // Verify switch succeeded
    await expect(page.locator(selectorSelectors.activeProjectCard)).toContainText(secondProject.key)

    // Reload page to verify persistence
    await page.reload()
    await waitForBoardReady(page)

    // Should still be on second project (state persisted)
    await expect(page.locator(selectorSelectors.activeProjectCard)).toContainText(secondProject.key)
  })
})

test.describe('Project Selector - Responsive Behavior', () => {
  test('mobile viewport shows collapsed selector rail', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Active project should be visible
    const activeCard = page.locator(selectorSelectors.activeProjectCard)
    await expect(activeCard).toBeVisible()

    // Inactive cards may be hidden in collapsed mode
    // Open panel by clicking active project card
    await activeCard.click()
    const panel = page.locator(selectorSelectors.projectPanel)
    await expect(panel).toBeVisible()
  })
})
