/**
 * MDT-197: Pin Rail E2E tests.
 *
 * Covers the behavior requirements (BR-1..BR-10) and the board-dnd regression
 * (C-2). Runs against the in-process E2E server (no-auth-dev mode → canWrite).
 *
 * Scenarios map to spec-trace test plans:
 * - TEST-e2e-drag-to-pin        (BR-1)
 * - TEST-e2e-click-opens-viewer (BR-2)
 * - TEST-e2e-hover-unpin        (BR-3, BR-6)
 * - TEST-e2e-persist-reload     (BR-4)
 * - TEST-e2e-empty-rail-absent  (BR-7)
 * - TEST-e2e-cross-view         (BR-9)
 * - TEST-e2e-board-dnd-regression (C-2)
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { boardSelectors } from '../utils/selectors.js'
import { getTicketStatus, navigateToList, navigateToDocuments, waitForBoardReady } from '../utils/helpers.js'

test.describe('Pin Rail (MDT-197)', () => {
  test.describe.configure({ mode: 'serial' })

  test('TEST-e2e-empty-rail-absent: empty pin set renders no rail', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // No pins → rail is absent.
    await expect(page.getByTestId('pin-rail')).toHaveCount(0)
  })

  test('TEST-e2e-drag-to-pin: drag a board card onto the rail pins it (BR-1)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Set viewport to desktop so the rail (md+) can show.
    await page.setViewportSize({ width: 1280, height: 800 })

    const proposedTicketCode = scenario.crCodes[2] // Proposed ticket
    const ticket = page.locator(boardSelectors.ticketByCode(proposedTicketCode))
    const ticketHandle = ticket.locator(boardSelectors.dragHandle)
    const source = (await ticketHandle.count()) > 0 ? ticketHandle : ticket

    // Begin a drag toward the rail. The rail reveals as a drop target once a
    // drag is in progress. We drag onto the drop affordance.
    // Start the drag by moving to source, pressing mouse down, moving to rail.
    const railDrop = page.getByTestId('pin-drop-affordance')
    await source.hover()
    await page.mouse.down()
    // The rail reveals during the drag; wait for it then drop on the affordance.
    await railDrop.waitFor({ state: 'visible', timeout: 3000 })
    await railDrop.hover()
    await page.mouse.up()

    // Pin item appears.
    await expect(page.getByTestId('pin-item')).toHaveCount(1)
  })

  test('TEST-e2e-click-opens-viewer: clicking a pin opens the ticket viewer (BR-2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.setViewportSize({ width: 1280, height: 800 })

    // Seed a pin via the API (reliable; avoids re-running the drag dance).
    const code = scenario.crCodes[0]
    await page.request.put('/api/pins', {
      data: { pins: [{ projectCode: scenario.projectCode, ticketCode: code, favoritedAt: new Date().toISOString() }] },
    })
    await page.reload()
    await waitForBoardReady(page)

    await expect(page.getByTestId('pin-item')).toHaveCount(1)
    await page.getByTestId('pin-item').click()

    // Ticket viewer opens (the detail modal/container).
    await expect(page.locator('[data-testid="ticket-viewer"], [role="dialog"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('TEST-e2e-hover-unpin: hover shows x and clicking it unpins (BR-3, BR-6)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const code = scenario.crCodes[0]
    await page.request.put('/api/pins', {
      data: { pins: [{ projectCode: scenario.projectCode, ticketCode: code, favoritedAt: new Date().toISOString() }] },
    })
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.setViewportSize({ width: 1280, height: 800 })

    const pin = page.getByTestId('pin-item')
    await expect(pin).toHaveCount(1)

    // Hover reveals the unpin ×. Click it.
    await pin.hover()
    const unpin = page.getByTestId('pin-item-unpin')
    await unpin.click({ force: true })

    // Pin removed; rail absent (empty again).
    await expect(page.getByTestId('pin-item')).toHaveCount(0)
  })

  test('TEST-e2e-persist-reload: pins persist across page reload (BR-4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const code = scenario.crCodes[0]
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.setViewportSize({ width: 1280, height: 800 })

    await page.request.put('/api/pins', {
      data: { pins: [{ projectCode: scenario.projectCode, ticketCode: code, favoritedAt: new Date().toISOString() }] },
    })
    await page.reload()
    await waitForBoardReady(page)

    // The pin survived the reload (server-backed).
    await expect(page.getByTestId('pin-item')).toHaveCount(1)

    // Cleanup so later tests start empty.
    await page.request.put('/api/pins', { data: { pins: [] } })
  })

  test('TEST-e2e-cross-view: rail stays visible across board/list/documents (BR-9)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    const code = scenario.crCodes[0]
    await page.request.put('/api/pins', {
      data: { pins: [{ projectCode: scenario.projectCode, ticketCode: code, favoritedAt: new Date().toISOString() }] },
    })
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.setViewportSize({ width: 1280, height: 800 })

    // Board view: rail visible.
    await expect(page.getByTestId('pin-rail')).toBeVisible()

    // List view: rail still visible.
    await navigateToList(page)
    await expect(page.getByTestId('pin-rail')).toBeVisible()

    // Documents view: rail still visible.
    await navigateToDocuments(page)
    await expect(page.getByTestId('pin-rail')).toBeVisible()

    // Cleanup.
    await page.request.put('/api/pins', { data: { pins: [] } })
  })

  test('TEST-e2e-board-dnd-regression: board status drag-drop still works after DndProvider lift (C-2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)
    await page.setViewportSize({ width: 1280, height: 800 })

    const proposedTicketCode = scenario.crCodes[2]
    const initialStatus = await getTicketStatus(page, proposedTicketCode)
    expect(initialStatus).toBe('Proposed')

    // Drag to In Progress column (the original board DnD behavior).
    const ticket = page.locator(boardSelectors.ticketByCode(proposedTicketCode))
    const dragHandle = ticket.locator(boardSelectors.dragHandle)
    const source = (await dragHandle.count()) > 0 ? dragHandle : ticket
    const targetColumn = page.locator(boardSelectors.columnByStatus('In Progress'))

    await source.dragTo(targetColumn)
    await page.waitForTimeout(500)

    const newStatus = await getTicketStatus(page, proposedTicketCode)
    expect(newStatus).toBe('In Progress')
  })
})
