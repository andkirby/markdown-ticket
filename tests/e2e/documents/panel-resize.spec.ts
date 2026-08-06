import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { documentSelectors } from '../utils/selectors.js'

/**
 * Documents View panel resize E2E
 *
 * Guards the resize-glitch fix: layout must persist on drag release (not every
 * tick) via react-resizable-panels' `onLayoutChanged`, and survive a reload.
 * Regression for the per-tick `onResize` persistence that re-rendered mid-drag.
 */

async function addDocs(projectDir: string) {
  await mkdir(join(projectDir, 'docs', 'design'), { recursive: true })
  await writeFile(join(projectDir, 'docs', 'design', 'intro.md'), '# Intro\n\nContent.')
}

async function panelWidth(page: import('@playwright/test').Page, selector: string): Promise<number> {
  return page.locator(selector).evaluate(el => el.getBoundingClientRect().width)
}

test.describe('Documents View panel resize', () => {
  test('drag changes the navigation width and persists across reload', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await addDocs(scenario.projectDir)

    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.waitForLoadState('load')
    await expect(page.locator(documentSelectors.documentTree)).toBeVisible()

    const navPanel = page.locator(documentSelectors.navigationPanel)
    const previewPanel = page.locator(documentSelectors.previewPanel)
    const handle = page.locator(documentSelectors.panelResizeHandle)
    await expect(navPanel).toBeVisible()
    await expect(handle).toBeVisible()

    const widthBefore = await panelWidth(page, documentSelectors.navigationPanel)
    const previewBefore = await panelWidth(page, documentSelectors.previewPanel)
    expect(widthBefore).toBeGreaterThan(0)

    // Perform a real pointer drag on the separator (+120px to the right widens nav).
    const handleBox = await handle.boundingBox()
    expect(handleBox).not.toBeNull()
    const startX = handleBox!.x + handleBox!.width / 2
    const startY = handleBox!.y + handleBox!.height / 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 120, startY, { steps: 10 })
    await page.mouse.up()

    // Nav grew, preview shrank by ~the same delta. Tolerate sub-pixel rounding.
    const widthAfter = await panelWidth(page, documentSelectors.navigationPanel)
    const previewAfter = await panelWidth(page, documentSelectors.previewPanel)
    expect(widthAfter).toBeGreaterThan(widthBefore + 80)
    expect(previewAfter).toBeLessThan(previewBefore - 80)

    // Reload — the release-time persisted width must restore (regression guard).
    await page.reload()
    await page.waitForLoadState('load')
    await expect(page.locator(documentSelectors.documentTree)).toBeVisible()

    const widthRestored = await panelWidth(page, documentSelectors.navigationPanel)
    expect(Math.abs(widthRestored - widthAfter)).toBeLessThan(6)
  })

  test('hide and show navigation toggles panel visibility', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')
    await addDocs(scenario.projectDir)

    await page.goto(`/prj/${scenario.projectCode}/documents`)
    await page.waitForLoadState('load')
    await expect(page.locator(documentSelectors.documentTree)).toBeVisible()

    // Collapse via the hide-navigation action — imperative collapse routes through
    // onLayoutChanged, which must persist the collapsed state.
    await page.locator('[data-testid="toggle-document-navigation-button"]').click()
    await expect(page.locator(documentSelectors.navigationPanel)).not.toBeVisible()

    // Restore via the show-navigation control in the viewer pane.
    await page.locator('[data-testid="show-document-navigation-button"]').click()
    await expect(page.locator(documentSelectors.navigationPanel)).toBeVisible()
    await expect(page.locator(documentSelectors.documentTree)).toBeVisible()
  })
})
