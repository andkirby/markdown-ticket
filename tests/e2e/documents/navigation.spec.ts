import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { navigateToDocuments } from '../utils/helpers.js'
import { documentSelectors, pathSelectorSelectors } from '../utils/selectors.js'

async function addNestedDocs(projectDir: string) {
  await mkdir(join(projectDir, 'docs', 'design'), { recursive: true })
  await mkdir(join(projectDir, 'docs', 'api'), { recursive: true })
  await mkdir(join(projectDir, 'docs', 'long'), { recursive: true })
  await writeFile(join(projectDir, 'docs', 'design', 'navigation.md'), '# Navigation Spec\n\nNavigation content.')
  await writeFile(join(projectDir, 'docs', 'api', 'reference.md'), '# API Docs\n\nAPI reference content.')
  for (let index = 0; index < 40; index += 1) {
    await writeFile(join(projectDir, 'docs', 'long', `entry-${index}.md`), `# Long Entry ${index}\n\nContent.`)
  }
  await writeFile(join(projectDir, 'docs', 'CRs', 'MDT-999.md'), '# Ticket Area\n\nShould not be shown in Documents View.')
}

async function expectViewportNotScrollable(page: { evaluate: <T>(pageFunction: () => T | Promise<T>) => Promise<T> }) {
  const scrollDelta = await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight)
  expect(scrollDelta).toBeLessThanOrEqual(1)
}

test.describe('Documents View navigation (MDT-162)', () => {
  test('starts collapsed, excludes ticket area, and preserves active document context', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await addNestedDocs(scenario.projectDir)

    await page.goto(`/prj/${scenario.projectCode}/documents?file=docs/design/navigation.md`)
    await page.waitForLoadState('load')

    await expect(page.locator(documentSelectors.documentTree)).toBeVisible()
    await expect(page.locator(documentSelectors.documentItem).filter({ hasText: 'Navigation Spec' })).toBeVisible()
    await expect(page.locator(documentSelectors.documentTree)).not.toContainText('MDT-999')
    await expect(page.locator(documentSelectors.documentTree)).not.toContainText('CRs')
    await expectViewportNotScrollable(page)
  })

  test('collapse all keeps selected document ancestors expanded', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await addNestedDocs(scenario.projectDir)

    await page.goto(`/prj/${scenario.projectCode}/documents?file=docs/design/navigation.md`)
    await page.waitForLoadState('load')

    await page.locator(documentSelectors.collapseAllButton).click()

    await expect(page.locator(documentSelectors.documentItem).filter({ hasText: 'Navigation Spec' })).toBeVisible()
    await expect(page.locator(documentSelectors.folderItem).filter({ hasText: 'design' })).toBeVisible()
  })

  test('sidebar starts with the tree instead of unmanaged shortcut lists', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await addNestedDocs(scenario.projectDir)

    await page.goto(`/prj/${scenario.projectCode}`)
    await navigateToDocuments(page)

    await expect(page.locator(documentSelectors.pinnedRoot)).toHaveCount(0)
    await expect(page.locator(documentSelectors.scopedBreadcrumb)).toHaveCount(0)
    await expect(page.locator(documentSelectors.folderItem).filter({ hasText: 'docs' })).toBeVisible()
  })

  test('recent documents are project scoped and capped at five', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await addNestedDocs(scenario.projectDir)

    await page.goto(`/prj/${scenario.projectCode}`)
    await navigateToDocuments(page)

    const documentItems = page.locator(documentSelectors.documentItem)
    const count = Math.min(await documentItems.count(), 6)

    for (let index = 0; index < count; index += 1) {
      await documentItems.nth(index).click()
    }

    await expect(page.locator(documentSelectors.recentDocument)).toHaveCount(Math.min(count, 5))
  })

  test('recent documents section can collapse and expand', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await addNestedDocs(scenario.projectDir)

    await page.goto(`/prj/${scenario.projectCode}`)
    await navigateToDocuments(page)

    await page.locator(documentSelectors.folderItem).filter({ hasText: 'docs' }).click()
    await page.locator(documentSelectors.folderItem).filter({ hasText: 'design' }).click()
    await page.locator(documentSelectors.documentItem).filter({ hasText: 'Navigation Spec' }).click()

    await expect(page.locator(documentSelectors.recentToggle)).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator(documentSelectors.recentDocument)).toHaveCount(1)
    await expect(page.locator(documentSelectors.recentDocument).first()).toContainText('Navigation Spec')
    await expect(page.locator(documentSelectors.recentDocument).first()).toContainText('navigation.md')
    const recentTopBeforeScroll = await page.locator(documentSelectors.recentToggle).boundingBox()

    await page.locator(documentSelectors.recentToggle).click()
    await expect(page.locator(documentSelectors.recentToggle)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator(documentSelectors.recentList)).toHaveCount(0)

    await page.locator(documentSelectors.recentToggle).click()
    await expect(page.locator(documentSelectors.recentToggle)).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator(documentSelectors.recentDocument)).toHaveCount(1)

    await page.locator(documentSelectors.folderItem).filter({ hasText: 'long' }).click()
    await page.locator(`${documentSelectors.documentTreeScrollArea} [data-radix-scroll-area-viewport]`).evaluate(element => element.scrollTop = 400)
    const recentTopAfterScroll = await page.locator(documentSelectors.recentToggle).boundingBox()

    expect(recentTopAfterScroll?.y).toBe(recentTopBeforeScroll?.y)
  })

  test('filter matches path/title and target recovers hidden active document', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await addNestedDocs(scenario.projectDir)

    await page.goto(`/prj/${scenario.projectCode}/documents?file=docs/design/navigation.md`)
    await page.waitForLoadState('load')

    await page.locator(documentSelectors.filterInput).fill('api reference')
    await expect(page.locator(documentSelectors.documentTree)).toContainText('reference.md')
    await expect(page.locator(documentSelectors.documentTree)).not.toContainText('Navigation Spec')

    await page.locator(documentSelectors.scrollToActiveButton).click()
    await expect(page.locator(documentSelectors.filterInput)).toHaveValue('')
    await expect(page.locator(documentSelectors.documentItem).filter({ hasText: 'Navigation Spec' })).toBeVisible()
  })

  test('path configuration discloses automatic docs/CRs exclusion', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.locator(pathSelectorSelectors.configureButton).click()

    await expect(page.locator(documentSelectors.exclusionNotice)).toContainText('docs/CRs')
  })
})
