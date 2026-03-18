import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '../fixtures/test-fixtures.js'
import { waitForBoardReady } from '../utils/helpers.js'
import { waitForSSEEvent } from '../utils/sse-helpers.js'
import { subdocSelectors, ticketSelectors } from '../utils/selectors.js'

const TICKETS_PATH = 'docs/CRs'

async function writeSubdocument(
  projectDir: string,
  ticketCode: string,
  filename: string,
  content: string,
): Promise<void> {
  const subdocumentDir = join(projectDir, TICKETS_PATH, ticketCode)
  await mkdir(subdocumentDir, { recursive: true })
  await writeFile(join(subdocumentDir, filename), content, 'utf8')
}

test.describe('Subdocument SSE Events (MDT-142)', () => {
  test('deep-linked trace subdocument refetches and updates content after file change', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Subdocument SSE Refresh',
    })

    const ticket = await e2eContext.projectFactory.createTestCR(project.key, {
      title: 'Verify SSE refresh for trace subdocument',
      type: 'Bug Fix',
      status: 'Proposed',
      priority: 'High',
      content: '# Main Ticket\n\nMain ticket content',
    })

    expect(ticket.success).toBe(true)
    expect(ticket.crCode).toBeDefined()

    const ticketCode = ticket.crCode!
    const initialContent = '# BBB Trace\n\nInitial trace marker'
    const updatedContent = '# BBB Trace\n\nUpdated trace marker'
    const subdocumentFilename = 'bbb.trace.md'
    const subdocumentFilePath = `${ticketCode}/${subdocumentFilename}`
    const subdocumentApiPath = 'bbb.trace'

    await writeSubdocument(project.path, ticketCode, subdocumentFilename, initialContent)

    e2eContext.fileWatcher.initMultiProjectWatcher([
      { id: project.key, path: `${project.path}/docs/CRs` },
    ])

    const deepLinkUrl = `/prj/${project.key}/ticket/${ticketCode}/${subdocumentFilename}`

    await page.goto(deepLinkUrl)
    await waitForBoardReady(page)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    const content = detailPanel.locator(subdocSelectors.content)

    await expect(detailPanel).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/prj/${project.key}/ticket/${ticketCode}/bbb\\.trace\\.md$`))
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('bbb'))).toHaveAttribute('data-state', 'active')
    await expect(content).toContainText('Initial trace marker')

    const refreshRequest = page.waitForRequest((request) => {
      return request.method() === 'GET'
        && request.url().includes(`/api/projects/${project.key}/crs/${ticketCode}/subdocuments/${subdocumentApiPath}`)
    })

    await Promise.all([
      waitForSSEEvent(page, 'file-change', {
        eventType: 'change',
        'projectId': project.key,
        'subdocument.filePath': subdocumentFilePath,
      }),
      refreshRequest,
      writeSubdocument(project.path, ticketCode, subdocumentFilename, updatedContent),
    ])

    await expect(content).toContainText('Updated trace marker', { timeout: 10000 })
    await expect(detailPanel).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/prj/${project.key}/ticket/${ticketCode}/bbb\\.trace\\.md$`))
  })

  test('authored architecture.md deep link refetches after file change', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Authored Stage SSE Refresh',
    })

    const ticket = await e2eContext.projectFactory.createTestCR(project.key, {
      title: 'Verify SSE refresh for authored architecture stage document',
      type: 'Bug Fix',
      status: 'Proposed',
      priority: 'High',
      content: '# Main Ticket\n\nMain ticket content',
    })

    expect(ticket.success).toBe(true)
    expect(ticket.crCode).toBeDefined()

    const ticketCode = ticket.crCode!
    const subdocumentFilename = 'architecture.md'
    const subdocumentApiPath = 'architecture'
    const subdocumentFilePath = `${ticketCode}/${subdocumentFilename}`
    const initialContent = [
      '# Architecture',
      '',
      '## Current Implementation',
      '',
      '- Initial architecture marker (`architecture_authored_refresh`)',
    ].join('\n')
    const updatedContent = [
      '# Architecture',
      '',
      '## Current Implementation',
      '',
      '- Updated architecture marker (`architecture_authored_refresh`)',
    ].join('\n')

    await writeSubdocument(project.path, ticketCode, subdocumentFilename, initialContent)

    e2eContext.fileWatcher.initMultiProjectWatcher([
      { id: project.key, path: `${project.path}/docs/CRs` },
    ])

    await page.goto(`/prj/${project.key}/ticket/${ticketCode}/${subdocumentFilename}`)
    await waitForBoardReady(page)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    const content = detailPanel.locator(subdocSelectors.content)

    await expect(detailPanel).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/prj/${project.key}/ticket/${ticketCode}/architecture\\.md$`))
    await expect(detailPanel.locator(subdocSelectors.tabTrigger('architecture'))).toHaveAttribute('data-state', 'active')
    await expect(content).toContainText('Initial architecture marker')

    const refreshRequest = page.waitForRequest((request) => {
      return request.method() === 'GET'
        && request.url().includes(`/api/projects/${project.key}/crs/${ticketCode}/subdocuments/${subdocumentApiPath}`)
    })

    await Promise.all([
      waitForSSEEvent(page, 'file-change', {
        eventType: 'change',
        projectId: project.key,
        'subdocument.filePath': subdocumentFilePath,
      }),
      refreshRequest,
      writeSubdocument(project.path, ticketCode, subdocumentFilename, updatedContent),
    ])

    await expect(content).toContainText('Updated architecture marker', { timeout: 10000 })
    await expect(detailPanel).toBeVisible()
  })

  test('autogenerated architecture.trace.md deep link refetches after rendered trace update', async ({ page, e2eContext }) => {
    const project = await e2eContext.projectFactory.createProject('empty', {
      name: 'Spec Trace SSE Refresh',
    })

    const ticket = await e2eContext.projectFactory.createTestCR(project.key, {
      title: 'Verify SSE refresh for rendered architecture trace subdocument',
      type: 'Bug Fix',
      status: 'Proposed',
      priority: 'High',
      content: '# Main Ticket\n\nMain ticket content',
    })

    expect(ticket.success).toBe(true)
    expect(ticket.crCode).toBeDefined()

    const ticketCode = ticket.crCode!
    const subdocumentFilename = 'architecture.trace.md'
    const subdocumentApiPath = 'architecture.trace'
    const subdocumentFilePath = `${ticketCode}/${subdocumentFilename}`
    const initialContent = [
      '# Architecture Trace',
      '',
      '## Coverage',
      '',
      '- Initial SSE coverage marker (`architecture_trace_refresh`)',
    ].join('\n')
    const updatedContent = [
      '# Architecture Trace',
      '',
      '## Coverage',
      '',
      '- Updated SSE coverage marker (`architecture_trace_refresh`)',
    ].join('\n')

    await writeSubdocument(project.path, ticketCode, 'architecture.md', '# Architecture\n\nArchitecture root')
    await writeSubdocument(project.path, ticketCode, subdocumentFilename, initialContent)

    e2eContext.fileWatcher.initMultiProjectWatcher([
      { id: project.key, path: `${project.path}/docs/CRs` },
    ])

    await page.goto(`/prj/${project.key}/ticket/${ticketCode}/${subdocumentFilename}`)
    await waitForBoardReady(page)

    const detailPanel = page.locator(ticketSelectors.detailPanel)
    const content = detailPanel.locator(subdocSelectors.content)

    await expect(detailPanel).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`/prj/${project.key}/ticket/${ticketCode}/architecture\\.trace\\.md$`))
    await expect(content).toContainText('Initial SSE coverage marker')

    const refreshRequest = page.waitForRequest((request) => {
      return request.method() === 'GET'
        && request.url().includes(`/api/projects/${project.key}/crs/${ticketCode}/subdocuments/${subdocumentApiPath}`)
    })

    await Promise.all([
      waitForSSEEvent(page, 'file-change', {
        eventType: 'change',
        projectId: project.key,
        'subdocument.filePath': subdocumentFilePath,
      }),
      refreshRequest,
      writeSubdocument(project.path, ticketCode, subdocumentFilename, updatedContent),
    ])

    await expect(content).toContainText('Updated SSE coverage marker', { timeout: 10000 })
    await expect(detailPanel).toBeVisible()
  })
})
