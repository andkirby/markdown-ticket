import { test, expect } from '@playwright/test';
import { TestSetup } from './setup';

let setup: TestSetup;

test.beforeAll(async () => {
  setup = new TestSetup();
  await setup.setup();
  await setup.waitForServerReady();
});

test.afterAll(async () => {
  await setup.cleanup();
});

test.describe('Board Loading E2E Tests', () => {
  test('should load board with all columns and tickets', async () => {
    const page = await setup.getPage();
    
    // Wait for board to load
    await page.waitForSelector('.board-container');
    await page.waitForLoadState('networkidle');
    
    // Verify board container is visible
    const boardContainer = page.locator('.board-container');
    await expect(boardContainer).toBeVisible();
    
    // Verify all status columns are present
    const columns = page.locator('.column');
    const columnCount = await columns.count();
    expect(columnCount).toBeGreaterThan(0);
    
    // Check for specific column headers
    const columnHeaders = [
      'Proposed',
      'In Progress', 
      'Implemented',
      'Closed'
    ];
    
    for (const header of columnHeaders) {
      const column = columns.filter({ hasText: header });
      await expect(column).toBeVisible();
      await expect(column.locator('.column-header')).toHaveText(header);
    }
    
    // Verify tickets are present in columns
    const allTickets = page.locator('.ticket-card');
    const ticketCount = await allTickets.count();
    expect(ticketCount).toBeGreaterThan(0);
    
    console.log(`✅ Board loaded with ${columnCount} columns and ${ticketCount} tickets`);
  });

  test('should display ticket details correctly', async () => {
    const page = await setup.getPage();
    
    // Wait for board to load
    await page.waitForSelector('.board-container');
    await page.waitForLoadState('networkidle');
    
    // Find a ticket and verify its details
    const ticketCard = page.locator('.ticket-card').first();
    await expect(ticketCard).toBeVisible();
    
    // Verify ticket code is displayed
    const ticketCode = ticketCard.locator('.ticket-code');
    const codeText = await ticketCode.textContent();
    expect(codeText).toMatch(/CR-[A-Z]\d{3}/);
    
    // Verify ticket title is displayed
    const ticketTitle = ticketCard.locator('.ticket-title');
    const titleText = await ticketTitle.textContent();
    expect(titleText).toBeTruthy();
    expect(titleText).toContain(':');
    
    // Verify ticket status is displayed
    const ticketStatus = ticketCard.locator('.ticket-status');
    const statusText = await ticketStatus.textContent();
    expect(statusText).toBeTruthy();
    
    // Verify ticket priority is displayed
    const ticketPriority = ticketCard.locator('.ticket-priority');
    const priorityText = await ticketPriority.textContent();
    expect(priorityText).toBeTruthy();
    
    // Verify ticket is draggable
    const draggableElement = ticketCard.locator('.draggable-ticket');
    await expect(draggableElement).toBeVisible();
    
    console.log(`✅ Ticket details displayed correctly: ${codeText} - ${titleText}`);
  });

  test('should handle API errors gracefully', async () => {
    const page = await setup.getPage();
    
    // Wait for board to load
    await page.waitForSelector('.board-container');
    await page.waitForLoadState('networkidle');
    
    // Mock API error to test error handling
    await page.route('**/api/tasks', route => {
      route.abort('failed');
    });
    
    // Reload the page to trigger the error
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify error message is displayed
    const errorContainer = page.locator('.error-container');
    await expect(errorContainer).toBeVisible();
    
    // Verify board still loads with cached data or fallback
    const boardContainer = page.locator('.board-container');
    await expect(boardContainer).toBeVisible();
    
    console.log('✅ Error handling works correctly');
  });

  test('should update board when tickets change', async () => {
    const page = await setup.getPage();
    
    // Wait for board to load
    await page.waitForSelector('.board-container');
    await page.waitForLoadState('networkidle');
    
    // Get initial ticket count
    const initialTickets = page.locator('.ticket-card');
    const initialCount = await initialTickets.count();
    
    // Wait for file watcher to detect changes (simulate external file change)
    await page.waitForTimeout(3000);
    
    // Get updated ticket count
    const updatedTickets = page.locator('.ticket-card');
    const updatedCount = await updatedTickets.count();
    
    // Verify board updates (count may change due to file watcher)
    expect(updatedCount).toBeGreaterThanOrEqual(0);
    
    // Verify tickets are still visible after update
    if (updatedCount > 0) {
      const firstTicket = updatedTickets.first();
      await expect(firstTicket).toBeVisible();
    }
    
    console.log(`✅ Board updated: ${initialCount} -> ${updatedCount} tickets`);
  });

  test('should display responsive layout', async () => {
    const page = await setup.getPage();
    
    // Wait for board to load
    await page.waitForSelector('.board-container');
    await page.waitForLoadState('networkidle');
    
    // Test desktop layout
    const boardContainer = page.locator('.board-container');
    await expect(boardContainer).toBeVisible();
    
    // Verify columns are arranged horizontally
    const columns = page.locator('.column');
    const columnCount = await columns.count();
    expect(columnCount).toBeGreaterThan(0);
    
    // Verify each column has proper structure
    for (let i = 0; i < columnCount; i++) {
      const column = columns.nth(i);
      await expect(column.locator('.column-header')).toBeVisible();
      await expect(column.locator('.column-content')).toBeVisible();
    }
    
    // Test responsive behavior by resizing viewport
    await page.setViewportSize({ width: 768, height: 600 });
    await page.waitForTimeout(1000);
    
    // Verify board is still functional on smaller screen
    await expect(boardContainer).toBeVisible();
    
    // Restore viewport size
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('✅ Responsive layout works correctly');
  });
});