import { test, expect } from '@playwright/test';

test('DEB-888 drag and drop smoke test', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:5173');
  
  console.log('🔍 Page loaded, waiting for content...');
  
  // Wait for the page to load completely
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for main content
  await page.waitForSelector('h1', { timeout: 15000 });
  
  console.log('✅ Main content loaded');
  
  // Try to select DEBUG project
  try {
    const projectSelector = page.locator('select').first();
    if (await projectSelector.count() > 0) {
      await projectSelector.selectOption({ label: 'DEBUG for markdown project' });
      await page.waitForTimeout(3000);
      console.log('✅ DEBUG project selected');
    }
  } catch (error) {
    console.log('⚠️ Could not select DEBUG project, using current project');
  }
  
  // Wait for board grid
  await page.waitForSelector('.grid', { timeout: 15000 });
  console.log('✅ Board grid loaded');
  
  // Look for DEB-888 ticket
  const deb888Ticket = page.locator('text=DEB-888').first();
  
  if (await deb888Ticket.count() === 0) {
    console.log('❌ DEB-888 ticket not found on page');
    
    // Debug: List all visible text
    const allText = await page.textContent('body');
    console.log('Page content preview:', allText?.substring(0, 500));
    
    expect(await deb888Ticket.count()).toBeGreaterThan(0);
    return;
  }
  
  console.log('✅ Found DEB-888 ticket');
  
  // Find the ticket card
  const ticketCard = deb888Ticket.locator('xpath=ancestor::div[contains(@class, "bg-white")]').first();
  await expect(ticketCard).toBeVisible();
  
  // Find current column
  const currentColumn = ticketCard.locator('xpath=ancestor::div[contains(@class, "flex flex-col")]').first();
  const currentColumnHeader = currentColumn.locator('h3').first();
  const currentColumnName = await currentColumnHeader.textContent();
  console.log(`🔍 DEB-888 is currently in: ${currentColumnName}`);
  
  // Find In Progress column
  const inProgressColumn = page.locator('div.flex.flex-col').filter({ hasText: 'In Progress' }).first();
  const targetHeader = await inProgressColumn.locator('h3').textContent();
  console.log(`🎯 Target column: ${targetHeader}`);
  
  // Drag to In Progress
  console.log('🖱️ Dragging DEB-888 to In Progress...');
  await ticketCard.dragTo(inProgressColumn, {
    force: true,
    targetPosition: { x: 100, y: 100 }
  });
  
  await page.waitForTimeout(2000);
  
  // Verify it moved
  const inProgressTickets = inProgressColumn.locator('div').filter({ hasText: 'DEB-888' });
  const movedToInProgress = await inProgressTickets.count() > 0;
  
  if (movedToInProgress) {
    console.log('✅ DEB-888 successfully moved to In Progress');
  } else {
    console.log('❌ DEB-888 did not move to In Progress');
  }
  
  expect(movedToInProgress).toBe(true);
  
  console.log('🎉 Basic drag and drop test completed!');
});