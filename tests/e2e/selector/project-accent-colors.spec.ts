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
  await page.click(projectSelectors.hamburgerMenu)
  await page.click(sharingSelectors.settingsButton)
  await expect(page.locator(sharingSelectors.settingsModal)).toBeVisible()
  // Appearance tab is the default
  await expect(page.locator(accentSelectors.section)).toBeVisible()
}

async function closeSettings(page: import('@playwright/test').Page) {
  await page.click('[data-testid="settings-close"]')
  await expect(page.locator(sharingSelectors.settingsModal)).toBeHidden()
}

test.describe('Project accent colors - MDT-181', () => {
  test('settings shows project accents section with (i) tooltip and choose-color link', async ({ page, e2eContext }) => {
    const scenario = await buildScenario(e2eContext.projectFactory, 'simple')

    await page.goto(`/prj/${scenario.projectCode}`)
    await waitForBoardReady(page)

    await openSettingsAccents(page)

    // Section visible with project dropdown
    await expect(page.locator(accentSelectors.projectSelect)).toBeVisible()
    await expect(page.locator(accentSelectors.infoButton)).toBeVisible()

    // Open palette
    await page.click(accentSelectors.paletteToggle)
    await expect(page.locator(accentSelectors.palette)).toBeVisible()
    await expect(page.locator(accentSelectors.presetGrid)).toBeVisible()
    await expect(page.locator(accentSelectors.allPresets)).toHaveCount(16)
    await expect(page.locator(accentSelectors.customHexInput)).toBeVisible()
    await expect(page.locator(accentSelectors.chooseColorLink)).toHaveAttribute('href', 'https://share.google/ATp6ypatbFk69dC91')
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
    await page.click(accentSelectors.paletteToggle)
    await expect(page.locator(accentSelectors.palette)).toBeVisible()

    // Pick a preset — this stages but does NOT persist yet
    await page.click(accentSelectors.preset('blue'))

    // Save button should appear
    await expect(page.locator(accentSelectors.saveButton)).toBeVisible()

    // Click Save — this persists
    const persistResponse = page.waitForResponse(response =>
      response.url().includes('/api/config/selector')
      && response.request().method() === 'POST',
    )
    await page.click(accentSelectors.saveButton)
    await persistResponse

    const selectorState = await readSelectorState(e2eContext.backendUrl)
    expect(selectorState[activeProject.projectCode]?.accent).toBe('#2563eb')
    expect(sharedUpdateRequests).toHaveLength(0)

    await closeSettings(page)

    await page.click(selectorSelectors.panelTrigger)
    await page.locator(projectSelectors.projectOption(secondProject.key)).click()
    await waitForBoardReady(page)

    const inactiveChip = page.locator(projectSelectors.projectSelectorChip(activeProject.projectCode))
    await expect(inactiveChip).toBeVisible()
    expect(await getAccentVariable(inactiveChip)).toBe('#2563eb')

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
    await page.click(accentSelectors.paletteToggle)
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

    await page.click(selectorSelectors.panelTrigger)
    await page.locator(projectSelectors.projectOption(secondaryProject.key)).click()
    await waitForBoardReady(page)

    const fallbackChip = page.locator(projectSelectors.projectSelectorChip(primaryProject.projectCode))
    await expect(fallbackChip).toBeVisible()
    const fallbackAccent = await getAccentVariable(fallbackChip)
    const overridePreset = fallbackAccent === '#e11d48' ? 'blue' : 'rose'
    const overrideAccent = overridePreset === 'blue' ? '#2563eb' : '#e11d48'

    expect(fallbackAccent).toMatch(/^#[0-9a-f]{6}$/)

    await page.reload()
    await waitForBoardReady(page)

    const reloadedFallback = await getAccentVariable(page.locator(projectSelectors.projectSelectorChip(primaryProject.projectCode)))
    expect(reloadedFallback).toBe(fallbackAccent)

    await page.click(selectorSelectors.panelTrigger)
    await page.locator(projectSelectors.projectOption(primaryProject.projectCode)).click()
    await waitForBoardReady(page)

    // Set accent via Settings
    await openSettingsAccents(page)
    await page.click(accentSelectors.paletteToggle)

    const persistResponse = page.waitForResponse(response =>
      response.url().includes('/api/config/selector')
      && response.request().method() === 'POST',
    )
    await page.click(accentSelectors.preset(overridePreset))
    await page.click(accentSelectors.saveButton)
    await persistResponse
    await closeSettings(page)

    await page.click(selectorSelectors.panelTrigger)
    await page.locator(projectSelectors.projectOption(secondaryProject.key)).click()
    await waitForBoardReady(page)

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

    await page.click(projectSelectors.hamburgerMenu)
    await page.click(projectSelectors.themeLight)
    expect(await getAccentVariable(activeProjectCard)).toBe('#9333ea')

    await page.click(projectSelectors.hamburgerMenu)
    await page.click(projectSelectors.themeDark)

    await expect.poll(async () => {
      return page.evaluate(() => document.documentElement.classList.contains('dark'))
    }).toBe(true)

    expect(await getAccentVariable(activeProjectCard)).toBe('#9333ea')
  })

  test('keyboard navigation and focus management still work in the browser panel after accent rendering is added', async ({ page, e2eContext }) => {
    const firstProject = await buildScenario(e2eContext.projectFactory, 'simple')
    const secondProject = await e2eContext.projectFactory.createProject('empty', { name: 'Keyboard Accent Two' })
    const thirdProject = await e2eContext.projectFactory.createProject('empty', { name: 'Keyboard Accent Three' })

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

    await page.click(selectorSelectors.panelTrigger)
    const secondCard = page.locator(projectSelectors.projectOption(secondProject.key))
    const thirdCard = page.locator(projectSelectors.projectOption(thirdProject.key))

    await secondCard.focus()
    await expect(secondCard).toBeFocused()

    await secondCard.evaluate((element: HTMLElement) => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    })
    await expect.poll(async () => {
      return page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null)
    }).not.toBe(`project-browser-card-${secondProject.key}`)

    const focusedCardTestId = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null)
    expect(focusedCardTestId?.startsWith('project-browser-card-')).toBe(true)

    const nextProjectKey = focusedCardTestId!.replace('project-browser-card-', '')
    await page.locator(`[data-testid="${focusedCardTestId}"]`).evaluate((element: HTMLElement) => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await waitForBoardReady(page)
    await expect(page.locator(selectorSelectors.activeProjectCard)).toContainText(nextProjectKey)
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

    const accentedChip = page.locator(projectSelectors.projectSelectorChip(accentedProject.key))
    const fallbackChip = page.locator(projectSelectors.projectSelectorChip(fallbackProject.key))
    await expect(accentedChip).toBeVisible()
    await expect(fallbackChip).toBeVisible()

    const accentedChipBox = await accentedChip.boundingBox()
    const fallbackChipBox = await fallbackChip.boundingBox()
    expect(accentedChipBox?.height).toBe(fallbackChipBox?.height)

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
    await page.click(accentSelectors.paletteToggle)

    await page.click(accentSelectors.preset('green'))

    const persistResponse = page.waitForResponse(response =>
      response.url().includes('/api/config/selector')
      && response.request().method() === 'POST',
    )
    await page.click(accentSelectors.saveButton)
    await persistResponse

    await closeSettings(page)

    // Switch to second project so activeProject becomes inactive
    await page.click(selectorSelectors.panelTrigger)
    await page.locator(projectSelectors.projectOption(secondProject.key)).click()
    await waitForBoardReady(page)

    // Verify inactive chip shows the accent
    const inactiveChip = page.locator(projectSelectors.projectSelectorChip(activeProject.projectCode))
    await expect(inactiveChip).toBeVisible()
    expect(await getAccentVariable(inactiveChip)).toBe('#16a34a')

    // Verify browser card shows the accent
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
    await page.click('[data-testid="accent-reset-button"]')
    await page.click(accentSelectors.saveButton)
    await persistResponse

    // Verify accent is cleared in persisted state
    const selectorState = await readSelectorState(e2eContext.backendUrl)
    expect(selectorState[activeProject.projectCode]?.accent).toBeUndefined()

    await closeSettings(page)
  })
})
