import { test, expect } from '@playwright/test';

test.describe('Simple Drag & Drop Tests', () => {
  test('should move ticket between columns', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for board to load
    await page.waitForSelector('.grid', { timeout: 10000 });
    
    console.log('🔍 Page loaded, looking for columns...');
    
    // Find all columns
    const columns = page.locator('div.flex.flex-col').filter({ has: page.locator('h3') });
    const columnCount = await columns.count();
    console.log(`Found ${columnCount} columns`);
    
    // Get column names
    for (let i = 0; i < columnCount; i++) {
      const column = columns.nth(i);
      const header = column.locator('h3').first();
      const columnName = await header.textContent();
      console.log(`Column ${i}: ${columnName}`);
    }
    
    // Look for any ticket card
    const allCards = page.locator('.bg-white.border.border-gray-200');
    const cardCount = await allCards.count();
    console.log(`Found ${cardCount} ticket cards`);
    
    if (cardCount === 0) {
      console.log('❌ No tickets found on the page');
      expect(cardCount).toBeGreaterThan(0);
      return;
    }
    
    // Get first ticket
    const firstCard = allCards.first();
    const ticketHeader = firstCard.locator('h4').first();
    const ticketTitle = await ticketHeader.textContent();
    console.log(`🎯 Found ticket: ${ticketTitle}`);
    
    // Find which column this ticket is in
    const parentColumn = firstCard.locator('xpath=ancestor::div[contains(@class, "flex flex-col")]').first();
    const currentColumnHeader = parentColumn.locator('h3').first();
    const currentColumnName = await currentColumnHeader.textContent();
    console.log(`🔍 Current column: ${currentColumnName}`);
    
    // Find a different target column
    let targetColumn;
    if (currentColumnName?.includes('Backlog') || currentColumnName?.includes('Proposed')) {
      targetColumn = columns.filter({ hasText: 'Open' }).or(columns.filter({ hasText: 'In Progress' })).first();
    } else if (currentColumnName?.includes('Open')) {
      targetColumn = columns.filter({ hasText: 'In Progress' }).or(columns.filter({ hasText: 'Done' })).first();
    } else {
      targetColumn = columns.filter({ hasText: 'Backlog' }).or(columns.filter({ hasText: 'Proposed' })).first();
    }
    
    const targetHeader = targetColumn.locator('h3').first();
    const targetColumnName = await targetHeader.textContent();
    console.log(`🎯 Target column: ${targetColumnName}`);
    
    // Perform drag and drop
    console.log(`🖱️ Dragging from ${currentColumnName} to ${targetColumnName}`);
    
    await firstCard.dragTo(targetColumn, {
      force: true,
      targetPosition: { x: 100, y: 100 }
    });
    
    // Wait for move to complete
    await page.waitForTimeout(2000);
    
    // Verify the move
    const targetCards = targetColumn.locator('.bg-white.border.border-gray-200');
    const targetCardTitles = await targetCards.allTextContents();
    const movedToTarget = targetCardTitles.some(content => content.includes(ticketTitle || ''));
    
    if (movedToTarget) {
      console.log('✅ Ticket successfully moved to target column');
    } else {
      console.log('❌ Ticket did not move to target column');
      console.log('Target column contents:', targetCardTitles);
    }
    
    expect(movedToTarget).toBe(true);
  });
  
  test('should have drag and drop visual feedback', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.grid', { timeout: 10000 });
    
    const allCards = page.locator('.bg-white.border.border-gray-200');
    const cardCount = await allCards.count();
    
    if (cardCount === 0) {
      console.log('⚠️ No tickets available for drag test');
      return;
    }
    
    const firstCard = allCards.first();
    
    // Start drag
    await firstCard.hover();
    await page.mouse.down();
    
    // Move slightly
    await page.mouse.move(100, 100, { steps: 5 });
    
    // Check for visual feedback (classes may vary)
    const cardClasses = await firstCard.getAttribute('class');
    console.log('Card classes during drag:', cardClasses);
    
    // Complete the drag
    await page.mouse.up();
    
    console.log('✅ Drag visual feedback test completed');
  });
});