/**
 * MDT-176 Auth Session Unlock E2E Tests
 *
 * Isolated auth-enabled suite. Skipped by default so the normal no-auth E2E
 * suite remains unchanged.
 */

import { expect, test } from '../fixtures/test-fixtures.js'
import type { Page } from '@playwright/test'
import { buildScenario } from '../setup/index.js'
import { waitForDocumentsReady } from '../utils/helpers.js'
import { authSelectors, boardSelectors, documentSelectors, projectSelectors, selectorSelectors, sharingSelectors } from '../utils/selectors.js'

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

    await page.locator(authSelectors.menuButton).click()
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

    await page.locator(authSelectors.menuButton).click()
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

  test('auth-enabled public project responses render read-only sharing instead of a locked screen', async ({ page, e2eContext }) => {
    void e2eContext
    const publicProject = createPublicProjectFixture()

    await page.route('**/api/projects', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([publicProject]),
      })
    })

    await page.goto('/prj/PUB')
    await page.waitForLoadState('load')

    await expectReadOnlyStatusInMenu(page)
    await expect(page.locator(authSelectors.accessIndicator)).toHaveCount(0)
    await expect(page.locator(authSelectors.unlockPanel)).toHaveCount(0)
    await expect(page.locator(projectSelectors.addProjectButton)).toHaveCount(0)
    await expect(page.locator(projectSelectors.editProjectButton)).toHaveCount(0)
  })

  test('locking owner access on a public documents route downgrades to read-only without blanking the page', async ({ page, e2eContext }) => {
    void e2eContext
    const publicProject = createPublicProjectFixture()
    const privateProject = createPrivateProjectFixture()
    let ownerAuthenticated = true

    await page.route('**/api/auth/session', async route => {
      if (route.request().method() === 'DELETE') {
        ownerAuthenticated = false
        await route.fulfill({ status: 204, body: '' })
        return
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authEnabled: true,
          authenticated: ownerAuthenticated,
          readAuthenticated: false,
        }),
      })
    })
    await page.route('**/api/projects/public-demo/crs', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    })
    await page.route('**/api/projects/public-demo/config', async route => {
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
    })
    await page.route('**/api/documents?projectId=public-demo', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      })
    })
    await page.route('**/api/projects', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ownerAuthenticated ? [publicProject, privateProject] : [publicProject]),
      })
    })

    await page.goto('/prj/PUB/documents')
    await page.waitForLoadState('load')
    await waitForDocumentsReady(page)

    await page.locator(authSelectors.menuButton).click()
    await page.locator(authSelectors.lockButton).click()

    await expectReadOnlyStatusInMenu(page)
    await expect(page.locator(authSelectors.accessIndicator)).toHaveCount(0)
    await expect(page.locator(authSelectors.unlockPanel)).toHaveCount(0)
    await expect(page.locator(documentSelectors.documentTree)).toBeVisible()

    await page.locator(selectorSelectors.panelTrigger).click()
    await expect(page.locator(selectorSelectors.projectPanel)).toBeVisible()
    await expect(page.locator(projectSelectors.projectOption('PRI'))).toHaveCount(0)
    await expect(page.locator(projectSelectors.projectOption('PUB'))).toBeVisible()
    await page.locator('[data-testid="project-browser-close"]').click()

    await page.reload()
    await page.waitForLoadState('load')
    await waitForDocumentsReady(page)
    await expectReadOnlyStatusInMenu(page)
    await expect(page.locator(authSelectors.unlockPanel)).toHaveCount(0)
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

function createPublicProjectFixture() {
  return {
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
      description: 'Public project',
      repository: '',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2026-05-23',
      lastAccessed: '2026-05-23',
      version: '1.0.0',
      sharing: {
        mode: 'public-readonly',
        shareId: 'pub-share-id',
      },
    },
  }
}

function createPrivateProjectFixture() {
  return {
    id: 'private-demo',
    project: {
      id: 'private-demo',
      name: 'Private Demo',
      code: 'PRI',
      path: '/tmp/private-demo',
      configFile: '/tmp/private-demo/.mdt-config.toml',
      startNumber: 1,
      counterFile: '.mdt-counter',
      active: true,
      description: 'Owner-only project',
      repository: '',
      ticketsPath: 'docs/CRs',
    },
    metadata: {
      dateRegistered: '2026-05-23',
      lastAccessed: '2026-05-23',
      version: '1.0.0',
    },
  }
}

async function expectReadOnlyStatusInMenu(page: Page): Promise<void> {
  await page.locator(authSelectors.menuButton).click()
  await expect(page.locator(sharingSelectors.readOnlyBadge)).toBeVisible()
  await page.locator(authSelectors.menuButton).click()
}
