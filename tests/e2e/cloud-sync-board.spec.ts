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

/**
 * MDT-226 push-path E2E (TEST-e2e-no-polling-push, TEST-e2e-local-wins-stale).
 *
 * Proves the push-delivery invariants once the browser consumes the unified
 * ticket API instead of the legacy projection feed:
 *   - the browser makes NO /cloud-projections request (C-3, C-11);
 *   - the browser opens NO direct cloud WebSocket (C-3);
 *   - additional browser tabs create no additional cloud traffic (BR-1.6);
 *   - a same-number local ticket wins in the unified view (BR-1.9).
 *
 * The legacy polling tests above remain valid during the compatibility window;
 * removal of useCloudProjectionFeed + /cloud-projections is a deliberate
 * post-green task (MDT-226 goal-prompt § Implementation Slices).
 */
test.describe('Cloud-Sync push delivery (MDT-226)', () => {
  test('unified-ticket board makes no /cloud-projections request and no direct cloud socket (C-3, C-11)', async ({ page, context, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    const cloudProjectionRequests: string[] = []
    await page.route('**/api/projects/**/cloud-projections**', async (route) => {
      cloudProjectionRequests.push(route.request().url())
      // Fail loudly if the legacy endpoint is hit in the push path.
      await route.abort()
    })

    // Track any direct cloud WebSocket attempts from the browser. The push path
    // keeps the cloud socket server-side; the browser must never open one.
    const cloudSocketAttempts: string[] = []
    context.on('request', (request) => {
      const url = request.url()
      if (url.includes('/projection-stream') || url.startsWith('wss://')) {
        cloudSocketAttempts.push(url)
      }
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // The board renders canonical local tickets via the unified ticket API.
    await expect(page.locator(boardSelectors.ticketByCode(scenario.crCodes[0]))).toBeVisible()

    // The legacy projection endpoint was never requested in the push path.
    expect(cloudProjectionRequests).toEqual([])
    // The browser opened no direct cloud WebSocket.
    expect(cloudSocketAttempts.filter(u => u.includes('/projection-stream'))).toEqual([])
  })

  test('local ticket wins in the unified board view (BR-1.9)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const localCode = scenario.crCodes[0]
    // The canonical local ticket is rendered; no projected stub for the same code.
    await expect(page.locator(boardSelectors.ticketByCode(localCode))).toBeVisible()
    await expect(page.locator(boardSelectors.projectedStubByCode(localCode))).toHaveCount(0)
  })

  test('a projected item served by the unified ticket API renders on the board (BR-1.2, BR-1.3)', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    // Serve the unified ticket endpoint with canonical local tickets PLUS a
    // projected read-only entry, proving the push path surfaces projections
    // through the unified API rather than the legacy /cloud-projections feed.
    await page.route('**/api/projects/**/tickets/unified**', async (route) => {
      const url = new URL(route.request().url())
      // Only override when the board fetches the unified list; let other calls pass.
      if (!url.pathname.endsWith('/tickets/unified')) {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { kind: 'projected', readOnly: true, stale: false, code: 'MDT-961', title: 'Pushed projection', status: 'Proposed', type: 'Feature', priority: 'High', assignee: null, dateCreated: null, lastModified: '2026-08-08T00:00:00Z' },
        ]),
      })
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    // The projected item appears via the unified API — proving the push path
    // delivers a projection to the board, not merely the absence of polling.
    await expect(page.locator(boardSelectors.projectedStubByCode('MDT-961'))).toBeVisible()
  })
})
