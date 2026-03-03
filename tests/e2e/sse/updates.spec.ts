/**
 * SSE Real-time Updates E2E Tests - MDT-128 Task 9
 *
 * Tests Server-Sent Events (SSE) real-time updates when ticket files
 * are modified on disk via file system operations (not API calls).
 *
 * This is the RED phase - tests will fail until:
 * 1. SSE helper utilities are implemented (Task #11)
 * 2. File watching works correctly
 * 3. Frontend properly handles SSE events
 *
 * @see tests/e2e/AGENTS.md for test patterns
 * @see docs/CRs/MDT-106*.md for SSE architecture
 */

import { expect, test } from "../fixtures/test-fixtures.js";
import { buildScenario, type ScenarioResult } from "../setup/index.js";
import { boardSelectors, ticketSelectors } from "../utils/selectors.js";
import { waitForBoardReady } from "../utils/helpers.js";
import { modifyTicketFile, waitForSSEEvent } from "../utils/sse-helpers.js";
import { promises as fs } from "fs";
import { join as pathJoin } from "path";

/**
 * Test suite for SSE real-time updates via file system modifications
 */
test.describe("SSE Real-time Updates - File System Modifications", () => {
  let scenario: ScenarioResult;

  async function readTicketFile(
    projectDir: string,
    ticketCode: string,
  ): Promise<string> {
    const crsDir = pathJoin(projectDir, "docs", "CRs");
    const files = await fs.readdir(crsDir);
    const targetFile = files.find(
      (f) => f.startsWith(`${ticketCode}-`) || f === `${ticketCode}.md`,
    );

    if (!targetFile) {
      throw new Error(
        `Ticket file not found for code ${ticketCode} in ${crsDir}`,
      );
    }

    return fs.readFile(pathJoin(crsDir, targetFile), "utf-8");
  }

  /**
   * Setup: Create test scenario once for all tests in this suite
   */
  test.beforeAll(async ({ e2eContext }) => {
    scenario = await buildScenario(e2eContext.projectFactory, "simple");

    // Initialize file watcher for the test project
    const projectPath = `${scenario.projectDir}/docs/CRs/*.md`;
    e2eContext.fileWatcher.initMultiProjectWatcher([
      {
        id: scenario.projectCode,
        path: projectPath,
      },
    ]);
  });

  /**
   * Scenario 1: File content update reflects immediately
   *
   * Modify ticket title on disk, verify board updates via SSE
   */
  test("file content update reflects immediately", async ({ page }) => {
    const { projectCode, crCodes, projectDir } = scenario;
    const ticketCode = crCodes[0];
    const newTitle = "Updated Title via File System";

    // Navigate to project
    await page.goto(`/prj/${projectCode}`);
    await waitForBoardReady(page);

    // Get initial ticket element
    const ticketSelector = boardSelectors.ticketByCode(ticketCode);
    const initialTicket = page.locator(ticketSelector);

    // Verify initial state
    await expect(initialTicket).toBeVisible();

    // Modify ticket file on disk and wait for SSE event
    await Promise.all([
      waitForSSEEvent(page, "file-change", { "ticketData.code": ticketCode }),
      modifyTicketFile(projectDir, ticketCode, { title: newTitle }),
    ]);

    // Verify title updated on board
    await expect(initialTicket).toContainText(newTitle, { timeout: 3000 });
  });

  /**
   * Scenario 2: Status change moves ticket via SSE
   *
   * Modify status in frontmatter on disk, verify ticket moves to correct column
   */
  test("status change moves ticket via SSE", async ({ page }) => {
    const { projectCode, crCodes, projectDir } = scenario;
    const ticketCode = crCodes[1];
    const newStatus = "Implemented";

    // Navigate to project
    await page.goto(`/prj/${projectCode}`);
    await waitForBoardReady(page);

    // Get ticket element
    const ticketSelector = boardSelectors.ticketByCode(ticketCode);
    const ticket = page.locator(ticketSelector);

    // Verify initial position (should NOT be in Implemented column)
    const implementedColumn = page.locator(
      boardSelectors.columnByStatus(newStatus),
    );
    const initialCount = await implementedColumn
      .locator(boardSelectors.ticketCard)
      .count();

    // Modify status in ticket file on disk and wait for SSE event
    await Promise.all([
      waitForSSEEvent(page, "file-change", { "ticketData.code": ticketCode }),
      modifyTicketFile(projectDir, ticketCode, { status: newStatus }),
    ]);

    // Wait for UI to update
    await page.waitForTimeout(500);

    // Verify ticket moved to Implemented column
    const finalCount = await implementedColumn
      .locator(boardSelectors.ticketCard)
      .count();
    expect(finalCount).toBe(initialCount + 1);

    // Verify ticket is now in the correct column by checking it's inside the Implemented column
    await expect(ticket).toBeVisible();
    await expect(
      implementedColumn.locator(boardSelectors.ticketByCode(ticketCode)),
    ).toBeVisible();
  });

  /**
   * Scenario 3: Bulk updates appear synchronously
   *
   * Modify 3 files on disk in quick succession, verify all updates appear
   */
  test("bulk updates appear synchronously", async ({ page, context }) => {
    const { projectCode, crCodes, projectDir } = scenario;

    // Create second browser context to observe updates
    const secondContext = await context.browser()?.newContext();
    const secondPage = await secondContext?.newPage();
    if (!secondPage) {
      throw new Error("Failed to create second page");
    }

    try {
      // Both pages navigate to the same project
      await page.goto(`/prj/${projectCode}`);
      await secondPage.goto(`/prj/${projectCode}`);
      await waitForBoardReady(page);
      await waitForBoardReady(secondPage);

      // Get initial ticket count on first page
      const initialTickets = page.locator(boardSelectors.ticketCard);
      const initialCount = await initialTickets.count();

      // Prepare updates for 3 tickets
      const updates = [
        { code: crCodes[0], title: "Bulk Update 1" },
        { code: crCodes[1], title: "Bulk Update 2" },
        { code: crCodes[2], title: "Bulk Update 3" },
      ];

      // Wait for all SSE events and modify all files
      const waitForBulkUpdates = Promise.all(
        updates.map((u) =>
          waitForSSEEvent(page, "file-change", { "ticketData.code": u.code }),
        ),
      );

      await Promise.all([
        waitForBulkUpdates,
        Promise.all(
          updates.map((update) =>
            modifyTicketFile(projectDir, update.code, { title: update.title }),
          ),
        ),
      ]);

      // Wait for UI to update on both pages
      await page.waitForTimeout(500);
      await secondPage.waitForTimeout(500);

      // Verify all updates reflected on first page
      for (const update of updates) {
        const ticketSelector = boardSelectors.ticketByCode(update.code);
        await expect(page.locator(ticketSelector)).toContainText(update.title);
      }

      // Verify second page also received all updates (multi-tab SSE)
      for (const update of updates) {
        const ticketSelector = boardSelectors.ticketByCode(update.code);
        await expect(secondPage.locator(ticketSelector)).toContainText(
          update.title,
        );
      }

      // Ticket count should remain the same
      const finalCount = await initialTickets.count();
      expect(finalCount).toBe(initialCount);
    } finally {
      await secondContext?.close();
    }
  });

  /**
   * Scenario 4: Modal stays usable during external file change
   *
   * With the modal open, modify the ticket file on disk and verify the app
   * remains stable. The board should reflect the SSE update immediately and
   * reopening the modal should show the updated title and content from disk.
   */
  test("modal updates during external file change", async ({ page }) => {
    const { projectCode, crCodes, projectDir } = scenario;
    const ticketCode = crCodes[0];
    const newTitle = "Updated While Modal Open";
    const newContent = `# ${newTitle}\n\nThis content was modified externally via file system.\n\n## Details\n\n- Item 1\n- Item 2\n- Item 3`;

    // Navigate to project
    await page.goto(`/prj/${projectCode}`);
    await waitForBoardReady(page);

    // Click on ticket to open modal
    const ticketSelector = boardSelectors.ticketByCode(ticketCode);
    await page.click(ticketSelector);

    // Wait for modal to open
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible();

    // Get initial title in modal
    const titleElement = page.locator(ticketSelectors.title);

    // Trigger the external file change - update both YAML title and markdown content
    await modifyTicketFile(projectDir, ticketCode, {
      title: newTitle,
      content: newContent,
    });

    // Prove the underlying markdown ticket changed on disk before asserting UI.
    await expect
      .poll(
        async () => {
          const fileContent = await readTicketFile(projectDir, ticketCode);
          return (
            fileContent.includes(`title: "${newTitle}"`) &&
            fileContent.includes("This content was modified externally")
          );
        },
        { timeout: 5000 },
      )
      .toBe(true);

    // The board should reflect the external update while the modal remains open.
    await expect(page.locator(ticketSelector)).toContainText(newTitle, {
      timeout: 10000,
    });
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible();
    await expect(titleElement).toContainText(ticketCode);

    // Close modal
    await page.click(ticketSelectors.closeDetail);
    await expect(page.locator(ticketSelectors.detailPanel)).toBeHidden();

    // Re-open the ticket and verify the modal reflects the updated file content.
    await page.click(ticketSelector);
    await expect(page.locator(ticketSelectors.detailPanel)).toBeVisible();

    // Verify updated title (from YAML frontmatter)
    await expect(page.locator(ticketSelectors.title)).toContainText(newTitle, {
      timeout: 10000,
    });

    // Verify updated content appears in the modal
    const contentElement = page.locator(ticketSelectors.content);
    await expect(contentElement).toBeVisible();
    await expect(contentElement).toContainText("This content was modified externally", {
      timeout: 10000,
    });
    await expect(contentElement).toContainText("Item 1");
    await expect(contentElement).toContainText("Item 2");
    await expect(contentElement).toContainText("Item 3");
  });
});
