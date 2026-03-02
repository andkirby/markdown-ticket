import { expect, test } from '../fixtures/test-fixtures.js'
import { openTicketDetail, waitForBoardReady } from '../utils/helpers.js'
import { markdownRenderingFixture } from '../utils/markdown-fixtures.js'
import { markdownSelectors, ticketSelectors } from '../utils/selectors.js'

test.describe('Ticket Markdown Rendering', () => {
  test('renders nested lists, Mermaid, tables, blockquotes, and code blocks', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Ticket Markdown Rendering',
    })

    const ticket = await e2eContext.projectFactory.createTestCR(project.key, {
      title: 'Verify markdown rendering in ticket detail',
      type: 'Bug Fix',
      status: 'Proposed',
      priority: 'High',
      content: markdownRenderingFixture,
    })

    expect(ticket.success).toBe(true)
    expect(ticket.crCode).toBeDefined()

    await page.goto(`/prj/${project.key}`)
    await waitForBoardReady(page)

    await openTicketDetail(page, ticket.crCode!)

    const content = page.locator(ticketSelectors.content)
    await expect(content).toBeVisible()

    const nestedListItem = content.locator(markdownSelectors.nestedListItem)
    await expect(nestedListItem).toHaveText('inside of one')

    await expect(content.locator(markdownSelectors.table)).toBeVisible()
    await expect(content.locator(markdownSelectors.blockquote)).toContainText('Rendered quote line')
    await expect(content.locator(markdownSelectors.codeBlock)).toContainText('const total = 1 + 2')

    const mermaid = content.locator(markdownSelectors.mermaidContainer)
    await expect(mermaid).toBeVisible()
    await expect(mermaid).toContainText('Start')
    await expect(mermaid).toContainText('Render')
    await expect(content.locator(markdownSelectors.mermaidFullscreenButton)).toBeVisible()
  })
})
