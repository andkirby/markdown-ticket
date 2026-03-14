/**
 * Document Path Persistence E2E Tests
 *
 * RED phase - Test verifies document path configuration persists correctly:
 * 1. Opens path selector modal
 * 2. Unchecks a path
 * 3. Saves selection
 * 4. Reopens modal and verifies change persisted
 *
 * This test exposes the bug where the backend creates [document.paths]
 * instead of [project.document.paths], causing config to not persist correctly.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { pathSelectorSelectors } from '../utils/selectors.js'

test.describe('Document Path Persistence', () => {
  test('path selector changes persist after save', async ({ page, e2eContext }) => {
    // Create isolated test data - simple scenario includes docs folder
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate directly to documents view
    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.waitForLoadState('load')

    // Wait for documents to load - check for the documents header
    await expect(page.locator('h3:has-text("Documents")')).toBeVisible({ timeout: 10000 })

    // Click the configure paths button
    const configureButton = page.locator(pathSelectorSelectors.configureButton)
    await expect(configureButton).toBeVisible({ timeout: 5000 })
    await configureButton.click()

    // Wait for modal to appear with heading
    const modalHeading = page.locator('h3:has-text("Select Document Paths")')
    await expect(modalHeading).toBeVisible({ timeout: 5000 })

    // Wait for file system to load - look for any checkbox
    await page.waitForSelector('input[type="checkbox"]', { timeout: 10000 })

    // Find all available checkboxes
    const allCheckboxes = await page.locator('input[type="checkbox"]').all()
    expect(allCheckboxes.length).toBeGreaterThan(0)

    // Find the "docs" folder checkbox if it exists (created by scenario builder)
    const docsCheckbox = page.locator(pathSelectorSelectors.pathCheckbox('docs'))
    const docsCheckboxExists = await docsCheckbox.count() > 0

    // Use docs if it exists, otherwise use the first checkbox
    const targetCheckbox = docsCheckboxExists ? docsCheckbox : allCheckboxes[0]
    await expect(targetCheckbox).toBeVisible({ timeout: 5000 })

    // Get initial state of target checkbox
    const initialState = await targetCheckbox.isChecked()

    // Ensure we have at least 2 checkboxes checked before toggling
    // This prevents the save button from being disabled
    const checkedCount = await page.locator('input[type="checkbox"]:checked').count()
    if (checkedCount < 2) {
      // Check the second checkbox to ensure save button stays enabled
      if (allCheckboxes.length > 1) {
        const secondCheckbox = allCheckboxes[1] !== targetCheckbox ? allCheckboxes[1] : allCheckboxes[0]
        await secondCheckbox.check()
      }
    }

    // Toggle the target checkbox
    if (initialState) {
      await targetCheckbox.uncheck()
      await expect(targetCheckbox).not.toBeChecked()
    } else {
      await targetCheckbox.check()
      await expect(targetCheckbox).toBeChecked()
    }

    // Save the selection
    const saveButton = page.locator(pathSelectorSelectors.saveButton)
    await expect(saveButton).toBeEnabled()
    await saveButton.click()

    // Wait for modal to close
    await expect(modalHeading).not.toBeVisible({ timeout: 5000 })

    // Reopen the path selector to verify persistence
    await configureButton.click()
    await expect(modalHeading).toBeVisible({ timeout: 5000 })

    // Wait for checkboxes to load
    await page.waitForSelector('input[type="checkbox"]', { timeout: 5000 })

    // Find the same checkbox again after reopening the modal
    const allCheckboxesAfterReopen = await page.locator('input[type="checkbox"]').all()
    const targetCheckboxAfterReopen = docsCheckboxExists
      ? page.locator(pathSelectorSelectors.pathCheckbox('docs'))
      : allCheckboxesAfterReopen[0]

    await expect(targetCheckboxAfterReopen).toBeVisible({ timeout: 5000 })

    // BUG: This assertion should pass, but will fail because the backend
    // writes to [document.paths] instead of [project.document.paths]
    // The config is read from [project.document.paths], so the change appears lost
    // We expect the checkbox to be in the opposite state from its initial state
    const expectedState = !initialState
    await expect(targetCheckboxAfterReopen).toBeChecked({ checked: expectedState })
  })
})
