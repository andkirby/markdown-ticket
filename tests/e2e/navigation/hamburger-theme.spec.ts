/**
 * MDT-131: Hamburger Menu Theme Controls E2E Tests
 *
 * Tests the button-group theme controls in the hamburger menu.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario, type ScenarioResult } from '../setup/index.js'
import { projectSelectors } from '../utils/selectors.js'
import { waitForBoardReady } from '../utils/helpers.js'

test.describe('MDT-131: Hamburger Menu Theme Controls', () => {
  let scenario: ScenarioResult

  test.beforeEach(async ({ page, e2eContext }) => {
    scenario = await buildScenario(e2eContext.projectFactory, 'simple')
  })

  test.describe('All Devices', () => {
    test('should display 3-option theme button group with correct icons in hamburger menu', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      await page.click(projectSelectors.hamburgerMenu)

      // Verify all 3 theme buttons are visible with correct icons
      const lightButton = page.locator(projectSelectors.themeLight)
      const darkButton = page.locator(projectSelectors.themeDark)
      const systemButton = page.locator(projectSelectors.themeSystem)

      await expect(lightButton).toBeVisible()
      await expect(lightButton.locator('svg')).toBeVisible()

      await expect(darkButton).toBeVisible()
      await expect(darkButton.locator('svg')).toBeVisible()

      await expect(systemButton).toBeVisible()
      await expect(systemButton.locator('svg')).toBeVisible()
    })

    test('should switch themes and highlight active selection', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      // Switch to light theme
      await page.click(projectSelectors.hamburgerMenu)
      await page.click(projectSelectors.themeLight)
      await page.waitForTimeout(200)

      let isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      expect(isDark).toBe(false)

      // Verify light button is active
      await page.click(projectSelectors.hamburgerMenu)
      await expect(page.locator(projectSelectors.themeLight)).toHaveClass(/bg-primary/)

      // Switch to dark theme
      await page.click(projectSelectors.themeDark)
      await page.waitForTimeout(200)

      isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
      expect(isDark).toBe(true)

      // Verify dark button is active
      await page.click(projectSelectors.hamburgerMenu)
      await expect(page.locator(projectSelectors.themeDark)).toHaveClass(/bg-primary/)

      // Switch to system theme
      await page.click(projectSelectors.themeSystem)
      await page.waitForTimeout(200)

      const theme = await page.evaluate(() => {
        const cookies = document.cookie.split('; ').reduce((acc, cookie) => {
          const [name, value] = cookie.split('=')
          acc[name] = value
          return acc
        }, {} as Record<string, string>)
        return cookies.theme
      })
      expect(theme).toBe('system')

      // Verify system button is active
      await page.click(projectSelectors.hamburgerMenu)
      await expect(page.locator(projectSelectors.themeSystem)).toHaveClass(/bg-primary/)
    })

    test('should close menu after theme selection', async ({ page }) => {
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      await page.click(projectSelectors.hamburgerMenu)
      await page.click(projectSelectors.themeLight)
      await page.waitForTimeout(200)

      const menuContent = page.locator('.absolute.right-0.top-full')
      await expect(menuContent).not.toBeVisible()
    })

    test('should NOT display theme toggle in top right corner on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      const desktopThemeToggle = page.locator('[data-testid="theme-toggle"]')
      await expect(desktopThemeToggle).not.toBeVisible()
    })
  })

  test.describe('Mobile Viewport (< 768px)', () => {
    test('should display theme button group on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      await page.click(projectSelectors.hamburgerMenu)

      await expect(page.locator(projectSelectors.themeLight)).toBeVisible()
      await expect(page.locator(projectSelectors.themeDark)).toBeVisible()
      await expect(page.locator(projectSelectors.themeSystem)).toBeVisible()
    })
  })

  test.describe('Desktop Viewport (>= 768px)', () => {
    test('should display theme button group on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.goto(`/prj/${scenario.projectCode}`)
      await waitForBoardReady(page)

      await page.click(projectSelectors.hamburgerMenu)

      await expect(page.locator(projectSelectors.themeLight)).toBeVisible()
      await expect(page.locator(projectSelectors.themeDark)).toBeVisible()
      await expect(page.locator(projectSelectors.themeSystem)).toBeVisible()
    })
  })
})
