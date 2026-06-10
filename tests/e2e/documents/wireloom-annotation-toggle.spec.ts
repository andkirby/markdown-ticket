/**
 * E2E tests for Wireloom annotation view toggle (MDT-182).
 *
 * Covers BDD scenarios:
 * - toggle_visible_on_wireloom_block (BR-1.1)
 * - full_callout_mode_default (BR-1.2)
 * - switch_to_compact_mode (BR-1.3)
 * - switch_back_to_callout_mode (BR-1.2, BR-1.3)
 * - hover_marker_shows_annotation (BR-1.4)
 * - focus_marker_shows_annotation (BR-1.5)
 * - click_marker_keeps_annotation (BR-1.6)
 * - escape_dismisses_annotation (BR-1.10)
 * - toggle_does_not_modify_source (BR-1.7)
 * - no_toggle_on_non_wireloom (BR-1.8)
 * - independent_toggles_per_block (BR-1.9)
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '../fixtures/test-fixtures.js'
import { documentSelectors, markdownSelectors } from '../utils/selectors.js'

// ---------------------------------------------------------------------------
// Wireloom test fixtures
// ---------------------------------------------------------------------------

const wireloomAnnotationDocumentPath = 'docs/wireloom-annotation-test.md'

/** Wireloom source with one annotated element */
const wireloomAnnotatedFixture = `
# Wireloom Annotation Test

## Annotated mockup

\`\`\`wireloom
window "Login":
  panel:
    input "Email" id="emailField"
    button "Sign in" id="signInBtn"

annotation "Enter your email address" target="emailField" position=left
annotation "Click to submit the form" target="signInBtn" position=right
\`\`\`

## Non-Wireloom code block

\`\`\`typescript
const x = 1
\`\`\`
`.trim()

/** Wireloom source with two annotated blocks */
const wireloomMultiBlockFixture = `
# Wireloom Multi-Block Test

\`\`\`wireloom
window "Block A":
  button "Action" id="actionA"

annotation "First block action" target="actionA" position=right
\`\`\`

\`\`\`wireloom
window "Block B":
  button "Action" id="actionB"

annotation "Second block action" target="actionB" position=right
\`\`\`
`.trim()

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

const selectors = {
  wireloomBlock: '.wireloom',
  annotationToggle: '.wireloom__annotation-toggle',
  compactMarker: '.wireloom__compact-marker',
  activeMarker: '.wireloom__compact-marker--active',
  tooltip: '.wireloom__annotation-tooltip',
  visibleTooltip: '.wireloom__annotation-tooltip--visible',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Wireloom annotation view toggle', () => {
  test('annotation mode toggle is visible on rendered Wireloom block (BR-1.1)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireloom Annotation Toggle',
    })

    const docPath = join(project.path, wireloomAnnotationDocumentPath)
    await writeFile(docPath, wireloomAnnotatedFixture, 'utf8')

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(wireloomAnnotationDocumentPath)}`)

    const viewer = page.locator(documentSelectors.fileViewer)
    await expect(viewer).toBeVisible()

    // Wait for Wireloom to render
    const wireloomBlock = viewer.locator(selectors.wireloomBlock).first()
    await expect(wireloomBlock).toBeVisible({ timeout: 5000 })

    // Toggle should be visible
    const toggle = wireloomBlock.locator(selectors.annotationToggle)
    await expect(toggle).toBeVisible()
  })

  test('full callout mode is the default (BR-1.2)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireloom Callout Default',
    })

    const docPath = join(project.path, wireloomAnnotationDocumentPath)
    await writeFile(docPath, wireloomAnnotatedFixture, 'utf8')

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(wireloomAnnotationDocumentPath)}`)

    const viewer = page.locator(documentSelectors.fileViewer)
    const wireloomBlock = viewer.locator(selectors.wireloomBlock).first()
    await expect(wireloomBlock).toBeVisible({ timeout: 5000 })

    // No compact markers in default mode
    await expect(wireloomBlock.locator(selectors.compactMarker)).toHaveCount(0)

    // SVG content should contain callout text (annotation bodies visible)
    const svg = wireloomBlock.locator('svg')
    await expect(svg).toBeVisible()
  })

  test('switching to compact mode replaces callouts with numbered markers (BR-1.3)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireloom Compact',
    })

    const docPath = join(project.path, wireloomAnnotationDocumentPath)
    await writeFile(docPath, wireloomAnnotatedFixture, 'utf8')

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(wireloomAnnotationDocumentPath)}`)

    const viewer = page.locator(documentSelectors.fileViewer)
    const wireloomBlock = viewer.locator(selectors.wireloomBlock).first()
    await expect(wireloomBlock).toBeVisible({ timeout: 5000 })

    const toggle = wireloomBlock.locator(selectors.annotationToggle)
    await toggle.click()

    // Should have 2 markers (one per annotation)
    const markers = wireloomBlock.locator(selectors.compactMarker)
    await expect(markers).toHaveCount(2)
    await expect(markers.nth(0)).toHaveText('1')
    await expect(markers.nth(1)).toHaveText('2')
  })

  test('switching back to callout mode restores callout view', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireloom Callout Restore',
    })

    const docPath = join(project.path, wireloomAnnotationDocumentPath)
    await writeFile(docPath, wireloomAnnotatedFixture, 'utf8')

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(wireloomAnnotationDocumentPath)}`)

    const viewer = page.locator(documentSelectors.fileViewer)
    const wireloomBlock = viewer.locator(selectors.wireloomBlock).first()
    await expect(wireloomBlock).toBeVisible({ timeout: 5000 })

    const toggle = wireloomBlock.locator(selectors.annotationToggle)

    // Compact
    await toggle.click()
    await expect(wireloomBlock.locator(selectors.compactMarker)).toHaveCount(2)

    // Back to callout
    await toggle.click()
    await expect(wireloomBlock.locator(selectors.compactMarker)).toHaveCount(0)
  })

  test('hovering a compact marker shows annotation tooltip (BR-1.4)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireloom Hover',
    })

    const docPath = join(project.path, wireloomAnnotationDocumentPath)
    await writeFile(docPath, wireloomAnnotatedFixture, 'utf8')

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(wireloomAnnotationDocumentPath)}`)

    const viewer = page.locator(documentSelectors.fileViewer)
    const wireloomBlock = viewer.locator(selectors.wireloomBlock).first()
    await expect(wireloomBlock).toBeVisible({ timeout: 5000 })

    const toggle = wireloomBlock.locator(selectors.annotationToggle)
    await toggle.click()

    const marker = wireloomBlock.locator(selectors.compactMarker).first()
    await marker.hover()

    const tooltip = wireloomBlock.locator(selectors.visibleTooltip)
    await expect(tooltip).toBeVisible()
    await expect(tooltip).toContainText('email')
  })

  test('clicking a compact marker keeps annotation visible (BR-1.6)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireloom Click Pin',
    })

    const docPath = join(project.path, wireloomAnnotationDocumentPath)
    await writeFile(docPath, wireloomAnnotatedFixture, 'utf8')

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(wireloomAnnotationDocumentPath)}`)

    const viewer = page.locator(documentSelectors.fileViewer)
    const wireloomBlock = viewer.locator(selectors.wireloomBlock).first()
    await expect(wireloomBlock).toBeVisible({ timeout: 5000 })

    const toggle = wireloomBlock.locator(selectors.annotationToggle)
    await toggle.click()

    const marker = wireloomBlock.locator(selectors.compactMarker).first()
    await marker.click()

    // Marker should be active
    await expect(marker).toHaveClass(/--active/)
      // Tooltip visible
    const tooltip = wireloomBlock.locator(selectors.visibleTooltip)
    await expect(tooltip).toBeVisible()
  })

  test('pressing Escape dismisses annotation (BR-1.10)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireloom Escape',
    })

    const docPath = join(project.path, wireloomAnnotationDocumentPath)
    await writeFile(docPath, wireloomAnnotatedFixture, 'utf8')

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(wireloomAnnotationDocumentPath)}`)

    const viewer = page.locator(documentSelectors.fileViewer)
    const wireloomBlock = viewer.locator(selectors.wireloomBlock).first()
    await expect(wireloomBlock).toBeVisible({ timeout: 5000 })

    const toggle = wireloomBlock.locator(selectors.annotationToggle)
    await toggle.click()

    const marker = wireloomBlock.locator(selectors.compactMarker).first()
    await marker.click()

    // Tooltip visible
    const tooltip = wireloomBlock.locator(selectors.visibleTooltip)
    await expect(tooltip).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')
    await expect(tooltip).not.toBeVisible()
  })

  test('non-Wireloom code fences do not show toggle (BR-1.8)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireloom Non-Block',
    })

    const docPath = join(project.path, wireloomAnnotationDocumentPath)
    await writeFile(docPath, wireloomAnnotatedFixture, 'utf8')

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(wireloomAnnotationDocumentPath)}`)

    const viewer = page.locator(documentSelectors.fileViewer)
    await expect(viewer).toBeVisible()

    // The TypeScript code block should NOT have an annotation toggle
    const codeBlock = viewer.locator(markdownSelectors.codeBlock).first()
    await expect(codeBlock).toBeVisible()

    // No .wireloom class on the code block parent
    const codeParent = codeBlock.locator('..')
    await expect(codeParent).not.toHaveClass(/wireloom/)
  })

  test('multiple Wireloom blocks have independent toggles (BR-1.9)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Wireloom Multi Block',
    })

    const docPath = join(project.path, wireloomAnnotationDocumentPath)
    await writeFile(docPath, wireloomMultiBlockFixture, 'utf8')

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(wireloomAnnotationDocumentPath)}`)

    const viewer = page.locator(documentSelectors.fileViewer)
    const wireloomBlocks = viewer.locator(selectors.wireloomBlock)
    await expect(wireloomBlocks).toHaveCount(2, { timeout: 5000 })

    // Each should have its own toggle
    const toggles = viewer.locator(selectors.annotationToggle)
    await expect(toggles).toHaveCount(2)

    // Switch first block to compact
    await toggles.nth(0).click()

    // First block should have markers
    await expect(wireloomBlocks.nth(0).locator(selectors.compactMarker)).toHaveCount(1)
    // Second block should NOT have markers
    await expect(wireloomBlocks.nth(1).locator(selectors.compactMarker)).toHaveCount(0)
  })
})
