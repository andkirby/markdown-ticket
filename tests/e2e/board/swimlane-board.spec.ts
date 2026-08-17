import { readFile, writeFile } from 'node:fs/promises'

import type { ProjectFactory } from '@mdt/shared/test-lib'
import { expect, test } from '../fixtures/test-fixtures.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { boardSelectors, swimlaneSelectors } from '../utils/selectors.js'

async function addLevel(filePath: string, level: 'epic' | 'ticket' = 'epic'): Promise<void> {
  const content = await readFile(filePath, 'utf8')
  await writeFile(filePath, content.replace('priority: Medium\n', `priority: Medium\nlevel: ${level}\n`), 'utf8')
}

async function createEpicProject(projectFactory: ProjectFactory) {
  const project = await projectFactory.createProject('empty', {
    name: 'Swimlane Board Project',
    code: 'SWIM',
  })

  const alphaEpic = await projectFactory.createTestCR(project.key, {
    title: 'Alpha Epic',
    type: 'Feature Enhancement',
    status: 'Approved',
    priority: 'Medium',
    content: 'Alpha epic.',
  })
  const betaEpic = await projectFactory.createTestCR(project.key, {
    title: 'Beta Epic',
    type: 'Feature Enhancement',
    status: 'Proposed',
    priority: 'Medium',
    content: 'Beta epic.',
  })
  if (!alphaEpic.filePath || !betaEpic.filePath || !alphaEpic.crCode || !betaEpic.crCode)
    throw new Error('Failed to create epic tickets')
  await addLevel(alphaEpic.filePath)
  await addLevel(betaEpic.filePath)

  const alphaOpen = await projectFactory.createTestCR(project.key, {
    title: 'Alpha Open Child',
    type: 'Feature Enhancement',
    status: 'Approved',
    priority: 'Medium',
    phaseEpic: alphaEpic.crCode,
    content: 'Open child.',
  })
  const alphaDone = await projectFactory.createTestCR(project.key, {
    title: 'Alpha Done Child',
    type: 'Feature Enhancement',
    status: 'Implemented',
    priority: 'Medium',
    phaseEpic: alphaEpic.crCode,
    content: 'Done child.',
  })
  const betaChild = await projectFactory.createTestCR(project.key, {
    title: 'Beta Child',
    type: 'Feature Enhancement',
    status: 'Proposed',
    priority: 'Medium',
    phaseEpic: betaEpic.crCode,
    content: 'Beta child.',
  })
  const orphan = await projectFactory.createTestCR(project.key, {
    title: 'Orphan Child',
    type: 'Bug Fix',
    status: 'Proposed',
    priority: 'Medium',
    phaseEpic: 'SWIM-999',
    content: 'Missing epic target.',
  })

  return {
    projectCode: project.key,
    alphaEpic: alphaEpic.crCode,
    betaEpic: betaEpic.crCode,
    alphaOpen: alphaOpen.crCode,
    alphaDone: alphaDone.crCode,
    betaChild: betaChild.crCode,
    orphan: orphan.crCode,
  }
}

test.describe('Epic swimlane board (MDT-206)', () => {
  test('keeps epic tickets out of flat board cards and renders each epic as a swimlane', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Flat Epic Regression Project',
      code: 'FER',
    })
    const epic = await e2eContext.projectFactory.createTestCR(project.key, {
      title: 'Approved Epic Without Children',
      type: 'Feature Enhancement',
      status: 'Approved',
      priority: 'Medium',
      content: 'Approved epic must not render as a flat card.',
    })
    if (!epic.filePath || !epic.crCode)
      throw new Error('Failed to create approved epic ticket')
    await addLevel(epic.filePath)
    const proposedEpic = await e2eContext.projectFactory.createTestCR(project.key, {
      title: 'Childless Proposed Epic',
      type: 'Feature Enhancement',
      status: 'Proposed',
      priority: 'Medium',
      content: 'Childless epic must still render as a swimlane.',
    })
    if (!proposedEpic.filePath || !proposedEpic.crCode)
      throw new Error('Failed to create childless proposed epic ticket')
    await addLevel(proposedEpic.filePath)

    await page.goto(`/prj/${project.key}`)
    await waitForBoardReady(page)
    await page.click(swimlaneSelectors.flatModeToggle)

    await expect(page.locator(boardSelectors.board)).toBeVisible()
    await expect(page.locator(boardSelectors.ticketByCode(epic.crCode))).toHaveCount(0)
    await expect(page.locator(boardSelectors.ticketByCode(proposedEpic.crCode))).toHaveCount(0)
    await expect(page.locator(swimlaneSelectors.flatModeToggle)).toHaveText('')
    await expect(page.locator(swimlaneSelectors.modeToggle)).toHaveText('')

    await page.click(swimlaneSelectors.modeToggle)
    await expect(page.locator(swimlaneSelectors.laneByKey(epic.crCode))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey(proposedEpic.crCode))).toBeVisible()
  })

  test('switches to swimlanes, renders lanes, excludes epic cards, and persists mode', async ({ page, e2eContext }) => {
    const scenario = await createEpicProject(e2eContext.projectFactory)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await expect(page.locator(boardSelectors.ticketByCode(scenario.alphaEpic))).toHaveCount(0)
    await expect(page.locator(boardSelectors.ticketByCode(scenario.betaEpic))).toHaveCount(0)

    await page.click(swimlaneSelectors.modeToggle)
    await expect(page.locator(swimlaneSelectors.board)).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.betaEpic))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey('__none'))).toBeVisible()

    // Lanes are collapsed by default; expand to inspect ticket contents.
    await page.click(swimlaneSelectors.expandAll)
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic)).locator(boardSelectors.ticketByCode(scenario.alphaOpen))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey('__none')).locator(boardSelectors.ticketByCode(scenario.orphan))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.board).locator(boardSelectors.ticketByCode(scenario.alphaEpic))).toHaveCount(0)

    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.locator(swimlaneSelectors.board)).toBeVisible()
  })

  test('keeps epic lanes when search filters match only child tickets', async ({ page, e2eContext }) => {
    const scenario = await createEpicProject(e2eContext.projectFactory)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await page.getByTestId('search-input').fill('Alpha Done Child')
    await page.click(swimlaneSelectors.modeToggle)
    await page.click(swimlaneSelectors.expandAll)

    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic)).locator(boardSelectors.ticketByCode(scenario.alphaDone))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic)).locator(boardSelectors.ticketByCode(scenario.alphaOpen))).toHaveCount(0)
    await expect(page.locator(swimlaneSelectors.laneProgressByKey(scenario.alphaEpic))).toHaveAttribute('aria-valuenow', '50')
  })

  test('updates only status for same-epic drops and rejects cross-epic drops', async ({ page, e2eContext }) => {
    const scenario = await createEpicProject(e2eContext.projectFactory)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.click(swimlaneSelectors.modeToggle)
    await page.click(swimlaneSelectors.expandAll)

    const betaTicket = page.locator(swimlaneSelectors.laneByKey(scenario.betaEpic)).locator(boardSelectors.ticketByCode(scenario.betaChild))
    await betaTicket.dragTo(page.locator(swimlaneSelectors.laneColumn(scenario.alphaEpic, 'Approved')))
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.betaEpic)).locator(boardSelectors.ticketByCode(scenario.betaChild))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic)).locator(boardSelectors.ticketByCode(scenario.betaChild))).toHaveCount(0)

    await betaTicket.dragTo(page.locator(swimlaneSelectors.laneColumn(scenario.betaEpic, 'Approved')))
    await expect(page.locator(swimlaneSelectors.laneColumn(scenario.betaEpic, 'Approved')).locator(boardSelectors.ticketByCode(scenario.betaChild))).toBeVisible()
  })

  test('shows progress, blocked close details, and lane visibility controls', async ({ page, e2eContext }) => {
    const scenario = await createEpicProject(e2eContext.projectFactory)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.click(swimlaneSelectors.modeToggle)

    await expect(page.locator(swimlaneSelectors.laneProgressByKey(scenario.alphaEpic))).toHaveAttribute('aria-valuenow', '50')

    const close = page.locator(swimlaneSelectors.laneActionByKey(scenario.alphaEpic))
    await expect(close).toContainText('Close')
    await expect(close).toBeDisabled()
    await expect(close).toHaveAttribute('title', new RegExp(`${scenario.alphaOpen}.*Alpha Open Child`))

    await page.click(swimlaneSelectors.collapseAll)
    await expect(page.locator(swimlaneSelectors.laneBodyByKey(scenario.alphaEpic))).toBeHidden()
    await page.click(swimlaneSelectors.expandAll)
    await expect(page.locator(swimlaneSelectors.laneBodyByKey(scenario.alphaEpic))).toBeVisible()
  })

  test('hides swimlane card badges by default, toggles them, and opens the epic ticket', async ({ page, e2eContext }) => {
    const scenario = await createEpicProject(e2eContext.projectFactory)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.click(swimlaneSelectors.modeToggle)

    const alphaOpenCard = page
      .locator(swimlaneSelectors.laneByKey(scenario.alphaEpic))
      .locator(boardSelectors.ticketByCode(scenario.alphaOpen))

    await expect(alphaOpenCard.locator('.badge')).toHaveCount(0)

    await page.click(swimlaneSelectors.showBadgesToggle)
    await expect(alphaOpenCard.locator('.badge')).not.toHaveCount(0)

    await page.click(swimlaneSelectors.laneOpenEpicByKey(scenario.alphaEpic))
    await expect(page).toHaveURL(new RegExp(`/prj/${scenario.projectCode}/ticket/${scenario.alphaEpic}`))
  })

  test('UAT: removes the color dot, renders a clickable epic key, and wraps lane titles', async ({ page, e2eContext }) => {
    const scenario = await createEpicProject(e2eContext.projectFactory)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.click(swimlaneSelectors.modeToggle)
    // Expand lanes so the expanded-layout CSS assertions (title wrap, column
    // scroll) resolve against the expanded state.
    await page.click(swimlaneSelectors.expandAll)

    const lane = page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic))

    // No color dot before the title.
    await expect(lane.locator('.swimlane-board__epic-dot')).toHaveCount(0)

    // Title wraps (overflow-wrap applied), not single-line ellipsis.
    const titleText = lane.locator('.swimlane-board__lane-title-text')
    await expect(titleText).toHaveCSS('overflow-wrap', 'break-word')

    // Lane label is height-capped so long lists don't stretch it unbounded.
    const label = lane.locator('.swimlane-board__lane-label')
    const labelMaxHeight = await label.evaluate(el => getComputedStyle(el).maxHeight)
    expect(labelMaxHeight).not.toBe('none')

    // Each column scrolls independently.
    const col = page.locator(swimlaneSelectors.laneColumn(scenario.alphaEpic, 'Approved')).first()
    const colOverflow = await col.evaluate(el => getComputedStyle(el).overflowY)
    expect(['auto', 'scroll']).toContain(colOverflow)

    // Epic key is rendered through TicketCode (priority glyph + key) and is
    // clickable — opens the epic ticket viewer. Checked last because it navigates away.
    const key = lane.locator(swimlaneSelectors.laneKeyByKey(scenario.alphaEpic))
    await expect(key).toBeVisible()
    await expect(key.locator('.ticket-code.ticket-key')).toHaveCount(1)
    await expect(key.locator('.priority-icon')).toHaveCount(1)
    await key.click()
    await expect(page).toHaveURL(new RegExp(`/prj/${scenario.projectCode}/ticket/${scenario.alphaEpic}`))
  })

  test('UAT: collapses a lane to a horizontal summary bar via whole-label click', async ({ page, e2eContext }) => {
    const scenario = await createEpicProject(e2eContext.projectFactory)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.click(swimlaneSelectors.modeToggle)

    const lane = page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic))
    const label = page.locator(swimlaneSelectors.laneLabelByKey(scenario.alphaEpic))
    const body = page.locator(swimlaneSelectors.laneBodyByKey(scenario.alphaEpic))

    // Clear any persisted expand state so we test the default-collapsed behavior.
    await page.evaluate(() => localStorage.removeItem('mdt-settings-swimlane-expanded-lanes'))
    await page.reload()
    await page.click(swimlaneSelectors.modeToggle)

    // The whole label is the toggle (role=button), collapsed by default.
    await expect(label).toHaveAttribute('role', 'button')
    await expect(label).toHaveAttribute('aria-expanded', 'false')
    await expect(body).toBeHidden()

    // Collapsed: the label is a horizontal full-width summary bar.
    await expect(label).toHaveCSS('flex-direction', 'row')

    // Clicking the label (not a chevron) expands the lane.
    await label.click()
    await expect(label).toHaveAttribute('aria-expanded', 'true')
    await expect(body).toBeVisible()
    await expect(label).toHaveCSS('flex-direction', 'column')

    // Collapse-all and expand-all still drive the same reflow.
    await page.click(swimlaneSelectors.collapseAll)
    await expect(label).toHaveAttribute('aria-expanded', 'false')
    await expect(label).toHaveCSS('flex-direction', 'row')

    // In the collapsed bar, all elements are vertically centered.
    const labelAlign = await label.evaluate(el => getComputedStyle(el).alignItems)
    expect(labelAlign).toBe('center')
    const keyAlign = await page
      .locator(swimlaneSelectors.laneKeyByKey(scenario.alphaEpic))
      .evaluate(el => getComputedStyle(el).alignSelf)
    expect(keyAlign).toBe('center')

    await page.click(swimlaneSelectors.expandAll)
    await expect(label).toHaveAttribute('aria-expanded', 'true')
    await expect(label).toHaveCSS('flex-direction', 'column')

    // Expanded state persists across reload.
    await page.reload()
    await page.click(swimlaneSelectors.modeToggle)
    await expect(label).toHaveAttribute('aria-expanded', 'true')
  })

  test('UAT: /epics is a deep-linkable route and toggling Epics updates the URL', async ({ page, e2eContext }) => {
    const scenario = await createEpicProject(e2eContext.projectFactory)

    // Toggling Epics from the board navigates to the /epics URL.
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.click(swimlaneSelectors.modeToggle)
    await expect(page).toHaveURL(new RegExp(`/prj/${scenario.projectCode}/epics`))
    await expect(page.locator(swimlaneSelectors.board)).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic))).toBeVisible()

    // The /epics URL is a deep link: navigating directly renders the swimlane board.
    await page.goto(`/prj/${scenario.projectCode}/epics`)
    await expect(page.locator(swimlaneSelectors.board)).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic))).toBeVisible()

    // Toggling back to flat board returns to the bare project URL.
    await page.click(swimlaneSelectors.flatModeToggle)
    await expect(page).toHaveURL(new RegExp(`/prj/${scenario.projectCode}/?$`))
    // Flat board renders (swimlane board is gone).
    await expect(page.locator(boardSelectors.board)).toBeVisible()
    await expect(page.locator(swimlaneSelectors.board)).toHaveCount(0)
  })

  test('UAT: swimlane status columns collapse to a 44px rail (shared with flat board)', async ({ page, e2eContext }) => {
    const scenario = await createEpicProject(e2eContext.projectFactory)

    await page.goto(`/prj/${scenario.projectCode}/epics`)
    await expect(page.locator(swimlaneSelectors.board)).toBeVisible()
    // Lanes are collapsed by default; expand so lane-body cells are present.
    await page.click(swimlaneSelectors.expandAll)

    // Clear any shared column-collapse state so the test starts from a clean
    // baseline (the key is shared with the flat board).
    await page.evaluate(() => {
      window.localStorage.removeItem('mdt-settings-collapsed-columns')
      window.dispatchEvent(new CustomEvent('markdown-ticket:settings:collapsed-columns-change', { detail: { columns: [] } }))
    })
    // Re-expand lanes (the evaluate above re-rendered the board).
    await page.click(swimlaneSelectors.expandAll)

    // The "Done" column (Implemented status) has a collapse chevron.
    const doneCollapse = page.locator(swimlaneSelectors.colCollapseByStatus('Implemented'))
    await expect(doneCollapse).toBeVisible()

    // Before collapse, a drop-zone cell exists for the Done column in the lane.
    await expect(page.locator(swimlaneSelectors.laneColumn(scenario.alphaEpic, 'Implemented'))).toBeVisible()

    // Collapse the Done column.
    await doneCollapse.click()

    // Header is replaced by a click-to-expand rail.
    await expect(page.locator(swimlaneSelectors.colExpandByStatus('Implemented'))).toBeVisible()
    await expect(doneCollapse).toHaveCount(0)

    // The lane-body cell for Done is now a narrow strip, not a drop zone.
    await expect(page.locator(swimlaneSelectors.laneColRail(scenario.alphaEpic, 'Implemented'))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneColumn(scenario.alphaEpic, 'Implemented'))).toHaveCount(0)

    // The collapsed header rail is 44px wide (matches the flat Board standard).
    const railWidth = await page.locator(swimlaneSelectors.colExpandByStatus('Implemented')).evaluate(
      el => window.getComputedStyle(el.parentElement!).width,
    )
    expect(railWidth).toBe('44px')

    // Collapse state is shared with the flat board key.
    const stored = await page.evaluate(() => window.localStorage.getItem('mdt-settings-collapsed-columns'))
    expect(JSON.parse(stored!)).toContain('Implemented')

    // Click the rail to re-expand.
    await page.click(swimlaneSelectors.colExpandByStatus('Implemented'))
    await expect(page.locator(swimlaneSelectors.colCollapseByStatus('Implemented'))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneColumn(scenario.alphaEpic, 'Implemented'))).toBeVisible()

    // Board parity: clicking any lane strip in a collapsed column also expands it.
    await page.click(swimlaneSelectors.colCollapseByStatus('Implemented'))
    await expect(page.locator(swimlaneSelectors.laneColRail(scenario.alphaEpic, 'Implemented'))).toBeVisible()
    await page.click(swimlaneSelectors.laneColRail(scenario.alphaEpic, 'Implemented'))
    await expect(page.locator(swimlaneSelectors.colCollapseByStatus('Implemented'))).toBeVisible()
    await expect(page.locator(swimlaneSelectors.laneColumn(scenario.alphaEpic, 'Implemented'))).toBeVisible()
  })

  test('toolbar search filters lane tickets by title and ticket key (BR-6.1)', async ({ page, e2eContext }) => {
    const scenario = await createEpicProject(e2eContext.projectFactory)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.click(swimlaneSelectors.modeToggle)
    await page.click(swimlaneSelectors.expandAll)

    const alphaLane = page.locator(swimlaneSelectors.laneByKey(scenario.alphaEpic))
    const alphaOpenCard = alphaLane.locator(boardSelectors.ticketByCode(scenario.alphaOpen))
    const alphaDoneCard = alphaLane.locator(boardSelectors.ticketByCode(scenario.alphaDone))

    // Search by title (case-insensitive substring).
    await page.locator(swimlaneSelectors.search).fill('alpha open')
    await expect(alphaOpenCard).toBeVisible()
    await expect(alphaDoneCard).toHaveCount(0)
    // Progress is presentation-only: kept from the full child set.
    await expect(page.locator(swimlaneSelectors.laneProgressByKey(scenario.alphaEpic))).toHaveAttribute('aria-valuenow', '50')

    // Search by full zero-padded ticket key.
    await page.locator(swimlaneSelectors.search).fill(scenario.alphaDone)
    await expect(alphaDoneCard).toBeVisible()
    await expect(alphaOpenCard).toHaveCount(0)

    // Search by simplified key (SWIM-00X → SWIM-X) and bare number.
    const [prefix, num] = scenario.alphaDone.split('-')
    await page.locator(swimlaneSelectors.search).fill(`${prefix}-${Number(num)}`)
    await expect(alphaDoneCard).toBeVisible()
    await expect(alphaOpenCard).toHaveCount(0)
    await page.locator(swimlaneSelectors.search).fill(String(Number(num)))
    await expect(alphaDoneCard).toBeVisible()
    await expect(alphaOpenCard).toHaveCount(0)

    // Non-matching query removes the lanes from the board entirely (the search
    // filters the epic lane list, not just tickets inside lanes).
    await page.locator(swimlaneSelectors.search).fill('no such ticket anywhere')
    await expect(page.locator(swimlaneSelectors.lane)).toHaveCount(0)

    // Epic-title match keeps the epic's lane with ALL of its tickets.
    await page.locator(swimlaneSelectors.search).fill('alpha epic')
    await expect(alphaLane).toBeVisible()
    await expect(alphaOpenCard).toBeVisible()
    await expect(alphaDoneCard).toBeVisible()

    // Clear restores the full board.
    await page.click(swimlaneSelectors.searchClear)
    await expect(alphaOpenCard).toBeVisible()
    await expect(alphaDoneCard).toBeVisible()
  })
})
