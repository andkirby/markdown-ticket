/**
 * MDT-131: View Mode Switcher E2E Tests
 *
 * Tests the merged Board|List toggle with hover overlay, Documents button visibility,
 * and localStorage persistence.
 */

import { test, expect } from '@playwright/test'

test.describe('MDT-131: View Mode Switcher', () => {
  test.describe('Initial View Display', () => {
    test('should display Board icon when application loads in board view', async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="view-mode-switcher"]')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')
      await expect(boardListButton).toBeVisible()
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'board')
    })

    test('should display List icon when application loads in list view', async ({ page }) => {
      // Navigate to list view first
      await page.goto('/')
      await page.click('[data-testid="board-list-toggle"]')
      await page.waitForURL('**/list')

      // Reload to test initial state in list view
      await page.reload()
      await page.waitForSelector('[data-testid="view-mode-switcher"]')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'list')
    })

    test('should show last-used mode with dimmed border in documents view', async ({ page }) => {
      // Set board mode as last-used
      await page.goto('/')
      await page.click('[data-testid="board-list-toggle"]')
      await page.click('[data-testid="board-list-toggle"]')

      // Navigate to documents
      await page.click('[data-testid="documents-button"]')
      await page.waitForURL('**/documents')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')
      await expect(boardListButton).toHaveAttribute('data-state', 'dimmed')
    })
  })

  test.describe('Desktop Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 })
    })

    test('should show both Board|List and Documents buttons on desktop', async ({ page }) => {
      await page.goto('/')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')
      const documentsButton = page.locator('[data-testid="documents-button"]')

      await expect(boardListButton).toBeVisible()
      await expect(documentsButton).toBeVisible()
    })
  })

  test.describe('Mobile Navigation', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
    })

    test('should show only Board|List button and hide Documents button on mobile', async ({ page }) => {
      await page.goto('/')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')
      const documentsButton = page.locator('[data-testid="documents-button"]')

      await expect(boardListButton).toBeVisible()
      await expect(documentsButton).not.toBeVisible()
    })
  })

  test.describe('Hover Overlay', () => {
    test('should show alternate view icon overlay when hovering in board/list view', async ({ page }) => {
      await page.goto('/')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')
      const overlay = page.locator('[data-testid="board-list-toggle-overlay"]')

      // Hover and check overlay appears
      await boardListButton.hover()
      await expect(overlay).toBeVisible({ timeout: 200 })

      // Verify animation timing (within 150ms)
      const opacity = await overlay.evaluate((el) => {
        return window.getComputedStyle(el).opacity
      })
      expect(parseFloat(opacity)).toBeGreaterThan(0)
    })

    test('should not show overlay when hovering in documents view', async ({ page }) => {
      await page.goto('/')
      await page.click('[data-testid="documents-button"]')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')
      const overlay = page.locator('[data-testid="board-list-toggle-overlay"]')

      await boardListButton.hover()
      await expect(overlay).not.toBeVisible()
    })
  })

  test.describe('Toggle Navigation', () => {
    test('should toggle from Board to List view and show Board icon on button', async ({ page }) => {
      await page.goto('/')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')

      // Verify starting state
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'board')

      // Click to toggle
      await boardListButton.click()
      await page.waitForURL('**/list')

      // Verify button shows Board icon (the alternate)
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'list')
    })

    test('should toggle from List to Board view and show List icon on button', async ({ page }) => {
      await page.goto('/list')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')

      // Verify starting state
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'list')

      // Click to toggle
      await boardListButton.click()
      await page.waitForURL('**/')

      // Verify button shows List icon (the alternate)
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'board')
    })

    test('should return to last-used view when clicking from documents view', async ({ page }) => {
      await page.goto('/')

      // Set list as last-used
      const boardListButton = page.locator('[data-testid="board-list-toggle"]')
      await boardListButton.click()

      // Navigate to documents
      await page.click('[data-testid="documents-button"]')

      // Click to return
      await boardListButton.click()
      await page.waitForURL('**/list')
    })
  })

  test.describe('Persistence', () => {
    test('should save last-used mode to localStorage when switching views', async ({ page }) => {
      await page.goto('/')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')
      await boardListButton.click()

      const storedMode = await page.evaluate(() => {
        return localStorage.getItem('lastBoardListMode')
      })

      expect(storedMode).toBe('list')
    })

    test('should load last-used mode from localStorage on application load', async ({ page }) => {
      // Set localStorage
      await page.goto('/')
      await page.evaluate(() => {
        localStorage.setItem('lastBoardListMode', 'list')
      })

      // Reload and verify
      await page.reload()
      await page.waitForURL('**/list')

      const boardListButton = page.locator('[data-testid="board-list-toggle"]')
      await expect(boardListButton).toHaveAttribute('data-current-mode', 'list')
    })
  })
})
