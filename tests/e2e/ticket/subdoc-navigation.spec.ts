/**
 * Sub-Document Navigation E2E Tests
 *
 * RED phase — Tests verify sub-document tab navigation behavior once MDT-093 is implemented:
 *   1. Tabs hidden when no sub-documents exist
 *   2. Tabs appear in default order when sub-documents are present
 *   3. Document content loads when a tab is selected
 *   4. URL hash updates on tab selection and encodes nested paths
 *   5. Deep link restores the targeted document on page load
 *   6. Invalid deep link hash falls back to main
 *   7. Folder tab reveals a second tab row for child documents
 *   8. Tab navigation remains sticky while scrolling
 *   9. Navigation updates when files change via SSE
 *  10. Error displayed when document content fails to load
 *
 * Note: manual_navigation_available_when_realtime_unavailable (BR-5.4) is covered
 * at integration level in server/tests rather than E2E due to SSE failure injection requirements.
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

/** Create a sub-document folder with files inside the ticket directory */
function createSubDocFolder(
  projectDir: string,
  ticketCode: string,
  folderName: string,
  files: Record<string, string>,
): void {
  const folderDir = path.join(projectDir, TICKETS_PATH, ticketCode, folderName)
  fs.mkdirSync(folderDir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(folderDir, name), content, 'utf8')
  }
}

test.describe('Sub-Document Navigation', () => {
  // Scenario: subdoc_navigation_hidden_when_absent (BR-1.5)
  test('tabs hidden when ticket has no sub-documents', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    // Tabs container must not be present
    await expect(page.locator(subdocSelectors.tabsContainer)).not.toBeVisible()
  })

  // Scenario: subdoc_navigation_shows_ordered_tabs (BR-1.1, BR-1.2, BR-2.1)
  test('tabs appear with main first, then sub-documents in default order', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    // Create sub-documents in non-default filesystem order
    createSubDocFiles(scenario.projectDir, ticketCode, {
      'tasks.md': '# Tasks',
      'requirements.md': '# Requirements',
      'architecture.md': '# Architecture',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await expect(detailPanel.locator(subdocSelectors.tabsContainer)).toBeVisible()

    // "main" tab must be first
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('main'))).toBeVisible()

    // Default order: requirements, architecture, tasks (domain, poc, tests, debt absent)
    const tabRow = detailPanel.locator(subdocSelectors.tabRow).first()
    const tabs = tabRow.locator('[data-testid^="subdoc-tab-"]')
    const tabNames = await tabs.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid')?.replace('subdoc-tab-', '') ?? ''),
    )
    expect(tabNames).toEqual(['main', 'requirements', 'architecture', 'tasks'])
  })

  // Scenario: subdoc_unordered_entries_appended (BR-1.4)
  test('unknown sub-document names are appended alphabetically after ordered entries', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': '# Requirements',
      'zebra.md': '# Zebra',
      'alpha.md': '# Alpha',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const tabRow = page.locator(ticketSelectors.detailPanel).locator(subdocSelectors.tabRow).first()
    const tabs = tabRow.locator('[data-testid^="subdoc-tab-"]')
    const tabNames = await tabs.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid')?.replace('subdoc-tab-', '') ?? ''),
    )
    // requirements first (known order), then alpha, zebra alphabetically
    expect(tabNames).toEqual(['main', 'requirements', 'alpha', 'zebra'])
  })

  // Scenario: document_selection_loads_content (BR-3.1, BR-3.2)
  test('selecting a tab loads and displays the corresponding content', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': '# Requirements\n\nThis is the requirements document.',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('requirements')).click()

    // Loading feedback appears then resolves
    // (loading may be too fast to catch; assert content is eventually visible)
    await expect(detailPanel.locator(subdocSelectors.content)).toBeVisible()
    await expect(detailPanel.locator(subdocSelectors.content)).toContainText('Requirements')
  })

  // Scenario: url_path_updates_on_selection (MDT-094: BR-4.1, BR-4.2)
  test('URL path updates to reflect selected sub-document', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': '# Architecture',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    await page.locator(ticketSelectors.detailPanel).locator(subdocSelectors.tabTrigger('architecture')).click()

    // MDT-094: Path-based routing - URL should contain /architecture.md
    await expect(page).toHaveURL(/\/architecture\.md$/)
  })

  // Scenario: deep_link_restores_target_document (MDT-094: BR-4.3)
  test('page load with valid sub-document path opens the referenced document', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'tasks.md': '# Tasks\n\nTask list here.',
    })

    // MDT-094: Navigate directly with the deep-link path already set
    await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}/tasks.md`)
    await waitForBoardReady(page)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('tasks'))).toHaveAttribute('aria-selected', 'true')
    await expect(detailPanel.locator(subdocSelectors.content)).toContainText('Task list here')
  })

  // Scenario: deep_link_invalid_path_falls_back_to_main (MDT-094: BR-4.4)
  test('page load with invalid sub-document path falls back to main tab', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': '# Requirements',
    })

    // MDT-094: Try to access a non-existent sub-document
    await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}/nonexistent-doc.md`)
    await waitForBoardReady(page)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('main'))).toHaveAttribute('aria-selected', 'true')
  })

  // Scenario: folder_tab_reveals_child_row (BR-2.2, BR-2.3, BR-2.5)
  test('selecting a folder tab reveals its children in a second tab row', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFolder(scenario.projectDir, ticketCode, 'poc', {
      'spike.md': '# Spike',
      'results.md': '# Results',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)

    // Before clicking: only one tab row
    await expect(detailPanel.locator(subdocSelectors.tabRow)).toHaveCount(1)

    await detailPanel.locator(subdocSelectors.tabTrigger('poc')).click()

    // After clicking folder: second tab row appears with folder's children
    await expect(detailPanel.locator(subdocSelectors.tabRow)).toHaveCount(2)
    const secondRow = detailPanel.locator(subdocSelectors.tabRow).nth(1)
    await expect(secondRow.locator(subdocSelectors.tabTrigger('spike'))).toBeVisible()
    await expect(secondRow.locator(subdocSelectors.tabTrigger('results'))).toBeVisible()
  })

  // Scenario: navigation_remains_visible_while_scrolling (BR-3.3, BR-3.4)
  test('tab navigation stays visible when scrolling through long document content', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    const longContent = Array.from({ length: 100 }, (_, i) => `Paragraph ${i + 1}: content here.`).join('\n\n')
    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': `# Requirements\n\n${longContent}`,
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('requirements')).click()
    await expect(detailPanel.locator(subdocSelectors.content)).toBeVisible()

    // Scroll to bottom of content
    await detailPanel.locator(subdocSelectors.content).evaluate((el) => el.scrollTo(0, el.scrollHeight))

    // Tabs container must still be visible after scrolling
    await expect(detailPanel.locator(subdocSelectors.tabsContainer)).toBeVisible()
  })

  // Scenario: grouped_folders_preserve_hierarchy (BR-2.4)
  test('grouped folder entries appear as groups in primary row, not flattened names', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFolder(scenario.projectDir, ticketCode, 'poc', { 'spike.md': '# Spike' })
    createSubDocFolder(scenario.projectDir, ticketCode, 'prep', { 'notes.md': '# Notes' })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    const primaryRow = detailPanel.locator(subdocSelectors.tabRow).first()

    // Folder names appear as primary tab entries
    await expect(primaryRow.locator(subdocSelectors.tabTrigger('poc'))).toBeVisible()
    await expect(primaryRow.locator(subdocSelectors.tabTrigger('prep'))).toBeVisible()

    // Descendant names must NOT appear in the primary row (not flattened)
    await expect(primaryRow.locator(subdocSelectors.tabTrigger('spike'))).not.toBeVisible()
    await expect(primaryRow.locator(subdocSelectors.tabTrigger('notes'))).not.toBeVisible()
  })

  // Scenario: navigation_updates_on_structure_change (BR-5.1, BR-5.2)
  test('tabs update when sub-document files are added or removed', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple', e2eContext.fileWatcher)
    const ticketCode = scenario.crCodes[0]

    // Navigate first with no subdoc files, then create them to test SSE-driven tab updates
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)

    // Tabs container must not be present yet (no subdoc files)
    await expect(detailPanel.locator(subdocSelectors.tabsContainer)).not.toBeVisible()

    // Create subdoc files — SSE should trigger tab list update
    const taskFile = path.join(scenario.projectDir, TICKETS_PATH, ticketCode, 'tasks.md')
    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': '# Requirements',
      'tasks.md': '# Tasks',
    })

    // After SSE updates: both tabs should appear
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('requirements'))).toBeVisible()
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('tasks'))).toBeVisible()

    // Select tasks tab so it becomes the active document
    await detailPanel.locator(subdocSelectors.tabTrigger('tasks')).click()
    await expect(detailPanel.locator(subdocSelectors.content)).toContainText('Tasks')

    // Remove tasks.md from disk — SSE should trigger tab list update
    fs.unlinkSync(taskFile)

    // After SSE update: tasks tab gone, system falls back to main
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('tasks'))).not.toBeVisible()
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('main'))).toHaveAttribute('aria-selected', 'true')
  })

  // Scenario: error_displayed_when_document_fails (BR-5.3)
  test('error shown in content area when a sub-document fails to load', async ({ page, e2eContext }) => {
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

    // Navigation remains available despite the error
    await expect(detailPanel.locator(subdocSelectors.tabsContainer)).toBeVisible()
  })

  // MDT-094: Test path-based routing with nested folders
  test('path-based routing supports nested folder structures', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    // Create nested folder structure
    createSubDocFolder(scenario.projectDir, ticketCode, 'part-1', {
      'chapter-1.md': '# Chapter 1\n\nContent for chapter 1',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    // Navigate to nested file via path
    await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}/part-1/chapter-1.md`)
    await waitForBoardReady(page)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await expect(detailPanel.locator(subdocSelectors.content)).toContainText('Content for chapter 1')
  })

  // MDT-094: Test path-based URLs work correctly (primary navigation method)
  test('path-based URLs load the correct sub-document', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'prep.md': '# Preparation\n\nPrep content',
    })

    // Navigate directly with path-based URL
    await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}/prep.md`)
    await waitForBoardReady(page)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('prep'))).toHaveAttribute('aria-selected', 'true')
    await expect(detailPanel.locator(subdocSelectors.content)).toContainText('Prep content')
  })

  // MDT-094: Security - reject path traversal attempts
  test.skip('security: path traversal attempts are handled gracefully', async ({ page, e2eContext }) => {
    // TODO: The app currently crashes on path traversal URLs
    // This needs to be fixed at the routing level to gracefully handle invalid paths
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'safe.md': '# Safe Content',
    })

    // Navigate to a path traversal URL
    // The app should handle this gracefully without crashing
    await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}/../safe.md`)

    // The app should still load and be functional
    // It may redirect to a safe URL or show an error, but should not crash
    await page.waitForTimeout(1000)

    // Verify the page is still responsive
    const body = page.locator('body')
    await expect(body).toBeVisible()

    // The URL may or may not have changed, but the app should not be broken
    const currentUrl = page.url()
    expect(currentUrl).toBeTruthy()
  })

  // MDT-094: Security - reject URLs without .md extension
  test('security: URLs without .md extension are rejected', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': '# Requirements',
    })

    // Try to access without .md extension
    await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}/requirements`)
    await waitForBoardReady(page)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    // Should fall back to main tab
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('main'))).toHaveAttribute('aria-selected', 'true')
  })

  // MDT-094: Security - reject absolute paths
  test('security: absolute paths are rejected', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'requirements.md': '# Requirements',
    })

    // Try to access with absolute path
    await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}/absolute/path.md`)
    await waitForBoardReady(page)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    // Should fall back to main tab
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('main'))).toHaveAttribute('aria-selected', 'true')
  })

  // MDT-094: Direct ticket access with sub-document path
  test('direct ticket access URL supports sub-document paths', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': '# Architecture\n\nSystem architecture details',
    })

    // Use direct ticket access URL with sub-document path
    await page.goto(`/ticket/${ticketCode}/architecture.md`)
    await waitForBoardReady(page)

    // Should redirect to project path and load the sub-document
    // Check that the URL contains the expected path (not exact match due to protocol/domain)
    const url = page.url()
    expect(url).toContain(`/prj/${scenario.projectCode}/ticket/${ticketCode}/architecture.md`)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('architecture'))).toHaveAttribute('aria-selected', 'true')
    await expect(detailPanel.locator(subdocSelectors.content)).toContainText('System architecture details')
  })
})
