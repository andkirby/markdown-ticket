/**
 * MDT-176 Auth Session Unlock E2E Tests
 *
 * Isolated auth-enabled suite. Skipped by default so the normal no-auth E2E
 * suite remains unchanged.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { authSelectors, boardSelectors, projectSelectors } from '../utils/selectors.js'

const authE2EEnabled = process.env.MDT_E2E_AUTH_ENABLED === 'true'
const adminToken = process.env.API_AUTH_TOKEN ?? 'mdt-176-e2e-token'
const invalidToken = 'mdt-176-invalid-token'

if (authE2EEnabled) {
  process.env.API_SECURITY_AUTH = 'true'
  process.env.API_AUTH_TOKEN = adminToken
}

test.describe('MDT-176 auth session unlock', () => {
  test.skip(!authE2EEnabled, 'Set MDT_E2E_AUTH_ENABLED=true with API_SECURITY_AUTH/API_AUTH_TOKEN for isolated auth E2E')

  test('locked backend shows unlock panel instead of empty project creation controls', async ({ page, e2eContext }) => {
    void e2eContext
    await page.goto('/')
    await page.waitForLoadState('load')

    await expect(page.locator(authSelectors.unlockPanel)).toBeVisible()
    await expect(page.locator(authSelectors.tokenInput)).toBeVisible()
    await expect(page.locator(projectSelectors.addProjectButton)).toHaveCount(0)
    await expect(page.getByText(/No Projects Found/i)).toHaveCount(0)
  })

  test('invalid unlock keeps the user locked with generic error copy and no token echo', async ({ page, e2eContext }) => {
    void e2eContext
    await page.goto('/')
    await page.waitForLoadState('load')

    await page.locator(authSelectors.tokenInput).fill(invalidToken)
    await page.locator(authSelectors.unlockSubmit).click()

    await expect(page.locator(authSelectors.unlockPanel)).toBeVisible()
    await expect(page.locator(authSelectors.unlockError)).toBeVisible()
    await expect(page.locator(authSelectors.unlockError)).not.toContainText(invalidToken)
    await expect(page.locator(authSelectors.tokenInput)).toBeFocused()
  })

  test('valid unlock loads projects, hides raw token from browser storage and URL, then logout returns locked', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForLoadState('load')

    await page.locator(authSelectors.tokenInput).fill(adminToken)
    await page.locator(authSelectors.unlockSubmit).click()

    await expect(page.locator(boardSelectors.board)).toBeVisible()
    await expect(page.locator(projectSelectors.projectSelector(scenario.projectCode))).toBeVisible()

    const browserState = await page.evaluate(() => ({
      href: window.location.href,
      localStorage: JSON.stringify(window.localStorage),
      sessionStorage: JSON.stringify(window.sessionStorage),
    }))
    expect(JSON.stringify(browserState)).not.toContain(adminToken)

    await page.locator(authSelectors.lockButton).click()
    await page.reload()

    await expect(page.locator(authSelectors.unlockPanel)).toBeVisible()
    await expect(page.locator(boardSelectors.board)).toHaveCount(0)
    await expect(page.locator(projectSelectors.addProjectButton)).toHaveCount(0)
  })

  test('logout converges reconnecting event streams to locked state without stale owner controls', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await page.waitForLoadState('load')

    await page.locator(authSelectors.tokenInput).fill(adminToken)
    await page.locator(authSelectors.unlockSubmit).click()
    await expect(page.locator(boardSelectors.board)).toBeVisible()

    await page.locator(authSelectors.lockButton).click()

    await page.route('**/api/events**', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Authentication required' }),
      })
    })
    await page.route('**/api/projects**', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Authentication required' }),
      })
    })
    await page.reload()

    await expect(page.locator(authSelectors.unlockPanel)).toBeVisible()
    await expect(page.locator(boardSelectors.board)).toHaveCount(0)
    await expect(page.locator(projectSelectors.addProjectButton)).toHaveCount(0)
  })

  test('auth-enabled 200 project responses without owner session stay locked until MDT-172 defines sharing', async ({ page, e2eContext }) => {
    void e2eContext
    const publicProject = {
      id: 'public-demo',
      project: {
        id: 'public-demo',
        name: 'Public Demo',
        code: 'PUB',
        path: '/tmp/public-demo',
        configFile: '/tmp/public-demo/.mdt-config.toml',
        startNumber: 1,
        counterFile: '.mdt-counter',
        active: true,
        description: 'Future public project',
        repository: '',
        ticketsPath: 'docs/CRs',
      },
      metadata: {
        dateRegistered: '2026-05-23',
        lastAccessed: '2026-05-23',
        version: '1.0.0',
      },
    }

    await page.route('**/api/projects', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([publicProject]),
      })
    })

    await page.goto('/prj/PUB')
    await page.waitForLoadState('load')

    await expect(page.locator(authSelectors.statusChip)).toHaveText('Locked')
    await expect(page.locator(authSelectors.unlockPanel)).toBeVisible()
    await expect(page.locator(authSelectors.unlockAffordance)).toBeVisible()
    await expect(page.locator(projectSelectors.addProjectButton)).toHaveCount(0)
    await expect(page.locator(projectSelectors.editProjectButton)).toHaveCount(0)
  })

  test('legacy no-auth backend does not masquerade as public sharing', async ({ page, e2eContext }) => {
    void e2eContext
    const localProject = {
      id: 'local-demo',
      project: {
        id: 'local-demo',
        name: 'Local Demo',
        code: 'LOC',
        path: '/tmp/local-demo',
        configFile: '/tmp/local-demo/.mdt-config.toml',
        startNumber: 1,
        counterFile: '.mdt-counter',
        active: true,
        description: 'Local no-auth project',
        repository: '',
        ticketsPath: 'docs/CRs',
      },
      metadata: {
        dateRegistered: '2026-05-23',
        lastAccessed: '2026-05-23',
        version: '1.0.0',
      },
    }

    await page.route('**/api/auth/session', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found' }),
      })
    })
    await page.route('**/api/projects', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([localProject]),
      })
    })
    await page.route('**/api/projects/local-demo/crs', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    })

    await page.goto('/prj/LOC')
    await page.waitForLoadState('load')

    await expect(page.locator(projectSelectors.projectSelector('LOC'))).toBeVisible()
    await expect(page.locator(authSelectors.statusChip)).toHaveCount(0)
    await expect(page.locator(authSelectors.unlockAffordance)).toHaveCount(0)
  })

  test('backend errors show backend-down state instead of locked state', async ({ page, e2eContext }) => {
    void e2eContext
    await page.route('**/api/projects', async route => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service unavailable' }),
      })
    })

    await page.goto('/')
    await page.waitForLoadState('load')

    await expect(page.locator(authSelectors.unlockPanel)).toHaveCount(0)
    await expect(page.getByText(/backend.*down|backend.*unavailable|service unavailable/i)).toBeVisible()
  })
})
