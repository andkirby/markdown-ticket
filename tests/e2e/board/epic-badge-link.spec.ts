/**
 * Epic Badge Link Board E2E (MDT-193)
 *
 * Smoke test: confirms a ticket whose `phaseEpic` is a bare ticket key renders
 * the phase (Epic) badge as a navigable link on the board, through the real
 * router context, file watcher, and TicketAttributeTags -> ContextBadge mount.
 *
 * One test only — the link-vs-plain-text decision is covered exhaustively at
 * the component level (ContextBadge.test.tsx). This E2E exists to prove the
 * link actually navigates end-to-end.
 */

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'
import { waitForBoardReady } from '../utils/helpers.js'

async function writeTicketWithEpic(
  projectDir: string,
  crCode: string,
  title: string,
  phaseEpic: string,
) {
  const content = `---
code: ${crCode}
title: ${title}
status: In Progress
type: Feature Enhancement
priority: Medium
phaseEpic: ${phaseEpic}
---

## Description

Test ticket with a bare ticket key in phaseEpic for MDT-193 E2E.
`
  await writeFile(join(projectDir, 'docs', 'CRs', `${crCode}.md`), content, 'utf8')
}

test.describe('Epic badge linking (MDT-193)', () => {
  test('phase badge renders a bare ticket key as a navigable link', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const { projectCode, projectDir } = scenario

    // Target ticket the epic points at, and the source ticket referencing it.
    const targetCode = scenario.crCodes[0]
    const sourceCode = `${projectCode}-010`
    await writeTicketWithEpic(projectDir, sourceCode, 'Source ticket', targetCode)

    await page.goto(`/prj/${projectCode}`)
    await waitForBoardReady(page)

    const sourceCard = page.locator(boardSelectors.ticketByCode(sourceCode))
    await expect(sourceCard).toBeVisible()

    // DECISIVE: the phase badge renders the bare key as a link (not plain text).
    const phaseBadge = sourceCard.locator('.badge[data-context="phase"]')
    await expect(phaseBadge).toBeVisible()
    const epicLink = phaseBadge.locator('a[data-link-type="ticket"]')
    await expect(epicLink).toBeVisible()
    await expect(epicLink).toContainText(targetCode)

    // DECISIVE: clicking navigates to the referenced ticket's route.
    await epicLink.click()
    await expect(page).toHaveURL(new RegExp(`/prj/${projectCode}/ticket/${targetCode}`))
  })
})
