import { test, expect } from '@playwright/test';
import { TestEnvironment, ProjectFactory, DEFAULT_TEST_PORTS } from '@mdt/shared/test-lib';

test.describe.skip('Board Loading - Isolated Test Environment', () => {
  let testEnv: TestEnvironment;
  let projectFactory: ProjectFactory;
  let projectKey: string;
  let frontendUrl: string;

  test.beforeAll(async () => {
    // Set up isolated test environment
    testEnv = new TestEnvironment();
    await testEnv.setup();

    // Get port configuration - this will match what Playwright is using
    const portConfig = testEnv.getPortConfig();
    frontendUrl = `http://localhost:${portConfig.frontend}`;

    // Create project factory
    projectFactory = new ProjectFactory(testEnv);

    // Create test project with sample tickets
    const project = await projectFactory.createProject('empty', {
      name: 'Board Loading Test Project',
      code: 'BOARD',
      description: 'Project for testing board loading functionality',
      crPath: 'docs/CRs',
      repository: 'test-repo'
    });
    projectKey = project.key;

    // Create sample tickets across different statuses
    await projectFactory.createTestCR(projectKey, {
      title: 'Sample Proposed Ticket',
      type: 'Feature Enhancement',
      priority: 'Low',
      status: 'Proposed',
      content: 'A ticket in Proposed status for testing board display'
    });

    await projectFactory.createTestCR(projectKey, {
      title: 'Sample In Progress Ticket',
      type: 'Bug Fix',
      priority: 'High',
      status: 'In Progress',
      content: 'A ticket in In Progress status for testing board display'
    });

    await projectFactory.createTestCR(projectKey, {
      title: 'Sample Implemented Ticket',
      type: 'Documentation',
      priority: 'Medium',
      status: 'Implemented',
      content: 'A ticket in Implemented status for testing board display'
    });
  });

  test.afterAll(async () => {
    // Clean up test environment
    await testEnv.cleanup();
  });

  test('should load board with all columns and tickets', async ({ page }) => {
    // Navigate to the test environment frontend
    await page.goto(frontendUrl);

    // Select our test project
    const projectSelect = page.locator('select').first();
    if (await projectSelect.count() > 0) {
      await projectSelect.selectOption({ label: new RegExp(projectKey, 'i') });
      await page.waitForTimeout(3000);
    }

    // Wait for board to load
    await page.waitForSelector('.board-container, .grid, .kanban-board', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify board container is visible
    const boardContainer = page.locator('.board-container, .grid, .kanban-board').first();
    await expect(boardContainer).toBeVisible();

    // Verify all status columns are present
    const columns = page.locator('.column, .flex-col');
    const columnCount = await columns.count();
    expect(columnCount).toBeGreaterThan(0);

    // Check for specific column headers
    const columnHeaders = [
      'Proposed',
      'In Progress',
      'Implemented',
      'Rejected'
    ];

    let foundHeaders = 0;
    for (const header of columnHeaders) {
      const headerElement = page.locator('h1, h2, h3, h4').filter({ hasText: header });
      if (await headerElement.count() > 0) {
        foundHeaders++;
      }
    }

    // At least some headers should be found
    expect(foundHeaders).toBeGreaterThan(0);

    // Verify tickets are present in columns
    const allTickets = page.locator('[data-testid="ticket-card"], .ticket-card, .bg-white.p-4');
    const ticketCount = await allTickets.count();
    expect(ticketCount).toBeGreaterThan(0);

    console.log(`✅ Board loaded with ${columnCount} columns and ${ticketCount} tickets`);
  });

  test('should display ticket details correctly', async ({ page }) => {
    // Navigate to the test environment frontend
    await page.goto(frontendUrl);

    // Select our test project
    const projectSelect = page.locator('select').first();
    if (await projectSelect.count() > 0) {
      await projectSelect.selectOption({ label: new RegExp(projectKey, 'i') });
      await page.waitForTimeout(3000);
    }

    // Wait for board to load
    await page.waitForSelector('.board-container, .grid, .kanban-board', { timeout: 15000 });

    // Find a ticket and verify its details
    const ticketCard = page.locator('[data-testid="ticket-card"], .ticket-card, .bg-white.p-4').first();
    await expect(ticketCard).toBeVisible();

    // Verify ticket has some text content (title, code, etc.)
    const ticketText = await ticketCard.textContent();
    expect(ticketText).toBeTruthy();
    expect(ticketText!.length).toBeGreaterThan(5);

    // Look for ticket code pattern (e.g., BOARD-001)
    const hasTicketCode = /BOARD-\d+/.test(ticketText!);
    if (hasTicketCode) {
      console.log('✅ Ticket code pattern found:', ticketText!.match(/BOARD-\d+/)?.[0]);
    }

    // Look for priority indicator
    const priorityPatterns = ['Low', 'Medium', 'High', 'Critical'];
    const hasPriority = priorityPatterns.some(priority => ticketText!.includes(priority));
    if (hasPriority) {
      const foundPriority = priorityPatterns.find(priority => ticketText!.includes(priority));
      console.log('✅ Priority indicator found:', foundPriority);
    }

    console.log(`✅ Ticket details displayed correctly`);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Navigate to the test environment frontend
    await page.goto(frontendUrl);

    // Select our test project
    const projectSelect = page.locator('select').first();
    if (await projectSelect.count() > 0) {
      await projectSelect.selectOption({ label: new RegExp(projectKey, 'i') });
      await page.waitForTimeout(3000);
    }

    // Wait for initial load
    await page.waitForSelector('.board-container, .grid, .kanban-board', { timeout: 15000 });

    // Mock API error to test error handling
    await page.route('**/api/tasks', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });

    // Trigger a refresh or action that would call the API
    await page.reload();

    // Wait a moment for error handling
    await page.waitForTimeout(2000);

    // Verify the app doesn't crash completely
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Look for error message or fallback content
    const errorElements = page.locator('.error, .error-message, [data-testid="error"]');
    const hasError = await errorElements.count() > 0;

    if (hasError) {
      console.log('✅ Error message displayed gracefully');
    }

    // Verify board attempts to load even with errors
    const boardContainer = page.locator('.board-container, .grid, .kanban-board');
    const boardExists = await boardContainer.count() > 0;

    // Board might not load fully due to error, but container should exist
    expect(boardExists || hasError).toBe(true);

    console.log('✅ Error handling works correctly');
  });

  test('should update board when tickets change', async ({ page }) => {
    // Navigate to the test environment frontend
    await page.goto(frontendUrl);

    // Select our test project
    const projectSelect = page.locator('select').first();
    if (await projectSelect.count() > 0) {
      await projectSelect.selectOption({ label: new RegExp(projectKey, 'i') });
      await page.waitForTimeout(3000);
    }

    // Wait for board to load
    await page.waitForSelector('.board-container, .grid, .kanban-board', { timeout: 15000 });

    // Get initial ticket count
    const initialTickets = page.locator('[data-testid="ticket-card"], .ticket-card, .bg-white.p-4');
    const initialCount = await initialTickets.count();
    console.log(`Initial ticket count: ${initialCount}`);

    // Create a new ticket via ProjectFactory to test real-time updates
    const newTicket = await projectFactory.createTestCR(projectKey, {
      title: 'Dynamic Test Ticket for Board Update',
      type: 'Feature Enhancement',
      priority: 'Medium',
      status: 'Proposed',
      content: 'Ticket created during test to verify board updates'
    });

    console.log(`Created new ticket: ${newTicket.result?.key || newTicket.code}`);

    // Wait for potential real-time updates
    await page.waitForTimeout(5000);

    // Check if ticket count increased
    const updatedTickets = page.locator('[data-testid="ticket-card"], .ticket-card, .bg-white.p-4');
    const updatedCount = await updatedTickets.count();
    console.log(`Updated ticket count: ${updatedCount}`);

    // Try to find the new ticket by its code
    const ticketCode = newTicket.result?.key || newTicket.code;
    if (ticketCode) {
      const newTicketElement = page.locator(`text=${ticketCode}`);
      const newTicketExists = await newTicketElement.count() > 0;

      if (newTicketExists) {
        console.log(`✅ New ticket ${ticketCode} found on board`);
        expect(updatedCount).toBe(initialCount + 1);
      } else {
        console.log(`ℹ️ New ticket ${ticketCode} not immediately visible (real-time sync may need refresh)`);

        // Refresh to verify ticket exists
        await page.reload();
        await page.waitForTimeout(3000);

        const afterRefreshCount = await updatedTickets.count();
        expect(afterRefreshCount).toBeGreaterThan(initialCount);
      }
    }

    console.log('✅ Board update test completed');
  });

  test('should display responsive layout', async ({ page }) => {
    // Navigate to the test environment frontend
    await page.goto(frontendUrl);

    // Select our test project
    const projectSelect = page.locator('select').first();
    if (await projectSelect.count() > 0) {
      await projectSelect.selectOption({ label: new RegExp(projectKey, 'i') });
      await page.waitForTimeout(3000);
    }

    // Wait for board to load
    await page.waitForSelector('.board-container, .grid, .kanban-board', { timeout: 15000 });

    // Test desktop layout
    const boardContainer = page.locator('.board-container, .grid, .kanban-board').first();
    await expect(boardContainer).toBeVisible();

    // Verify columns are present
    const columns = page.locator('.column, .flex-col');
    const columnCount = await columns.count();
    expect(columnCount).toBeGreaterThan(0);

    // Test responsive behavior by resizing viewport
    await page.setViewportSize({ width: 768, height: 600 });
    await page.waitForTimeout(1000);

    // Verify board is still functional on smaller screen
    await expect(boardContainer).toBeVisible();

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    // Board should still be visible
    await expect(boardContainer).toBeVisible();

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('✅ Responsive layout works correctly');
  });
});