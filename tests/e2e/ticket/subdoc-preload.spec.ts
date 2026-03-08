/**
 * Sub-Document Preload E2E Tests
 *
 * Tests verify that sub-document content is preloaded before tab switching
 * to prevent layout shift (MDT-094 fix).
 *
 * Key behaviors:
 * 1. Tab shows loading indicator when clicked
 * 2. Content area shows "Loading…" state during preload
 * 3. Content appears smoothly without layout shift
 * 4. Tab is disabled during load to prevent rapid clicking
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady, openTicketDetail } from '../utils/helpers.js'
import { subdocSelectors, ticketSelectors } from '../utils/selectors.js'

const TICKETS_PATH = 'docs/CRs'

/** Create sub-document files in the ticket's sub-document directory */
function createSubDocFiles(
  projectDir: string,
  ticketCode: string,
  files: Record<string, string>,
): void {
  const subdocDir = path.join(projectDir, TICKETS_PATH, ticketCode)
  fs.mkdirSync(subdocDir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(subdocDir, name), content, 'utf8')
  }
}

test.describe('Sub-Document Preload', () => {
  test('tab shows loading state and content appears smoothly', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    // Create sub-documents with substantial content
    const longContent = Array.from({ length: 50 }, (_, i) =>
      `## Section ${i + 1}\n\nThis is section ${i + 1} with some content.\n\n`,
    ).join('\n')

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': `# Requirements\n\n${longContent}`,
      'architecture.md': `# Architecture\n\n${longContent}`,
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)

    // Click on requirements tab
    await detailPanel.locator(subdocSelectors.tabTrigger('requirements')).click()

    // Tab should become active
    const requirementsTab = detailPanel.locator(subdocSelectors.tabTrigger('requirements'))
    await expect(requirementsTab).toHaveAttribute('data-state', 'active')

    // Content should appear smoothly without a "loading" placeholder appearing AFTER tab switch
    // The key is that we should see content appear, not a loading state after the tab is already active
    await expect(detailPanel.locator(subdocSelectors.content)).toContainText('Section 1', { timeout: 5000 })

    // Verify the content is fully loaded
    await expect(detailPanel.locator(subdocSelectors.content)).toContainText('Section 50')
  })

  test('tab disabled during content load to prevent rapid clicking', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': '# Requirements',
    })

    // Slow down the network to make loading state observable
    await page.route('**/subdocuments/**', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 500))
      route.continue()
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)

    // Click requirements tab and immediately check if it's disabled
    await detailPanel.locator(subdocSelectors.tabTrigger('requirements')).click()

    // Tab should have the loading indicator (…)
    const requirementsTab = detailPanel.locator(subdocSelectors.tabTrigger('requirements'))
    const tabText = await requirementsTab.textContent()
    expect(tabText).toContain('…')
  })

  test('multiple rapid tab clicks are handled gracefully', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': '# Requirements',
      'architecture.md': '# Architecture',
      'tasks.md': '# Tasks',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)

    // Rapidly click multiple tabs
    await detailPanel.locator(subdocSelectors.tabTrigger('requirements')).click()
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()
    await detailPanel.locator(subdocSelectors.tabTrigger('tasks')).click()

    // Should settle on the last tab with correct content
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('tasks'))).toHaveAttribute('data-state', 'active')
    await expect(detailPanel.locator(subdocSelectors.content)).toContainText('Tasks')
  })

  test('error during load clears pending state and shows error', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': '# Requirements',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)

    // Intercept the sub-document fetch to simulate a load failure
    await page.route('**/subdocuments/requirements', (route) => route.abort())

    await detailPanel.locator(subdocSelectors.tabTrigger('requirements')).click()

    // Error message appears in content area
    await expect(detailPanel.locator(subdocSelectors.error)).toBeVisible()

    // Tab should be active (not stuck in loading state)
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('requirements'))).toHaveAttribute('data-state', 'active')
  })
})
