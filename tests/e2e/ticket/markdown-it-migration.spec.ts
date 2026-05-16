import { expect, test } from '../fixtures/test-fixtures.js'
import { openTicketDetail, waitForBoardReady } from '../utils/helpers.js'
import { ticketSelectors } from '../utils/selectors.js'

/**
 * E2E tests for MDT-165: markdown-it migration + wireframe label rendering.
 * Covers BDD scenarios: wireframe_with_metadata_label, wireframe_without_metadata,
 * table_rendering, strikethrough_rendering, task_list_rendering, mermaid_block_compatibility,
 * prism_syntax_highlighting, smart_link_preprocessing, heading_id_generation,
 * dompurify_allows_wireframe_label.
 */

const markdownItMigrationFixture = `
# Markdown-it Migration Test

## Introduction

This document tests all markdown rendering features after migration from Showdown to markdown-it.

## Wireframe With Metadata

\`\`\`wireframe state:surface empty
+------------------+
|  Surface View    |
+------------------+
\`\`\`

## Wireframe Without Metadata

\`\`\`wireframe
+------------------+
|  Plain Wireframe |
+------------------+
\`\`\`

## Table

| Name | Value |
| --- | --- |
| alpha | 1 |
| beta | 2 |

## Strikethrough

This is ~~deleted text~~ in a paragraph.

## Task List

- [ ] Unchecked item
- [x] Checked item

## Mermaid

\`\`\`mermaid
graph TD
    A[Start] --> B[End]
\`\`\`

## Code Block

\`\`\`typescript
const greeting: string = "hello"
\`\`\`

## Smart Links

See MDT-001 for details. Also check README.md.
`.trim()

test.describe('Markdown-it Migration Rendering', () => {
  test('renders wireframe fence with metadata as labeled code block', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireframe Metadata Label',
    })

    const ticket = await e2eContext.projectFactory.createTestCR(project.key, {
      title: 'Wireframe metadata label test',
      type: 'Feature Enhancement',
      status: 'Proposed',
      priority: 'Medium',
      content: markdownItMigrationFixture,
    })

    expect(ticket.success).toBe(true)
    expect(ticket.crCode).toBeDefined()

    await page.goto(`/prj/${project.key}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticket.crCode!)

    const content = page.locator(ticketSelectors.content)
    await expect(content).toBeVisible()

    // BR-1, BR-10: Wireframe with metadata renders labeled block
    const wireframeLabel = content.locator('.code-block-label.wireframe-label')
    await expect(wireframeLabel).toHaveText('state:surface empty')

    const wireframeCode = content.locator('pre code.language-wireframe').first()
    await expect(wireframeCode).toBeVisible()
  })

  test('renders wireframe fence without metadata as normal code block', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireframe No Metadata',
    })

    const ticket = await e2eContext.projectFactory.createTestCR(project.key, {
      title: 'Wireframe no metadata test',
      type: 'Feature Enhancement',
      status: 'Proposed',
      priority: 'Medium',
      content: markdownItMigrationFixture,
    })

    expect(ticket.success).toBe(true)

    await page.goto(`/prj/${project.key}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticket.crCode!)

    const content = page.locator(ticketSelectors.content)
    await expect(content).toBeVisible()

    // BR-2: Plain wireframe renders without label
    const wireframeLabels = content.locator('.code-block-label.wireframe-label')
    // Only the metadata wireframe should have a label
    await expect(wireframeLabels).toHaveCount(1)
  })

  test('renders tables, strikethrough, task lists, mermaid, and code blocks correctly', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Markdown Features',
    })

    const ticket = await e2eContext.projectFactory.createTestCR(project.key, {
      title: 'Full markdown feature test',
      type: 'Feature Enhancement',
      status: 'Proposed',
      priority: 'Medium',
      content: markdownItMigrationFixture,
    })

    expect(ticket.success).toBe(true)

    await page.goto(`/prj/${project.key}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticket.crCode!)

    const content = page.locator(ticketSelectors.content)
    await expect(content).toBeVisible()

    // BR-3: Table renders
    await expect(content.locator('table')).toBeVisible()
    await expect(content.locator('table th')).toHaveCount(2)
    await expect(content.locator('table td')).toHaveCount(4)

    // BR-4: Strikethrough renders
    const deletedText = content.locator('del, s')
    await expect(deletedText).toContainText('deleted text')

    // BR-5: Task list renders with disabled checkboxes
    const checkboxes = content.locator('input[type="checkbox"]')
    await expect(checkboxes).toHaveCount(2)
    await expect(checkboxes.first()).not.toBeChecked()
    await expect(checkboxes.first()).toBeDisabled()
    await expect(checkboxes.last()).toBeChecked()
    await expect(checkboxes.last()).toBeDisabled()

    // BR-6: Mermaid renders
    const mermaid = content.locator('.mermaid-container')
    await expect(mermaid).toBeVisible()
    await expect(mermaid).toContainText('Start')

    // BR-7: Code block with syntax highlighting
    const tsCode = content.locator('pre code.language-typescript')
    await expect(tsCode).toBeVisible()
    await expect(tsCode).toContainText('greeting')

    // BR-9: Heading has GitHub-compatible slug ID
    // headerLevelStart offsets h2 → h4 in ticket content
    const introHeading = content.locator('h4#introduction')
    await expect(introHeading).toBeVisible()

    // BR-11: TOC extraction is verified via unit tests for extractTableOfContents()
    // The ticket detail TOC sidebar only populates for subdocuments, not main ticket content.
    // E2E verifies heading IDs exist; unit tests verify TOC extraction + headerLevelStart offset.
  })

  test('renders ticket and document references as links', async ({ page, e2eContext }) => {
    // Project code must be 'MDT' so the preprocessor matches 'MDT-001' as a ticket reference
    // (convertTicketReferences uses currentProject prefix for matching)
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Smart Links',
      code: 'MDT',
    })

    const ticket = await e2eContext.projectFactory.createTestCR(project.key, {
      title: 'Smart link test',
      type: 'Feature Enhancement',
      status: 'Proposed',
      priority: 'Medium',
      content: markdownItMigrationFixture,
    })

    expect(ticket.success).toBe(true)

    await page.goto(`/prj/${project.key}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticket.crCode!)

    const content = page.locator(ticketSelectors.content)
    await expect(content).toBeVisible()

    // BR-8: Ticket reference becomes link (preprocessor matches MDT-\d+ when project is MDT)
    // Use data-link-type to avoid matching document links whose path also contains /ticket/MDT-001
    const ticketLink = content.locator('a[data-link-type="ticket"][href*="/ticket/MDT-001"]')
    await expect(ticketLink).toBeVisible()

    // BR-8: Document reference becomes link
    const docLink = content.locator('a[href*="README.md"]')
    await expect(docLink).toBeVisible()
  })
})
