import { test, expect } from '@playwright/test';

test.describe('Simple Tests', () => {
  test('should pass basic test', async ({ page }) => {
    // Navigate to a simple page
    await page.goto('data:text/html,<html><body><h1>Test Page</h1></body></html>');
    
    // Check that the page loaded
    await expect(page.locator('h1')).toHaveText('Test Page');
  });
});
