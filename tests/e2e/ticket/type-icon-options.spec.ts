/**
 * Ticket Type Icon Options E2E (MDT-244)
 *
 * Covers the two app-configuration display options for ticket-type glyphs:
 * - ui.ticketKey.typeIconNearKey — glyph in the ticket-key line
 * - ui.ticketKey.typeIconInBadge — leading glyph inside the type badge
 * plus the viewer-header suppression precedence and absent-key defaults.
 *
 * RED phase: svg[data-type] assertions fail until MDT-244 implements the
 * glyph slot; the viewer-header scope requires a `[data-testid="ticket-detail-header"]`
 * hook on the compact header (see tests/AGENTS.md "Adding test hooks").
 *
 * Config is applied through the live config API (PATCH /api/config with the
 * owner-intent header) so every run exercises the real client → backend →
 * user.toml path, not a localStorage shortcut.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { boardSelectors, projectSelectors, sharingSelectors, ticketSelectors } from '../utils/selectors.js'

const KEY_OPTION = 'ui.ticketKey.typeIconNearKey'
const BADGE_OPTION = 'ui.ticketKey.typeIconInBadge'

type TypeIconOption = typeof KEY_OPTION | typeof BADGE_OPTION

/** Apply a user-scope config selector through the live config API. */
async function setOption(page: import('@playwright/test').Page, option: TypeIconOption, value: boolean) {
  const response = await page.request.patch('/api/config', {
    data: { selector: option, value },
    headers: { 'Content-Type': 'application/json', 'X-MDT-Owner-Intent': '1' },
  })
  expect(response.ok(), `config apply ${option}=${value} (status ${response.status()})`).toBeTruthy()
}

/** Open the ticket viewer for a card. */
async function openTicketViewer(page: import('@playwright/test').Page, crCode: string) {
  await page.locator(boardSelectors.ticketByCode(crCode)).first().click()
  await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible()
}

test.describe('Ticket type icon options', () => {
  // Must stay FIRST: CONFIG_DIR persists across tests in a run, so this is the
  // only point where neither option key has ever been written.
  test('absent config keys keep pre-feature rendering', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const keyLine = page
      .locator(boardSelectors.ticketByCode(scenario.crCodes[0]!))
      .first()
      .locator(ticketSelectors.code)
    await expect(keyLine).toBeVisible()
    expect(await keyLine.locator('svg[data-type]').count()).toBe(0)

    await openTicketViewer(page, scenario.crCodes[0]!)
    const badge = page
      .locator('[data-testid="ticket-detail-header"]')
      .locator(ticketSelectors.typeBadge)
    await expect(badge).toContainText('Architecture')
    expect(await badge.locator('svg[data-type]').count()).toBe(0)
  })

  test('key line shows the type glyph when the key-icon option is enabled', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await setOption(page, KEY_OPTION, true)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // simple dataset ticket #1 is type Architecture → glyph carries data-type="architecture"
    const keyLine = page
      .locator(boardSelectors.ticketByCode(scenario.crCodes[0]!))
      .first()
      .locator(ticketSelectors.code)
    await expect(keyLine.locator('svg[data-type="architecture"]')).toBeVisible()
    // glyph sits after the key text, before any epic marker — inside the key line, not the card body
    expect(await keyLine.locator('svg[data-type]').count()).toBe(1)
  })

  test('key line has no type glyph when the key-icon option is disabled', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await setOption(page, KEY_OPTION, false)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const keyLine = page
      .locator(boardSelectors.ticketByCode(scenario.crCodes[0]!))
      .first()
      .locator(ticketSelectors.code)
    await expect(keyLine).toBeVisible()
    expect(await keyLine.locator('svg[data-type]').count()).toBe(0)
  })

  test('type badge shows a leading glyph when the badge-glyph option is enabled', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await setOption(page, BADGE_OPTION, true)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketViewer(page, scenario.crCodes[0]!)

    const badge = page
      .locator('[data-testid="ticket-detail-header"]')
      .locator(ticketSelectors.typeBadge)
    await expect(badge.locator('svg[data-type="architecture"]')).toBeVisible()
    await expect(badge).toContainText('Architecture')
  })

  test('type badge stays text-only when the badge-glyph option is disabled', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await setOption(page, BADGE_OPTION, false)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketViewer(page, scenario.crCodes[0]!)

    const badge = page
      .locator('[data-testid="ticket-detail-header"]')
      .locator(ticketSelectors.typeBadge)
    await expect(badge).toContainText('Architecture')
    expect(await badge.locator('svg[data-type]').count()).toBe(0)
  })

  test('viewer header suppresses the type badge when the key glyph is shown', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await setOption(page, KEY_OPTION, true)
    await setOption(page, BADGE_OPTION, true) // badge option on cannot beat suppression in the header row

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketViewer(page, scenario.crCodes[0]!)

    const header = page.locator('[data-testid="ticket-detail-header"]')
    await expect(header.locator(ticketSelectors.code).locator('svg[data-type]')).toBeVisible()
    await expect(header.locator(ticketSelectors.typeBadge)).toHaveCount(0)
  })

  test('viewer header shows the type badge when the key glyph is hidden', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await setOption(page, KEY_OPTION, false)
    await setOption(page, BADGE_OPTION, true)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await openTicketViewer(page, scenario.crCodes[0]!)

    const header = page.locator('[data-testid="ticket-detail-header"]')
    await expect(header.locator(ticketSelectors.typeBadge)).toBeVisible()
  })

  test('both type-icon options are editable in Settings → Advanced', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await page.click(projectSelectors.hamburgerMenu)
    await page.click(sharingSelectors.settingsButton)
    await expect(page.locator(sharingSelectors.settingsModal)).toBeVisible()
    await page.click('[data-testid="settings-tab-advanced"]')

    const section = page.locator('[data-testid="backend-config-section"]')
    await expect(section).toBeVisible()
    for (const option of [KEY_OPTION, BADGE_OPTION]) {
      // NB: the id contains dots — use an attribute selector, not #id syntax
      const control = section.locator(`[id="backend-cfg-${option}"]`)
      await expect(control).toBeVisible()
      // boolean selectors render as checkboxes, not text inputs
      await expect(control).toHaveAttribute('type', 'checkbox')
      await expect(section.locator(`label[for="backend-cfg-${option}"]`)).toHaveText(option)
    }
  })
})
