import { expect, test } from '../fixtures/test-fixtures.js'
import { addHtmlPreviewDocs, htmlPreviewDocumentPath } from '../utils/html-preview-fixtures.js'
import { documentSelectors, htmlSandboxSelectors } from '../utils/selectors.js'

test.describe('HTML Document Preview (MDT-221)', () => {
  test('renders a multi-file HTML document in a sandboxed iframe with sibling assets', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'HTML Preview E2E',
      documentPaths: ['docs/site'],
    })
    await addHtmlPreviewDocs(project.path)

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(htmlPreviewDocumentPath)}`)
    await page.waitForLoadState('load')

    // The file-viewer wrapper is present
    const viewer = page.locator(documentSelectors.fileViewer)
    await expect(viewer).toBeVisible()

    // The HTML iframe is rendered (not the markdown viewer)
    const iframe = page.locator(htmlSandboxSelectors.iframe)
    await expect(iframe).toBeVisible()

    // sandbox attribute excludes allow-same-origin
    const sandbox = await iframe.getAttribute('sandbox')
    expect(sandbox).toContain('allow-scripts')
    expect(sandbox).not.toContain('allow-same-origin')

    // The fixture content renders inside the iframe
    const frame = iframe.contentFrame()
    await expect(frame.locator('#title')).toHaveText('HTML Preview Fixture')

    // Sibling assets load (the fixture's onload handlers flip data attributes)
    await expect(frame.locator('#probe')).toHaveAttribute('data-js', 'true', { timeout: 5000 })
    await expect(frame.locator('#probe')).toHaveAttribute('data-css', 'true', { timeout: 5000 })

    // The fixture inline script ran
    await expect(frame.locator('#probe')).toHaveAttribute('data-script-ran', 'true')
  })

  test('previewed HTML cannot read parent DOM or localStorage (sandbox isolation)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'HTML Preview Isolation',
      documentPaths: ['docs/site'],
    })
    await addHtmlPreviewDocs(project.path)

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(htmlPreviewDocumentPath)}`)
    await page.waitForLoadState('load')

    const iframe = page.locator(htmlSandboxSelectors.iframe)
    await expect(iframe).toBeVisible()
    const frame = iframe.contentFrame()

    // The fixture probes parent access and localStorage; both must be blocked
    // (the sandbox lacks allow-same-origin, so access throws).
    await expect(frame.locator('#probe')).toHaveAttribute('data-parent', 'blocked', { timeout: 5000 })
    await expect(frame.locator('#probe')).toHaveAttribute('data-localstorage', 'blocked', { timeout: 5000 })
  })

  test('previewed HTML cannot fetch /api/* (connect-src none)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'HTML Preview CSP',
      documentPaths: ['docs/site'],
    })
    await addHtmlPreviewDocs(project.path)

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(htmlPreviewDocumentPath)}`)
    await page.waitForLoadState('load')

    const iframe = page.locator(htmlSandboxSelectors.iframe)
    await expect(iframe).toBeVisible()
    const frame = iframe.contentFrame()

    // The fixture attempts fetch('/api/status'); connect-src 'none' blocks it
    await expect(frame.locator('#probe')).toHaveAttribute('data-fetch', 'blocked', { timeout: 5000 })
  })

  test('fullscreen overlays the viewport and exits on Escape without reloading the preview (MDT-221 r3)', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'HTML Preview Fullscreen',
      documentPaths: ['docs/site'],
    })
    await addHtmlPreviewDocs(project.path)

    await page.goto(`/prj/${project.key}/documents?file=${encodeURIComponent(htmlPreviewDocumentPath)}`)
    await page.waitForLoadState('load')

    const wrapper = page.locator('.html-sandbox-viewer')
    const iframe = page.locator(htmlSandboxSelectors.iframe)
    await expect(iframe).toBeVisible()
    // contentFrame() yields a FrameLocator (locator-only); evaluate needs the
    // raw Frame, resolved by URL (the sandboxed frame has an opaque origin but
    // is still registered in page.frames()). Poll: the lazy iframe element can
    // be visible before its frame is attached/navigated.
    await expect.poll(() => page.frame({ url: /\/api\/documents\/raw-preview\// }) !== null).toBe(true)
    const frame = page.frame({ url: /\/api\/documents\/raw-preview\// })!

    // Marker inside the frame proves the browsing context never reloads across
    // the toggle (a remount or forced reload would wipe it).
    await frame!.evaluate(() => {
      (window as unknown as Record<string, unknown>).__mdtFullscreenMarker = 'alive'
    })

    await page.locator(htmlSandboxSelectors.fullscreenToggle).click()
    await expect(wrapper).toHaveClass(/html-sandbox-viewer--fullscreen/)

    // Overlay geometry: the wrapper becomes a viewport-sized fixed box.
    const viewport = page.viewportSize()!
    const box = await wrapper.boundingBox()
    expect(box).not.toBeNull()
    expect(Math.round(box!.x)).toBe(0)
    expect(Math.round(box!.y)).toBe(0)
    expect(Math.round(box!.width)).toBe(viewport.width)
    expect(Math.round(box!.height)).toBe(viewport.height)

    // No reload: the marker survived entering fullscreen.
    expect(await frame!.evaluate(() => (window as unknown as Record<string, unknown>).__mdtFullscreenMarker)).toBe('alive')

    // Escape exits and the preview is still the same loaded document.
    await page.keyboard.press('Escape')
    await expect(wrapper).not.toHaveClass(/html-sandbox-viewer--fullscreen/)
    expect(await frame!.evaluate(() => (window as unknown as Record<string, unknown>).__mdtFullscreenMarker)).toBe('alive')
  })
})
