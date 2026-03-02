/**
 * Project Management E2E Tests
 *
 * Tests for project creation and project switching functionality:
 * 1. Add project modal opens
 * 2. Create new project
 * 3. Switch projects via selector
 *
 * RED phase: Tests may fail due to missing selectors and UI elements.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'
import { projectSelectors } from '../utils/selectors.js'
import { waitForBoardReady } from '../utils/helpers.js'

/**
 * Test suite for project management features
 */
test.describe('Project Management', () => {
  test('add project modal opens', async ({ page, e2eContext }) => {
    // Create a scenario so we have a project to navigate from
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to the project
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Click hamburger menu to reveal add project button
    await page.click('[data-testid="hamburger-menu"]')

    // Then click add project button
    await page.click('[data-testid="add-project-button"]')

    // Verify the add project modal appears
    const modal = page.locator('[data-testid="add-project-modal"]')
    await expect(modal).toBeVisible()

    // Verify modal has essential elements
    await expect(page.locator('[data-testid="project-name-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="project-code-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="project-submit-button"]')).toBeVisible()
    await expect(page.locator('[data-testid="project-cancel-button"]')).toBeVisible()
  })

  test('project path folder browser loads directories', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await page.click('[data-testid="hamburger-menu"]')
    await page.click('[data-testid="add-project-button"]')

    await expect(page.locator(projectSelectors.addProjectModal)).toBeVisible()

    await page.click(projectSelectors.projectPathBrowseButton)

    await expect(page.locator(projectSelectors.folderBrowserModal)).toBeVisible()
    await expect(page.locator(projectSelectors.folderBrowserCurrentPath)).not.toHaveText('Loading...', { timeout: 5000 })
    await expect(page.locator(projectSelectors.folderBrowserItem).first()).toBeVisible()
    await expect(page.locator(projectSelectors.folderBrowserSelectButton)).toBeEnabled()
  })

  test('create new project', async ({ page, e2eContext }) => {
    // Create a scenario so we have a project to navigate from
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to the project
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Click hamburger menu to reveal add project button
    await page.click('[data-testid="hamburger-menu"]')

    // Then click add project button
    await page.click('[data-testid="add-project-button"]')

    // Wait for modal to appear
    const modal = page.locator('[data-testid="add-project-modal"]')
    await expect(modal).toBeVisible()

    // Fill in the form
    const newProjectName = 'My New Project'
    const newProjectCode = 'NEW'
    const newProjectPath = '~/test-projects/my-new-project'

    await page.fill('[data-testid="project-name-input"]', newProjectName)
    await page.fill('[data-testid="project-code-input"]', newProjectCode)
    await page.fill('[data-testid="project-path-input"]', newProjectPath)

    // Wait for submit button to be enabled
    await expect(page.locator('[data-testid="project-submit-button"]')).toBeEnabled()

    // Submit the form
    await page.click('[data-testid="project-submit-button"]')

    // Wait for confirmation dialog to appear and be ready
    await expect(page.locator('text=Confirm Project Creation')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(200) // Allow animation to complete

    // Click the confirm button (second Create Project button, in confirmation dialog)
    await page.locator('button').filter({ hasText: 'Create Project' }).nth(1).click()

    // Wait for success dialog
    await expect(page.locator('text=Project Created Successfully')).toBeVisible({ timeout: 10000 })

    // Click Done to close success dialog
    await page.locator('button:has-text("Done")').click()

    // Verify modal closes
    await expect(modal).toBeHidden()

    // Verify the new project appears in the navigation
    const newProjectOption = page.locator(`[data-testid="project-option-${newProjectCode}"]`)
    await expect(newProjectOption).toBeVisible()

    // Click the new project to switch to it
    await newProjectOption.click()

    // Verify we're on the new project (should be empty)
    await waitForBoardReady(page)

    // Verify project name is displayed
    const projectName = page.locator('[data-testid="project-name"]')
    await expect(projectName).toHaveText(newProjectName)
  })

  test('switch projects via selector', async ({ page, e2eContext }) => {
    // Create first project with scenario
    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')

    // Create second project
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Second Test Project',
    })

    // Navigate to the first project
    await page.goto(`/prj/${firstProject.projectCode}`)
    await waitForBoardReady(page)

    // Verify we're on the first project
    const projectName = page.locator('[data-testid="project-name"]')
    await expect(projectName).toHaveText(firstProject.projectName)

    // Verify tickets from first project are visible
    const firstProjectTickets = page.locator(boardSelectors.ticketCard)
    const firstTicketCount = await firstProjectTickets.count()
    expect(firstTicketCount).toBeGreaterThanOrEqual(firstProject.ticketCount)

    // Switch to the second project using the project selector
    const secondProjectOption = page.locator(`[data-testid="project-option-${secondProject.key}"]`)
    await expect(secondProjectOption).toBeVisible()
    await secondProjectOption.click()

    // Wait for board to reload
    await waitForBoardReady(page)

    // Verify we're now on the second project
    await expect(projectName).toHaveText('Second Test Project')

    // Verify second project is empty (no tickets)
    const secondProjectTickets = page.locator(boardSelectors.ticketCard)
    await expect(secondProjectTickets).toHaveCount(0)

    // Switch back to the first project
    const firstProjectOption = page.locator(`[data-testid="project-option-${firstProject.projectCode}"]`)
    await firstProjectOption.click()

    // Wait for board to reload
    await waitForBoardReady(page)

    // Verify we're back on the first project
    await expect(projectName).toHaveText(firstProject.projectName)

    // Verify tickets are visible again
    const firstProjectTicketsAgain = page.locator(boardSelectors.ticketCard)
    await expect(firstProjectTicketsAgain).toHaveCount(firstTicketCount)
  })
})
