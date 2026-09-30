/**
 * List View E2E Tests
 *
 * Tests the list view functionality including:
 * 1. Table rendering with tickets
 * 2. Sorting by columns
 * 3. Clicking rows to open ticket details
 *
 * Desktop uses table view (ticket-table, ticket-row-*)
 * Mobile uses card view (ticket-list, ticket-card-*)
 */

import type { ProjectFactory } from '@mdt/shared/test-lib'
import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { listSelectors, ticketSelectors } from '../utils/selectors.js'

const SORT_STORAGE_KEY = 'markdown-ticket-sort-preferences'

const headerTexts = (page) =>
  page.locator(`${listSelectors.ticketTable} th`).allInnerTexts()

const rowCodes = async (page): Promise<string[]> =>
  page.locator(`${listSelectors.ticketTable} [data-testid^="ticket-row-"]`).evaluateAll(els =>
    els.map(el => el.getAttribute('data-testid')!.replace('ticket-row-', '')))

const rowTitles = (page) =>
  page.locator(`${listSelectors.ticketTable} [data-testid="ticket-title"]`).allInnerTexts()

const sortHeader = (page, attr: string) =>
  page.locator(`[data-testid="sort-${attr}"]`).locator('xpath=ancestor::th[1]')

const rowStatusTexts = (page) =>
  page.locator(`${listSelectors.ticketTable} [data-testid^="ticket-status-cell-"]`).allInnerTexts()

test.describe('List View', () => {
  test('table renders with tickets', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with multiple tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Act: Navigate to the project's list view
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForLoadState('load')

    // Wait for either table (desktop) or list (mobile) to be visible
    await page.waitForSelector(`${listSelectors.ticketTable}, ${listSelectors.ticketList}`, { state: 'visible', timeout: 10000 })

    // Assert: Verify ticket items are rendered (desktop rows or mobile cards).
    // Rows arrive asynchronously after the table container — poll for them
    // instead of taking an instant count (races ticket load).
    const ticketItems = page.locator(listSelectors.ticketItem)
    await expect.poll(async () => await ticketItems.count()).toBeGreaterThanOrEqual(scenario.ticketCount)

    // Assert: Verify each item has expected data attributes
    for (const crCode of scenario.crCodes) {
      const item = page.locator(listSelectors.itemByCode(crCode))
      await expect(item.first()).toBeVisible()
    }
  })

  test('sort changes ticket order', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with multiple tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Navigate to list view
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForLoadState('load')
    await page.waitForSelector(`${listSelectors.ticketTable}, ${listSelectors.ticketList}`, { state: 'visible', timeout: 10000 })

    // Get initial order of tickets (using data-testid attributes)
    const getTicketCodes = async (): Promise<string[]> => {
      const items = page.locator(listSelectors.ticketItem)
      // Items can arrive after the container — poll before reading order.
      await expect.poll(async () => await items.count(), { timeout: 10000 }).toBeGreaterThan(0)
      const count = await items.count()
      const codes: string[] = []
      for (let i = 0; i < count; i++) {
        const item = items.nth(i)
        const testId = await item.getAttribute('data-testid')
        // Extract code from testid like "ticket-row-ABC-1" or "ticket-card-ABC-1"
        const match = testId?.match(/ticket-(?:row|card)-([A-Z0-9-]+)/)
        if (match) {
          codes.push(match[1])
        }
      }
      return codes
    }

    const initialOrder = await getTicketCodes()
    expect(initialOrder.length).toBeGreaterThan(0)

    // Act: Select Title from the collapsed sort menu (available option)
    await page.locator('[data-testid="sort-controls"] [data-testid="sort-menu-trigger"]').click()
    await page.locator('[data-testid="sort-menu-option"][data-value="title"]').click()

    // Wait for sorting to complete
    await page.waitForTimeout(500)

    // Assert: Verify order changed after sorting by title
    const sortedOrder = await getTicketCodes()
    expect(sortedOrder.length).toBe(initialOrder.length)

    // Verify that the order actually changed (not just the count)
    // This assertion will fail if sorting doesn't work
    expect(sortedOrder).not.toEqual(initialOrder)

    // Act: Toggle sort direction
    const directionToggle = page.locator('[data-testid="sort-menu-direction"]')
    await directionToggle.click()
    await page.waitForTimeout(500)

    // Assert: Verify order was reversed
    const reversedOrder = await getTicketCodes()
    expect(reversedOrder.length).toBe(initialOrder.length)

    // Verify that reversing the direction actually reversed the order
    expect(reversedOrder).toEqual([...sortedOrder].reverse())
  })

  test('click row opens ticket detail', async ({ page, e2eContext }) => {
    // Arrange: Create a scenario with tickets
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Navigate to list view
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForLoadState('load')
    await page.waitForSelector(`${listSelectors.ticketTable}, ${listSelectors.ticketList}`, { state: 'visible', timeout: 10000 })

    // Get the first ticket code
    const firstTicketCode = scenario.crCodes[0]

    // Act: Click on a ticket item (this navigates to ticket detail URL which opens modal)
    const ticketItem = page.locator(listSelectors.itemByCode(firstTicketCode))
    await ticketItem.first().click()

    // Wait for navigation to complete and modal to appear
    await page.waitForLoadState('load')
    await page.waitForTimeout(500) // Allow modal animation

    // Assert: Verify ticket detail modal/panel opens
    const detailPanel = page.locator(ticketSelectors.detailPanel)
    await expect(detailPanel).toBeVisible({ timeout: 5000 })

    // Assert: Verify ticket code in detail panel (scope to detail panel to avoid strict mode violation)
    const detailCode = detailPanel.locator(ticketSelectors.code)
    await expect(detailCode).toBeVisible()
    await expect(detailCode).toContainText(firstTicketCode)

    // Assert: Verify ticket title in detail panel
    const detailTitle = detailPanel.locator(ticketSelectors.title)
    await expect(detailTitle).toBeVisible()

    // Cleanup: Close the detail panel
    await page.click(ticketSelectors.closeDetail)
    await page.waitForSelector(ticketSelectors.detailPanel, { state: 'hidden', timeout: 5000 })
  })
})

test.describe('List View — column sorting (MDT-249)', () => {
  // Note: Playwright gives each test a fresh browser context (empty localStorage)
  // — no clearing hook; persistence tests depend on storage surviving navigations.

  async function openList(page, projectCode: string) {
    await page.goto(`/prj/${projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { state: 'visible', timeout: 10000 })
    await expect.poll(async () =>
      await page.locator(`${listSelectors.ticketTable} [data-testid^="ticket-row-"]`).count(),
    { timeout: 10000 }).toBeGreaterThan(0)
  }

  test('header click sorts by default direction; labels match dropdown (BR-1.1/1.3/3.1, C3)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')
    await openList(page, scenario.projectCode)

    // Column labels exactly Key/Title/Status/Attributes/Created/Updated (BR-3.1)
    expect(await headerTexts(page)).toEqual(['Key', 'Title', 'Status', 'Attributes', 'Created', 'Updated'])

    // First click on inactive header applies defaultDirection: Title → asc
    await page.locator('[data-testid="sort-title"]').click()
    await page.waitForTimeout(300)
    expect(await rowTitles(page)).toEqual([...(await rowTitles(page))].sort((a, b) => a.localeCompare(b)))
    await expect(sortHeader(page, 'title')).toHaveAttribute('aria-sort', 'ascending')
    // Inactive sortable headers carry NO aria-sort (UX gate)
    expect(await sortHeader(page, 'code').getAttribute('aria-sort')).toBeNull()

    // Key defaultDirection is desc: click Key → newest (highest) number first
    await page.locator('[data-testid="sort-code"]').click()
    await page.waitForTimeout(300)
    const codes = await rowCodes(page)
    expect(codes).toEqual([...codes].sort((a, b) => b.localeCompare(a)))
    await expect(sortHeader(page, 'code')).toHaveAttribute('aria-sort', 'descending')
    expect(await sortHeader(page, 'title').getAttribute('aria-sort')).toBeNull()
  })

  test('active header click flips direction (BR-1.4)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')
    await openList(page, scenario.projectCode)

    await page.locator('[data-testid="sort-title"]').click()
    await page.waitForTimeout(300)
    const asc = await rowTitles(page)

    await page.locator('[data-testid="sort-title"]').click()
    await page.waitForTimeout(300)
    const desc = await rowTitles(page)
    expect(desc).toEqual([...asc].reverse())
    await expect(sortHeader(page, 'title')).toHaveAttribute('aria-sort', 'descending')
  })

  test('attributes header click does not sort (BR-1.2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')
    await openList(page, scenario.projectCode)

    const before = await rowCodes(page)
    // Attributes is static text — no button control exists for it
    await expect(page.locator('[data-testid="sort-attributes"]')).toHaveCount(0)
    await page.locator(`${listSelectors.ticketTable} th`, { hasText: 'Attributes' }).click()
    await page.waitForTimeout(300)
    expect(await rowCodes(page)).toEqual(before)
  })

  test('header click updates sort menu (BR-2.1)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')
    await openList(page, scenario.projectCode)

    await page.locator('[data-testid="sort-status"]').click()
    await page.waitForTimeout(300)
    await expect(page.locator(listSelectors.sortMenuTrigger)).toContainText('Status')
    await expect(sortHeader(page, 'status')).toHaveAttribute('aria-sort', 'ascending')
  })

  test('sort menu change updates header (BR-2.2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')
    await openList(page, scenario.projectCode)

    await page.locator(listSelectors.sortMenuTrigger).click()
    await page.locator(listSelectors.sortMenuOption('lastModified')).click()
    await page.waitForTimeout(300)
    // Updated defaultDirection desc → header glyph/aria-sort follow the dropdown
    await expect(sortHeader(page, 'lastModified')).toHaveAttribute('aria-sort', 'descending')
    expect(await sortHeader(page, 'code').getAttribute('aria-sort')).toBeNull()
    await expect(page.locator(listSelectors.sortMenuTrigger)).toContainText('Updated')
  })

  test('created column shows relative timestamps, non-interactive (BR-4.1/4.2, C5)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')
    await openList(page, scenario.projectCode)

    // Created renders immediately before Updated (BR-4.1)
    const headers = await headerTexts(page)
    expect(headers.indexOf('Created')).toBe(headers.indexOf('Updated') - 1)

    const firstRow = page.locator(`${listSelectors.ticketTable} tbody tr`).first()
    for (const attr of ['dateCreated', 'lastModified']) {
      // Cells: Key(0) Title(1) Status(2) Attributes(3) Created(4) Updated(5)
      const cellIndex = attr === 'dateCreated' ? 4 : 5
      const cell = firstRow.locator('td').nth(cellIndex)
      await expect(cell.locator('span')).toHaveText(/^(just now|.* ago)$/, { timeout: 5000 })
      // C5: no nested interactive element inside the clickable row cell
      await expect(cell.locator('button')).toHaveCount(0)
      // Full date-time available on hover (native title) — BR-4.2.
      // formatFullDateTime renders e.g. "9/30/26, 8:48 PM".
      await expect(cell.locator('span')).toHaveAttribute('title', /\d+\/\d+\/\d+,\s*\d+:\d+/)
    }
  })

  test('status sorts by lifecycle order, unknown last in both directions (BR-5.1)', async ({ page, e2eContext }) => {
    // Scenario-local fixture: scrambled lifecycle statuses + two unknown values.
    // Uses the public factory API directly — shared datasets stay untouched.
    const factory: ProjectFactory = e2eContext.projectFactory
    const project = await factory.createProject('empty', { name: 'Status Lifecycle Order' })
    const fixture = [
      { title: 'Rejected one', status: 'Rejected' },
      { title: 'Implemented two', status: 'Implemented' },
      { title: 'Proposed three', status: 'Proposed' },
      { title: 'Frozen four', status: 'Frozen' },
      { title: 'Partially Implemented five', status: 'Partially Implemented' },
      { title: 'On Hold six', status: 'On Hold' },
      { title: 'Approved seven', status: 'Approved' },
      { title: 'Limbo eight', status: 'Limbo' },
      { title: 'In Progress nine', status: 'In Progress' },
    ]
    await factory.createMultipleCRs(project.key, fixture.map(f => ({
      title: f.title,
      type: 'Feature Enhancement',
      status: f.status,
      priority: 'Medium',
      content: f.title,
    })) as Parameters<ProjectFactory['createMultipleCRs']>[1])

    await openList(page, project.key)

    const LIFECYCLE = ['Proposed', 'Approved', 'In Progress', 'On Hold', 'Implemented', 'Partially Implemented', 'Rejected']
    await page.locator('[data-testid="sort-status"]').click()
    await page.waitForTimeout(300)
    const asc = await rowStatusTexts(page)
    expect(asc.slice(0, LIFECYCLE.length)).toEqual(LIFECYCLE)
    // Unknown statuses pin last (stable tie order follows the prior sort, not creation)
    expect(asc.slice(LIFECYCLE.length)).toEqual(expect.arrayContaining(['Frozen', 'Limbo']))
    expect(asc.slice(LIFECYCLE.length)).toHaveLength(2)

    await page.locator('[data-testid="sort-status"]').click()
    await page.waitForTimeout(300)
    const desc = await rowStatusTexts(page)
    expect(desc.slice(0, LIFECYCLE.length)).toEqual([...LIFECYCLE].reverse())
    expect(desc.slice(LIFECYCLE.length)).toEqual(expect.arrayContaining(['Frozen', 'Limbo']))
    expect(desc.slice(LIFECYCLE.length)).toHaveLength(2)
  })

  test('status offered in list menus only, never board (BR-6.1/6.2, C6)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // Desktop dropdown, list scope: Status present
    await openList(page, scenario.projectCode)
    await page.locator(listSelectors.sortMenuTrigger).click()
    await expect(page.locator(listSelectors.sortMenuOption('status'))).toBeVisible()
    await page.keyboard.press('Escape')

    // Mobile hamburger sort list, list scope: Status present with label.
    // At 375px the table (and its header button) is display:none, so the
    // hamburger row is the only accessible "Status" button.
    await page.setViewportSize({ width: 375, height: 667 })
    await page.getByTestId('hamburger-menu').click()
    const statusRow = page.getByRole('button', { name: 'Status', exact: true })
    await expect(statusRow).toBeVisible()
    await statusRow.click() // selecting it proves the mobile list writes through
    await page.waitForTimeout(300)

    // Board scope (desktop): five options, no Status
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForTimeout(800)
    await page.locator(listSelectors.sortMenuTrigger).click()
    await expect(page.locator(listSelectors.sortMenuOption('status'))).toHaveCount(0)
    // Board offers exactly the pre-change five
    await expect(page.locator('[data-testid="sort-menu-option"]')).toHaveCount(5)
  })

  test('sticky headers stay pinned while the list scrolls (BR-8, TASK-7)', async ({ page, e2eContext }) => {
    // complex (12 tickets) + short viewport → guaranteed vertical overflow
    const scenario = await buildScenario(e2eContext.projectFactory, 'complex')
    await openList(page, scenario.projectCode)

    // Short viewport forces the table to overflow vertically; the height chain
    // makes .mdt-table__scroll the scrollport (naive sticky without it is inert).
    await page.setViewportSize({ width: 1280, height: 400 })
    const scrollEl = page.locator(`${listSelectors.ticketTable} .mdt-table__scroll`)
    await expect.poll(async () =>
      await scrollEl.evaluate(el => el.scrollHeight - el.clientHeight),
    { timeout: 5000 }).toBeGreaterThan(0)

    // Computed sticky styles on the th (scoped rules from list-view.css)
    const th = page.locator(`${listSelectors.ticketTable} th`).first()
    const styles = await th.evaluate((el) => {
      const s = getComputedStyle(el)
      return { position: s.position, top: s.top, bg: s.backgroundColor }
    })
    expect(styles.position).toBe('sticky')
    expect(styles.top).toBe('0px')
    expect(styles.bg).not.toBe('rgba(0, 0, 0, 0)') // opaque — rows must not show through

    // Pin proof: scroll to bottom; the header's viewport position must not move
    const pinnedY = (await th.boundingBox())!.y
    await scrollEl.evaluate((el) => { el.scrollTop = el.scrollHeight })
    await page.waitForTimeout(200)
    const scrolledY = (await th.boundingBox())!.y
    expect(Math.abs(scrolledY - pinnedY)).toBeLessThan(2)

    // Sort controls keep working while pinned: glyph state (aria-sort) persists (pure CSS)
    await page.locator('[data-testid="sort-title"]').click()
    await page.waitForTimeout(300)
    await expect(sortHeader(page, 'title')).toHaveAttribute('aria-sort', 'ascending')
    await scrollEl.evaluate((el) => { el.scrollTop = el.scrollHeight })
    await page.waitForTimeout(200)
    await expect(sortHeader(page, 'title')).toHaveAttribute('aria-sort', 'ascending')
    const stillPinnedY = (await th.boundingBox())!.y
    expect(Math.abs(stillPinnedY - pinnedY)).toBeLessThan(2)
  })

  test('view sort preferences persist independently; stale flat value resets (BR-7.1/7.2, C1, Edge-1)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'medium')

    // List: sort by Title asc
    await openList(page, scenario.projectCode)
    await page.locator('[data-testid="sort-title"]').click()
    await page.waitForTimeout(300)
    const listOrder = await rowCodes(page)

    // Board: default (Key desc), then set Priority — list slice must not move
    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForTimeout(800)
    await page.locator(listSelectors.sortMenuTrigger).click()
    await page.locator(listSelectors.sortMenuOption('priority')).click()
    await page.waitForTimeout(300)

    const stored = JSON.parse(await page.evaluate(k => localStorage.getItem(k), SORT_STORAGE_KEY))
    expect(stored).toEqual({
      list: { selectedAttribute: 'title', selectedDirection: 'asc' },
      board: { selectedAttribute: 'priority', selectedDirection: 'desc' },
    })

    // Reload: both scopes restore independently (BR-7.2)
    await page.reload()
    await page.waitForTimeout(800)
    await expect(page.locator(listSelectors.sortMenuTrigger)).toContainText('Priority')
    await page.goto(`/prj/${scenario.projectCode}/list`)
    await page.waitForSelector(listSelectors.ticketTable, { timeout: 10000 })
    await page.waitForTimeout(500)
    expect(await rowCodes(page)).toEqual(listOrder)

    // Edge-1: stale pre-change flat value → both scopes fall back to defaults
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SORT_STORAGE_KEY, JSON.stringify({ selectedAttribute: 'title', selectedDirection: 'asc' })])
    await page.reload()
    await page.waitForSelector(listSelectors.ticketTable, { timeout: 10000 })
    await page.waitForTimeout(500)
    await expect(page.locator(listSelectors.sortMenuTrigger)).toContainText('Key')
    await expect(sortHeader(page, 'code')).toHaveAttribute('aria-sort', 'descending')
  })
})
