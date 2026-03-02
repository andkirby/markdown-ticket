import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '../fixtures/test-fixtures.js'
import { markdownRenderingDocumentPath, markdownRenderingFixture } from '../utils/markdown-fixtures.js'
import { documentSelectors, markdownSelectors } from '../utils/selectors.js'

test.describe('Document Markdown Rendering', () => {
  test('renders nested lists, Mermaid, tables, blockquotes, and code blocks', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Document Markdown Rendering',
    })

    const documentPath = join(project.path, markdownRenderingDocumentPath)
    await writeFile(documentPath, markdownRenderingFixture, 'utf8')

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(markdownRenderingDocumentPath)}`)

    const viewer = page.locator(documentSelectors.fileViewer)
    await expect(viewer).toBeVisible()
    await expect(viewer).toContainText('Markdown Rendering Fixture')

    const nestedListItem = viewer.locator(markdownSelectors.nestedListItem)
    await expect(nestedListItem).toHaveText('inside of one')

    await expect(viewer.locator(markdownSelectors.table)).toBeVisible()
    await expect(viewer.locator(markdownSelectors.blockquote)).toContainText('Rendered quote line')
    await expect(viewer.locator(markdownSelectors.codeBlock)).toContainText('const total = 1 + 2')

    const mermaid = viewer.locator(markdownSelectors.mermaidContainer)
    await expect(mermaid).toBeVisible()
    await expect(mermaid).toContainText('Start')
    await expect(mermaid).toContainText('Render')
    await expect(viewer.locator(markdownSelectors.mermaidFullscreenButton)).toBeVisible()
  })
})
