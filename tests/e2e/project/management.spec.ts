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
import { boardSelectors, projectSelectors, selectorSelectors } from '../utils/selectors.js'
import { waitForBoardReady } from '../utils/helpers.js'

/**
 * Test suite for project management features
 */
test.describe('Project Management', () => {
  test('add project modal opens', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Click hamburger menu to reveal add project button
    await page.click(projectSelectors.hamburgerMenu)

    // Then click add project button
    await page.click(projectSelectors.addProjectButton)

    // Verify the add project modal appears
    const modal = page.locator(projectSelectors.addProjectModal)
    await expect(modal).toBeVisible()

    // Verify modal has essential elements
    await expect(page.locator(projectSelectors.projectNameInput)).toBeVisible()
    await expect(page.locator(projectSelectors.projectCodeInput)).toBeVisible()
    await expect(page.locator(projectSelectors.projectSubmitButton)).toBeVisible()
    await expect(page.locator(projectSelectors.projectCancelButton)).toBeVisible()
  })

  test('project path folder browser loads directories', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await page.click(projectSelectors.hamburgerMenu)
    await page.click(projectSelectors.addProjectButton)

    await expect(page.locator(projectSelectors.addProjectModal)).toBeVisible()

    await page.click(projectSelectors.projectPathBrowseButton)

    await expect(page.locator(projectSelectors.folderBrowserModal)).toBeVisible()
    await expect(page.locator(projectSelectors.folderBrowserCurrentPath)).not.toHaveText('Loading...', { timeout: 5000 })
    await expect(page.locator(projectSelectors.folderBrowserItem).first()).toBeVisible()
    await expect(page.locator(projectSelectors.folderBrowserSelectButton)).toBeEnabled()
  })

  test('create new project', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Click hamburger menu to reveal add project button
    await page.click(projectSelectors.hamburgerMenu)

    // Then click add project button
    await page.click(projectSelectors.addProjectButton)

    // Wait for modal to appear
    const modal = page.locator(projectSelectors.addProjectModal)
    await expect(modal).toBeVisible()

    // Fill in the form
    const newProjectName = 'My New Project'
    const newProjectCode = 'NEW'
    const newProjectPath = '~/test-projects/my-new-project'

    await page.fill(projectSelectors.projectNameInput, newProjectName)
    await page.fill(projectSelectors.projectCodeInput, newProjectCode)
    await page.fill(projectSelectors.projectPathInput, newProjectPath)

    // Wait for submit button to be enabled
    await expect(page.locator(projectSelectors.projectSubmitButton)).toBeEnabled()

    // Submit the form
    await page.click(projectSelectors.projectSubmitButton)

    // Wait for confirmation dialog to appear
    await expect(page.locator(projectSelectors.confirmCreationDialog)).toBeVisible({ timeout: 5000 })

    // Click the confirm button
    await page.click(projectSelectors.confirmCreationButton)

    // Wait for success dialog
    await expect(page.locator(projectSelectors.successDialog)).toBeVisible({ timeout: 10000 })

    // Click Done to close success dialog
    await page.click(projectSelectors.successDoneButton)

    // Verify modal closes
    await expect(modal).toBeHidden()

    // Navigate directly to the new project to verify it was created
    await page.goto(`/prj/${newProjectCode}`)
    await waitForBoardReady(page)

    // Verify we're on the new project by checking the active card
    const activeProjectCard = page.locator(projectSelectors.projectSelectorCard(newProjectCode))
    await expect(activeProjectCard).toBeVisible()

    // Verify the board is empty (no tickets)
    const tickets = page.locator(boardSelectors.ticketCard)
    await expect(tickets).toHaveCount(0)
  })

  test('edit project form updates editable project fields', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await page.click(projectSelectors.hamburgerMenu)
    await page.click(projectSelectors.editProjectButton)

    const modal = page.locator(projectSelectors.editProjectModal)
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Edit Project')

    await expect(page.locator(projectSelectors.projectCodeInput)).toHaveAttribute('readonly', '')
    await expect(page.locator(projectSelectors.projectPathInput)).toHaveAttribute('readonly', '')
    await expect(page.getByLabel('Tickets Directory')).toHaveAttribute('readonly', '')
    await expect(page.locator(projectSelectors.projectPathBrowseButton)).toHaveCount(0)

    const updatedName = `${scenario.projectName} Edited`
    const updatedDescription = 'Updated from project edit E2E'
    const updatedRepository = 'https://github.com/example/markdown-ticket-e2e'

    await page.locator(projectSelectors.projectNameInput).fill(updatedName)
    await page.getByLabel('Description').fill(updatedDescription)
    await page.getByLabel('Repository URL').fill(updatedRepository)

    await expect(page.locator(projectSelectors.projectSubmitButton)).toBeEnabled()
    await page.click(projectSelectors.projectSubmitButton)

    await expect(page.locator(projectSelectors.successDialog)).toBeVisible({ timeout: 10000 })
    await expect(page.locator(projectSelectors.successDialog)).toContainText('Project Updated Successfully!')
    await page.click(projectSelectors.successDoneButton)

    await expect(modal).toBeHidden()
    await expect(page.locator(projectSelectors.projectSelectorCard(scenario.projectCode))).toContainText(updatedName)
    await expect(page.locator(projectSelectors.projectSelectorCard(scenario.projectCode))).toContainText(updatedDescription)

    await page.click(projectSelectors.hamburgerMenu)
    await page.click(projectSelectors.editProjectButton)
    await expect(page.locator(projectSelectors.editProjectModal)).toBeVisible()
    await expect(page.getByLabel('Description')).toHaveValue(updatedDescription)
  })

  test('switch projects via selector', async ({ page, e2eContext }) => {
    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Second Test Project',
    })

    await page.goto(`/prj/${firstProject.projectCode}`)
    await waitForBoardReady(page)

    // Verify we're on the first project by checking active card
    const firstProjectCard = page.locator(projectSelectors.projectSelectorCard(firstProject.projectCode))
    await expect(firstProjectCard).toBeVisible()

    // Verify tickets from first project are visible
    const firstProjectTickets = page.locator(boardSelectors.ticketCard)
    const firstTicketCount = await firstProjectTickets.count()
    expect(firstTicketCount).toBeGreaterThanOrEqual(firstProject.ticketCount)

    // Switch to the second project using the project selector panel
    await page.click(selectorSelectors.panelTrigger)
    const secondProjectOption = page.locator(projectSelectors.projectOption(secondProject.key))
    await expect(secondProjectOption).toBeVisible()
    await secondProjectOption.click()

    // Wait for board to reload
    await waitForBoardReady(page)

    // Verify we're now on the second project by checking active card
    const secondProjectCard = page.locator(projectSelectors.projectSelectorCard(secondProject.key))
    await expect(secondProjectCard).toBeVisible()

    // Verify second project is empty (no tickets)
    const secondProjectTickets = page.locator(boardSelectors.ticketCard)
    await expect(secondProjectTickets).toHaveCount(0)

    // Switch back to the first project via panel
    await page.click(selectorSelectors.panelTrigger)
    const firstProjectOption = page.locator(projectSelectors.projectOption(firstProject.projectCode))
    await firstProjectOption.click()

    // Wait for board to reload
    await waitForBoardReady(page)

    // Verify we're back on the first project
    await expect(firstProjectCard).toBeVisible()

    // Verify tickets are visible again
    const firstProjectTicketsAgain = page.locator(boardSelectors.ticketCard)
    await expect(firstProjectTicketsAgain).toHaveCount(firstTicketCount)
  })
})
