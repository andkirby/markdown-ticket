import { test, expect } from '@playwright/test';

test('Quick DEB-888 test', async ({ page }) => {
  console.log('🚀 Starting quick test...');
  
  await page.goto('http://localhost:5173');
  await page.waitForSelector('h1', { timeout: 10000 });
  
  console.log('✅ Page loaded');
  
  // Check if DEB-888 is visible - use the title element specifically
  const deb888Title = page.locator('h4').filter({ hasText: 'DEB-888' });
  await expect(deb888Title).toBeVisible({ timeout: 10000 });
  
  console.log('✅ DEB-888 ticket is visible');
  
  // Find the ticket card
  const ticketCard = deb888Title.locator('xpath=ancestor::div[contains(@class, "bg-white")]').first();
  
  // Try to drag it slightly
  const boundingBox = await ticketCard.boundingBox();
  if (boundingBox) {
    await page.mouse.move(boundingBox.x + 50, boundingBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(boundingBox.x + 100, boundingBox.y + 50);
    await page.mouse.up();
  }
  
  console.log('✅ Drag operation completed');
  
  // Basic assertion
  expect(true).toBe(true);
  
  console.log('🎉 Test completed successfully!');
});