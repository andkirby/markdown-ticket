/**
 * Relationship Badge Board E2E (MDT-187)
 *
 * Verifies the board relationship badge renders same-project links as bare
 * zero-padded numbers (elision) and collapses lists beyond INLINE_MAX into a
 * +N trigger. Exercises the real route context (useParams projectCode) that
 * unit tests cannot cover.
 *
 * Added after UAT: confirms elision works end-to-end through the real router
 * context, file watcher, and TicketAttributeTags -> RelationshipBadge mount.
 */

import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'
import { waitForBoardReady } from '../utils/helpers.js'

/**
 * Write a ticket file with same-project relatedTickets + dependsOn, mirroring
 * the frontmatter shape produced by the test ticket builder. Written BEFORE
 * navigation so it is present at initial board load.
 */
async function writeTicketWithRelationships(
  projectDir: string,
  crCode: string,
  title: string,
  relatedTickets: string,
  dependsOn: string,
) {
  const content = `---
code: ${crCode}
title: ${title}
status: In Progress
type: Feature Enhancement
priority: High
relatedTickets: ${relatedTickets}
dependsOn: ${dependsOn}
---

## Description

Test ticket with relationships for MDT-187 elision E2E.
`
  await writeFile(join(projectDir, 'docs', 'CRs', `${crCode}.md`), content, 'utf8')
}

test.describe('Relationship badge elision (MDT-187)', () => {
  test('same-project links render as bare numbers on the board', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const { projectCode, projectDir } = scenario

    const relatedCodes = scenario.crCodes.slice(0, 3).join(',')
    const hubCode = `${projectCode}-010`
    await writeTicketWithRelationships(projectDir, hubCode, 'Hub ticket', relatedCodes, scenario.crCodes[0])

    await page.goto(`/prj/${projectCode}`)
    await waitForBoardReady(page)

    const hubCard = page.locator(boardSelectors.ticketByCode(hubCode))
    await expect(hubCard).toBeVisible()

    const relatedBadge = hubCard.locator('.badge[data-relationship="related"]')
    await expect(relatedBadge).toBeVisible()

    // DECISIVE: no full "CODE-NNN" codes visible in the badge (elision succeeded).
    await expect(relatedBadge).not.toContainText(`${projectCode}-`)

    // DECISIVE: bare numbers are present for each related link.
    for (const code of scenario.crCodes.slice(0, 3)) {
      const number = code.split('-').pop()
      await expect(relatedBadge).toContainText(number!)
    }

    // Per-link title carries the full key even though display is elided.
    await expect(relatedBadge.locator(`[title="${scenario.crCodes[0]}"]`)).toBeVisible()
  })

  test('lists beyond INLINE_MAX collapse into a +N trigger', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const { projectCode, projectDir } = scenario

    // Reference 5 same-project tickets (> INLINE_MAX of 3).
    const fiveRelated = [
      ...scenario.crCodes.slice(0, 3),
      `${projectCode}-098`,
      `${projectCode}-099`,
    ].join(',')
    const overflowCode = `${projectCode}-011`
    await writeTicketWithRelationships(projectDir, overflowCode, 'Overflow ticket', fiveRelated, scenario.crCodes[0])

    await page.goto(`/prj/${projectCode}`)
    await waitForBoardReady(page)

    const card = page.locator(boardSelectors.ticketByCode(overflowCode))
    await expect(card).toBeVisible()

    const relatedBadge = card.locator('.badge[data-relationship="related"]')
    await expect(relatedBadge).toBeVisible()

    // +N trigger present (5 links − 3 inline = 2 hidden)
    const trigger = relatedBadge.locator('button[aria-haspopup="dialog"]')
    await expect(trigger).toBeVisible()
    await expect(trigger).toContainText('+2')

    // No full codes visible in the inline portion
    await expect(relatedBadge).not.toContainText(`${projectCode}-`)
  })
})
