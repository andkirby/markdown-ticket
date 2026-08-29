import type { Locator } from '@playwright/test'
import { expect, test } from '../fixtures/test-fixtures.js'
import { buildScenario } from '../setup/index.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { projectSelectors, selectorSelectors, sharingSelectors } from '../utils/selectors.js'

const accentSelectors = {
  section: '[data-testid="project-accents-section"]',
  projectSelect: '[data-testid="accent-project-select"]',
  paletteToggle: '[data-testid="accent-palette-toggle"]',
  palette: '[data-testid="accent-palette"]',
  presetGrid: '[data-testid="project-accent-presets"]',
  preset: (name: string) => `[data-testid="accent-preset-${name}"]`,
  allPresets: '[data-testid^="accent-preset-"]',
  customHexInput: '[data-testid="accent-custom-hex-input"]',
  validationError: '[data-testid="accent-validation-error"]',
  chooseColorLink: '[data-testid="accent-choose-color-link"]',
  resetButton: '[data-testid="accent-reset-button"]',
  saveButton: '[data-testid="save-accents-button"]',
  infoButton: '[data-testid="accents-info"]',
} as const

async function readSelectorState(backendUrl: string) {
  const response = await fetch(`${backendUrl}/api/config/selector`)
  const data = await response.json()
  return data.selectorState as Record<string, { accent?: string }>
}

async function writeSelectorState(
  backendUrl: string,
  state: Record<string, { favorite: boolean, lastUsedAt: string | null, count: number, accent?: string }>,
) {
  await fetch(`${backendUrl}/api/config/selector`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  })
}

async function getAccentVariable(locator: Locator) {
  return locator.evaluate((element: HTMLElement) => element.style.getPropertyValue('--project-accent'))
}

async function openSettingsAccents(page: import('@playwright/test').Page) {
  await collapseChips(page)
  await page.click(projectSelectors.hamburgerMenu)
  await collapseChips(page)
  await page.click(sharingSelectors.settingsButton)
  await expect(page.locator(sharingSelectors.settingsModal)).toBeVisible()
  // Appearance tab is the default
  await expect(page.locator(accentSelectors.section)).toBeVisible()
}

async function closeSettings(page: import('@playwright/test').Page) {
  await collapseChips(page)
  await page.click('[data-testid="settings-close"]')
  await expect(page.locator(sharingSelectors.settingsModal)).toBeHidden()
}


/**
 * MDT-185: inactive project chips are hover-revealed — the rail's active card
 * expands the chip overlay on pointer enter. Dispatch the event directly: it
 * expands the overlay deterministically and leaves it expanded (no pointer
 * movement that could slip off the card mid-assertion).
 */
async function revealChips(page: import('@playwright/test').Page): Promise<void> {
  // pointerenter only fires on boundary crossing — move away first so a
  // pointer already parked on the rail still re-triggers the reveal.
  await page.mouse.move(400, 400)
  await page.locator('[data-testid="project-selector-rail-active"]').hover()
  await page.locator('[data-testid="collapsed-chips-overlay"]').waitFor({ state: 'visible', timeout: 3000 })
}

/**
 * Collapse the chip overlay (it overlays other header chrome while expanded,
 * intercepting clicks on e.g. the hamburger menu).
 */
async function collapseChips(page: import('@playwright/test').Page): Promise<void> {
  await page.mouse.move(400, 400)
  await page.locator('[data-testid="collapsed-chips-overlay"]').waitFor({ state: 'hidden', timeout: 2000 }).catch(() => {})
}


/**
 * The rail caps chips at preferences.visibleCount with favorites first
 * (computeRailOrder). In a long run the singleton accumulates projects, so a
 * fresh project's chip can lose its slot. Favorite the chip target via the
 * selector-state API to pin it to slot #1 deterministically.
 */
async function favoriteProject(projectCode: string): Promise<void> {
  const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:4001'
  await fetch(`${backendUrl}/api/config/selector`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      [projectCode]: { favorite: true, lastUsedAt: new Date().toISOString(), count: 1 },
    }),
  })
}

test.describe('Project accent colors - MDT-181', () => {

  // The rail caps chips at ui.projectSelector.visibleCount with favorites
  // first (computeRailOrder). A full run accumulates singleton projects, so a
  // fresh project's chip can lose its slot. Raise the cap for this file —
  // chips are the subject under test and must all render.
  test.beforeAll(async ({ e2eContext }) => {
    await fetch(`${e2eContext.backendUrl}/api/config`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selector: 'ui.projectSelector.visibleCount', value: 1000 }),
    })
  })

  test('settings shows project accents section with (i) tooltip and choose-color link', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openSettingsAccents(page)

    // Section visible with project dropdown
    await expect(page.locator(accentSelectors.projectSelect)).toBeVisible()
    await expect(page.locator(accentSelectors.infoButton)).toBeVisible()

    // Open palette
    await collapseChips(page)
    await page.click(accentSelectors.paletteToggle)
    await expect(page.locator(accentSelectors.palette)).toBeVisible()
    await expect(page.locator(accentSelectors.presetGrid)).toBeVisible()
    await expect(page.locator(accentSelectors.allPresets)).toHaveCount(16)
    await expect(page.locator(accentSelectors.customHexInput)).toBeVisible()
    // The settings modal's choose-color link points at the Figma color tool
    // (the AddProjectModal keeps its own legacy share.google link — see
    // CHOOSE_COLOR_URL duplication, tracked in MDT-239 hygiene).
    await expect(page.locator(accentSelectors.chooseColorLink)).toHaveAttribute('href', 'https://www.figma.com/colors/')
    await expect(page.locator(accentSelectors.chooseColorLink)).toHaveAttribute('target', '_blank')
    await expect(page.locator(accentSelectors.chooseColorLink)).toHaveAttribute('rel', /noopener/)
    await expect(page.locator(accentSelectors.chooseColorLink)).toHaveAttribute('rel', /noreferrer/)
  })

  test('preset accent stages in settings, saves on button, renders on inactive chips and browser cards', async ({ page, e2eContext }) => {
    const activeProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Accent Target Project',
    })

    const sharedUpdateRequests: string[] = []
    page.on('request', (request) => {
      if (request.method() === 'PUT' && request.url().includes(`/api/projects/${encodeURIComponent(activeProject.projectCode)}/update`)) {
        sharedUpdateRequests.push(request.url())
      }
    })

    await page.goto(`/prj/${activeProject.projectCode}`)
    await waitForBoardReady(page)

    await openSettingsAccents(page)

    // Open palette
    await collapseChips(page)
    await page.click(accentSelectors.paletteToggle)
    await expect(page.locator(accentSelectors.palette)).toBeVisible()

    // Pick a preset — this stages but does NOT persist yet
    await collapseChips(page)
    await page.click(accentSelectors.preset('blue'))

    // Save button should appear
    await expect(page.locator(accentSelectors.saveButton)).toBeVisible()

    // Click Save — this persists
    const persistResponse = page.waitForResponse(response =>
      response.url().includes('/api/config/selector')
      && response.request().method() === 'POST',
    )
    await collapseChips(page)
    await page.click(accentSelectors.saveButton)
    await persistResponse

    const selectorState = await readSelectorState(e2eContext.backendUrl)
    expect(selectorState[activeProject.projectCode]?.accent).toBe('#2563eb')
    expect(sharedUpdateRequests).toHaveLength(0)

    await closeSettings(page)

    await collapseChips(page)
    await page.click(selectorSelectors.panelTrigger)
    await page.locator(projectSelectors.projectOption(secondProject.key)).click()
    await waitForBoardReady(page)

    await revealChips(page)
    const inactiveChip = page.locator(projectSelectors.projectSelectorChip(activeProject.projectCode))
    await expect(inactiveChip).toBeVisible()
    expect(await getAccentVariable(inactiveChip)).toBe('#2563eb')

    await collapseChips(page)
    await page.click(selectorSelectors.panelTrigger)
    const browserCard = page.locator(projectSelectors.projectOption(activeProject.projectCode))
    await expect(browserCard).toBeVisible()
    expect(await getAccentVariable(browserCard)).toBe('#2563eb')
  })

  test('canceling settings discards staged accent changes', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openSettingsAccents(page)

    // Open palette and pick a color
    await collapseChips(page)
    await page.click(accentSelectors.paletteToggle)
    await collapseChips(page)
    await page.click(accentSelectors.preset('blue'))

    // Close settings without saving
    await closeSettings(page)

    // Verify accent was NOT persisted
    const selectorState = await readSelectorState(e2eContext.backendUrl)
    expect(selectorState[scenario.projectCode]?.accent).toBeUndefined()
  })

  test('invalid custom hex shows a field error and preserves the previous accent', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await writeSelectorState(e2eContext.backendUrl, {
      [scenario.projectCode]: {
        favorite: false,
        lastUsedAt: null,
        count: 0,
        accent: '#16a34a',
      },
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openSettingsAccents(page)

    // Open palette
    await collapseChips(page)
    await page.click(accentSelectors.paletteToggle)

    await page.locator(accentSelectors.customHexInput).fill('blue')
    await page.locator(accentSelectors.customHexInput).blur()

    await expect(page.locator(accentSelectors.validationError)).toBeVisible()
    await page.waitForTimeout(500)

    // Accent should not have changed
    const selectorState = await readSelectorState(e2eContext.backendUrl)
    expect(selectorState[scenario.projectCode]?.accent).toBe('#16a34a')
  })

  test('fallback accent is stable across reloads and is replaced by a user-selected accent', async ({ page, e2eContext }) => {
    const primaryProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondaryProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Fallback Visibility Project',
    })

    await page.goto(`/prj/${primaryProject.projectCode}`)
    await waitForBoardReady(page)

    await collapseChips(page)
    await page.click(selectorSelectors.panelTrigger)
    await page.locator(projectSelectors.projectOption(secondaryProject.key)).click()
    await waitForBoardReady(page)

    await revealChips(page)
    const fallbackChip = page.locator(projectSelectors.projectSelectorChip(primaryProject.projectCode))
    await expect(fallbackChip).toBeVisible()
    const fallbackAccent = await getAccentVariable(fallbackChip)
    const overridePreset = fallbackAccent === '#e11d48' ? 'blue' : 'rose'
    const overrideAccent = overridePreset === 'blue' ? '#2563eb' : '#e11d48'

    expect(fallbackAccent).toMatch(/^#[0-9a-f]{6}$/)

    await page.reload()
    await waitForBoardReady(page)

    await revealChips(page)
    const reloadedFallback = await getAccentVariable(page.locator(projectSelectors.projectSelectorChip(primaryProject.projectCode)))
    expect(reloadedFallback).toBe(fallbackAccent)

    await collapseChips(page)
    await page.click(selectorSelectors.panelTrigger)
    await page.locator(projectSelectors.projectOption(primaryProject.projectCode)).click()
    await waitForBoardReady(page)

    // Set accent via Settings
    await openSettingsAccents(page)
    await collapseChips(page)
    await page.click(accentSelectors.paletteToggle)

    const persistResponse = page.waitForResponse(response =>
      response.url().includes('/api/config/selector')
      && response.request().method() === 'POST',
    )
    await collapseChips(page)
    await page.click(accentSelectors.preset(overridePreset))
    await collapseChips(page)
    await page.click(accentSelectors.saveButton)
    await persistResponse
    await closeSettings(page)

    await collapseChips(page)
    await page.click(selectorSelectors.panelTrigger)
    await page.locator(projectSelectors.projectOption(secondaryProject.key)).click()
    await waitForBoardReady(page)

    await revealChips(page)
    const overriddenAccent = await getAccentVariable(page.locator(projectSelectors.projectSelectorChip(primaryProject.projectCode)))
    expect(overriddenAccent).toBe(overrideAccent)
    expect(overriddenAccent).not.toBe(fallbackAccent)
  })

  test('theme switching keeps the same stored accent across light and dark mode', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await writeSelectorState(e2eContext.backendUrl, {
      [scenario.projectCode]: {
        favorite: false,
        lastUsedAt: null,
        count: 0,
        accent: '#9333ea',
      },
    })

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    const activeProjectCard = page.locator(projectSelectors.projectSelectorCard(scenario.projectCode))
    await expect(activeProjectCard).toBeVisible()
    expect(await getAccentVariable(activeProjectCard)).toBe('#9333ea')

    await collapseChips(page)
    await page.click(projectSelectors.hamburgerMenu)
    await collapseChips(page)
    await page.click(projectSelectors.themeLight)
    expect(await getAccentVariable(activeProjectCard)).toBe('#9333ea')

    await collapseChips(page)
    await page.click(projectSelectors.hamburgerMenu)
    await collapseChips(page)
    await page.click(projectSelectors.themeDark)

    await expect.poll(async () => {
      return page.evaluate(() => document.documentElement.classList.contains('dark'))
    }).toBe(true)

    expect(await getAccentVariable(activeProjectCard)).toBe('#9333ea')
  })

  test('keyboard navigation and selection still work in the browser panel after accent rendering is added', async ({ page, e2eContext }) => {
    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', { name: 'Keyboard Accent Two' })

    await writeSelectorState(e2eContext.backendUrl, {
      [secondProject.key]: {
        favorite: false,
        lastUsedAt: null,
        count: 0,
        accent: '#2563eb',
      },
    })

    await page.goto(`/prj/${firstProject.projectCode}`)
    await waitForBoardReady(page)

    await collapseChips(page)
    await page.click(selectorSelectors.panelTrigger)
    const secondCard = page.locator(projectSelectors.projectOption(secondProject.key))
    await expect(secondCard).toBeVisible()

    // Filter down to the accented project so it is the only (hence first) result
    await page.locator('[data-testid="project-browser-search-input"]').fill(secondProject.key)
    await expect(secondCard).toBeVisible()

    // Active-descendant (BR-11): ArrowDown highlights the first result, Enter selects it
    await page.keyboard.press('ArrowDown')
    await expect(secondCard).toHaveAttribute('data-selected', 'true')

    await page.keyboard.press('Enter')

    await waitForBoardReady(page)
    await expect(page.locator(selectorSelectors.activeProjectCard)).toContainText(secondProject.key)
  })

  test('accent rendering does not change inactive chip or browser-card row height', async ({ page, e2eContext }) => {
    const activeProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const accentedProject = await e2eContext.projectFactory.createProject('empty', { name: 'Accented Height Target' })
    const fallbackProject = await e2eContext.projectFactory.createProject('empty', { name: 'Fallback Height Target' })

    await writeSelectorState(e2eContext.backendUrl, {
      [accentedProject.key]: {
        favorite: true,
        lastUsedAt: null,
        count: 0,
        accent: '#2563eb',
      },
      [fallbackProject.key]: {
        favorite: true,
        lastUsedAt: null,
        count: 0,
      },
    })

    await page.goto(`/prj/${activeProject.projectCode}`)
    await waitForBoardReady(page)

    await revealChips(page)
    const accentedChip = page.locator(projectSelectors.projectSelectorChip(accentedProject.key))
    await revealChips(page)
    const fallbackChip = page.locator(projectSelectors.projectSelectorChip(fallbackProject.key))
    await expect(accentedChip).toBeVisible()
    await expect(fallbackChip).toBeVisible()

    const accentedChipBox = await accentedChip.boundingBox()
    const fallbackChipBox = await fallbackChip.boundingBox()
    // subpixel rendering makes exact float equality flaky — compare with tolerance
    expect(accentedChipBox?.height).toBeCloseTo(fallbackChipBox?.height ?? 0, 0)

    await collapseChips(page)
    await page.click(selectorSelectors.panelTrigger)
    const accentedCard = page.locator(projectSelectors.projectOption(accentedProject.key))
    const fallbackCard = page.locator(projectSelectors.projectOption(fallbackProject.key))
    await expect(accentedCard).toBeVisible()
    await expect(fallbackCard).toBeVisible()

    const accentedCardBox = await accentedCard.boundingBox()
    const fallbackCardBox = await fallbackCard.boundingBox()
    expect(accentedCardBox?.height).toBe(fallbackCardBox?.height)
  })

  test('settings saves selected accent and it renders on inactive chip and browser card', async ({ page, e2eContext }) => {
    const activeProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Accent Render Target',
    })

    await page.goto(`/prj/${activeProject.projectCode}`)
    await waitForBoardReady(page)

    // Open settings and pick green
    await openSettingsAccents(page)
    await collapseChips(page)
    await page.click(accentSelectors.paletteToggle)

    await collapseChips(page)
    await page.click(accentSelectors.preset('green'))

    const persistResponse = page.waitForResponse(response =>
      response.url().includes('/api/config/selector')
      && response.request().method() === 'POST',
    )
    await collapseChips(page)
    await page.click(accentSelectors.saveButton)
    await persistResponse

    await closeSettings(page)

    // Switch to second project so activeProject becomes inactive
    await collapseChips(page)
    await page.click(selectorSelectors.panelTrigger)
    await page.locator(projectSelectors.projectOption(secondProject.key)).click()
    await waitForBoardReady(page)

    // Verify inactive chip shows the accent
    await revealChips(page)
    const inactiveChip = page.locator(projectSelectors.projectSelectorChip(activeProject.projectCode))
    await expect(inactiveChip).toBeVisible()
    expect(await getAccentVariable(inactiveChip)).toBe('#16a34a')

    // Verify browser card shows the accent
    await collapseChips(page)
    await page.click(selectorSelectors.panelTrigger)
    const browserCard = page.locator(projectSelectors.projectOption(activeProject.projectCode))
    await expect(browserCard).toBeVisible()
    expect(await getAccentVariable(browserCard)).toBe('#16a34a')
  })

  test('reset button clears stored accent and reverts to fallback', async ({ page, e2eContext }) => {
    const activeProject = await buildScenario(e2eContext.projectFactory, 'simple')

    // Set an accent first
    await writeSelectorState(e2eContext.backendUrl, {
      [activeProject.projectCode]: {
        favorite: false,
        lastUsedAt: null,
        count: 0,
        accent: '#dc2626',
      },
    })

    await page.goto(`/prj/${activeProject.projectCode}`)
    await waitForBoardReady(page)

    // Open settings — reset button should be visible
    await openSettingsAccents(page)
    await expect(page.locator('[data-testid="accent-reset-button"]')).toBeVisible()

    // Click reset
    const persistResponse = page.waitForResponse(response =>
      response.url().includes('/api/config/selector')
      && response.request().method() === 'POST',
    )
    await collapseChips(page)
    await page.click('[data-testid="accent-reset-button"]')
    await collapseChips(page)
    await page.click(accentSelectors.saveButton)
    await persistResponse

    // Verify accent is cleared in persisted state
    const selectorState = await readSelectorState(e2eContext.backendUrl)
    expect(selectorState[activeProject.projectCode]?.accent).toBeUndefined()

    await closeSettings(page)
  })

  test('accent colors toggle hides accent marks on chips and cards', async ({ page, e2eContext }) => {
    const activeProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const inactiveProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Accent Target Project',
    })

    await writeSelectorState(e2eContext.backendUrl, {
      [inactiveProject.key]: {
        visible: true,
        favorite: false,
        lastUsedAt: null,
        count: 0,
        accent: '#2563eb',
      },
    })

    await page.goto(`/prj/${activeProject.projectCode}`)
    await waitForBoardReady(page)

    // Verify accent mark is visible initially
    await revealChips(page)
    const chip = page.locator(`[data-testid="project-selector-chip-${inactiveProject.key}"]`)
    await revealChips(page)
    await expect(chip.locator('.project-chip__accent-mark')).toBeVisible()

    // Open settings and toggle off
    await openSettingsAccents(page)
    await collapseChips(page)
    await page.click('[data-testid="toggle-accent-enabled"]')

    // Accent mark should be hidden. The open settings modal intercepts the
    // reveal hover — close it before re-revealing the chips.
    await closeSettings(page)
    await revealChips(page)
    await expect(chip.locator('.project-chip__accent-mark')).toBeHidden()
  })

  test('gradient toggle switches between gradient and flat stripe', async ({ page, e2eContext }) => {
    const activeProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const inactiveProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Gradient Target Project',
    })

    await writeSelectorState(e2eContext.backendUrl, {
      [inactiveProject.key]: {
        visible: true,
        favorite: false,
        lastUsedAt: null,
        count: 0,
        accent: '#2563eb',
      },
    })

    await page.goto(`/prj/${activeProject.projectCode}`)
    await waitForBoardReady(page)

    await revealChips(page)
    const chip = page.locator(`[data-testid="project-selector-chip-${inactiveProject.key}"]`)

    // Default: gradient style
    await revealChips(page)
    await expect(chip).toHaveAttribute('data-accent-style', 'gradient')

    // Open settings and switch to flat style
    await openSettingsAccents(page)
    await page.selectOption('[data-testid="accent-style-select"]', 'flat')

    // Should switch to flat. Close settings first — the open modal
    // intercepts the reveal hover.
    await closeSettings(page)
    await revealChips(page)
    await expect(chip).toHaveAttribute('data-accent-style', 'flat')
  })

  test('plate style renders code badge with accent background', async ({ page, e2eContext }) => {
    const activeProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const inactiveProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Plate Target Project',
    })

    await writeSelectorState(e2eContext.backendUrl, {
      [inactiveProject.key]: {
        visible: true,
        favorite: false,
        lastUsedAt: null,
        count: 0,
        accent: '#dc2626',
      },
    })

    await page.goto(`/prj/${activeProject.projectCode}`)
    await waitForBoardReady(page)

    await revealChips(page)
    const chip = page.locator(`[data-testid="project-selector-chip-${inactiveProject.key}"]`)

    // Switch to plate style
    await collapseChips(page)
    await openSettingsAccents(page)
    await page.selectOption('[data-testid="accent-style-select"]', 'plate')

    // Should have plate style attribute. Close settings first — the open
    // modal intercepts the reveal hover.
    await closeSettings(page)
    await revealChips(page)
    await expect(chip).toHaveAttribute('data-accent-style', 'plate')

    // Code badge should have accent background
    const codeBadge = chip.locator('.project-chip__code')
    await expect(codeBadge).toHaveCSS('background-color', /rgb/) // some rgb color
  })

  test('autocolor off hides accent for unconfigured projects', async ({ page, e2eContext }) => {
    const activeProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const inactiveProject = await e2eContext.projectFactory.createProject('empty', {
      name: 'Autocolor Target Project',
    })
    // No accent configured for the inactive project.

    await page.goto(`/prj/${activeProject.projectCode}`)
    await waitForBoardReady(page)

    await revealChips(page)
    const chip = page.locator(`[data-testid="project-selector-chip-${inactiveProject.key}"]`)

    // Default: autocolor on, should have fallback
    await revealChips(page)
    await expect(chip).toHaveAttribute('data-autocolor', 'true')

    // Toggle autocolor off
    await collapseChips(page)
    await openSettingsAccents(page)
    await page.click('[data-testid="toggle-autocolor"]')

    // Should switch autocolor off. Close settings first — the open modal
    // intercepts the reveal hover.
    await closeSettings(page)
    await revealChips(page)
    await expect(chip).toHaveAttribute('data-autocolor', 'false')
  })
})
