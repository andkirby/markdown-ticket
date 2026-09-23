/**
 * MDT-248: Ticket Side Reading Pane E2E Tests
 *
 * BDD Scenarios (docs/CRs/MDT-248/bdd.trace.md):
 *   doc_link_opens_pane_beside_ticket (BR-1.1)
 *   pane_follow_link_stays_in_pane (BR-1.2)
 *   pane_back_forward_restores_scroll (BR-1.3)
 *   escape_hides_pane_pill_reveals (BR-1.4, BR-1.5)
 *   pane_close_discards_session (BR-1.6)
 *   ticket_link_swaps_column_pane_survives (BR-1.7)
 *   handoff_opens_documents_view (BR-1.8)
 *   narrow_viewport_pane_overlays (BR-1.9)
 *   escape_with_pane_hidden_closes_modal (BR-1.10)
 *
 * Written RED against the planned DOM contract (sidePaneSelectors).
 *
 * @tags MDT-248
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady, openTicketDetail } from '../utils/helpers.js'
import { sidePaneSelectors, subdocSelectors, ticketSelectors } from '../utils/selectors.js'

const TICKETS_PATH = 'docs/CRs'

/** Long filler so the pane actually scrolls (scroll-memory assertions). */
function filler(count: number): string {
  return Array.from(
    { length: count },
    (_, i) => `Paragraph ${i + 1}. Filler prose so the reading pane scrolls and scroll positions are observable during back and forward navigation.`,
  ).join('\n\n')
}

/** Create sub-document files in the ticket's sub-document directory. */
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

/** Create chained repo documents under project docs/ for the pane to open. */
function createProjectDocs(
  projectDir: string,
  files: Record<string, string>,
): void {
  const docsDir = path.join(projectDir, 'docs')
  fs.mkdirSync(docsDir, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(docsDir, name), content, 'utf8')
  }
}

async function setupChainedDocs(
  e2eContext: { projectFactory: unknown },
  siblingCode: string,
): Promise<{ projectCode: string, projectDir: string, ticketCode: string }> {
  const scenario = await buildScenario(
    e2eContext.projectFactory as Parameters<typeof buildScenario>[0],
    'simple',
  )
  const ticketCode = scenario.crCodes[0]

  // Repo documents: guide → deep-dive (chained), plus a long doc for scroll memory
  createProjectDocs(scenario.projectDir, {
    'side-doc-guide.md': '# Guide\n\nSee the [deep dive](deep-dive.md) for details.',
    'deep-dive.md': `# Deep dive\n\nBack to the [guide](side-doc-guide.md).\n\n${filler(30)}`,
  })

  // Subdoc hosting the links (relative from docs/CRs/{code}/ → ../../docs/)
  createSubDocFiles(scenario.projectDir, ticketCode, {
    'architecture.md': [
      '# Architecture',
      '',
      'Start from the [guide](../../side-doc-guide.md).',
      '',
      `Sibling ticket: [${siblingCode}](../${siblingCode}.md)`,
      '',
    ].join('\n'),
  })

  return {
    projectCode: scenario.projectCode,
    projectDir: scenario.projectDir,
    ticketCode,
  }
}

async function openSubdocWithGuideLink(
  page: import('@playwright/test').Page,
  projectCode: string,
  ticketCode: string,
): Promise<import('@playwright/test').Locator> {
  await page.goto(`/prj/${projectCode}`)
  await waitForBoardReady(page)
  await openTicketDetail(page, ticketCode)
  const detailPanel = page.locator(ticketSelectors.detailPanel)
  await detailPanel.locator(subdocSelectors.tabTrigger('architecture')).click()
  await expect(page.locator(subdocSelectors.content)).toBeVisible()
  return detailPanel
}

test.describe('MDT-248: ticket side reading pane', () => {
  test('@MDT-248 doc_link_opens_pane_beside_ticket (BR-1.1)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]
    createProjectDocs(scenario.projectDir, { 'side-doc-guide.md': '# Guide\n\nGuide body.' })
    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': `# Architecture\n\nSee the [guide](../../side-doc-guide.md).\n\n${filler(40)}`,
    })

    const detailPanel = await openSubdocWithGuideLink(page, scenario.projectCode, ticketCode)

    // Scroll the ticket (outer overlay is the scroller pre-split), then open
    // the pane via JS click so the manual offset survives to be transferred.
    const overlayScroll = page.locator('.modal')
    await overlayScroll.evaluate(el => { el.scrollTop = 150 })
    await detailPanel.locator('a.smart-link[data-link-type="document"]').evaluate(el => (el as HTMLElement).click())

    const pane = page.locator(sidePaneSelectors.pane)
    await expect(pane).toBeVisible()
    await expect(page.locator(sidePaneSelectors.title)).toHaveText('Guide')
    await expect(page.locator(sidePaneSelectors.path)).toContainText('side-doc-guide.md')
    // Ticket column: still the architecture subdoc, still selected
    await expect(page.locator(subdocSelectors.tabTrigger('architecture'))).toHaveAttribute('data-state', 'active')
    await expect(detailPanel).toBeVisible()

    // C2: the pre-split scroll offset transferred into the content scroller
    const subdocScroll = page.locator(subdocSelectors.content)
    const transferred = await subdocScroll.evaluate(el => el.scrollTop)
    expect(transferred).toBeGreaterThan(100)

    // UAT r1 — pinned chrome: deep scroll the content; title + tabs stay
    // visible and the modal × stays over the pinned title bar (above the
    // tabs band), never over scrolling prose.
    await subdocScroll.evaluate(el => { el.scrollTop = 100000 })
    await expect(page.locator('[data-testid="ticket-title"]')).toBeVisible()
    await expect(page.locator(subdocSelectors.tabsContainer)).toBeVisible()
    const closeBox = await page.locator('[data-testid="close-detail"]').boundingBox()
    const tabsBox = await page.locator(subdocSelectors.tabsContainer).boundingBox()
    expect(closeBox).not.toBeNull()
    expect(tabsBox).not.toBeNull()
    expect(closeBox!.y).toBeLessThan(tabsBox!.y)
  })

  test('@MDT-248 pane_follow_link_stays_in_pane (BR-1.2)', async ({ page, e2eContext }) => {
    const ctx = await setupChainedDocs(e2eContext, 'MDT-001')
    const detailPanel = await openSubdocWithGuideLink(page, ctx.projectCode, ctx.ticketCode)

    await detailPanel.locator('a.smart-link[data-link-type="document"]').click()
    const pane = page.locator(sidePaneSelectors.pane)
    await expect(pane).toBeVisible()

    // Follow the link inside the pane document
    await pane.locator('a.smart-link[data-link-type="document"]').first().click()
    await expect(page.locator(sidePaneSelectors.title)).toHaveText('Deep dive')

    // Ticket column unchanged: same subdoc, modal still open
    await expect(page.locator(subdocSelectors.tabTrigger('architecture'))).toHaveAttribute('data-state', 'active')
    await expect(detailPanel).toBeVisible()
  })

  test('@MDT-248 pane_back_forward_restores_scroll (BR-1.3)', async ({ page, e2eContext }) => {
    const ctx = await setupChainedDocs(e2eContext, 'MDT-001')
    const detailPanel = await openSubdocWithGuideLink(page, ctx.projectCode, ctx.ticketCode)

    await detailPanel.locator('a.smart-link[data-link-type="document"]').click()
    const pane = page.locator(sidePaneSelectors.pane)
    await expect(pane).toBeVisible()
    const paneScroll = page.locator(sidePaneSelectors.scroll)

    // JS click avoids Playwright's actionability scroll clobbering the offset
    await pane.locator('a.smart-link[data-link-type="document"]').first().evaluate(el => (el as HTMLElement).click())
    await expect(page.locator(sidePaneSelectors.title)).toHaveText('Deep dive')

    await paneScroll.evaluate(el => { el.scrollTop = 480 })
    // Back: returns to Guide; then forward: returns to Deep dive at 480
    await page.locator(sidePaneSelectors.back).click()
    await expect(page.locator(sidePaneSelectors.title)).toHaveText('Guide')
    const backTop = await paneScroll.evaluate(el => el.scrollTop)
    expect(backTop).toBeLessThan(60)

    await page.locator(sidePaneSelectors.forward).click()
    await expect(page.locator(sidePaneSelectors.title)).toHaveText('Deep dive')
    const fwdTop = await paneScroll.evaluate(el => el.scrollTop)
    expect(fwdTop).toBeGreaterThan(400)
  })

  test('@MDT-248 escape_hides_pane_pill_reveals (BR-1.4, BR-1.5)', async ({ page, e2eContext }) => {
    const ctx = await setupChainedDocs(e2eContext, 'MDT-001')
    const detailPanel = await openSubdocWithGuideLink(page, ctx.projectCode, ctx.ticketCode)
    await detailPanel.locator('a.smart-link[data-link-type="document"]').click()
    await expect(page.locator(sidePaneSelectors.pane)).toBeVisible()

    await page.keyboard.press('Escape')

    // Pane hidden, modal open, pill visible naming the document
    await expect(page.locator(sidePaneSelectors.pane)).toBeHidden()
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()
    const pill = page.locator(sidePaneSelectors.pill)
    await expect(pill).toBeVisible()
    await expect(pill).toContainText('Guide')

    await pill.click()

    await expect(page.locator(sidePaneSelectors.pane)).toBeVisible()
    await expect(page.locator(sidePaneSelectors.title)).toHaveText('Guide')
  })

  test('@MDT-248 pane_close_discards_session (BR-1.6)', async ({ page, e2eContext }) => {
    const ctx = await setupChainedDocs(e2eContext, 'MDT-001')
    const detailPanel = await openSubdocWithGuideLink(page, ctx.projectCode, ctx.ticketCode)
    await detailPanel.locator('a.smart-link[data-link-type="document"]').click()
    await expect(page.locator(sidePaneSelectors.pane)).toBeVisible()

    await page.locator(sidePaneSelectors.close).click()

    await expect(page.locator(sidePaneSelectors.pane)).toBeHidden()
    await expect(page.locator(sidePaneSelectors.pill)).toBeHidden()
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()
  })

  test('@MDT-248 ticket_link_swaps_column_pane_survives (BR-1.7)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const ticketCode = scenario.crCodes[0]
    const siblingCode = scenario.crCodes[1]
    createProjectDocs(scenario.projectDir, { 'side-doc-guide.md': '# Guide\n\nGuide body.' })
    createSubDocFiles(scenario.projectDir, ticketCode, {
      'architecture.md': `# Architecture\n\nSee the [guide](../../side-doc-guide.md) and [sibling](../${siblingCode}.md).`,
    })

    const detailPanel = await openSubdocWithGuideLink(page, scenario.projectCode, ticketCode)
    await detailPanel.locator('a.smart-link[data-link-type="document"]').click()
    await expect(page.locator(sidePaneSelectors.pane)).toBeVisible()

    await detailPanel.locator(`a.smart-link[data-link-type="ticket"]`).first().click()

    // Ticket column swapped to the sibling; pane still shows the guide
    await expect(page).toHaveURL(new RegExp(`/ticket/${siblingCode}`))
    await expect(page.locator(sidePaneSelectors.pane)).toBeVisible()
    await expect(page.locator(sidePaneSelectors.title)).toHaveText('Guide')
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()
  })

  test('@MDT-248 handoff_opens_documents_view (BR-1.8)', async ({ page, e2eContext }) => {
    const ctx = await setupChainedDocs(e2eContext, 'MDT-001')
    const detailPanel = await openSubdocWithGuideLink(page, ctx.projectCode, ctx.ticketCode)
    await detailPanel.locator('a.smart-link[data-link-type="document"]').click()
    await expect(page.locator(sidePaneSelectors.pane)).toBeVisible()

    await page.locator(sidePaneSelectors.openDocuments).click()

    await expect(page).toHaveURL(new RegExp(`/prj/${ctx.projectCode}/documents\\?file=.*side-doc-guide\\.md`))
    await expect(page.locator(ticketSelectors.detailPanel)).toBeHidden()
  })

  test('@MDT-248 narrow_viewport_pane_overlays (BR-1.9)', async ({ page, e2eContext }) => {
    const ctx = await setupChainedDocs(e2eContext, 'MDT-001')
    const detailPanel = await openSubdocWithGuideLink(page, ctx.projectCode, ctx.ticketCode)
    await detailPanel.locator('a.smart-link[data-link-type="document"]').click()
    await expect(page.locator(sidePaneSelectors.pane)).toBeVisible()

    await page.setViewportSize({ width: 900, height: 800 })

    const pane = page.locator(sidePaneSelectors.pane)
    await expect(pane).toBeVisible()
    await expect(pane.locator(sidePaneSelectors.backToTicket)).toBeVisible()
    // Pane overlays the modal as a single column
    const panePosition = await pane.evaluate(el => getComputedStyle(el).position)
    expect(panePosition).toBe('absolute')

    await pane.locator(sidePaneSelectors.backToTicket).click()
    await expect(pane).toBeHidden()
    await expect(page.locator(sidePaneSelectors.pill)).toBeVisible()

    // A document link re-reveals the pane with the session kept
    await detailPanel.locator('a.smart-link[data-link-type="document"]').first().click()
    await expect(pane).toBeVisible()
    await expect(page.locator(sidePaneSelectors.title)).toHaveText('Guide')
  })

  test('@MDT-248 divider_resizes_columns_within_range (UAT r2)', async ({ page, e2eContext }) => {
    const ctx = await setupChainedDocs(e2eContext, 'MDT-001')
    const detailPanel = await openSubdocWithGuideLink(page, ctx.projectCode, ctx.ticketCode)
    await detailPanel.locator('a.smart-link[data-link-type="document"]').click()
    await expect(page.locator(sidePaneSelectors.pane)).toBeVisible()

    const column = page.locator('.ticket-viewer-content')
    const body = page.locator('.ticket-viewer-body--split')
    const divider = page.locator(sidePaneSelectors.divider)
    await expect(divider).toBeVisible()

    // Frame stretches to top/bottom: body height ≈ viewport minus a thin frame
    const bodyBox = await body.boundingBox()
    expect(bodyBox!.height).toBeGreaterThan(page.viewportSize()!.height - 48)

    // The modal width transition (xl -> split) must settle before measuring
    const stableColumnWidth = async (): Promise<number> => {
      let previous = -1
      for (let i = 0; i < 40; i++) {
        const width = Math.round((await column.boundingBox())!.width)
        if (width === previous && width > 0)
          return width
        previous = width
        await page.waitForTimeout(50)
      }
      throw new Error('column width never settled')
    }

    // Pointer drag widens the ticket column
    const w1 = await stableColumnWidth()
    const d1 = await divider.boundingBox()
    await page.mouse.move(d1!.x + d1!.width / 2, d1!.y + 60)
    await page.mouse.down()
    await page.mouse.move(d1!.x + d1!.width / 2 + 240, d1!.y + 60, { steps: 4 })
    await page.mouse.up()
    const w2 = (await column.boundingBox())!.width
    expect(w2 - w1).toBeGreaterThan(180)
    expect(w2 - w1).toBeLessThan(300)

    // Extreme drag clamps: the pane keeps its minimum (340px)
    const d2 = await divider.boundingBox()
    await page.mouse.move(d2!.x + d2!.width / 2, d2!.y + 60)
    await page.mouse.down()
    await page.mouse.move(d2!.x + d2!.width / 2 + 2000, d2!.y + 60, { steps: 4 })
    await page.mouse.up()
    const bodyWidth = (await body.boundingBox())!.width
    const w3 = (await column.boundingBox())!.width
    expect(w3).toBeLessThanOrEqual(bodyWidth - 340 + 2)

    // Double-click resets to the default measure
    await divider.dblclick()
    const w4 = await stableColumnWidth()
    expect(Math.abs(w4 - w1)).toBeLessThan(2)

    // Keyboard: ±32px per arrow press
    await divider.focus()
    await page.keyboard.press('ArrowRight')
    const w5 = (await column.boundingBox())!.width
    expect(Math.round(w5 - w4)).toBe(32)
  })

  test('@MDT-248 escape_with_pane_hidden_closes_modal (BR-1.10)', async ({ page, e2eContext }) => {
    const ctx = await setupChainedDocs(e2eContext, 'MDT-001')
    const detailPanel = await openSubdocWithGuideLink(page, ctx.projectCode, ctx.ticketCode)
    await detailPanel.locator('a.smart-link[data-link-type="document"]').click()
    await expect(page.locator(sidePaneSelectors.pane)).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator(sidePaneSelectors.pill)).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(page.locator(ticketSelectors.detailPanel)).toBeHidden()
  })
})
