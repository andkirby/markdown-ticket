import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { documentSelectors } from '../utils/selectors.js'
import { waitForSSEEvent } from '../utils/sse-helpers.js'

async function writeDocument(projectDir: string, relativePath: string, content: string): Promise<void> {
  const absolutePath = join(projectDir, relativePath)
  await mkdir(join(absolutePath, '..'), { recursive: true })
  await writeFile(absolutePath, content, 'utf8')
}

async function addFilenameTabDocs(projectDir: string): Promise<void> {
  await writeDocument(projectDir, 'docs/some-name.md', '# Main Variant\n\nMain marker')
  await writeDocument(projectDir, 'docs/some-name.one.md', '# One Variant\n\nOne marker')
  await writeDocument(projectDir, 'docs/some-name.two.md', '# Two Variant\n\nTwo marker')
  await writeDocument(projectDir, 'docs/some-name.alpha.beta.md', '# Alpha Beta Variant\n\nAlpha beta marker')
  await writeDocument(projectDir, 'docs/some-name-extra.one.md', '# Different Base\n\nDifferent base marker')
  await writeDocument(projectDir, 'docs/standalone.md', '# Standalone\n\nStandalone marker')
}

async function waitForDocumentWatcherReady(
  fileWatcher: {
    initDocumentWatchers: (projectId: string, projectRoot: string, documentPaths: string[], ticketsPath?: string) => number
    once: (event: string, listener: (data: { projectId: string, watcherId: string }) => void) => void
  },
  projectId: string,
  expectedWatcherSuffix: string,
  startWatching: () => void,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, 1500)
    fileWatcher.once('document-ready', (data) => {
      if (data.projectId === projectId && data.watcherId.endsWith(expectedWatcherSuffix)) {
        clearTimeout(timeout)
        resolve()
      }
    })
    startWatching()
  })
}

test.describe('Documents filename tabs (MDT-169)', () => {
  test('opening a tree variant shows grouped tabs while preserving physical tree files', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Filename Tabs',
    })
    await addFilenameTabDocs(project.path)

    await page.goto(`/prj/${project.key}/documents?file=docs/some-name.two.md`)
    await page.waitForLoadState('load')

    await expect(page.locator(documentSelectors.documentItem).filter({ hasText: 'some-name.one.md' })).toBeVisible()
    await expect(page.locator(documentSelectors.documentItem).filter({ hasText: 'some-name.two.md' })).toBeVisible()
    await expect(page.locator(documentSelectors.filenameTabList)).toBeVisible()
    await expect(page.locator(documentSelectors.filenameTab('main'))).toBeVisible()
    await expect(page.locator(documentSelectors.filenameTab('one'))).toBeVisible()
    await expect(page.locator(documentSelectors.filenameTab('two'))).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator(documentSelectors.fileViewer)).toContainText('Two marker')
  })

  test('switching filename tabs updates content, URL, recents, and selected tree item', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Filename Tab Navigation',
    })
    await addFilenameTabDocs(project.path)

    await page.goto(`/prj/${project.key}/documents?file=docs/some-name.one.md`)
    await page.waitForLoadState('load')

    await page.locator(documentSelectors.filenameTab('alpha.beta')).click()

    await expect(page.locator(documentSelectors.fileViewer)).toContainText('Alpha beta marker')
    await expect(page).toHaveURL(/file=docs(?:%2F|\/)some-name\.alpha\.beta\.md/)
    await expect(page.locator(documentSelectors.recentDocument).first()).toContainText('some-name.alpha.beta.md')
    await expect(page.locator(`${documentSelectors.documentItem}[data-document-path="docs/some-name.alpha.beta.md"]`)).toHaveClass(/text-primary/)
  })

  test('standalone markdown opens without filename tabs', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Standalone Filename Tabs',
    })
    await addFilenameTabDocs(project.path)

    await page.goto(`/prj/${project.key}/documents?file=docs/standalone.md`)
    await page.waitForLoadState('load')

    await expect(page.locator(documentSelectors.fileViewer)).toContainText('Standalone marker')
    await expect(page.locator(documentSelectors.filenameTabList)).toHaveCount(0)
  })

  test('active grouped file deletion refreshes to an available sibling', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Filename Tab Deletion',
    })
    await addFilenameTabDocs(project.path)

    await waitForDocumentWatcherReady(
      e2eContext.fileWatcher,
      project.key,
      '__document__docs',
      () => e2eContext.fileWatcher.initDocumentWatchers(project.key, project.path, ['docs'], 'docs/CRs'),
    )

    await page.goto(`/prj/${project.key}/documents?file=docs/some-name.two.md`)
    await page.waitForLoadState('load')
    await expect(page.locator(documentSelectors.fileViewer)).toContainText('Two marker')

    await Promise.all([
      waitForSSEEvent(page, 'document-change', {
        eventType: 'unlink',
        projectId: project.key,
        filePath: 'docs/some-name.two.md',
      }),
      rm(join(project.path, 'docs', 'some-name.two.md')),
    ])

    await expect(page.locator(documentSelectors.filenameTab('two'))).toHaveCount(0)
    await expect(page.locator(documentSelectors.fileViewer)).not.toContainText('File was deleted')
    await expect(page.locator(documentSelectors.fileViewer)).toContainText(/Main marker|One marker|Alpha beta marker/)
  })

  test('native document SSE add, change, and unlink refresh filename tabs from the physical tree', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Filename Tab SSE Reconciliation',
    })
    await addFilenameTabDocs(project.path)

    await waitForDocumentWatcherReady(
      e2eContext.fileWatcher,
      project.key,
      '__document__docs',
      () => e2eContext.fileWatcher.initDocumentWatchers(project.key, project.path, ['docs'], 'docs/CRs'),
    )

    await page.goto(`/prj/${project.key}/documents?file=docs/some-name.one.md`)
    await page.waitForLoadState('load')
    await expect(page.locator(documentSelectors.filenameTab('one'))).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator(documentSelectors.fileViewer)).toContainText('One marker')

    await Promise.all([
      waitForSSEEvent(page, 'document-change', {
        eventType: 'add',
        projectId: project.key,
        filePath: 'docs/some-name.three.md',
      }),
      writeDocument(project.path, 'docs/some-name.three.md', '# Three Variant\n\nThree marker'),
    ])

    await expect(page.locator(documentSelectors.documentItem).filter({ hasText: 'some-name.three.md' })).toBeVisible()
    await expect(page.locator(documentSelectors.filenameTab('three'))).toBeVisible()
    await expect(page.locator(documentSelectors.filenameTab('one'))).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator(documentSelectors.fileViewer)).toContainText('One marker')

    await page.locator(documentSelectors.filenameTab('three')).click()
    await expect(page.locator(documentSelectors.fileViewer)).toContainText('Three marker')

    const refreshRequest = page.waitForRequest((request) => {
      return request.method() === 'GET'
        && request.url().includes('/api/documents/content')
        && request.url().includes(`projectId=${project.key}`)
        && request.url().includes('filePath=docs%2Fsome-name.three.md')
    })

    await Promise.all([
      waitForSSEEvent(page, 'document-change', {
        eventType: 'change',
        projectId: project.key,
        filePath: 'docs/some-name.three.md',
      }),
      refreshRequest,
      writeDocument(project.path, 'docs/some-name.three.md', '# Three Variant\n\nUpdated three marker'),
    ])

    await expect(page.locator(documentSelectors.filenameTab('three'))).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator(documentSelectors.fileViewer)).toContainText('Updated three marker', { timeout: 10000 })

    await Promise.all([
      waitForSSEEvent(page, 'document-change', {
        eventType: 'unlink',
        projectId: project.key,
        filePath: 'docs/some-name.three.md',
      }),
      rm(join(project.path, 'docs', 'some-name.three.md')),
    ])

    await expect(page.locator(documentSelectors.filenameTab('three'))).toHaveCount(0)
    await expect(page.locator(documentSelectors.fileViewer)).not.toContainText('File was deleted')
    await expect(page.locator(documentSelectors.fileViewer)).toContainText(/Main marker|One marker|Two marker|Alpha beta marker/)
  })

  test('document tree renders before grouped content fetch completion', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Filename Tab Nonblocking Tree',
    })
    await addFilenameTabDocs(project.path)

    let releaseContent: (() => void) | null = null
    await page.route('**/api/documents/content?**', async (route) => {
      const url = new URL(route.request().url())
      if (url.searchParams.get('filePath') !== 'docs/some-name.two.md') {
        await route.fallback()
        return
      }

      await new Promise<void>((resolve) => {
        releaseContent = resolve
      })
      await route.fulfill({
        status: 200,
        contentType: 'text/markdown',
        body: '# Two Variant\n\nTwo marker',
      })
    })

    const responsePromise = page.waitForRequest(request =>
      request.url().includes('/api/documents/content')
      && request.url().includes('filePath=docs%2Fsome-name.two.md'),
    )

    await page.goto(`/prj/${project.key}/documents?file=docs/some-name.two.md`)
    await responsePromise

    await expect(page.locator(documentSelectors.documentItem).filter({ hasText: 'some-name.one.md' })).toBeVisible()
    await expect(page.locator(documentSelectors.documentItem).filter({ hasText: 'some-name.two.md' })).toBeVisible()
    await expect(page.locator(documentSelectors.filenameTabList)).toBeVisible()

    releaseContent?.()
    await expect(page.locator(documentSelectors.fileViewer)).toContainText('Two marker')
  })
})
