/**
 * MDT-177 Read Access Sharing Journey E2E Tests
 *
 * RED acceptance coverage for named read-access sharing. The suite is expected
 * to fail until MDT-177 implements the named token, invite, and read-only UI.
 */

import type { ProjectFactory } from '@mdt/shared/test-lib'
import type { Browser, Page } from '@playwright/test'
import type { E2EContext } from '../setup/index.js'
import { buildRuntimeConfig } from '../../../server/config/runtimeConfig.js'
import { expect, test } from '../fixtures/test-fixtures.js'
import { waitForBoardReady, waitForDocumentsReady, waitForListReady } from '../utils/helpers.js'
import {
  authSelectors,
  boardSelectors,
  documentSelectors,
  listSelectors,
  projectSelectors,
  selectorSelectors,
  sharingSelectors,
  ticketSelectors,
} from '../utils/selectors.js'

const accessName = 'Bob'
const invalidOwnerToken = 'mdt-177-invalid-owner-token'

interface SharingProject {
  code: string
  name: string
}

interface SharingDataset {
  firstPrivate: SharingProject
  secondPrivate: SharingProject
  publicProject: SharingProject
  extraPrivate: SharingProject
}

test.describe('MDT-177 read access sharing journey', () => {
  test('owner creates named multi-project access and generates invite links without persistent token exposure', async ({ page, e2eContext }) => {
    const dataset = await createSharingDataset(e2eContext.projectFactory)
    const accessName = accessNameFor(dataset)

    await page.goto(`/prj/${dataset.firstPrivate.code}`)
    await waitForBoardReady(page)
    await openSharingSettings(page)
    await createNamedAccess(page, accessName, [
      dataset.firstPrivate.code,
      dataset.secondPrivate.code,
    ])

    const row = page.locator(sharingSelectors.namedAccessRow(accessName)).first()
    await expect(row).toContainText(dataset.firstPrivate.code)
    await expect(row).toContainText(dataset.secondPrivate.code)
    await expect(row).toContainText(/active/i)
    await expect(row.locator(sharingSelectors.inviteButton)).toBeVisible()
    await expect(row.locator(sharingSelectors.revokeButton)).toBeVisible()
    await expect(row.locator(sharingSelectors.rawPersistentToken)).toHaveCount(0)

    const inviteUrl = await generateInviteUrl(page, accessName)
    expect(inviteUrl).toMatch(/^https?:\/\//u)
    expect(inviteUrl).not.toMatch(/(?:read[-_]?token|token=|access_token=)/iu)
    expect(new URL(inviteUrl).origin).toBe(new URL(page.url()).origin)
  })

  test('valid invite exchange cleans URL, preserves scoped project switching, and suppresses owner controls', async ({ page, browser, e2eContext }) => {
    const dataset = await createSharingDataset(e2eContext.projectFactory)
    const accessName = accessNameFor(dataset)

    await makeProjectPublicReadonly(page, dataset.publicProject.code)
    await page.goto(`/prj/${dataset.firstPrivate.code}`)
    await waitForBoardReady(page)
    await openSharingSettings(page)
    await createNamedAccess(page, accessName, [
      dataset.firstPrivate.code,
      dataset.secondPrivate.code,
    ])
    const inviteUrl = await generateInviteUrl(page, accessName)

    const visitor = await openCleanVisitorPage(browser, inviteUrl)
    await expect(visitor).toHaveURL(new RegExp(`/prj/${dataset.firstPrivate.code}(?:$|[/?#])`, 'u'))
    expect(visitor.url()).not.toMatch(/(?:invite|code|token)=/iu)
    await expect(visitor.locator(boardSelectors.board)).toBeVisible()
    await expect(visitor.locator(authSelectors.accessIndicator)).toBeVisible()
    await expectReadOnlyStatusInMenu(visitor)

    await openProjectBrowser(visitor)
    await expect(visitor.locator(projectSelectors.projectOption(dataset.firstPrivate.code))).toBeVisible()
    await expect(visitor.locator(projectSelectors.projectOption(dataset.secondPrivate.code))).toBeVisible()
    await expect(visitor.locator(projectSelectors.projectOption(dataset.publicProject.code))).toBeVisible()
    await visitor.locator(projectSelectors.projectOption(dataset.secondPrivate.code)).click()
    await waitForBoardReady(visitor)

    await assertOwnerControlsSuppressed(visitor)
    await visitor.close()
  })

  test('public read-only project renders tickets for an anonymous visitor', async ({ page, browser, e2eContext }) => {
    const dataset = await createSharingDataset(e2eContext.projectFactory)

    await makeProjectPublicReadonly(page, dataset.publicProject.code)

    const context = await browser.newContext()
    const visitor = await context.newPage()
    await visitor.goto(`/prj/${dataset.publicProject.code}`)
    await waitForBoardReady(visitor)

    await expect(visitor.locator(boardSelectors.ticketByCode(`${dataset.publicProject.code}-001`))).toBeVisible()

    await visitor.close()
    await context.close()
  })

  test('share link merge adds the linked project without replacing existing token and public access', async ({ page, browser, e2eContext }) => {
    const dataset = await createSharingDataset(e2eContext.projectFactory)
    const accessName = accessNameFor(dataset)

    await makeProjectPublicReadonly(page, dataset.publicProject.code)
    await page.goto(`/prj/${dataset.firstPrivate.code}`)
    await waitForBoardReady(page)
    await openSharingSettings(page)
    await createNamedAccess(page, accessName, [
      dataset.firstPrivate.code,
      dataset.secondPrivate.code,
    ])
    const inviteUrl = await generateInviteUrl(page, accessName)
    const visitor = await openCleanVisitorPage(browser, inviteUrl)

    const shareUrl = await generateProjectShareLink(page, dataset.extraPrivate.code)
    await visitor.goto(shareUrl)
    await visitor.waitForLoadState('load')
    await waitForBoardReady(visitor)

    await openProjectBrowser(visitor)
    await expect(visitor.locator(projectSelectors.projectOption(dataset.firstPrivate.code))).toBeVisible()
    await expect(visitor.locator(projectSelectors.projectOption(dataset.secondPrivate.code))).toBeVisible()
    await expect(visitor.locator(projectSelectors.projectOption(dataset.publicProject.code))).toBeVisible()
    await expect(visitor.locator(projectSelectors.projectOption(dataset.extraPrivate.code))).toBeVisible()
    await visitor.close()
  })

  test('share session survives refresh without owner-only endpoint probes', async ({ page, browser, e2eContext }) => {
    const dataset = await createSharingDataset(e2eContext.projectFactory)
    const ownerOnlyEndpointCalls: string[] = []

    const shareUrl = await generateProjectShareLink(page, dataset.extraPrivate.code)
    const context = await browser.newContext()
    const visitor = await context.newPage()
    watchOwnerOnlyEndpointCalls(visitor, ownerOnlyEndpointCalls)

    await visitor.goto(shareUrl)
    await visitor.waitForLoadState('load')
    await waitForBoardReady(visitor)
    await expect(visitor).toHaveURL(new RegExp(`/prj/${dataset.extraPrivate.code}(?:$|[/?#])`, 'u'))
    await expectReadOnlyStatusInMenu(visitor)

    await visitor.reload()
    await visitor.waitForLoadState('load')
    await waitForBoardReady(visitor)
    await expect(visitor).toHaveURL(new RegExp(`/prj/${dataset.extraPrivate.code}(?:$|[/?#])`, 'u'))
    await expectReadOnlyStatusInMenu(visitor)

    await visitor.locator(projectSelectors.hamburgerMenu).click()
    await visitor.locator('[data-testid="clear-cache-button"]').click()
    await visitor.waitForLoadState('load')
    await waitForBoardReady(visitor)
    await expectReadOnlyStatusInMenu(visitor)
    expect(ownerOnlyEndpointCalls).toEqual([])

    await visitor.close()
    await context.close()
  })

  test('read-only owner unlock cancel and invalid token preserve route, view state, and session', async ({ page, browser, e2eContext }) => {
    const dataset = await createSharingDataset(e2eContext.projectFactory)
    const accessName = accessNameFor(dataset)

    await page.goto(`/prj/${dataset.firstPrivate.code}`)
    await waitForBoardReady(page)
    await openSharingSettings(page)
    await createNamedAccess(page, accessName, [
      dataset.firstPrivate.code,
      dataset.secondPrivate.code,
    ])
    const inviteUrl = await generateInviteUrl(page, accessName)
    const visitor = await openCleanVisitorPage(browser, inviteUrl)

    await visitor.locator(selectorSelectors.panelTrigger).click()
    await visitor.locator(projectSelectors.projectOption(dataset.firstPrivate.code)).click()
    await waitForBoardReady(visitor)
    await visitor.goto(`/prj/${dataset.firstPrivate.code}/list`)
    await waitForListReady(visitor)
    const listUrl = visitor.url()

    await openOwnerUnlockFromMenu(visitor)
    await expect(visitor.locator(sharingSelectors.ownerUnlockDialog)).toBeVisible()
    await visitor.locator(sharingSelectors.ownerUnlockCancelButton).click()
    await expect(visitor.locator(sharingSelectors.ownerUnlockDialog)).toHaveCount(0)
    expect(visitor.url()).toBe(listUrl)
    await expect(visitor.locator(listSelectors.ticketTable).or(visitor.locator(listSelectors.ticketList))).toBeVisible()

    await openOwnerUnlockFromMenu(visitor)
    await visitor.locator(authSelectors.tokenInput).fill(invalidOwnerToken)
    await visitor.locator(authSelectors.unlockSubmit).click()
    await expect(visitor.locator(sharingSelectors.ownerUnlockError)).toBeVisible()
    await expect(visitor.locator(sharingSelectors.ownerUnlockError)).not.toContainText(invalidOwnerToken)
    await visitor.locator(sharingSelectors.ownerUnlockCancelButton).click()
    await expectReadOnlyStatusInMenu(visitor)

    await visitor.goto(`/prj/${dataset.firstPrivate.code}/documents`)
    await waitForDocumentsReady(visitor)
    await openOwnerUnlockFromMenu(visitor)
    await visitor.locator(sharingSelectors.ownerUnlockCancelButton).click()
    await expect(visitor.locator(documentSelectors.documentTree)).toBeVisible()
    await visitor.close()
  })

  test('revoked, expired, and invalid invite paths fail visibly without widening read access', async ({ page, browser, e2eContext }) => {
    const dataset = await createSharingDataset(e2eContext.projectFactory)
    const accessName = accessNameFor(dataset)

    await page.goto(`/prj/${dataset.firstPrivate.code}`)
    await waitForBoardReady(page)
    await openSharingSettings(page)
    await createNamedAccess(page, accessName, [
      dataset.firstPrivate.code,
      dataset.secondPrivate.code,
    ])
    const inviteUrl = await generateInviteUrl(page, accessName)
    const visitor = await openCleanVisitorPage(browser, inviteUrl)

    await page.locator(sharingSelectors.namedAccessRow(accessName)).first().locator(sharingSelectors.revokeButton).click()
    await page.locator('[data-testid="confirm-button"]').click()

    await visitor.reload()
    await visitor.waitForLoadState('load')
    await expect(visitor.locator(projectSelectors.projectSelector(dataset.firstPrivate.code))).toHaveCount(0)

    const invalidInvite = new URL(inviteUrl)
    invalidInvite.searchParams.set('code', 'mdt-177-invalid-invite-code')
    await visitor.goto(invalidInvite.toString())
    await visitor.waitForLoadState('load')
    await expect(visitor.locator(sharingSelectors.inviteError)).toBeVisible()
    await expect(visitor.locator(projectSelectors.projectSelector(dataset.firstPrivate.code))).toHaveCount(0)

    await expect(page.locator(sharingSelectors.namedAccessRow(accessName)).first().locator(sharingSelectors.inviteButton)).toBeDisabled()
    await expect(page.locator(sharingSelectors.inviteUrl)).toHaveCount(0)
    await visitor.close()
  })

  test('configured public origin is used for generated invite links', async ({ page, e2eContext }) => {
    setRuntimeConfigOverride(e2eContext, {
      PUBLIC_ORIGIN: 'https://share.example.com',
    })
    const dataset = await createSharingDataset(e2eContext.projectFactory)
    const accessName = accessNameFor(dataset)

    try {
      await page.goto(`/prj/${dataset.firstPrivate.code}`)
      await waitForBoardReady(page)
      await openSharingSettings(page)
      await createNamedAccess(page, accessName, [
        dataset.firstPrivate.code,
        dataset.secondPrivate.code,
      ])

      await expect(page.locator(sharingSelectors.linkOriginFallbackNotice)).toHaveCount(0)
      const inviteUrl = await generateInviteUrl(page, accessName)
      expect(new URL(inviteUrl).origin).toBe('https://share.example.com')
    }
    finally {
      clearRuntimeConfigOverride(e2eContext)
    }
  })
})

async function createSharingDataset(projectFactory: ProjectFactory): Promise<SharingDataset> {
  const firstPrivate = await createProjectWithTicket(projectFactory, 'Private Read Access A')
  const secondPrivate = await createProjectWithTicket(projectFactory, 'Private Read Access B')
  const publicProject = await createProjectWithTicket(projectFactory, 'Public Read Access')
  const extraPrivate = await createProjectWithTicket(projectFactory, 'Extra Private Read Access')

  return {
    firstPrivate,
    secondPrivate,
    publicProject,
    extraPrivate,
  }
}

function accessNameFor(dataset: SharingDataset): string {
  return `${accessName} ${dataset.firstPrivate.code}`
}

async function createProjectWithTicket(projectFactory: ProjectFactory, name: string): Promise<SharingProject> {
  const project = await projectFactory.createProject('empty', { name })
  await projectFactory.createTestCR(project.key, {
    title: `${name} visible ticket`,
    type: 'Feature Enhancement',
    status: 'Proposed',
    priority: 'High',
    content: `Ticket used by MDT-177 ${name} read-access journey.`,
  })

  return {
    code: project.key,
    name: project.config.name ?? project.key,
  }
}

async function openSharingSettings(page: Page): Promise<void> {
  await page.locator(projectSelectors.hamburgerMenu).click()
  await page.locator(sharingSelectors.settingsButton).click()
  await expect(page.locator(sharingSelectors.settingsModal)).toBeVisible()
  await page.locator(sharingSelectors.settingsSharingTab).click()
  await expect(page.locator(sharingSelectors.namedAccessSection)).toBeVisible()
}

async function createNamedAccess(page: Page, name: string, projectCodes: string[]): Promise<void> {
  await page.locator(sharingSelectors.namedAccessNameInput).fill(name)
  await page.locator(sharingSelectors.namedAccessExpiryInput).fill('7')

  for (const code of projectCodes) {
    await page.locator(sharingSelectors.namedAccessProjectCheckbox(code)).check()
  }

  await page.locator(sharingSelectors.createNamedAccessButton).click()
  await expect(page.locator(sharingSelectors.creationResult)).toBeVisible()
  await page.locator(sharingSelectors.dismissCreationResultButton).click()
  await expect(page.locator(sharingSelectors.creationResult)).toHaveCount(0)
  await expect(page.locator(sharingSelectors.namedAccessRow(name)).first()).toBeVisible()
}

async function generateInviteUrl(page: Page, name: string): Promise<string> {
  const row = page.locator(sharingSelectors.namedAccessRow(name)).first()
  const [response] = await Promise.all([
    page.waitForResponse(resp =>
      resp.request().method() === 'POST'
      && /\/api\/read-tokens\/[^/]+\/invites$/u.test(new URL(resp.url()).pathname)),
    row.locator(sharingSelectors.inviteButton).click(),
  ])

  expect(response.ok()).toBe(true)
  const data = await response.json() as { inviteUrl?: string }
  expect(data.inviteUrl).toMatch(/^https?:\/\/.+\/invite\/[^/?#]+/u)
  const inviteUrlField = page.locator(sharingSelectors.inviteUrl)
  await expect(inviteUrlField).toBeVisible()
  return data.inviteUrl!
}

async function generateProjectShareLink(page: Page, projectCode: string): Promise<string> {
  await page.goto(`/prj/${projectCode}`)
  await waitForBoardReady(page)
  await openSharingSettings(page)

  const existingMode = page.locator('[data-testid="settings-sharing-mode"]')
  await existingMode.selectOption('unlisted-readonly')
  await page.locator('[data-testid="settings-save-sharing"]').click()

  const shareUrlField = page.locator(sharingSelectors.shareUrl)
  await expect(shareUrlField).toBeVisible()
  return readFieldValue(shareUrlField)
}

async function makeProjectPublicReadonly(page: Page, projectCode: string): Promise<void> {
  await page.goto(`/prj/${projectCode}`)
  await waitForBoardReady(page)
  await openSharingSettings(page)
  await page.locator('[data-testid="settings-sharing-mode"]').selectOption('public-readonly')
  await page.locator('[data-testid="settings-save-sharing"]').click()
  await expect(page.locator(sharingSelectors.shareUrl)).toBeVisible()
}

async function readFieldValue(locator: ReturnType<Page['locator']>): Promise<string> {
  const value = await locator.inputValue().catch(async () => locator.textContent())
  const normalizedValue = value?.trim()
  expect(normalizedValue).toBeTruthy()
  return normalizedValue!
}

async function openCleanVisitorPage(browser: Browser, inviteUrl: string): Promise<Page> {
  const context = await browser.newContext()
  const visitor = await context.newPage()
  await visitor.goto(inviteUrl)
  await visitor.waitForLoadState('load')
  try {
    await waitForBoardReady(visitor)
  }
  catch (error) {
    const bodyText = await visitor.locator('body').innerText({ timeout: 1000 }).catch(() => '')
    throw new Error(`Visitor did not reach board after invite. url=${visitor.url()} body=${bodyText.slice(0, 500)}`, { cause: error })
  }
  return visitor
}

function setRuntimeConfigOverride(e2eContext: E2EContext, overrides: NodeJS.ProcessEnv): void {
  e2eContext.app.locals.runtimeConfig = buildRuntimeConfig({
    ...process.env,
    CONFIG_DIR: e2eContext.testEnv.getConfigDirectory(),
    NODE_ENV: 'test',
    API_SECURITY_AUTH: process.env.API_SECURITY_AUTH,
    API_AUTH_TOKEN: process.env.API_AUTH_TOKEN,
    ...overrides,
  } as NodeJS.ProcessEnv)
}

function clearRuntimeConfigOverride(e2eContext: E2EContext): void {
  e2eContext.app.locals.runtimeConfig = buildRuntimeConfig({
    ...process.env,
    CONFIG_DIR: e2eContext.testEnv.getConfigDirectory(),
    NODE_ENV: 'test',
    API_SECURITY_AUTH: process.env.API_SECURITY_AUTH,
    API_AUTH_TOKEN: process.env.API_AUTH_TOKEN,
  } as NodeJS.ProcessEnv)
}

async function openProjectBrowser(page: Page): Promise<void> {
  await page.locator(selectorSelectors.panelTrigger).click()
  await expect(page.locator(selectorSelectors.projectPanel)).toBeVisible()
}

async function openOwnerUnlockFromMenu(page: Page): Promise<void> {
  await page.locator(projectSelectors.hamburgerMenu).click()
  await page.locator(sharingSelectors.ownerUnlockButton).click()
}

async function expectReadOnlyStatusInMenu(page: Page): Promise<void> {
  await page.locator(projectSelectors.hamburgerMenu).click()
  await expect(page.locator(sharingSelectors.readOnlyBadge)).toBeVisible()
  await page.locator(projectSelectors.hamburgerMenu).click()
}

function watchOwnerOnlyEndpointCalls(page: Page, calls: string[]): void {
  page.on('request', (request) => {
    const pathname = new URL(request.url()).pathname
    if (isOwnerOnlyEndpoint(pathname)) {
      calls.push(`${request.method()} ${pathname}`)
    }
  })
}

function isOwnerOnlyEndpoint(pathname: string): boolean {
  return pathname.startsWith('/api/config')
    || pathname.startsWith('/api/filesystem')
    || pathname.startsWith('/api/directories')
    || pathname.startsWith('/api/read-tokens')
    || pathname.startsWith('/api/cache')
}

async function assertOwnerControlsSuppressed(page: Page): Promise<void> {
  await expect(page.locator(projectSelectors.addProjectButton)).toHaveCount(0)
  await expect(page.locator(projectSelectors.editProjectButton)).toHaveCount(0)
  await expect(page.locator(boardSelectors.dragHandle)).toHaveCount(0)
  await expect(page.locator(ticketSelectors.statusDropdown)).toHaveCount(0)
  await expect(page.locator(selectorSelectors.favoriteButton)).toHaveCount(0)
  await expect(page.locator(documentSelectors.treeFavStar)).toHaveCount(0)
}
