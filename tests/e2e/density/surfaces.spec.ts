/**
 * MDT-236: App-wide two-axis density — computed-style verification.
 *
 * Verifies on representative surfaces (sampled per architecture.md D5):
 * 1. SIZE axis scales content text (list rows, board cards, documents tree rows)
 * 2. SPACE axis scales content padding without touching text size
 * 3. Axis independence: SIZE never moves padding, SPACE never moves text
 * 4. Chrome immunity: header chrome computed styles identical at every combination
 * 5. A11y floor at compact · tight: content text >= 11px, targets >= 24px
 * 6. Reset returns every probe to regular · normal
 * 7. Persistence across reload
 *
 * These tests are RED until the density consumer migration lands.
 */
import { expect, test } from '../fixtures/test-fixtures.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { buildScenario } from '../setup/index.js'
import { boardSelectors, densitySelectors, documentSelectors, listSelectors, navSelectors } from '../utils/selectors.js'

const SIZE_KEY = 'mdt-settings-card-density'
const SPACE_KEY = 'mdt-settings-space-density'

type AxisSize = 'compact' | 'regular' | 'comfortable'
type AxisSpace = 'tight' | 'normal' | 'relaxed'

async function seedDensity(page: import('@playwright/test').Page, size: AxisSize, space: AxisSpace): Promise<void> {
  await page.addInitScript(([s, sp]) => {
    localStorage.setItem('mdt-settings-card-density', s)
    localStorage.setItem('mdt-settings-space-density', sp)
  }, [size, space] as const)
}

async function setAxesViaMenu(page: import('@playwright/test').Page, size: AxisSize, space: AxisSpace): Promise<void> {
  await page.locator(densitySelectors.trigger).click()
  await page.locator(densitySelectors.sizeOption(size)).click()
  await page.locator(densitySelectors.spaceOption(space)).click()
  await page.keyboard.press('Escape')
}

/** Computed font-size in px of the first element matching `selector`. */
async function fontSize(page: import('@playwright/test').Page, selector: string): Promise<number> {
  return await page.locator(selector).first().evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize))
}

/** Computed vertical padding (pt+pb) in px of the first element matching `selector`. */
async function padY(page: import('@playwright/test').Page, selector: string): Promise<number> {
  return await page.locator(selector).first().evaluate((el) => {
    const cs = getComputedStyle(el)
    return Number.parseFloat(cs.paddingTop) + Number.parseFloat(cs.paddingBottom)
  })
}

/** Computed outer height in px of the first element matching `selector`. */
async function boxHeight(page: import('@playwright/test').Page, selector: string): Promise<number> {
  return await page.locator(selector).first().evaluate(el => el.getBoundingClientRect().height)
}

// Probes: representative content element per surface + one chrome anchor
const LIST_ROW_TITLE = `${listSelectors.ticketTable} [data-testid="ticket-title"]`
const LIST_ROW = `${listSelectors.ticketTable} tbody tr`
const LIST_CELL = `${listSelectors.ticketTable} tbody tr td`
const BOARD_CARD = `${boardSelectors.ticketCard} .ticket-card__title`
const DOC_TREE_ROW = '[data-testid="folder-item"], [data-testid="document-item"]'
const CHROME_ANCHOR = navSelectors.viewModeSwitcher

test.describe('Density: app-wide surfaces (MDT-236)', () => {
  test('SIZE axis scales content text on list rows, board cards, and documents tree rows', async ({ page, e2eContext }, testInfo) => {
    testInfo.slow() // three navigations + eight menu interactions
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10_000 })
    const rowRegular = await fontSize(page, LIST_ROW_TITLE)

    await setAxesViaMenu(page, 'compact', 'normal')
    const rowCompact = await fontSize(page, LIST_ROW_TITLE)
    expect(rowCompact).toBeLessThan(rowRegular)

    await setAxesViaMenu(page, 'comfortable', 'normal')
    const rowComfortable = await fontSize(page, LIST_ROW_TITLE)
    expect(rowComfortable).toBeGreaterThan(rowRegular)

    // Board card
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await setAxesViaMenu(page, 'compact', 'normal')
    const cardCompact = await fontSize(page, BOARD_CARD)
    await setAxesViaMenu(page, 'comfortable', 'normal')
    const cardComfortable = await fontSize(page, BOARD_CARD)
    expect(cardCompact).toBeLessThan(cardComfortable)

    // Documents navigation tree row. The density menu lives on board/list only
    // (documents toolbar has no density control by design) — change axes there,
    // then re-navigate; preferences persist within the session.
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10_000 })
    await setAxesViaMenu(page, 'compact', 'normal')
    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.waitForSelector(documentSelectors.documentTree, { state: 'visible', timeout: 10_000 })
    const treeCompact = await fontSize(page, DOC_TREE_ROW)
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10_000 })
    await setAxesViaMenu(page, 'comfortable', 'normal')
    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.waitForSelector(documentSelectors.documentTree, { state: 'visible', timeout: 10_000 })
    const treeComfortable = await fontSize(page, DOC_TREE_ROW)
    expect(treeCompact).toBeLessThan(treeComfortable)
  })

  test('SPACE axis scales padding without changing text size', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10_000 })
    const fontRegular = await fontSize(page, LIST_ROW_TITLE)
    const padRegular = await padY(page, LIST_CELL)

    await setAxesViaMenu(page, 'regular', 'tight')
    const padTight = await padY(page, LIST_CELL)
    const fontTight = await fontSize(page, LIST_ROW_TITLE)
    expect(padTight).toBeLessThan(padRegular)
    expect(fontTight).toBe(fontRegular)

    await setAxesViaMenu(page, 'regular', 'relaxed')
    const padRelaxed = await padY(page, LIST_CELL)
    expect(padRelaxed).toBeGreaterThan(padRegular)
  })

  test('axes are independent: SIZE change never moves padding', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10_000 })
    const padRegular = await padY(page, LIST_CELL)

    await setAxesViaMenu(page, 'compact', 'normal')
    expect(await padY(page, LIST_CELL)).toBe(padRegular)

    await setAxesViaMenu(page, 'comfortable', 'normal')
    expect(await padY(page, LIST_CELL)).toBe(padRegular)
  })

  test('chrome is density-immune at every axis combination', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(CHROME_ANCHOR, { state: 'visible', timeout: 10_000 })
    const chromeFont = await fontSize(page, CHROME_ANCHOR)

    const combinations: ReadonlyArray<readonly [AxisSize, AxisSpace]> = [
      ['compact', 'tight'],
      ['compact', 'relaxed'],
      ['comfortable', 'tight'],
      ['comfortable', 'relaxed'],
    ]
    for (const [size, space] of combinations) {
      await setAxesViaMenu(page, size, space)
      expect(await fontSize(page, CHROME_ANCHOR)).toBe(chromeFont)
    }
  })

  test('accessibility floor holds at compact · tight', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await seedDensity(page, 'compact', 'tight')

    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10_000 })
    expect(await fontSize(page, LIST_ROW_TITLE)).toBeGreaterThanOrEqual(11)
    expect(await boxHeight(page, LIST_ROW)).toBeGreaterThanOrEqual(24)

    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.waitForSelector(documentSelectors.documentTree, { state: 'visible', timeout: 10_000 })
    expect(await fontSize(page, DOC_TREE_ROW)).toBeGreaterThanOrEqual(11)
    expect(await boxHeight(page, DOC_TREE_ROW)).toBeGreaterThanOrEqual(24)
  })

  test('reset returns every surface to regular · normal', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10_000 })
    const fontBaseline = await fontSize(page, LIST_ROW_TITLE)
    const padBaseline = await padY(page, LIST_CELL)

    await setAxesViaMenu(page, 'compact', 'relaxed')
    expect(await fontSize(page, LIST_ROW_TITLE)).not.toBe(fontBaseline)

    await page.locator(densitySelectors.trigger).click()
    await page.locator(densitySelectors.reset).click()
    expect(await fontSize(page, LIST_ROW_TITLE)).toBe(fontBaseline)
    expect(await padY(page, LIST_CELL)).toBe(padBaseline)
  })

  test('density choice persists across reload on all surfaces', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10_000 })
    const fontRegular = await fontSize(page, LIST_ROW_TITLE)

    await setAxesViaMenu(page, 'compact', 'tight')
    await page.reload()
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10_000 })
    expect(await fontSize(page, LIST_ROW_TITLE)).toBeLessThan(fontRegular)

    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.waitForSelector(documentSelectors.documentTree, { state: 'visible', timeout: 10_000 })
    const treeFont = await fontSize(page, DOC_TREE_ROW)
    expect(treeFont).toBeLessThan(14) // compact tree row must be below the regular 14px step
  })
})
