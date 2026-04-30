/**
 * MDT-150: SmartLink Document Reference E2E Tests
 *
 * BDD Scenarios:
 *   BR-1 ticket_subdoc_reference: .md ref inside ticket subdoc resolves to ticket subdoc or documents view
 *   BR-1 project_doc_reference: .md ref outside ticket folder routes to documents view
 *   BR-2 sibling_ticket_reference: .md ref to sibling ticket routes to ticket view
 *
 * @tags MDT-150
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

test.describe('MDT-150: SmartLink Document References', () => {
  // Scenario: ticket_subdoc_reference (BR-1)
  // A .md reference inside a ticket subdoc to another file in the same ticket
  // should produce a navigable link (ticket subdoc or documents route)
  test('@MDT-150 ticket_subdoc_reference: bare .md ref in subdoc renders as navigable link', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    // Create a subdoc that references another subdoc in the same ticket
    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': '# Architecture\n\nSee [requirements](requirements.md) for details.',
      'requirements.md': '# Requirements\n\nThis is the requirements document.',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    // Select the architecture subdoc
    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()

    // Wait for subdoc content to load
    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible()

    // Verify the link to requirements.md is rendered as a SmartLink
    const docLink = page.locator('a.smart-link[data-link-type="document"]')
    await expect(docLink).toHaveCount(1)

    // Verify the link has a valid href (not a bare filename)
    const href = await docLink.getAttribute('href')
    expect(href).toBeTruthy()
    // The link should point to a route, not a bare relative path
    expect(href).not.toBe('requirements.md')
    expect(href).toContain('/prj/')
  })

  // Scenario: project_doc_reference (BR-1)
  // A .md reference to a file outside the ticket folder should route to documents view
  test('@MDT-150 project_doc_reference: relative .md ref outside ticket folder routes to documents', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]

    // Create a project-level doc outside the ticket folder
    const docsDir = path.join(scenario.projectDir, 'docs')
    fs.mkdirSync(docsDir, { recursive: true })
    fs.writeFileSync(path.join(docsDir, 'CONTRIBUTING.md'), '# Contributing\n\nHow to contribute.', 'utf8')

    // Create a subdoc with a relative reference to the project-level doc
    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': '# Architecture\n\nSee [contributing guide](../../CONTRIBUTING.md) for details.',
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    // Select the architecture subdoc
    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()

    // Wait for subdoc content to load
    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible()

    // Verify the link is rendered as a SmartLink
    const docLink = page.locator('a.smart-link[data-link-type="document"]')
    await expect(docLink).toHaveCount(1)

    // Verify the link has a valid href pointing to documents route
    const href = await docLink.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href).toContain('/prj/')
    // Should not be a bare relative path with ..
    expect(href).not.toBe('../../CONTRIBUTING.md')
  })

  // Scenario: sibling_ticket_reference (BR-2)
  // A .md reference to a sibling ticket (e.g., ../MDT-001.md) should
  // be recognized as a ticket link and route to the ticket view
  test('@MDT-150 sibling_ticket_reference: relative .md ref to sibling ticket routes to ticket view', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]
    const siblingCode = scenario.crCodes[1]

    // Create a subdoc that references a sibling ticket
    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': `# Architecture\n\nSee [related ticket](../${siblingCode}.md) for context.`,
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)

    // Select the architecture subdoc
    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()

    // Wait for subdoc content to load
    await expect(page.locator('[data-testid="subdoc-content"]')).toBeVisible()

    // Verify the link is rendered as a ticket SmartLink
    const ticketLink = page.locator('a.smart-link[data-link-type="ticket"]')
    await expect(ticketLink).toHaveCount(1)

    // Verify the link href points to the ticket view
    const href = await ticketLink.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href).toContain(`/prj/${scenario.projectCode}/ticket/${siblingCode}`)
    // Should not be a bare relative path
    expect(href).not.toContain('../')
  })
})
