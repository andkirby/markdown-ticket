/**
 * Epic board jump journeys (MDT-246)
 *
 * Proves the ticket → epic → focused-board journey end to end through the
 * real router, file watcher, and board mount:
 *
 * 1. "Epics →" CTA (epic detail header) — one navigation to
 *    /prj/:code/epics?epic=KEY with focused arrival (expanded, highlighted,
 *    auto-clear) and natural token drop on the next navigation (C-2).
 * 2. Split-chip action zone (epic ContextBadge in the ticket viewer header)
 *    — same destination; the identity-zone key link carries ?view= (BR-1.7)
 *    so closing the epic returns to the Epics view.
 * 3. Unknown ?epic= token — board renders normally (BR-1.6).
 * 4. Hide empty override — the focused lane renders despite the filter (BR-1.5).
 *
 * Focus expansion/override/search logic is covered at the unit level
 * (SwimlaneBoard.test.tsx, helpers.test.ts); this spec proves integration.
 */

import type { ProjectFactory } from '@mdt/shared/test-lib'
import type { Page } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { expect, test } from '../fixtures/test-fixtures.js'
import { boardSelectors, commonSelectors, swimlaneSelectors, ticketSelectors } from '../utils/selectors.js'

/**
 * Direct /epics navigations never render the flat-board testid that
 * waitForBoardReady waits for — wait for the swimlane surface instead.
 */
async function waitForEpicsBoard(page: Page): Promise<void> {
  await page.waitForSelector(commonSelectors.loading, { state: 'hidden' })
  await page.waitForSelector(swimlaneSelectors.board, { state: 'visible' })
}

interface JumpScenario {
  projectCode: string
  epic: string
  closedEpic: string
  child: string
}

async function addLevel(filePath: string, level: 'epic' | 'ticket' = 'epic'): Promise<void> {
  const content = await readFile(filePath, 'utf8')
  await writeFile(filePath, content.replace('priority: Medium\n', `priority: Medium\nlevel: ${level}\n`), 'utf8')
}

async function createJumpProject(projectFactory: ProjectFactory): Promise<JumpScenario> {
  const project = await projectFactory.createProject('empty', {
    name: 'Epic Board Jump Project',
    code: 'EBJ',
  })

  const epic = await projectFactory.createTestCR(project.key, {
    title: 'Journey Epic',
    type: 'Feature Enhancement',
    status: 'Approved',
    priority: 'Medium',
    content: 'Epic for the board-jump journey.',
  })
  const closedEpic = await projectFactory.createTestCR(project.key, {
    title: 'Closed Epic',
    type: 'Feature Enhancement',
    status: 'Implemented',
    priority: 'Medium',
    content: 'Closed epic — hidden from the board unless Show closed is on.',
  })
  const child = await projectFactory.createTestCR(project.key, {
    title: 'Journey Child',
    type: 'Feature Enhancement',
    status: 'Approved',
    priority: 'Medium',
    phaseEpic: epic.crCode,
    content: 'Child ticket of the journey epic.',
  })
  const closedChild = await projectFactory.createTestCR(project.key, {
    title: 'Closed Child',
    type: 'Feature Enhancement',
    status: 'Implemented',
    priority: 'Medium',
    phaseEpic: closedEpic.crCode,
    content: 'Child ticket of the closed epic.',
  })
  if (!epic.filePath || !closedEpic.filePath || !epic.crCode || !closedEpic.crCode || !child.crCode || !closedChild.crCode)
    throw new Error('Failed to create journey tickets')
  await addLevel(epic.filePath)
  await addLevel(closedEpic.filePath)

  return { projectCode: project.key, epic: epic.crCode, closedEpic: closedEpic.crCode, child: child.crCode }
}

test.describe('Epic board jump (MDT-246)', () => {
  test('Epics → CTA on the epic detail jumps to the focused lane (BR-1.1, BR-1.3, BR-1.4)', async ({ page, e2eContext }) => {
    const scenario = await createJumpProject(e2eContext.projectFactory)

    // Journey start: the Epics view; open the epic from its lane key.
    await page.goto(`/prj/${scenario.projectCode}/epics`)
    await waitForEpicsBoard(page)
    await page.click(swimlaneSelectors.laneKeyByKey(scenario.epic))
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()

    // The CTA renders beside Trace Graph with the full-sentence name.
    const cta = page.locator(ticketSelectors.epicBoardAction)
    await expect(cta).toBeVisible()
    await expect(cta).toHaveText(/Epics/)
    await expect(cta).toHaveAccessibleName(`Show ${scenario.epic} on Epics board`)

    await cta.click()

    // One navigation: modal closed, focused arrival on the epic's lane.
    await expect(page.locator(ticketSelectors.detailPanel)).toHaveCount(0)
    await expect(page).toHaveURL(`/prj/${scenario.projectCode}/epics?epic=${scenario.epic}`)
    const lane = page.locator(swimlaneSelectors.laneByKey(scenario.epic))
    await expect(lane).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneLabelByKey(scenario.epic))).toHaveAttribute('aria-expanded', 'true')

    // Transient highlight present, then auto-cleared (~2s); expansion persists.
    await expect(page.locator(swimlaneSelectors.focusedLaneByKey(scenario.epic))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.focusedLaneByKey(scenario.epic))).toHaveCount(0, { timeout: 5000 })
    await expect(page.locator(swimlaneSelectors.laneLabelByKey(scenario.epic))).toHaveAttribute('aria-expanded', 'true')

    // C-2: the token drops naturally on the next navigation — opening a
    // ticket from the lane does not carry ?epic=.
    await page.locator(swimlaneSelectors.laneByKey(scenario.epic))
      .locator(boardSelectors.ticketByCode(scenario.child)).click()
    await expect(page).toHaveURL(new RegExp(`/ticket/${scenario.child}(\\?view=epics)?$`))
    await expect(page).not.toHaveURL(/epic=/)
  })

  test('split-chip action zone jumps; identity link carries ?view= (BR-1.2, BR-1.3, BR-1.7)', async ({ page, e2eContext }) => {
    const scenario = await createJumpProject(e2eContext.projectFactory)

    // Open the child ticket from the Epics view (carries ?view=epics).
    await page.goto(`/prj/${scenario.projectCode}/epics`)
    await waitForEpicsBoard(page)
    await page.click(swimlaneSelectors.expandAll)
    await page.locator(swimlaneSelectors.laneByKey(scenario.epic))
      .locator(boardSelectors.ticketByCode(scenario.child)).click()
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()

    // Split chip in the viewer header: two zones; Zap stays passive.
    const action = page.locator(ticketSelectors.detailPanel).locator(ticketSelectors.epicBadgeAction)
    await expect(action).toBeVisible()
    await expect(action).toHaveAccessibleName(`Show ${scenario.epic} on Epics board`)

    // F2 geometry ruling (2026-09-16): the chip's visible box equals the
    // status badge's height — every badge renders at the same height; the
    // 24×24 hit-target floor is met by the invisible hit expansion, not by
    // taller chrome.
    const chipBox = await page.locator(ticketSelectors.detailPanel).locator('.badge--split').boundingBox()
    const statusBox = await page.locator(ticketSelectors.detailPanel).locator(ticketSelectors.statusBadge).boundingBox()
    expect(chipBox?.height).toBe(statusBox?.height)

    await action.click()
    await expect(page.locator(ticketSelectors.detailPanel)).toHaveCount(0)
    await expect(page).toHaveURL(`/prj/${scenario.projectCode}/epics?epic=${scenario.epic}`)
    await expect(page.locator(swimlaneSelectors.laneLabelByKey(scenario.epic))).toHaveAttribute('aria-expanded', 'true')

    // Return context: reopen the child, follow the identity-zone key link —
    // the epic ticket URL carries ?view=epics, and closing returns to /epics.
    await page.goto(`/prj/${scenario.projectCode}/epics`)
    await waitForEpicsBoard(page)
    await page.click(swimlaneSelectors.expandAll)
    await page.locator(swimlaneSelectors.laneByKey(scenario.epic))
      .locator(boardSelectors.ticketByCode(scenario.child)).click()
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()

    await page.locator(ticketSelectors.detailPanel).locator(ticketSelectors.epicBadgeKeyLink).click()
    await expect(page).toHaveURL(`/prj/${scenario.projectCode}/ticket/${scenario.epic}?view=epics`)
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()

    await page.click(ticketSelectors.closeDetail)
    await expect(page).toHaveURL(`/prj/${scenario.projectCode}/epics`)
  })

  test('unknown ?epic= token is ignored — board renders normally (BR-1.6)', async ({ page, e2eContext }) => {
    const scenario = await createJumpProject(e2eContext.projectFactory)

    await page.goto(`/prj/${scenario.projectCode}/epics?epic=EBJ-999`)
    await waitForEpicsBoard(page)

    await expect(page.locator(swimlaneSelectors.board)).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.epic))).toBeVisible()
    // No focused arrival: lanes stay collapsed by default, nothing highlighted.
    await expect(page.locator(swimlaneSelectors.laneLabelByKey(scenario.epic))).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator('[data-testid="swimlane-lane"][data-focused]')).toHaveCount(0)
  })

  test('focused lane renders despite the default Show-closed exclusion (BR-1.5)', async ({ page, e2eContext }) => {
    const scenario = await createJumpProject(e2eContext.projectFactory)

    // Show closed is off by default: the closed epic's lane is excluded in a
    // normal board render. (The route table mounts a fresh ProjectRouteHandler
    // per route, so every jump arrives as a mount with default toggles — the
    // mounted token-change path with toggled filters is covered at unit level.)
    await page.goto(`/prj/${scenario.projectCode}/epics`)
    await waitForEpicsBoard(page)
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.closedEpic))).toHaveCount(0)

    // …but the focused arrival overrides the exclusion, without flipping the toggle.
    await page.goto(`/prj/${scenario.projectCode}/epics?epic=${scenario.closedEpic}`)
    await waitForEpicsBoard(page)
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.closedEpic))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneLabelByKey(scenario.closedEpic))).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator(swimlaneSelectors.showClosedToggle)).toHaveAttribute('aria-pressed', 'false')
  })
})
