/**
 * MDT-150: Documents-View Relative Link Resolution E2E Tests
 *
 * BDD Scenario:
 *   BR-5 documents_view_relative_reference: a relative .md link inside a
 *   document viewed in the documents view resolves against the source
 *   document's directory, not the URL root.
 *
 * Symptom (pre-fix):
 *   Document at /prj/ABC/documents?file=docs/architecture/aaaa.md contains
 *   [x](relative.md). Browser resolves the raw relative href against the URL
 *   root → /prj/ABC/documents/relative.md (broken — drops docs/architecture/).
 *
 * Expected (post-fix):
 *   The preprocessor resolves relative.md against the source document's
 *   directory and emits /prj/ABC/documents?file=docs%2Farchitecture%2Frelative.md.
 *
 * @tags MDT-150
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { navigateToDocuments } from '../utils/helpers.js'
import { documentSelectors } from '../utils/selectors.js'

test.describe('MDT-150: Documents-View Relative Link Resolution', () => {
  // Scenario: documents_view_relative_reference (BR-1, BR-5)
  test('@MDT-150 documents_view_relative_reference: relative .md link resolves against source dir', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Create a source document with a relative .md link, and the target it links to.
    const archDir = path.join(scenario.projectDir, 'docs', 'architecture')
    fs.mkdirSync(archDir, { recursive: true })
    fs.writeFileSync(
      path.join(archDir, 'aaaa.md'),
      '# aaaa\n\nSee [relative](relative.md) for details.',
      'utf8',
    )
    fs.writeFileSync(
      path.join(archDir, 'relative.md'),
      '# relative\n\nThis is the sibling document.',
      'utf8',
    )

    // Open the source document in the documents view.
    await page.goto(`/prj/${scenario.projectCode}`)
    await navigateToDocuments(page)
    await page.goto(`/prj/${scenario.projectCode}/documents?file=docs/architecture/aaaa.md`)

    // Verify source document loaded.
    const fileViewer = page.locator(documentSelectors.fileViewer)
    await expect(fileViewer).toBeVisible()

    // The relative link must be resolved against the source document's directory.
    // Pre-fix: href would be the raw "relative.md" (browser would resolve to
    // /prj/.../documents/relative.md — broken).
    // Post-fix: href is /prj/.../documents?file=docs%2Farchitecture%2Frelative.md.
    const relativeLink = page.locator('a[href*="relative.md"]').first()
    await expect(relativeLink).toBeVisible()
    const href = await relativeLink.getAttribute('href')
    expect(href).toContain('docs')
    expect(href).toContain('architecture')
    expect(href).toContain('relative.md')
    // Must NOT be the raw unresolved relative href.
    expect(href).not.toBe('relative.md')
    expect(href).not.toMatch(/\/documents\/relative\.md$/)

    // Click the link and confirm it navigates to the sibling document.
    await relativeLink.click()
    await page.waitForURL(/file=docs%2Farchitecture%2Frelative\.md/)
    await expect(page.locator('h1:has-text("relative")')).toBeVisible()
  })
})
