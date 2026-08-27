/**
 * MDT-237: Inline-code .md references render as clickable links (E2E)
 *
 * BDD Scenarios:
 *   BR-1.1 convert_inline_code_doc_reference
 *   BR-1.2 client_side_navigation_no_reload
 *   BR-3.1 fenced_code_path_stays_plain
 *   BR-3.2 genuine_inline_code_stays_plain
 *   BR-2.1 broken_reference_visibly_flagged
 *
 * @tags MDT-237
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady, openTicketDetail } from '../utils/helpers.js'
import { subdocSelectors, ticketSelectors } from '../utils/selectors.js'

const TICKETS_PATH = 'docs/CRs'

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

const ARCH_BODY = '# Architecture\n\nSee `requirements.md` for details.'
const REQ_BODY = '# Requirements\n\nThis is the requirements document.'

test.describe('MDT-237: inline-code document references', () => {
  // Scenario: convert_inline_code_doc_reference (BR-1.1)
  test('@MDT-237 inline-code .md ref renders as a clickable link', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': ARCH_BODY,
      'requirements.md': REQ_BODY,
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()
    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible()

    // The inline-code ref becomes a link (code span inside an anchor)
    const codeLink = page.locator('a.smart-link code')
    await expect(codeLink).toHaveCount(1)
    const href = await page.locator('a.smart-link').getAttribute('href')
    expect(href).toBeTruthy()
    expect(href).toContain('/prj/')
  })

  // Scenario: client_side_navigation_no_reload (BR-1.2)
  test('@MDT-237 clicking an inline-code ref navigates without reload', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': ARCH_BODY,
      'requirements.md': '# Requirements\n\nTarget document.',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()
    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible()

    // Mark the window; a full reload would destroy the marker
    await page.evaluate(() => { (window as any).__mdt237NoReload = true })
    await page.locator('a.smart-link code').click()

    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible({ timeout: 10000 })
    const marker = await page.evaluate(() => (window as any).__mdt237NoReload)
    expect(marker).toBe(true)
  })

  // Scenario: fenced_code_path_stays_plain (BR-3.1)
  test('@MDT-237 .md path inside fenced code stays plain code', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': '# Architecture\n\n\`\`\`bash\ncat requirements.md\n\`\`\`\n',
      'requirements.md': '# Requirements\n\nTarget document.',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()
    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible()

    await expect(page.locator('a.smart-link')).toHaveCount(0)
    await expect(page.locator('pre code')).toContainText('cat requirements.md')
  })

  // Scenario: genuine_inline_code_stays_plain (BR-3.2)
  test('@MDT-237 genuine command inline code stays plain code', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': '# Architecture\n\nRun `git mv old.md new.md` to rename.',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()
    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible()

    await expect(page.locator('a.smart-link')).toHaveCount(0)
    await expect(page.locator('code')).toContainText('git mv old.md new.md')
  })

  // Scenario: broken_reference_visibly_flagged (BR-2.1)
  test('@MDT-237 reference to a non-existent document is visibly flagged', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': '# Architecture\n\nSee `../../does-not-exist.md` for details.',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()
    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible()

    // The document index loads via /api/documents; once known-missing,
    // the reference renders in the broken state instead of a working link
    const broken = page.locator('[data-link-type="broken"]')
    await expect(broken).toBeVisible({ timeout: 10000 })
    await expect(broken).toContainText('does-not-exist.md')
  })

  // Scenario: project_root_fallback (BR-2.4)
  // A ref whose relative (ticket-relative) target is missing but whose
  // project-root interpretation exists routes to the documents view
  test('@MDT-237 project-root fallback when the relative target is missing', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': '# Architecture\n\nSee `docs/README.md` for the project doc.',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()
    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible()

    // Falls back to the project-root interpretation via the documents route
    const fallbackLink = page.locator('a.smart-link[data-link-type="document"]')
    await expect(fallbackLink).toHaveCount(1, { timeout: 10000 })
    const fallbackHref = await fallbackLink.getAttribute('href')
    expect(fallbackHref).toContain('/prj/')
    expect(decodeURIComponent(fallbackHref || '')).toContain('file=docs/README.md')
  })

  // Scenario: unique_basename_disambiguation (BR-2.5)
  // A bare filename that is not a ticket subdoc but uniquely matches a
  // project file resolves to that file (THEME.md -> src/THEME.md pattern)
  test('@MDT-237 bare filename with unique project basename resolves to that file', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': '# Architecture\n\nSee `README.md` for the project doc.',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()
    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible()

    const docLink = page.locator('a.smart-link[data-link-type="document"]')
    await expect(docLink).toHaveCount(1, { timeout: 10000 })
    const href = await docLink.getAttribute('href')
    expect(decodeURIComponent(href || '')).toContain('file=docs/README.md')
  })
})
