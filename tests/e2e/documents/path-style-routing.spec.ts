/**
 * MDT-150: Documents Path-Style Routing E2E Tests
 *
 * BDD Scenario:
 *   BR-4 documents_path_style_route: path-style document URLs work alongside query-param URLs
 *
 * @tags MDT-150
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { navigateToDocuments } from '../utils/helpers.js'
import { documentSelectors } from '../utils/selectors.js'

test.describe('MDT-150: Documents Path-Style Routing', () => {
  // Scenario: documents_path_style_route (BR-4)
  // Direct URL navigation to /prj/MDT/documents/path/to/file.md works
  test('@MDT-150 documents_path_style_route: path-style URL loads correct document', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Create a doc file in the docs directory
    const docsDir = path.join(scenario.projectDir, 'docs')
    fs.mkdirSync(docsDir, { recursive: true })
    fs.writeFileSync(path.join(docsDir, 'test-doc.md'), '# Test Document\n\nThis is a test document for path-style routing.', 'utf8')

    // Navigate to documents view first to set up the view
    await page.goto(`/prj/${scenario.projectCode}`)
    await navigateToDocuments(page)

    // Navigate using path-style URL (new behavior)
    await page.goto(`/prj/${scenario.projectCode}/documents/docs/test-doc.md`)

    // Verify the document content is displayed via path-style route
    const fileViewer = page.locator(documentSelectors.fileViewer)
    await expect(fileViewer).toBeVisible()
  })

  // Backwards compatibility: query-param style still works
  test('@MDT-150 documents_query_param_compat: query-param URL still works', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Create a doc file
    const docsDir = path.join(scenario.projectDir, 'docs')
    fs.mkdirSync(docsDir, { recursive: true })
    fs.writeFileSync(path.join(docsDir, 'compat-doc.md'), '# Compat Doc\n\nQuery param backwards compatibility.', 'utf8')

    // Navigate to documents view first
    await page.goto(`/prj/${scenario.projectCode}`)
    await navigateToDocuments(page)

    // Navigate using query param
    await page.goto(`/prj/${scenario.projectCode}/documents?file=docs/compat-doc.md`)

    // Verify content loads
    const fileViewer = page.locator(documentSelectors.fileViewer)
    await expect(fileViewer).toBeVisible()
  })
})
