/**
 * E2E Tests: Dot-Notation Namespace System (MDT-138)
 *
 * Tests for sub-document namespace tabs using dot-notation filenames.
 * Covers: single tabs, namespace grouping, sorting, URL routing, SSE updates, coexistence.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { subdocSelectors } from '../utils/selectors.js'
import * as fs from 'node:fs'
import * as path from 'node:path'

const TICKETS_PATH = 'docs/CRs'

/**
 * Create dot-notation sub-document files in ticket directory
 */
function createDotNotationFiles(
  projectDir: string,
  ticketCode: string,
  files: Record<string, string>
): void {
  const ticketDir = path.join(projectDir, TICKETS_PATH, ticketCode)
  fs.mkdirSync(ticketDir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(ticketDir, name), content, 'utf-8')
  }
}

test.describe('MDT-138: Dot-Notation Namespace Tabs', () => {
  test.describe('Tab Display Journey', () => {
    test('single_tab_display - Single tab for root document without dotvariants', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with only 'architecture.md' file (no dot-variants)
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'architecture.md': '# Architecture\n\nContent here',
      })

      // When: I view the ticket detail page
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)

      // Then: I see a single 'architecture' tab (no namespace expansion)
      await expect(page.locator(subdocSelectors.tabTrigger('architecture'))).toBeVisible()
      await expect(page.locator('[data-testid="tab-expansion-indicator"]')).not.toBeVisible()
    })

    test('no_main_tab_without_root - No main tab when no root document exists', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'tests.one.md' and 'tests.two.md' but no 'tests.md'
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'tests.one.md': '# Tests One\n\nContent one',
        'tests.two.md': '# Tests Two\n\nContent two',
      })

      // When: I view the ticket detail page
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)

      // Then: I see '[tests >]' namespace tab with sub-tabs '[one]' and '[two]' but NO '[main]' tab in the nested row
      await expect(page.locator(subdocSelectors.tabTrigger('tests'))).toBeVisible()
      // Click to expand namespace
      await page.click(subdocSelectors.tabTrigger('tests'))
      await expect(page.locator(subdocSelectors.tabTrigger('one'))).toBeVisible()
      await expect(page.locator(subdocSelectors.tabTrigger('two'))).toBeVisible()
      // Check that the nested row (second row) does NOT contain a 'main' tab
      // Note: The top-level row still has [Main] which represents ticket.content
      const tabRows = await page.locator(subdocSelectors.tabRow).all()
      const nestedRowTabs = tabRows[1].locator('[data-testid^="subdoc-tab-"]')
      const subtabs = await nestedRowTabs.allTextContents()
      expect(subtabs).toEqual(['one', 'two'])
    })

    test('multi_dot_preservation - Multi-dot preservation in sub-key', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'a.b.c.md' file
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'a.b.c.md': '# A.B.C\n\nMulti-dot content',
      })

      // When: I view the ticket detail page
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)

      // Then: I see '[a >]' namespace tab with sub-tab '[b.c]' (dots preserved after first)
      await expect(page.locator(subdocSelectors.tabTrigger('a'))).toBeVisible()
      await page.click(subdocSelectors.tabTrigger('a'))
      await expect(page.locator(subdocSelectors.tabTrigger('b.c'))).toBeVisible()
    })
  })

  test.describe('Namespace Grouping Journey', () => {
    test('namespace_grouping_with_sorting - Namespace grouping with alphanumerical sorting', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'architecture.md', 'architecture.alpha.md', and 'architecture.beta.md'
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'architecture.md': '# Architecture\n\nMain content',
        'architecture.alpha.md': '# Alpha\n\nAlpha content',
        'architecture.beta.md': '# Beta\n\nBeta content',
      })

      // When: I view the ticket detail page
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)

      // Then: I see '[architecture >]' namespace tab with sub-tabs '[main]', '[alpha]', '[beta]' sorted alphanumerically
      await expect(page.locator(subdocSelectors.tabTrigger('architecture'))).toBeVisible()
      await page.click(subdocSelectors.tabTrigger('architecture'))

      // Get only the nested row tabs (second row)
      const tabRows = await page.locator(subdocSelectors.tabRow).all()
      const nestedRowTabs = tabRows[1].locator('[data-testid^="subdoc-tab-"]')
      const subtabs = await nestedRowTabs.allTextContents()
      expect(subtabs).toEqual(['Main', 'alpha', 'beta'])
    })

    test('namespace_selection_shows_first - Namespace selection shows first sub-document', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'bdd.scenario-1.md' and 'bdd.scenario-2.md'
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'bdd.scenario-1.md': '# Scenario 1\n\nFirst scenario content',
        'bdd.scenario-2.md': '# Scenario 2\n\nSecond scenario content',
      })

      // When: I click the '[bdd >]' namespace tab
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)
      await page.click(subdocSelectors.tabTrigger('bdd'))

      // Then: I see the content of 'bdd.scenario-1.md' (first sub-document alphanumerically)
      await expect(page.locator(subdocSelectors.content)).toContainText('First scenario content')
    })
  })

  test.describe('Navigation Journey', () => {
    test('url_routing_namespace_path - URL routing with namespace path', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'requirements.scope.md'
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'requirements.scope.md': '# Scope\n\nScope content',
      })

      // When: I navigate to view 'requirements.scope.md' sub-document
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)
      await page.click(subdocSelectors.tabTrigger('requirements'))
      await page.click(subdocSelectors.tabTrigger('scope'))

      // Then: the URL shows the dot-notation path format for virtual folders '/prj/{project}/ticket/{ticket}/requirements.scope.md'
      expect(page.url()).toContain(`/prj/${scenario.projectCode}/ticket/${ticketCode}/requirements.scope.md`)
    })

    test('root_document_url_routing - Root document URL displays single tab', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'architecture.md' file only
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'architecture.md': '# Architecture\n\nContent',
      })

      // When: user navigates directly to the architecture.md URL
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}/architecture.md`)
      await waitForBoardReady(page)

      // Then: the system displays the 'architecture' tab
      await expect(page.locator(subdocSelectors.tabTrigger('architecture'))).toBeVisible()
    })

    test('dot_notation_url_routing - Dot-notation URL displays namespace subtab', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'architecture.approve-it.md' file
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'architecture.approve-it.md': '# Approve It\n\nContent',
      })

      // When: user navigates directly to the URL (backward compatibility: slash-separated format)
      // Note: Frontend now generates dot-notation URLs, but slash-separated URLs still work for backward compatibility
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}/architecture/approve-it.md`)
      await waitForBoardReady(page)

      // Then: the system displays 'architecture' namespace tab with 'approve-it' subtab
      await expect(page.locator(subdocSelectors.tabTrigger('architecture'))).toBeVisible()
      await expect(page.locator(subdocSelectors.tabTrigger('approve-it'))).toBeVisible()
    })

    test('folder_subfile_url_routing - Folder subfile URL displays gray slash subtab', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'bdd/legacy.md' file in folder
      const ticketDir = path.join(scenario.projectDir, TICKETS_PATH, ticketCode)
      fs.mkdirSync(path.join(ticketDir, 'bdd'), { recursive: true })
      fs.writeFileSync(path.join(ticketDir, 'bdd', 'legacy.md'), '# Legacy\n\nContent', 'utf-8')

      // When: user navigates directly to the folder-based URL
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}/bdd/legacy.md`)
      await waitForBoardReady(page)

      // Then: the system displays 'bdd' namespace tab with 'legacy' subtab (no prefix when only folder exists)
      await expect(page.locator(subdocSelectors.tabTrigger('bdd'))).toBeVisible()
      await expect(page.locator(subdocSelectors.tabTrigger('legacy'))).toBeVisible()
    })
  })

  test.describe('Coexistence Journey', () => {
    test('folder_dot_coexistence - Folder and dot-notation coexistence', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'bdd.scenario-1.md' and 'bdd/legacy.md'
      const ticketDir = path.join(scenario.projectDir, TICKETS_PATH, ticketCode)
      fs.mkdirSync(path.join(ticketDir, 'bdd'), { recursive: true })
      fs.writeFileSync(path.join(ticketDir, 'bdd.scenario-1.md'), '# Scenario 1\n\nContent', 'utf-8')
      fs.writeFileSync(path.join(ticketDir, 'bdd', 'legacy.md'), '# Legacy\n\nLegacy content', 'utf-8')

      // When: I view the ticket detail page
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)
      await page.click(subdocSelectors.tabTrigger('bdd'))

      // Then: I see both '[scenario-1]' (dot-notation) and '[/legacy]' (physical folder child with / prefix)
      await expect(page.locator(subdocSelectors.tabTrigger('scenario-1'))).toBeVisible()
      await expect(page.locator(subdocSelectors.tabTrigger('/legacy'))).toBeVisible()
    })

    test('special_characters_preserved - Special characters preserved in semantic part', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'tests.e2e-smoke.md'
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'tests.e2e-smoke.md': '# E2E Smoke\n\nSmoke test content',
      })

      // When: I view the ticket detail page
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)
      await page.click(subdocSelectors.tabTrigger('tests'))

      // Then: I see '[tests >]' namespace tab with sub-tab '[e2e-smoke]' (hyphen preserved)
      await expect(page.locator(subdocSelectors.tabTrigger('e2e-smoke'))).toBeVisible()
    })
  })

  test.describe('Bug Fix Specifications (from MISSING_SPECS.md)', () => {
    test('BR-MAIN - Main tab always visible as first tab', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with dot-notation files
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'bdd.scenario-1.md': '# Scenario 1',
        'tests.trace.md': '# Tests',
      })

      // When: I view the ticket detail page
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)

      // Then: [Main] tab is visible as the first tab (for ticket.content)
      // Note: data-testid is 'subdoc-tab-main' (lowercase), display text is 'Main'
      const mainTab = page.locator('[data-testid="subdoc-tab-main"]')
      await expect(mainTab).toBeVisible()

      // Verify it's the first tab in the top row
      const firstTab = page.locator(subdocSelectors.tabRow).first().locator('[data-testid^="subdoc-tab-"]').first()
      await expect(firstTab).toHaveAttribute('data-testid', 'subdoc-tab-main')
    })

    test('BR-NO-DUPLICATES - Dot-notation files only in virtual folders', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with dot-notation file
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'bdd.trace.md': '# BDD Trace',
      })

      // When: I view the ticket detail page
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)

      // Then: 'trace' does NOT appear as a top-level tab
      await expect(page.locator(subdocSelectors.tabTrigger('trace'))).not.toBeVisible()

      // But 'bdd' namespace tab IS visible
      await expect(page.locator(subdocSelectors.tabTrigger('bdd'))).toBeVisible()

      // And 'trace' appears as a sub-tab inside 'bdd' namespace
      await page.click(subdocSelectors.tabTrigger('bdd'))
      await expect(page.locator(subdocSelectors.tabTrigger('trace'))).toBeVisible()
    })

    test('BR-CLICK-FORWARD - Virtual folder click navigates to root file', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with 'bdd.md' root file and dot-notation children
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'bdd.md': '# BDD Root\n\nRoot content',
        'bdd.trace.md': '# Trace',
      })

      // When: I click the '[bdd >]' namespace tab
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)
      await page.click(subdocSelectors.tabTrigger('bdd'))

      // Then: URL navigates to root file (bdd.md), NOT bdd.main.md
      await expect(page).toHaveURL(/\/bdd\.md$/)
      await expect(page).not.toHaveURL(/\/bdd\.main\.md$/)

      // And content is from root file
      await expect(page.locator(subdocSelectors.content)).toContainText('Root content')
    })

    test('BR-MAIN-PATH - Main child path equals namespace path', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with virtual folder containing [main] child
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'tests.md': '# Tests Root\n\nRoot content',
        'tests.e2e.md': '# E2E Tests',
      })

      // When: I click the namespace tab (which should navigate to root file)
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)
      await page.click(subdocSelectors.tabTrigger('tests'))

      // Then: URL shows the namespace path (tests.md), NOT dot-notation (tests.main.md)
      // The click on namespace tab should forward to the root file
      await expect(page).toHaveURL(new RegExp(`/${ticketCode}/tests\\.md$`))
      await expect(page).not.toHaveURL(new RegExp(`/${ticketCode}/tests\\.main\\.md$`))

      // And clicking the [main] sub-tab in the NESTED row should also navigate to the same URL
      // Note: We need to click the main tab in the second row (nested), not the top-level main tab
      const tabRows = await page.locator(subdocSelectors.tabRow).all()
      const nestedRowMainTab = tabRows[1].locator('[data-testid="subdoc-tab-main"]')
      await nestedRowMainTab.click()
      await expect(page).toHaveURL(new RegExp(`/${ticketCode}/tests\\.md$`))
    })

    test('C-URL-FORMAT - Virtual folders use dot notation in URLs', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with dot-notation file
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'requirements.scope.md': '# Scope',
      })

      // When: I navigate to the subdocument
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)
      await page.click(subdocSelectors.tabTrigger('requirements'))
      await page.click(subdocSelectors.tabTrigger('scope'))

      // Then: URL uses dot notation (requirements.scope.md), NOT slash encoding
      // The URL should contain the dot-notation path
      await expect(page.url()).toContain('requirements.scope.md')

      // Verify no slash encoding (%2F) in URL
      await expect(page.url()).not.toContain('%2F')

      // Verify it's NOT using slash notation (requirements/scope.md)
      await expect(page.url()).not.toContain('requirements/scope.md')
    })

    test('C-URL-FORMAT - Physical folders use slash notation in URLs', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with folder-based subdocument
      const ticketDir = path.join(scenario.projectDir, TICKETS_PATH, ticketCode)
      fs.mkdirSync(path.join(ticketDir, 'bdd'), { recursive: true })
      fs.writeFileSync(path.join(ticketDir, 'bdd', 'legacy.md'), '# Legacy\n\nContent', 'utf-8')

      // When: I navigate to the subdocument
      await page.goto(`/prj/${scenario.projectCode}/ticket/${ticketCode}`)
      await waitForBoardReady(page)
      await page.click(subdocSelectors.tabTrigger('bdd'))
      // Note: folder-based files don't have '/' prefix in data-testid, only in display
      await page.click('[data-testid="subdoc-tab-legacy"]')

      // Then: URL uses slash notation (bdd/legacy.md)
      const expectedUrl = `${page.url().split('/prj/')[0]}/prj/${scenario.projectCode}/ticket/${ticketCode}/bdd/legacy.md`
      await expect(page).toHaveURL(expectedUrl)
    })

    test('BR-DOT-IN-PATH - Physical child with dot in filename navigates correctly', async ({ page }) => {
      // This test uses the real MDT-138 ticket which has:
      // - bdd.md (root file)
      // - bdd.trace.md (virtual child)
      // - bdd/another.trace.md (physical child with dot in name)

      // When: I navigate directly to the bdd folder and then click the /another.trace sub-tab
      await page.goto('/prj/MDT/ticket/MDT-138')
      await page.waitForSelector('[data-testid="subdoc-tab-bdd"]', { timeout: 30000 })
      await page.click('[data-testid="subdoc-tab-bdd"]')

      // Wait for the second tab row to appear
      await page.waitForSelector('[data-testid="subdoc-tab-row"] >> nth=1', { timeout: 5000 })

      // Verify the /another.trace tab exists (physical children have / prefix when mixed with virtual)
      const anotherTraceTab = page.locator('[data-testid="subdoc-tab-/another.trace"]')
      await expect(anotherTraceTab).toBeVisible({ timeout: 10000 })

      // Click the physical child tab
      await anotherTraceTab.click()

      // Then: URL should be bdd/another.trace.md (NOT main.md)
      await expect(page).toHaveURL(/\/MDT-138\/bdd\/another\.trace\.md$/)

      // And the tab should be active
      await expect(anotherTraceTab).toHaveAttribute('data-state', 'active')

      // And content should be from the correct file (physical trace, not virtual trace)
      await expect(page.locator('[data-testid="subdoc-content"]')).toContainText('another.trace')
    })

    test('C-FILEPATH - API response includes filePath for all nodes', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      const ticketCode = scenario.crCodes[0]

      // Given: a ticket with mixed subdocument types
      createDotNotationFiles(scenario.projectDir, ticketCode, {
        'architecture.md': '# Architecture',
        'architecture.approve-it.md': '# Approve It',
        'tests.trace.md': '# Tests',
      })

      // When: I fetch the CR endpoint (which includes subdocuments)
      const response = await page.request.get(
        `/api/projects/${scenario.projectCode}/crs/${ticketCode}`
      )
      const data = await response.json()
      const subdocuments = data.subdocuments as any[]

      // Then: all nodes have filePath property
      function assertHasFilePath(node: any, basePath: string = ticketCode): void {
        expect(node).toHaveProperty('filePath')

        // Verify filePath format based on node type
        if (node.isVirtual && node.kind === 'folder') {
          // Virtual folder: {ticketCode}/{namespace}.md
          expect(node.filePath).toMatch(new RegExp(`^${basePath}/[^/]+\\.md$`))
        } else if (node.kind === 'folder' && !node.isVirtual) {
          // Physical folder: {ticketCode}/{namespace}/
          expect(node.filePath).toMatch(new RegExp(`^${basePath}/[^/]+/$`))
        } else if (node.kind === 'file') {
          // File nodes should have proper path
          expect(node.filePath).toBeDefined()
          expect(node.filePath).toMatch(/\.md$/)
        }

        // Recursively check children
        if (node.children && node.children.length > 0) {
          const childBasePath = node.isVirtual ? basePath : `${basePath}/`
          node.children.forEach((child: any) => assertHasFilePath(child, childBasePath))
        }
      }

      // Verify all top-level nodes
      expect(Array.isArray(subdocuments)).toBe(true)
      subdocuments.forEach((node: any) => assertHasFilePath(node))
    })
  })
})
