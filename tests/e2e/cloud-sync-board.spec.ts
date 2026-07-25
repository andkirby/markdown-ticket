/**
 * E2E: Cloud-Sync Board Projection (MDT-200 Slice U5).
 *
 * Proves the projection poll→render path against the real board: the production
 * hook polls the local server endpoint, and a deterministic injection seam
 * covers subsequent board states without live Cloudflare credentials. A stub
 * renders as a clearly-labeled, read-only,
 * non-draggable card in the correct column (BR-3.4), with no body (BR-3.1),
 * and without implying teammate ownership/presence (C8).
 *
 * AUTOMATED vs MANUAL (honest scope):
 *   - AUTOMATED: the board render contract for a projected stub (label, column
 *     placement, non-draggable, no body, read-only) and the poll-style update
 *     path (a second "projection arrives" updates the board within the render
 *     cycle). This exercises the same useCloudProjections + CloudProjectionStub
 *     code path a live poller drives.
 *   - MANUAL GATE: a true two-client run against the deployed Worker
 *     (client A publishes via PUT /v1/projects/{id}/tickets/{number}/projection,
 *     client B polls GET .../projections through its local server) requires live Cloudflare
 *     Access credentials and a provisioned cloud project, which are not
 *     available in the headless test environment. The CloudProjectionClient
 *     HTTP/cursor/allowlist behavior is covered by jest
 *     (shared/services/cloud-sync/__tests__/CloudProjectionClient.test.ts);
 *     the live two-client round-trip is documented as a manual verification
 *     step. See docs/CRs/MDT-200/ux-design.md § Verification mapping.
 *
 * The optional `window.__MDT_PROJECTION_FEED__` seam overrides production
 * polling only for deterministic render-state tests.
 */

import { expect, test } from './fixtures/test-fixtures.js'
import { buildScenario } from './setup/index.js'
import { boardSelectors } from './utils/selectors.js'
import { waitForBoardReady } from './utils/helpers.js'

/** A projected header shaped like the wire ProjectedHeader (no body — BR-3.1). */
function projectedItem(code: string, ticketNumber: number, overrides: Record<string, unknown> = {}) {
  return {
    ticketNumber,
    lifecycle: 'active',
    code,
    title: `Projected ${code}`,
    status: 'Proposed',
    type: 'Feature',
    priority: 'High',
    assignee: 'teammate@example.com',
    date_created: '2026-07-24',
    last_modified: '2026-07-24',
    ...overrides,
  }
}

/** Inject a projection feed into the board via the testability seam. */
async function injectProjectionFeed(page: import('@playwright/test').Page, items: Record<string, unknown>[]) {
  await page.evaluate((feedItems) => {
    ;(window as unknown as { __MDT_PROJECTION_FEED__?: unknown }).__MDT_PROJECTION_FEED__ = {
      items: feedItems,
      stale: false,
    }
    window.dispatchEvent(new Event('mdt:projection-feed'))
  }, items)
}

/** Clear the projection feed (simulates cloud-binding disabled — BR-4.2). */
async function clearProjectionFeed(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    ;(window as unknown as { __MDT_PROJECTION_FEED__?: unknown }).__MDT_PROJECTION_FEED__ = null
    window.dispatchEvent(new Event('mdt:projection-feed'))
  })
}

test.describe('Cloud-Sync Board Projection (MDT-200 U5)', () => {
  test('production poller renders a header returned by the local server endpoint', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    let pollCount = 0
    await page.route('**/api/projects/**/cloud-projections**', async (route) => {
      pollCount += 1
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enabled: true,
          pollIntervalSeconds: 60,
          items: [projectedItem('MDT-949', 949)],
          nextCursor: 1,
          hasMore: false,
          stale: false,
        }),
      })
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await expect(page.locator(boardSelectors.projectedStubByCode('MDT-949'))).toBeVisible()
    expect(pollCount).toBeGreaterThan(0)
  })

  test('projected stub renders labeled, read-only, non-draggable, in the right column', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // Client B receives a projection for a ticket number with NO local file.
    // Use a high number guaranteed not to collide with the simple scenario.
    await injectProjectionFeed(page, [projectedItem('MDT-950', 950)])

    const stub = page.locator(boardSelectors.projectedStubByCode('MDT-950'))
    await expect(stub).toBeVisible()

    // It lands in the column matching its projected status (Proposed).
    const proposedColumn = page.locator(boardSelectors.columnByStatus('Proposed'))
    await expect(proposedColumn.locator(boardSelectors.projectedStubByCode('MDT-950'))).toBeVisible()

    // The muted "cloud" label is present (must not imply ownership/presence — C8).
    await expect(stub.locator(boardSelectors.cloudBadge)).toBeVisible()
    await expect(stub.locator(boardSelectors.cloudBadge)).toContainText(/cloud/i)

    // Read-only / non-draggable: no drag handle on the stub (BR-3.4).
    await expect(stub.locator(boardSelectors.dragHandle)).toHaveCount(0)

    // The card carries the projected flag for downstream assertions.
    await expect(stub).toHaveAttribute('data-projected', 'true')

    // BR-3.1: the stub must not render a body/description. The projected title
    // is the only text content beyond the approved badges.
    const stubText = (await stub.innerText()).toLowerCase()
    expect(stubText).not.toContain('description:')
    expect(stubText).not.toContain('rationale:')
  })

  test('local ticket wins — no stub for a ticket number that has a local file', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // The simple scenario creates local tickets; take the first code and project
    // a stub for the SAME code. The canonical local file must win (BR-3.4, C2).
    const localCode = scenario.crCodes[0]
    const localNumber = Number.parseInt(localCode.split('-').pop() ?? '0', 10)
    await injectProjectionFeed(page, [projectedItem(localCode, localNumber, { title: 'PROJECTED SHOULD NOT APPEAR' })])

    // No projected stub for the local code.
    await expect(page.locator(boardSelectors.projectedStubByCode(localCode))).toHaveCount(0)
    // The local ticket card is still rendered with its canonical title.
    const localCard = page.locator(boardSelectors.ticketByCode(localCode))
    await expect(localCard).toBeVisible()
    await expect(localCard).not.toContainText('PROJECTED SHOULD NOT APPEAR')
  })

  test('poll-style update: a second projection arrives and renders (within the render cycle)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // First poll: one projection.
    await injectProjectionFeed(page, [projectedItem('MDT-951', 951)])
    await expect(page.locator(boardSelectors.projectedStubByCode('MDT-951'))).toBeVisible()
    await expect(page.locator(boardSelectors.projectedStub)).toHaveCount(1)

    // Second poll: an additional projection arrives (simulating client B observing
    // a publish from client A). The board updates without a full reload.
    await injectProjectionFeed(page, [
      projectedItem('MDT-951', 951),
      projectedItem('MDT-952', 952, { status: 'In Progress' }),
    ])
    await expect(page.locator(boardSelectors.projectedStubByCode('MDT-951'))).toBeVisible()
    await expect(page.locator(boardSelectors.projectedStubByCode('MDT-952'))).toBeVisible()
    await expect(page.locator(boardSelectors.projectedStub)).toHaveCount(2)

    // The second stub lands in its projected status column.
    const inProgressColumn = page.locator(boardSelectors.columnByStatus('In Progress'))
    await expect(inProgressColumn.locator(boardSelectors.projectedStubByCode('MDT-952'))).toBeVisible()
  })

  test('clearing the feed removes projected stubs (cloud-binding disabled — BR-4.2)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await injectProjectionFeed(page, [projectedItem('MDT-953', 953)])
    await expect(page.locator(boardSelectors.projectedStubByCode('MDT-953'))).toBeVisible()

    // Detach: projected stubs disappear (they were derived). Local tickets remain.
    await clearProjectionFeed(page)
    await expect(page.locator(boardSelectors.projectedStubByCode('MDT-953'))).toHaveCount(0)
    await expect(page.locator(boardSelectors.projectedStub)).toHaveCount(0)
    // Canonical local tickets are unchanged.
    await expect(page.locator(boardSelectors.ticketByCode(scenario.crCodes[0]))).toBeVisible()
  })
})
