/**
 * SSE for runtime-registered projects — MDT-183 UAT (2026-09-02)
 *
 * Regression for the production defect: a project registered in the global
 * registry while the server is running never received lazy watchers, so its
 * boards stayed stale until a backend restart (observed live: GPDE project,
 * correct REST data, silent SSE).
 *
 * These specs exercise the PRODUCTION path only — no `/_e2e/watchers/*`
 * manual watcher init. See tests/e2e/sse/updates.spec.ts for the admin-seam
 * variants that historically masked this gap.
 *
 * @see docs/CRs/MDT-183/uat.md (BR-7, TEST-late-registration)
 */

import { expect, test } from "../fixtures/test-fixtures.js";
import { buildScenario } from "../setup/index.js";
import { boardSelectors } from "../utils/selectors.js";
import { waitForBoardReady } from "../utils/helpers.js";
import { modifyTicketFile, waitForSSEEvent } from "../utils/sse-helpers.js";
import type { Page } from "@playwright/test";
import type { ScenarioResult } from "../setup/index.js";

test.describe("SSE for runtime-registered projects (MDT-183 UAT)", () => {
  /**
   * The watcher for a runtime-registered project provisions asynchronously
   * (registry-change → discovery → chokidar ready), and there is no per-project
   * readiness endpoint. Probe by writing a distinct title and waiting for its
   * file-change; retry until the pipeline is proven live. Old code fails all
   * probes (watcher never exists), fixed code converges within ~1s.
   */
  async function probeUntilWatcherLive(
    page: Page,
    project: ScenarioResult,
    timeoutMs = 15000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;

    while (Date.now() < deadline) {
      attempt++;
      await modifyTicketFile(project.projectDir, project.crCodes[0], {
        title: `Watcher readiness probe ${attempt}`,
      });
      try {
        await waitForSSEEvent(page, "file-change", {
          filename: `${project.crCodes[0]}.md`,
        });
        return;
      } catch {
        // Watcher not live yet — keep probing
      }
    }

    throw new Error(
      `Runtime-registered project watcher did not come live within ${timeoutMs}ms after ${attempt} probes`,
    );
  }

  test("existing SSE connection receives file-change for a project registered after connect", async ({ page, e2eContext }) => {
    // Anchor board first: the page's SSE capture connection opens NOW,
    // before the late project exists — the production reproduction.
    const anchor = await buildScenario(e2eContext.projectFactory, "simple");
    await page.goto(`/prj/${anchor.projectCode}`);
    await waitForBoardReady(page);

    // Open the observing SSE connection BEFORE the new project is registered
    await waitForSSEEvent(page, "connection");

    // Register a new project while the server runs and the client stays
    // connected. buildScenario's optional fileWatcher arg is deliberately
    // NOT passed — the lazy lifecycle must pick the project up on its own.
    const late = await buildScenario(e2eContext.projectFactory, "simple");

    // The pre-existing connection must receive the late project's events
    await probeUntilWatcherLive(page, late);

    // Steady-state assertion: one more write, event observed on the same connection
    const finalTitle = "Late Registration Update";
    await Promise.all([
      waitForSSEEvent(page, "file-change", {
        filename: `${late.crCodes[0]}.md`,
      }),
      modifyTicketFile(late.projectDir, late.crCodes[0], { title: finalTitle }),
    ]);
  });

  test("board of a runtime-created project updates via SSE without manual watcher init", async ({ page, e2eContext }) => {
    const late = await buildScenario(e2eContext.projectFactory, "simple");

    // Navigate AFTER registration — provisioning must come from the lazy
    // lifecycle registry, not from any test-injected watcher
    await page.goto(`/prj/${late.projectCode}`);
    await waitForBoardReady(page);

    await probeUntilWatcherLive(page, late);

    const ticketCode = late.crCodes[1]; // 'In Progress' initially
    const newStatus = "Implemented";
    const implementedColumn = page.locator(boardSelectors.columnByStatus(newStatus));
    const initialCount = await implementedColumn
      .locator(boardSelectors.ticketCard)
      .count();

    await Promise.all([
      waitForSSEEvent(page, "file-change", {
        filename: `${ticketCode}.md`,
      }),
      modifyTicketFile(late.projectDir, ticketCode, { status: newStatus }),
    ]);

    await page.waitForTimeout(500);

    const finalCount = await implementedColumn
      .locator(boardSelectors.ticketCard)
      .count();
    expect(finalCount).toBe(initialCount + 1);
    await expect(
      implementedColumn.locator(boardSelectors.ticketByCode(ticketCode)),
    ).toBeVisible();
  });
});
