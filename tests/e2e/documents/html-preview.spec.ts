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
})
