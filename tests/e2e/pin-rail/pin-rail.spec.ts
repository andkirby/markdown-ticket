/**
 * MDT-197: Pin Rail E2E tests.
 *
 * Covers BR-1..BR-10 and the board-dnd regression (C-2). Runs against the E2E
 * stack (no-auth-dev mode → canWrite; no unlock needed).
 *
 * Tests are independent (not serial) so one failure doesn't mask the rest.
 * Pin-dependent tests seed via the API (reliable) rather than re-running the
 * drag dance. The drag-to-pin test uses Playwright dragTo() (proper HTML5 drag
 * events) so react-dnd's HTML5Backend registers the drag.
 *
 * Scenarios map to spec-trace test plans:
 * - TEST-e2e-empty-rail-absent   (BR-7)
 * - TEST-e2e-drag-to-pin         (BR-1)
 * - TEST-e2e-click-opens-viewer  (BR-2)
 * - TEST-e2e-hover-unpin         (BR-3, BR-6)
 * - TEST-e2e-persist-reload      (BR-4)
 * - TEST-e2e-cross-view          (BR-9)
 * - TEST-e2e-board-dnd-regression (C-2)
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'
import { getTicketStatus, waitForBoardReady } from '../utils/helpers.js'

/** Seed pins via the API (no-auth-dev E2E backend → no owner-intent needed). */
async function seedPins(page: import('@playwright/test').Page, pins: Array<{ projectCode: string, ticketCode: string }>): Promise<void> {
  await page.request.put('/api/pins', {
    data: { pins: pins.map(p => ({ ...p, favoritedAt: new Date().toISOString() })) },
  })
}

/** Clear the pin set (cleanup between independent tests). */
async function clearPins(page: import('@playwright/test').Page): Promise<void> {
  await page.request.put('/api/pins', { data: { pins: [] } })
}

test.describe('Pin Rail (MDT-197)', () => {
  test.beforeEach(async ({ page }) => {
    await clearPins(page)
  })

  test('TEST-e2e-empty-rail-collapsed: empty pin set keeps the rail present (BR-7/BR-12)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // No pins + feature enabled (default pinned=true) → rail is present (pinned
    // / docked, taking its 48px). Toggling the pin collapses it to the floating
    // button (covered by TEST-e2e-pin-toggle-collapse).
    await expect(page.getByTestId('pin-rail')).toBeVisible()
    await expect(page.getByTestId('pin-rail')).toHaveAttribute('data-state', 'pinned')

    // Collapse via the pin toggle → now the collapsed strip is present.
    await page.getByTestId('pin-rail-toggle').click()
    await page.waitForTimeout(400)
    await expect(page.getByTestId('pin-rail')).toHaveAttribute('data-state', 'collapsed')
  })

  test('TEST-e2e-settings-disables-rail: Settings off removes rail + strip entirely (BR-11)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Rail/strip present by default.
    await expect(page.getByTestId('pin-rail')).toBeVisible()

    // Disable via Settings: evaluate localStorage directly (the Settings modal
    // UI toggle is covered by the hook test; here we verify the effect).
    await page.evaluate(() => {
      localStorage.setItem('mdt-settings-pin-rail-enabled', '0')
      window.dispatchEvent(new Event('markdown-ticket:settings:pin-rail-enabled-change'))
    })
    await page.waitForTimeout(500)

    // Neither rail nor strip renders — 0px.
    await expect(page.getByTestId('pin-rail')).toHaveCount(0)

    // Re-enable to restore for subsequent tests.
    await page.evaluate(() => {
      localStorage.setItem('mdt-settings-pin-rail-enabled', '1')
      window.dispatchEvent(new Event('markdown-ticket:settings:pin-rail-enabled-change'))
    })
  })

  test('TEST-e2e-pin-toggle-collapse: pin icon toggles rail open/closed (BR-12)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const code = scenario.crCodes[0]
    await seedPins(page, [{ projectCode: scenario.projectCode, ticketCode: code }])
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Default pinned → docked rail (takes space) with the pin item.
    await expect(page.getByTestId('pin-rail')).toHaveAttribute('data-state', 'pinned')
    await expect(page.getByTestId('pin-item')).toHaveCount(1)

    // Click the pin toggle → collapses to floating button (no space).
    await page.getByTestId('pin-rail-toggle').click()
    await page.waitForTimeout(400)
    await expect(page.getByTestId('pin-rail')).toHaveAttribute('data-state', 'collapsed')
    // Pin item not shown in collapsed state.
    await expect(page.getByTestId('pin-item')).toHaveCount(0)

    // Click the floating button → pins again (docked, takes space).
    await page.getByTestId('pin-rail-toggle').click()
    await page.waitForTimeout(400)
    await expect(page.getByTestId('pin-rail')).toHaveAttribute('data-state', 'pinned')
    await expect(page.getByTestId('pin-item')).toHaveCount(1)
  })

  test('TEST-e2e-pinned-takes-space: pinned rail pushes columns; collapsed does not (BR-12)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const code = scenario.crCodes[0]
    await seedPins(page, [{ projectCode: scenario.projectCode, ticketCode: code }])
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Pinned (docked) → first column pushed right by ~48px.
    const colLeftPinned = await page.evaluate(() =>
      Math.round(document.querySelector('[data-testid^="column-"]')!.getBoundingClientRect().left),
    )

    // Unpin → collapsed (floating button, no space). Column moves left.
    await page.getByTestId('pin-rail-toggle').click()
    await page.waitForTimeout(500)
    const colLeftCollapsed = await page.evaluate(() =>
      Math.round(document.querySelector('[data-testid^="column-"]')!.getBoundingClientRect().left),
    )

    // Pinned takes ~48px of layout space; collapsed takes none.
    expect(colLeftPinned - colLeftCollapsed).toBeGreaterThan(40)
  })

  test('TEST-e2e-drag-to-pin: drag a board card onto the rail pins it (BR-1)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Seed one pin first so the rail is already visible (stable drop target).
    // The empty-rail drag-reveal is covered by the unit-level useDragLayer
    // contract; here we verify the drop actually pins a NEW ticket.
    const firstCode = scenario.crCodes[0]
    await seedPins(page, [{ projectCode: scenario.projectCode, ticketCode: firstCode }])
    await page.reload()
    await waitForBoardReady(page)
    await expect(page.getByTestId('pin-rail')).toBeVisible()

    // Drag a different ticket onto the rail using dragTo (HTML5 drag events).
    const draggedCode = scenario.crCodes[2]
    const ticket = page.locator(boardSelectors.ticketByCode(draggedCode))
    const dragHandle = ticket.locator(boardSelectors.dragHandle)
    const source = (await dragHandle.count()) > 0 ? dragHandle : ticket
    const rail = page.getByTestId('pin-rail')

    await source.dragTo(rail)
    await page.waitForTimeout(500)

    // A second pin item appeared (the dragged ticket).
    await expect(page.getByTestId('pin-item')).toHaveCount(2)
  })

  test('TEST-e2e-click-opens-viewer: clicking a pin opens the ticket viewer (BR-2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const code = scenario.crCodes[0]
    await seedPins(page, [{ projectCode: scenario.projectCode, ticketCode: code }])
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await expect(page.getByTestId('pin-item')).toHaveCount(1)
    await page.getByTestId('pin-item').first().click()

    // Ticket viewer opens (TicketViewer root uses data-testid="ticket-detail").
    await expect(page.getByTestId('ticket-detail')).toBeVisible({ timeout: 8000 })
  })

  test('TEST-e2e-hover-unpin: hover shows x and clicking it unpins (BR-3, BR-6)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const code = scenario.crCodes[0]
    await seedPins(page, [{ projectCode: scenario.projectCode, ticketCode: code }])
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const pin = page.getByTestId('pin-item')
    await expect(pin).toHaveCount(1)

    await pin.first().hover()
    const unpin = page.getByTestId('pin-item-unpin')
    await unpin.first().click({ force: true })

    await expect(page.getByTestId('pin-item')).toHaveCount(0)
  })

  test('TEST-e2e-persist-reload: pins persist across page reload (BR-4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const code = scenario.crCodes[0]
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await seedPins(page, [{ projectCode: scenario.projectCode, ticketCode: code }])
    await page.reload()
    await waitForBoardReady(page)

    // The pin survived the reload (server-backed).
    await expect(page.getByTestId('pin-item')).toHaveCount(1)
  })

  test('TEST-e2e-cross-view: rail stays visible across board/list/documents (BR-9)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const code = scenario.crCodes[0]
    await seedPins(page, [{ projectCode: scenario.projectCode, ticketCode: code }])
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Board view: rail visible (app-level chrome).
    await expect(page.getByTestId('pin-rail')).toBeVisible()

    // Toggle to list view and confirm the rail persists. We click the toggle
    // directly and assert on the rail (not the list contents) so the assertion
    // is independent of list-view rendering timing in the E2E backend.
    const toggle = page.getByTestId('board-list-toggle')
    if ((await toggle.getAttribute('data-current-mode')) !== 'list') {
      await toggle.click()
      await page.waitForTimeout(500)
    }
    await expect(page.getByTestId('pin-rail')).toBeVisible()

    // Documents view: rail still visible.
    await page.getByTestId('documents-button').click()
    await page.waitForTimeout(500)
    await expect(page.getByTestId('pin-rail')).toBeVisible()
  })

  test('TEST-e2e-board-dnd-regression: board status drag-drop still works after DndProvider lift (C-2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const proposedTicketCode = scenario.crCodes[2]
    expect(await getTicketStatus(page, proposedTicketCode)).toBe('Proposed')

    const ticket = page.locator(boardSelectors.ticketByCode(proposedTicketCode))
    const dragHandle = ticket.locator(boardSelectors.dragHandle)
    const source = (await dragHandle.count()) > 0 ? dragHandle : ticket
    const targetColumn = page.locator(boardSelectors.columnByStatus('In Progress'))

    await source.dragTo(targetColumn)
    await page.waitForTimeout(500)

    expect(await getTicketStatus(page, proposedTicketCode)).toBe('In Progress')
  })

  test('TEST-e2e-visual-signals-only: no label/divider/"+" glyph; collapsed opacity 0.85; pin code uses ticket-card font token (C-6)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const code = scenario.crCodes[0]
    await seedPins(page, [{ projectCode: scenario.projectCode, ticketCode: code }])
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Rail is pinned/docked by default → open. Assert visual-signals-only:
    // no "Pinned" text label, no divider element, no "+" drop affordance.
    const rail = page.getByTestId('pin-rail')
    await expect(rail).toHaveAttribute('data-state', 'pinned')
    await expect(rail.locator('.pin-rail__label')).toHaveCount(0)
    await expect(rail.locator('.pin-rail__divider')).toHaveCount(0)
    await expect(rail.locator('.pin-rail__drop-affordance')).toHaveCount(0)
    // No literal "Pinned" word or "+" glyph rendered as text inside the rail.
    await expect(rail).not.toContainText('Pinned')
    await expect(rail).not.toContainText('+')

    // The pin-item code uses the same font-size token as the board ticket card
    // code: var(--fs-xs) resolves to 11px in the default comfortable density.
    const pinCodeFont = await page.locator('.pin-item__code').first().evaluate(el => {
      return window.getComputedStyle(el).fontSize
    })
    expect(pinCodeFont).toBe('11px')

    // Collapse to the floating button and assert its opacity is 0.85 at rest.
    await page.getByTestId('pin-rail-toggle').click()
    await page.mouse.move(500, 500) // move away so it settles to collapsed
    await page.waitForTimeout(400)
    const collapsedBtn = page.locator('.pin-rail__toggle--collapsed')
    await expect(collapsedBtn).toBeVisible()
    const opacity = await collapsedBtn.evaluate(el => window.getComputedStyle(el).opacity)
    expect(opacity).toBe('0.85')
  })
})
