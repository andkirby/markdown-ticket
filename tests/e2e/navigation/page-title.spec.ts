import * as fs from 'node:fs'
import * as path from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { navigateToDocuments, openTicketDetail, waitForBoardReady, waitForDocumentsReady, waitForListReady } from '../utils/helpers.js'
import { subdocSelectors, ticketSelectors } from '../utils/selectors.js'

function createProjectDocument(projectDir: string): void {
  const docsDir = path.join(projectDir, 'docs', 'design')
  fs.mkdirSync(docsDir, { recursive: true })
  fs.writeFileSync(
    path.join(docsDir, 'navigation.md'),
    '# Navigation Specification\n\nNavigation content.',
    'utf8',
  )
}

function createTicketSubdocument(projectDir: string, ticketCode: string): void {
  const ticketDir = path.join(projectDir, 'docs', 'CRs', ticketCode)
  fs.mkdirSync(ticketDir, { recursive: true })
  fs.writeFileSync(
    path.join(ticketDir, 'architecture.md'),
    '# Architecture\n\nArchitecture content.',
    'utf8',
  )
}

test.describe('Page title', () => {
  test('uses deterministic titles for root ticket subdocument and document contexts', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]
    createProjectDocument(scenario.projectDir)
    createTicketSubdocument(scenario.projectDir, ticketCode)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await expect(page).toHaveTitle(`${scenario.projectCode} Board`)

    await page.goto(`/prj/${scenario.projectCode}/list`)
    await waitForListReady(page)
    await expect(page).toHaveTitle(`${scenario.projectCode} Listing`)

    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await waitForDocumentsReady(page)
    await expect(page).toHaveTitle(`${scenario.projectCode} Documents`)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketDetail(page, ticketCode)
    await expect(page).toHaveTitle(`${ticketCode} - Setup Project Structure`)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await expect(detailPanel.locator(subdocSelectors.tabsContainer)).toBeVisible({ timeout: 10000 })
    await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()
    await expect(page).toHaveTitle(`${ticketCode} - Setup Project Structure - Architecture`)

    await page.locator(ticketSelectors.closeDetail).click()
    await expect(page).toHaveTitle(`${scenario.projectCode} Board`)

    await navigateToDocuments(page)
    await page.goto(`/prj/${scenario.projectCode}/documents/docs/design/navigation.md`)
    await expect(page).toHaveTitle(`${scenario.projectCode} - Navigation Specification`)
  })
})
