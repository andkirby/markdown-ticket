/**
 * MDT-131: Mobile Responsive UI E2E Tests
 *
 * Tests mobile-specific UI changes including header layout, logo, theme toggle placement,
 * and list view card layout.
 */

import { test, expect } from '@playwright/test'

test.describe('MDT-131: Mobile Responsive UI', () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test.describe('Mobile Header', () => {
    test('should not display project title in navigation header on mobile', async ({ page }) => {
      await page.goto('/')

      const projectTitle = page.locator('[data-testid="project-title"]')
      await expect(projectTitle).not.toBeVisible()
    })

    test('should use mobile logo on mobile viewport', async ({ page }) => {
      await page.goto('/')

      const logo = page.locator('[data-testid="app-logo"]')
      await expect(logo).toHaveAttribute('src', /logo-mdt-m-dark_64x64\.png/)
    })

    test('should move theme toggle button into hamburger menu on mobile', async ({ page }) => {
      await page.goto('/')

      // Theme toggle should not be in main nav
      const themeToggle = page.locator('[data-testid="theme-toggle"]')
      await expect(themeToggle).not.toBeVisible()

      // Open hamburger menu
      await page.click('[data-testid="hamburger-menu"]')

      // Theme toggle should be visible in menu
      const menuThemeToggle = page.locator('[data-testid="theme-toggle-menu"]')
      await expect(menuThemeToggle).toBeVisible()
    })
  })

  test.describe('Mobile List View Cards', () => {
    test('should render ticket cards with 2-line layout on mobile', async ({ page }) => {
      await page.goto('/list')

      const ticketCard = page.locator('[data-testid^="ticket-card-"]').first()
      await expect(ticketCard).toBeVisible()

      // Verify structure with line 1 (CR-key + badges) and line 2 (title)
      const line1 = ticketCard.locator('[data-testid="ticket-card-line-1"]')
      const line2 = ticketCard.locator('[data-testid="ticket-card-line-2"]')

      await expect(line1).toBeVisible()
      await expect(line2).toBeVisible()

      // Verify title takes 100% width
      const titleWidth = await line2.locator('[data-testid="ticket-title"]').evaluate((el) => {
        return window.getComputedStyle(el).width
      })
      expect(titleWidth).toBe('100%')
    })
  })
})
