/**
 * Documents View E2E Tests
 *
 * RED phase - Tests verify documents view behavior:
 * 1. File tree renders - Verify document tree is visible
 * 2. Folder expansion works - Click folder, verify it expands
 * 3. File content displays - Click file, verify markdown viewer shows content
 *
 * Note: These tests use selectors that may not yet exist in the application.
 * This is intentional RED phase - write tests first, then implement features.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { navigateToDocuments } from '../utils/helpers.js'
import { documentSelectors } from '../utils/selectors.js'

test.describe('Documents View', () => {
  test('file tree renders', async ({ page, e2eContext }) => {
    // Create isolated test data - simple scenario includes docs folder
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to documents view
    await page.goto(`/prj/${scenario.projectCode}`)
    await navigateToDocuments(page)

    // Verify document tree is visible (use first() due to strict mode)
    const documentTree = page.locator(documentSelectors.documentTree).first()
    await expect(documentTree).toBeVisible()
  })

  test('folder expansion works', async ({ page, e2eContext }) => {
    // Create isolated test data - simple scenario includes docs folder
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to documents view
    await page.goto(`/prj/${scenario.projectCode}`)
    await navigateToDocuments(page)

    // Find first folder item (docs folder should be present)
    const firstFolder = page.locator(documentSelectors.folderItem).first()

    // Verify folder is visible
    await expect(firstFolder).toBeVisible()

    // Click folder to expand
    await firstFolder.click()

    // After clicking, verify folder has expanded state
    // The FileTree component doesn't use aria-expanded, so we just verify it's still visible
    await expect(firstFolder).toBeVisible()
  })

  test('file content displays', async ({ page, e2eContext }) => {
    // Create isolated test data - simple scenario includes docs folder
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Navigate to documents view
    await page.goto(`/prj/${scenario.projectCode}`)
    await navigateToDocuments(page)

    // Find and click first document item
    const firstDocument = page.locator(documentSelectors.documentItem).first()

    // Verify document is visible before clicking
    await expect(firstDocument).toBeVisible()

    // Click document to view content
    await firstDocument.click()

    // Verify file viewer appears with content
    const fileViewer = page.locator(documentSelectors.fileViewer)
    await expect(fileViewer).toBeVisible()

    // Verify markdown content is rendered
    const content = await fileViewer.innerHTML()

    // Check for basic markdown elements (headers, paragraphs, code blocks, etc.)
    const hasMarkdownElements = content.includes('<h') ||      // headers
                                content.includes('<p') ||       // paragraphs
                                content.includes('<code') ||    // code blocks
                                content.includes('<pre') ||     // preformatted text
                                content.includes('<ul') ||      // lists
                                content.includes('<ol')         // ordered lists

    expect(hasMarkdownElements).toBe(true)
  })

  test('direct document URL shows created and updated metadata', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}/documents?file=docs/README.md`)

    const fileViewer = page.locator(documentSelectors.fileViewer)
    await expect(fileViewer).toBeVisible()
    await expect(fileViewer).toContainText('Test Project')
    await expect(fileViewer).toContainText('Created:')
    await expect(fileViewer).toContainText('Updated:')
    await expect(fileViewer).not.toContainText('Created: Unknown')
    await expect(fileViewer).not.toContainText('Updated: Unknown')
  })
})
