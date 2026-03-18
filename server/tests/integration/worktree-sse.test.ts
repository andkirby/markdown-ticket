/// <reference types="jest" />

import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import type { ProjectData } from '@mdt/shared/test-lib'
import type FileWatcherService from '../../services/fileWatcher/index.js'
import { promises as fs } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { commitAllChanges, createGitWorktree, initGitRepository } from '@mdt/shared/test-lib'
import { WorktreeService } from '@mdt/shared/services/WorktreeService.js'
import { cleanupTestEnvironment, setupTestEnvironment } from '../api/setup'

interface RecordedSSEEvent {
  type: string
  data: Record<string, unknown>
}

interface SSERecorder {
  events: RecordedSSEEvent[]
  close: () => Promise<void>
  waitForEvent: (matcher: (event: RecordedSSEEvent) => boolean, timeoutMs?: number) => Promise<RecordedSSEEvent>
}

const POLL_INTERVAL_MS = 50
const DEFAULT_TIMEOUT_MS = 5000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitFor<T>(
  getValue: () => T | undefined,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    const value = getValue()
    if (value !== undefined) {
      return value
    }

    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(`Timed out after ${timeoutMs}ms`)
}

function parseSSEChunk(chunk: string): RecordedSSEEvent | null {
  const dataLine = chunk
    .split('\n')
    .find(line => line.startsWith('data:'))

  if (!dataLine) {
    return null
  }

  try {
    const parsed = JSON.parse(dataLine.slice(5).trim())
    if (!isRecord(parsed) || typeof parsed.type !== 'string' || !isRecord(parsed.data)) {
      return null
    }

    return {
      type: parsed.type,
      data: parsed.data,
    }
  }
  catch {
    return null
  }
}

async function createSSERecorder(baseUrl: string): Promise<SSERecorder> {
  const controller = new AbortController()
  const response = await fetch(`${baseUrl}/api/events`, {
    headers: {
      Accept: 'text/event-stream',
    },
    signal: controller.signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`Failed to connect to SSE endpoint: ${response.status}`)
  }

  const events: RecordedSSEEvent[] = []
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const readerTask = (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })

        let separatorIndex = buffer.indexOf('\n\n')
        while (separatorIndex !== -1) {
          const chunk = buffer.slice(0, separatorIndex)
          buffer = buffer.slice(separatorIndex + 2)

          const event = parseSSEChunk(chunk)
          if (event) {
            events.push(event)
          }

          separatorIndex = buffer.indexOf('\n\n')
        }
      }
    }
    catch (error) {
      if (!controller.signal.aborted) {
        throw error
      }
    }
  })()

  await waitFor(
    () => events.find(event => event.type === 'connection'),
    3000,
  )

  return {
    events,
    async close() {
      controller.abort()
      await readerTask.catch(() => {})
    },
    async waitForEvent(matcher, timeoutMs = DEFAULT_TIMEOUT_MS) {
      return waitFor(
        () => events.find(event => matcher(event)),
        timeoutMs,
      )
    },
  }
}

async function waitForWatcherEvent<T extends Record<string, unknown>>(
  fileWatcher: FileWatcherService,
  eventName: string,
  matcher: (event: T) => boolean,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      fileWatcher.off(eventName, onEvent)
      reject(new Error(`Timed out waiting for ${eventName}`))
    }, timeoutMs)

    const onEvent = (event: T) => {
      if (!matcher(event)) {
        return
      }

      clearTimeout(timeoutId)
      fileWatcher.off(eventName, onEvent)
      resolve(event)
    }

    fileWatcher.on(eventName, onEvent)
  })
}

function matchesFileChangeEvent(
  event: RecordedSSEEvent,
  expected: {
    eventType?: 'add' | 'change' | 'unlink'
    projectId?: string
    source?: 'main' | 'worktree'
    subdocumentFilePath?: string
  },
): boolean {
  if (event.type !== 'file-change') {
    return false
  }

  const { data } = event
  const subdocument = isRecord(data.subdocument) ? data.subdocument : null

  if (expected.eventType && data.eventType !== expected.eventType) {
    return false
  }

  if (expected.projectId && data.projectId !== expected.projectId) {
    return false
  }

  if (expected.source && data.source !== expected.source) {
    return false
  }

  if (expected.subdocumentFilePath && subdocument?.filePath !== expected.subdocumentFilePath) {
    return false
  }

  return true
}

async function expectNoMatchingEvent(
  recorder: SSERecorder,
  matcher: (event: RecordedSSEEvent) => boolean,
  timeoutMs = 750,
): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (recorder.events.some(matcher)) {
      throw new Error(`Unexpected SSE event captured: ${JSON.stringify(recorder.events, null, 2)}`)
    }

    await sleep(POLL_INTERVAL_MS)
  }
}

async function createGitBackedProject(
  projectFactory: Awaited<ReturnType<typeof setupTestEnvironment>>['projectFactory'],
): Promise<{ project: ProjectData, ticketCode: string }> {
  const project = await projectFactory.createProject('empty', {
    code: 'MDT',
    name: 'MDT Worktree SSE Test',
  })

  const ticket = await projectFactory.createTestCR(project.key, {
    title: 'Wire real worktree SSE coverage',
    type: 'Feature Enhancement',
    content: 'Integration coverage for worktree-driven SSE events.',
  })

  if (!ticket.success || !ticket.crCode) {
    throw new Error(ticket.error || 'Failed to create test ticket')
  }

  await initGitRepository(project.path)
  await commitAllChanges(project.path, 'Initial test fixture commit')

  return {
    project,
    ticketCode: ticket.crCode,
  }
}

describe('Worktree SSE Integration (MDT-142)', () => {
  let context: Awaited<ReturnType<typeof setupTestEnvironment>>
  let server: Server
  let baseUrl: string

  beforeEach(async () => {
    context = await setupTestEnvironment()
    server = createServer(context.app)

    await new Promise<void>((resolve, reject) => {
      server.listen(0, '127.0.0.1', () => resolve())
      server.on('error', reject)
    })

    const address = server.address() as AddressInfo
    baseUrl = `http://127.0.0.1:${address.port}`
  })

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })

    context.fileWatcher.stop()
    await context.testEnv.cleanup()
    await cleanupTestEnvironment(context.tempDir)
  })

  it('emits a real SSE subdocument event from a git worktree with source attribution', async () => {
    const { project, ticketCode } = await createGitBackedProject(context.projectFactory)
    const ticketsPath = join(project.path, 'docs', 'CRs')
    const worktreePath = join(context.testEnv.getTempDirectory(), 'worktrees', ticketCode)

    const mainReady = waitForWatcherEvent(
      context.fileWatcher,
      'ready',
      event => event.projectId === project.key,
    )
    context.fileWatcher.initMultiProjectWatcher([{ id: project.key, path: ticketsPath }])
    await mainReady

    await createGitWorktree(project.path, {
      branchName: `feature/${ticketCode}`,
      worktreePath,
    })

    const normalizedWorktreePath = await fs.realpath(worktreePath)
    const worktreeService = new WorktreeService()
    const mapping = await worktreeService.detect(project.path, project.key)
    expect(mapping.get(ticketCode)).toBe(normalizedWorktreePath)

    const resolvedPath = await worktreeService.resolvePath(
      project.path,
      ticketCode,
      'docs/CRs',
      project.key,
    )
    expect(resolvedPath).toBe(normalizedWorktreePath)

    const worktreeReady = waitForWatcherEvent(
      context.fileWatcher,
      'worktree-ready',
      event => event.projectId === project.key && event.ticketCode === ticketCode,
    )
    context.fileWatcher.addWatcher(project.key, ticketCode, worktreePath)
    await worktreeReady

    const recorder = await createSSERecorder(baseUrl)

    try {
      const subdocumentPath = join(worktreePath, 'docs', 'CRs', ticketCode, 'architecture.md')
      await fs.mkdir(dirname(subdocumentPath), { recursive: true })
      await fs.writeFile(subdocumentPath, '# Architecture\n\nWorktree content\n', 'utf8')

      const event = await recorder.waitForEvent(candidate =>
        matchesFileChangeEvent(candidate, {
          eventType: 'add',
          projectId: project.key,
          source: 'worktree',
          subdocumentFilePath: `${ticketCode}/architecture.md`,
        }),
      )

      expect(event.data.subdocument).toEqual({
        code: 'architecture',
        filePath: `${ticketCode}/architecture.md`,
      })

      await sleep(300)
      expect(
        recorder.events.filter(candidate =>
          matchesFileChangeEvent(candidate, {
            eventType: 'add',
            projectId: project.key,
            source: 'worktree',
            subdocumentFilePath: `${ticketCode}/architecture.md`,
          }),
        ),
      ).toHaveLength(1)
    }
    finally {
      await recorder.close()
    }
  })

  it('suppresses main-project subdocument SSE events once a worktree watcher is active for that ticket', async () => {
    const { project, ticketCode } = await createGitBackedProject(context.projectFactory)
    const ticketsPath = join(project.path, 'docs', 'CRs')
    const worktreePath = join(context.testEnv.getTempDirectory(), 'worktrees', ticketCode)

    const mainReady = waitForWatcherEvent(
      context.fileWatcher,
      'ready',
      event => event.projectId === project.key,
    )
    context.fileWatcher.initMultiProjectWatcher([{ id: project.key, path: ticketsPath }])
    await mainReady

    await createGitWorktree(project.path, {
      branchName: `feature/${ticketCode}`,
      worktreePath,
    })

    const worktreeReady = waitForWatcherEvent(
      context.fileWatcher,
      'worktree-ready',
      event => event.projectId === project.key && event.ticketCode === ticketCode,
    )
    context.fileWatcher.addWatcher(project.key, ticketCode, worktreePath)
    await worktreeReady

    const recorder = await createSSERecorder(baseUrl)

    try {
      const mainSubdocumentPath = join(project.path, 'docs', 'CRs', ticketCode, 'architecture.md')
      await fs.mkdir(dirname(mainSubdocumentPath), { recursive: true })
      await fs.writeFile(mainSubdocumentPath, '# Architecture\n\nMain project content\n', 'utf8')

      await expectNoMatchingEvent(
        recorder,
        event => matchesFileChangeEvent(event, {
          projectId: project.key,
          source: 'main',
          subdocumentFilePath: `${ticketCode}/architecture.md`,
        }),
      )
    }
    finally {
      await recorder.close()
    }
  })
})
