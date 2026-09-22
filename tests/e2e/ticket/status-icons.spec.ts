/**
 * Status Icons E2E (MDT-247)
 *
 * Covers the always-on status glyph contract:
 * - key-strip glyph on surfaces with no co-rendered badge (quick search, pin
 *   tooltip): svg.ticket-code__status-icon[data-status]
 * - leading glyph inside every StatusBadge: svg.badge__icon[data-status]
 * - suppression: no key-strip glyph where the badge co-renders (board cards)
 * - list view Status column (desktop table + mobile lead tag)
 * - graceful absence for unknown status; rejected glyph for invalid status
 *
 * RED phase: the svg.ticket-code__status-icon / svg.badge__icon[data-status]
 * assertions fail until MDT-247 implements the glyph slots.
 *
 * Scenarios map to spec-trace test plans:
 * - TEST-e2e-strip-glyph-quick-search    (quick_search_hit_shows_status_glyph)
 * - TEST-e2e-pin-tooltip-status-glyph    (pin_tooltip_shows_status_glyph_not_badge)
 * - TEST-e2e-badge-glyph-and-suppression (status_badge_leads_with_glyph, strip_glyph_suppressed_where_badge_renders)
 * - TEST-e2e-list-status-column-desktop  (desktop_list_status_column)
 * - TEST-e2e-list-status-mobile          (mobile_list_lead_status_tag)
 * - TEST-e2e-unknown-status-no-glyph     (unknown_status_renders_no_glyph, invalid_status_uses_rejected_glyph_and_invalid_colors)
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { modifyTicketFile } from '../utils/sse-helpers.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { boardSelectors, listSelectors, quickSearchSelectors, ticketSelectors } from '../utils/selectors.js'

/** Seed a pin via the API (no-auth-dev E2E backend → no owner-intent needed). */
async function seedPin(page: import('@playwright/test').Page, projectCode: string, ticketCode: string): Promise<void> {
  await page.request.put('/api/pins', {
    data: { pins: [{ projectCode, ticketCode, favoritedAt: new Date().toISOString() }] },
  })
}

test.describe('Status icons (MDT-247)', () => {
  test('TEST-e2e-strip-glyph-quick-search: quick-search hit key strip carries the status glyph', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    // 'simple' crCodes[1] = "Add User Authentication", status In Progress.
    const code = scenario.crCodes[1]!

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const isMac = process.platform === 'darwin'
    await page.keyboard.press(`${isMac ? 'Meta' : 'Control'}+k`)
    await expect(page.locator(quickSearchSelectors.modal)).toBeVisible()
    await page.locator(quickSearchSelectors.input).fill(code)

    // Current-project hit: the key strip (canonical <TicketCode>) carries the
    // status glyph between the priority glyph and the key text.
    const hit = page.getByTestId('quick-search-result-item').first()
    await expect(hit).toBeVisible({ timeout: 5000 })
    const hitCode = hit.locator(ticketSelectors.code)
    await expect(hitCode.locator('svg.ticket-code__status-icon[data-status="in-progress"]')).toBeVisible()
  })

  test('TEST-e2e-pin-tooltip-status-glyph: pin tooltip shows the strip glyph and no badge block', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    // crCodes[0] = "Setup Project Structure", status Implemented.
    const code = scenario.crCodes[0]!
    await seedPin(page, scenario.projectCode, code)

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const pin = page.getByTestId('pin-item').first()
    await expect(pin).toBeVisible()
    await pin.hover()

    // Scope to the OPEN tooltip via its ARIA role (Radix keeps a hidden sibling
    // content node in the DOM; only the open one is exposed via role="tooltip").
    const tooltip = page.getByRole('tooltip').filter({ hasText: code })
    const tooltipCode = tooltip.getByTestId('ticket-code')
    await expect(tooltipCode).toBeVisible()
    await expect(tooltipCode.locator('svg.ticket-code__status-icon[data-status="implemented"]')).toBeVisible()

    // The badge block is replaced by the glyph: no status badge in the tooltip.
    await expect(tooltip.locator('.badge[data-status]')).toHaveCount(0)
    await expect(tooltip.locator('.pin-tooltip__status')).toHaveCount(0)
  })

  test('TEST-e2e-badge-glyph-and-suppression: board badge leads with its glyph; key strip suppresses', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    // crCodes[1] = In Progress.
    const code = scenario.crCodes[1]!

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const card = page.locator(boardSelectors.ticketByCode(code)).first()

    // One status encoding per surface: the badge is the status encoding on
    // cards, so the key strip carries NO status glyph.
    const keyLine = card.locator(ticketSelectors.code)
    await expect(keyLine).toBeVisible()
    await expect(keyLine.locator('svg.ticket-code__status-icon')).toHaveCount(0)

    // The badge leads with its glyph, icon before the label.
    const badge = card.locator('.badge[data-status="in-progress"]')
    await expect(badge).toBeVisible()
    await expect(badge.locator('svg.badge__icon[data-status="in-progress"]')).toBeVisible()
    await expect(badge).toContainText('In Progress')
  })

  test('TEST-e2e-list-status-column-desktop: desktop table has a Status column with the badge cell', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    // crCodes[1] = In Progress.
    const code = scenario.crCodes[1]!

    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10000 })

    // Column header present between Title and Attributes.
    await expect(page.locator(listSelectors.ticketTable).locator('th', { hasText: 'Status' })).toBeVisible()

    // Exactly ONE status badge per row (the Status column cell); the
    // Attributes cell no longer repeats the STATUS tag. Scope to the desktop
    // row testid — the mobile card is also in the DOM (hidden via md:hidden),
    // so the shared itemByCode selector resolves both and violates strict mode.
    const row = page.getByTestId(`ticket-row-${code}`)
    await expect(row).toBeVisible()
    await expect(row.locator('.badge[data-status]')).toHaveCount(1)
    await expect(row.locator('.badge[data-status="in-progress"] svg.badge__icon[data-status="in-progress"]')).toBeVisible()
  })

  test.describe('mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } })

    test('TEST-e2e-list-status-mobile: mobile list presents status once via the lead tag', async ({ page, e2eContext }) => {
      const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
      // crCodes[1] = In Progress.
      const code = scenario.crCodes[1]!

      await page.goto(`/prj/${scenario.projectCode}/list`)
      const card = page.getByTestId(`ticket-card-${code}`)
      await expect(card).toBeVisible({ timeout: 10000 })

      // The existing lead status tag IS the mobile status column: exactly one
      // status badge per card, carrying the leading glyph.
      await expect(card.locator('.badge[data-status]')).toHaveCount(1)
      await expect(card.locator('.badge[data-status="in-progress"] svg.badge__icon[data-status="in-progress"]')).toBeVisible()
    })
  })

  test('TEST-e2e-unknown-status-no-glyph: unknown status renders no strip glyph; invalid badge uses the rejected glyph', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    // crCodes[2] = Proposed; rewrite to a status outside the seven CRStatus values.
    const code = scenario.crCodes[2]!
    await modifyTicketFile(scenario.projectDir, code, { status: 'In Review' })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const card = page.locator(boardSelectors.ticketByCode(code)).first()

    // Graceful absence: no status glyph anywhere for an unmapped status.
    const keyLine = card.locator(ticketSelectors.code)
    await expect(keyLine).toBeVisible()
    await expect(keyLine.locator('svg.ticket-code__status-icon')).toHaveCount(0)

    // The badge keeps its label (unchanged) and uses the rejected-status glyph
    // under the invalid data-status colors.
    const badge = card.locator('.badge[data-status="invalid"]')
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('In Review')
    await expect(badge.locator('svg.badge__icon[data-status="rejected"]')).toBeVisible()
  })
})
