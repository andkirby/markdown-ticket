import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, test } from '../fixtures/test-fixtures.js'
import { waitForSSEEvent } from '../utils/sse-helpers.js'
import { documentSelectors, pathSelectorSelectors } from '../utils/selectors.js'

async function writeDocument(projectDir: string, relativePath: string, content: string): Promise<void> {
  const absolutePath = join(projectDir, relativePath)
  await mkdir(join(absolutePath, '..'), { recursive: true })
  await writeFile(absolutePath, content, 'utf8')
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

test.describe('Document SSE live updates', () => {
  test('captures add, change, and delete events for configured document files', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Document SSE Live Updates',
    })

    await writeDocument(project.path, 'docs/live.md', '# Live Document\n\nInitial document marker')

    await waitForDocumentWatcherReady(
      e2eContext.fileWatcher,
      project.key,
      '__document__docs',
      () => e2eContext.fileWatcher.initDocumentWatchers(project.key, project.path, ['docs'], 'docs/CRs'),
    )

    await page.goto(`/prj/${project.key}/documents/docs/live.md`)

    const fileViewer = page.locator(documentSelectors.fileViewer)
    await expect(fileViewer).toBeVisible()
    await expect(fileViewer).toContainText('Initial document marker')

    await Promise.all([
      waitForSSEEvent(page, 'document-change', {
        eventType: 'add',
        projectId: project.key,
        filePath: 'docs/added.md',
      }),
      writeDocument(project.path, 'docs/added.md', '# Added Document\n\nAdded document marker'),
    ])

    await expect(
      page.locator(documentSelectors.documentItem).filter({ hasText: 'added.md' }),
    ).toBeVisible({ timeout: 10000 })

    const refreshRequest = page.waitForRequest((request) => {
      return request.method() === 'GET'
        && request.url().includes('/api/documents/content')
        && request.url().includes(`projectId=${project.key}`)
        && request.url().includes('filePath=docs%2Flive.md')
    })

    await Promise.all([
      waitForSSEEvent(page, 'document-change', {
        eventType: 'change',
        projectId: project.key,
        filePath: 'docs/live.md',
      }),
      refreshRequest,
      writeDocument(project.path, 'docs/live.md', '# Live Document\n\nUpdated document marker'),
    ])

    await expect(fileViewer).toContainText('Updated document marker', { timeout: 10000 })

    await Promise.all([
      waitForSSEEvent(page, 'document-change', {
        eventType: 'unlink',
        projectId: project.key,
        filePath: 'docs/live.md',
      }),
      rm(join(project.path, 'docs/live.md')),
    ])

    await expect(fileViewer).toContainText('File was deleted', { timeout: 10000 })
    await expect(
      page.locator(documentSelectors.documentItem).filter({ hasText: 'live.md' }),
    ).toHaveCount(0)
  })

  test('saving Select Document Paths starts watching newly selected document paths', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Document Path Reconfiguration',
    })

    await writeDocument(project.path, 'docs/current.md', '# Current Docs\n\nCurrent path marker')
    await writeDocument(project.path, 'guides/live.md', '# Guide Document\n\nInitial guide marker')

    await waitForDocumentWatcherReady(
      e2eContext.fileWatcher,
      project.key,
      '__document__docs',
      () => e2eContext.fileWatcher.initDocumentWatchers(project.key, project.path, ['docs'], 'docs/CRs'),
    )

    await page.goto(`/prj/${project.key}/documents`)

    const configureButton = page.locator(pathSelectorSelectors.configureButton)
    await expect(configureButton).toBeVisible({ timeout: 10000 })
    await configureButton.click()

    const pathSelector = page.locator(pathSelectorSelectors.pathSelector)
    await expect(pathSelector).toBeVisible()

    const guidesCheckbox = page.locator(pathSelectorSelectors.pathCheckbox('guides'))
    await expect(guidesCheckbox).toBeVisible({ timeout: 10000 })
    await guidesCheckbox.check()

    const saveButton = page.locator(pathSelectorSelectors.saveButton)
    await expect(saveButton).toBeEnabled()

    await waitForDocumentWatcherReady(
      e2eContext.fileWatcher,
      project.key,
      '__document__guides',
      () => {
        void saveButton.click()
      },
    )

    await expect(pathSelector).not.toBeVisible({ timeout: 5000 })

    await page.goto(`/prj/${project.key}/documents/guides/live.md`)

    const fileViewer = page.locator(documentSelectors.fileViewer)
    await expect(fileViewer).toBeVisible()
    await expect(fileViewer).toContainText('Initial guide marker')

    const refreshRequest = page.waitForRequest((request) => {
      return request.method() === 'GET'
        && request.url().includes('/api/documents/content')
        && request.url().includes(`projectId=${project.key}`)
        && request.url().includes('filePath=guides%2Flive.md')
    })

    await Promise.all([
      waitForSSEEvent(page, 'document-change', {
        eventType: 'change',
        projectId: project.key,
        filePath: 'guides/live.md',
      }),
      refreshRequest,
      writeDocument(project.path, 'guides/live.md', '# Guide Document\n\nUpdated guide marker'),
    ])

    await expect(fileViewer).toContainText('Updated guide marker', { timeout: 10000 })
  })

  test('refreshes rendered Wireloom block when only the fence content changes', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Document Wireloom SSE Refresh',
    })

    const initialContent = [
      '# Wireloom Refresh',
      '',
      '```wireloom',
      'window "Documents View":',
      '  panel:',
      '    text "Initial wireloom marker"',
      '```',
    ].join('\n')

    const updatedContent = [
      '# Wireloom Refresh',
      '',
      '```wireloom',
      'window "Documents View":',
      '  panel:',
      '    text "Updated wireloom marker"',
      '```',
    ].join('\n')

    await writeDocument(project.path, 'docs/wireloom.md', initialContent)

    await waitForDocumentWatcherReady(
      e2eContext.fileWatcher,
      project.key,
      '__document__docs',
      () => e2eContext.fileWatcher.initDocumentWatchers(project.key, project.path, ['docs'], 'docs/CRs'),
    )

    await page.goto(`/prj/${project.key}/documents/docs/wireloom.md`)

    const fileViewer = page.locator(documentSelectors.fileViewer)
    await expect(fileViewer).toBeVisible()
    await expect(fileViewer).toContainText('Initial wireloom marker')

    const refreshRequest = page.waitForRequest((request) => {
      return request.method() === 'GET'
        && request.url().includes('/api/documents/content')
        && request.url().includes(`projectId=${project.key}`)
        && request.url().includes('filePath=docs%2Fwireloom.md')
    })

    await Promise.all([
      waitForSSEEvent(page, 'document-change', {
        eventType: 'change',
        projectId: project.key,
        filePath: 'docs/wireloom.md',
      }),
      refreshRequest,
      writeDocument(project.path, 'docs/wireloom.md', updatedContent),
    ])

    await expect(fileViewer).toContainText('Updated wireloom marker', { timeout: 10000 })
    await expect(fileViewer).not.toContainText('Initial wireloom marker')
  })
})
