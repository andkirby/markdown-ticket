import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { documentSelectors } from '../utils/selectors.js'

async function addFavDocs(projectDir: string) {
  await mkdir(join(projectDir, 'docs', 'design'), { recursive: true })
  await mkdir(join(projectDir, 'docs', 'api'), { recursive: true })
  await mkdir(join(projectDir, 'docs', 'long'), { recursive: true })
  await mkdir(join(projectDir, 'docs', 'CRs'), { recursive: true })
  await writeFile(join(projectDir, 'docs', 'design', 'navigation.md'), '# Navigation Spec\n\nNavigation content.')
  await writeFile(join(projectDir, 'docs', 'api', 'reference.md'), '# API Docs\n\nAPI reference content.')
  await writeFile(join(projectDir, 'docs', 'long', 'entry.md'), '# Long Entry\n\nLong content.')
  await writeFile(join(projectDir, 'docs', 'overview.md'), '# Overview\n\nOverview content.')
  await writeFile(join(projectDir, 'docs', 'roadmap.md'), '# Roadmap\n\nRoadmap content.')
  await writeFile(join(projectDir, 'docs', 'CRs', 'MDT-999.md'), '# Ticket Area\n\nShould not be shown.')
}

test.describe('Documents favs (MDT-171)', () => {
  test('adds, restores, opens, locates, caps, and preserves recent navigation', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await addFavDocs(scenario.projectDir)

    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.waitForLoadState('load')
    await expect(page.locator(documentSelectors.documentTree)).toBeVisible()
    await expect(page.locator(documentSelectors.favsToggle)).toHaveCount(0)

    await page.locator(documentSelectors.treeFavStarByPath('docs')).click()
    await expect(page.locator(documentSelectors.favsToggle)).toBeVisible()
    await expect(page.locator(documentSelectors.favItemByPath('docs'))).toBeVisible()
    await expect(page.locator(documentSelectors.treeFavStarByPath('docs')).locator('.fav-star')).toHaveClass(/active/)

    await page.locator(documentSelectors.folderItem).filter({ hasText: 'docs' }).click()
    await page.locator(documentSelectors.folderItem).filter({ hasText: 'design' }).click()
    await page.locator(documentSelectors.treeFavStarByPath('docs/design')).click()
    await page.locator(documentSelectors.treeFavStarByPath('docs/design/navigation.md')).click()
    await page.locator(documentSelectors.folderItem).filter({ hasText: 'api' }).click()
    await page.locator(documentSelectors.treeFavStarByPath('docs/api')).click()
    await page.locator(documentSelectors.treeFavStarByPath('docs/api/reference.md')).click()
    await page.locator(documentSelectors.folderItem).filter({ hasText: 'long' }).click()
    await page.locator(documentSelectors.treeFavStarByPath('docs/long')).click()

    await expect(page.locator(documentSelectors.favItem)).toHaveCount(5)
    await expect(page.locator(documentSelectors.favsShowAll)).toHaveText('Show all')

    await page.locator(documentSelectors.favsShowAll).click()
    await expect(page.locator(documentSelectors.favItem)).toHaveCount(6)
    await expect(page.locator(documentSelectors.favsShowAll)).toHaveText('Show less')

    await page.locator(documentSelectors.favsToggle).click()
    await expect(page.locator(documentSelectors.favsToggle)).toHaveAttribute('aria-expanded', 'false')

    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.locator(documentSelectors.favsToggle)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.locator(documentSelectors.favsList)).toHaveCount(0)

    await page.locator(documentSelectors.favsToggle).click()
    await expect(page.locator(documentSelectors.favsToggle)).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator(documentSelectors.favItem)).toHaveCount(6)
    await expect(page.locator(documentSelectors.favsShowAll)).toHaveText('Show less')
    await page.locator(documentSelectors.favsShowAll).click()
    await expect(page.locator(documentSelectors.favItem)).toHaveCount(5)
    await expect(page.locator(documentSelectors.favsShowAll)).toHaveText('Show all')
    await expect(page.locator(documentSelectors.favItemByPath('docs/design/navigation.md'))).toBeVisible()

    await page.locator(documentSelectors.favItemByPath('docs/design/navigation.md')).click()
    await expect(page.locator(documentSelectors.fileViewer)).toContainText('Navigation Spec')
    await expect(page.locator(documentSelectors.recentDocument)).toContainText('Navigation Spec')

    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.waitForLoadState('load')
    await page.locator(documentSelectors.collapseAllButton).click()
    await page.locator(documentSelectors.favItemByPath('docs/design')).click()
    await expect(page.locator(documentSelectors.locatedFolderByPath('docs/design'))).toBeVisible()
    await expect(page.locator(documentSelectors.recentDocument)).toContainText('Navigation Spec')
  })

  test('removes the final fav through the active star and hides Favs', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await addFavDocs(scenario.projectDir)

    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.waitForLoadState('load')
    await page.locator(documentSelectors.treeFavStarByPath('docs')).click()
    await expect(page.locator(documentSelectors.favItemByPath('docs'))).toBeVisible()

    await page.locator(documentSelectors.favStar).click()

    await expect(page.locator(documentSelectors.favsToggle)).toHaveCount(0)
  })
})
