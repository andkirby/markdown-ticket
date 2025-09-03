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

test.describe('Ticket Move E2E Tests', () => {
  test('should move a ticket from Proposed to In Progress column', async () => {
    const page = await setup.getPage();
    
    // Wait for board to load
    await page.waitForSelector('.board-container');
    await page.waitForSelector('.column');
    
    // Verify initial state - ticket should be in Proposed column
    const proposedColumn = page.locator('.column').filter({ hasText: 'Proposed' });
    const inProgressColumn = page.locator('.column').filter({ hasText: 'In Progress' });
    
    // Check that there's at least one ticket in Proposed column
    const proposedTickets = proposedColumn.locator('.ticket-card');
    await expect(proposedTickets.first()).toBeVisible();
    
    // Get the first ticket's code
    const firstTicket = proposedTickets.first();
    const ticketTitle = await firstTicket.locator('.ticket-title').textContent();
    const ticketCode = ticketTitle?.split(':')[0].trim();
    
    console.log(`🎯 Moving ticket: ${ticketCode}`);
    
    // Perform drag and drop
    const ticketElement = firstTicket.locator('.draggable-ticket');
    const targetColumn = inProgressColumn.locator('.column-drop-zone');
    
    // Drag the ticket to In Progress column
    await ticketElement.dragTo(targetColumn, {
      force: true,
      targetPosition: { x: 50, y: 50 }
    });
    
    // Wait for the move to complete
    await page.waitForTimeout(2000);
    
    // Verify ticket moved to In Progress column
    const inProgressTickets = inProgressColumn.locator('.ticket-card');
    await expect(inProgressTickets.first()).toBeVisible();
    
    // Verify ticket is no longer in Proposed column
    const proposedTicketsAfter = proposedColumn.locator('.ticket-card');
    const proposedCount = await proposedTicketsAfter.count();
    if (proposedCount > 0) {
      const movedTicketStillInProposed = proposedTicketsAfter.first();
      const movedTicketTitle = await movedTicketStillInProposed.locator('.ticket-title').textContent();
      expect(movedTicketTitle).not.toContain(ticketCode);
    }
    
    // Verify the moved ticket has correct status
    const movedTicket = inProgressTickets.first();
    const movedTicketTitle = await movedTicket.locator('.ticket-title').textContent();
    expect(movedTicketTitle).toContain(ticketCode);
    
    console.log(`✅ Ticket ${ticketCode} successfully moved to In Progress`);
  });

  test('should move a ticket from In Progress to Implemented column', async () => {
    const page = await setup.getPage();
    
    // Wait for board to load
    await page.waitForSelector('.board-container');
    await page.waitForSelector('.column');
    
    // Find In Progress column
    const inProgressColumn = page.locator('.column').filter({ hasText: 'In Progress' });
    const implementedColumn = page.locator('.column').filter({ hasText: 'Implemented' });
    
    // Get a ticket from In Progress column
    const inProgressTickets = inProgressColumn.locator('.ticket-card');
    const ticketCount = await inProgressTickets.count();
    
    if (ticketCount === 0) {
      console.log('Skipping test: No tickets in In Progress column');
      return;
    }
    
    const firstTicket = inProgressTickets.first();
    const ticketTitle = await firstTicket.locator('.ticket-title').textContent();
    const ticketCode = ticketTitle?.split(':')[0].trim();
    
    console.log(`🎯 Moving ticket: ${ticketCode} from In Progress to Implemented`);
    
    // Perform drag and drop
    const ticketElement = firstTicket.locator('.draggable-ticket');
    const targetColumn = implementedColumn.locator('.column-drop-zone');
    
    // Drag the ticket to Implemented column
    await ticketElement.dragTo(targetColumn, {
      force: true,
      targetPosition: { x: 50, y: 50 }
    });
    
    // Wait for the move to complete
    await page.waitForTimeout(2000);
    
    // Verify ticket moved to Implemented column
    const implementedTickets = implementedColumn.locator('.ticket-card');
    await expect(implementedTickets.first()).toBeVisible();
    
    // Verify implementation date was set
    const movedTicket = implementedTickets.first();
    const ticketContent = await movedTicket.locator('.ticket-content').textContent();
    expect(ticketContent).toContain('implementationDate:');
    
    console.log(`✅ Ticket ${ticketCode} successfully moved to Implemented with implementation date`);
  });

  test('should display visual feedback during drag and drop', async () => {
    const page = await setup.getPage();
    
    // Wait for board to load
    await page.waitForSelector('.board-container');
    await page.waitForSelector('.column');
    
    // Find Proposed column
    const proposedColumn = page.locator('.column').filter({ hasText: 'Proposed' });
    const inProgressColumn = page.locator('.column').filter({ hasText: 'In Progress' });
    
    // Get a ticket from Proposed column
    const proposedTickets = proposedColumn.locator('.ticket-card');
    const ticketCount = await proposedTickets.count();
    
    if (ticketCount === 0) {
      console.log('Skipping test: No tickets in Proposed column');
      return;
    }
    
    const firstTicket = proposedTickets.first();
    const ticketElement = firstTicket.locator('.draggable-ticket');
    
    // Start dragging
    await ticketElement.hover();
    await page.mouse.down();
    
    // Verify ticket has dragging class
    await expect(ticketElement).toHaveClass(/dragging/);
    
    // Move over to In Progress column
    const targetColumn = inProgressColumn.locator('.column-drop-zone');
    const targetBox = await targetColumn.boundingBox();
    if (targetBox) {
      await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
    }
    
    // Verify target column has drag-over class
    await expect(targetColumn).toHaveClass(/drag-over/);
    
    // Complete the drop
    await page.mouse.up();
    
    // Wait for animation to complete
    await page.waitForTimeout(1000);
    
    // Verify classes are removed
    await expect(ticketElement).not.toHaveClass(/dragging/);
    await expect(targetColumn).not.toHaveClass(/drag-over/);
    
    console.log('✅ Visual feedback during drag and drop works correctly');
  });
});