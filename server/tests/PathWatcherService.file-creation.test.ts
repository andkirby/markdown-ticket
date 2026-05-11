import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PathWatcherService } from '../services/fileWatcher/PathWatcherService.js'

interface FileChangePayload {
  eventType: 'add' | 'change' | 'unlink'
  filename: string
  projectId: string
  subdocument: unknown
  source: 'main' | 'worktree'
}

function waitForFileChange(service: PathWatcherService, timeoutMs = 5000): Promise<FileChangePayload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      service.off('file-change', onFileChange)
      reject(new Error('Timed out waiting for file-change event'))
    }, timeoutMs)

    const onFileChange = (payload: FileChangePayload) => {
      clearTimeout(timeout)
      resolve(payload)
    }

    service.once('file-change', onFileChange)
  })
}

function waitForReady(service: PathWatcherService, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      service.off('ready', onReady)
      reject(new Error('Timed out waiting for watcher ready event'))
    }, timeoutMs)

    const onReady = () => {
      clearTimeout(timeout)
      resolve()
    }

    service.once('ready', onReady)
  })
}

describe('PathWatcherService top-level ticket file creation', () => {
  let tempDir: string
  let service: PathWatcherService

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'mdt-path-watcher-file-creation-'))
    service = new PathWatcherService()
  })

  afterEach(async () => {
    service.stop()
    await rm(tempDir, { recursive: true, force: true })
  })

  it('emits an add event when a new top-level ticket file is created with a real chokidar watcher', async () => {
    const projectRoot = join(tempDir, 'project')
    const ticketsDir = join(projectRoot, 'docs/CRs')
    await mkdir(ticketsDir, { recursive: true })

    const ready = waitForReady(service)
    service.initMultiProjectWatcher([{
      id: 'MDT',
      path: join(ticketsDir, '*.md'),
      projectRoot,
      projectCode: 'MDT',
    }])
    await ready

    const fileChange = waitForFileChange(service)
    await writeFile(join(ticketsDir, 'MDT-150-aa.md'), `---
code: MDT-150
status: Proposed
type: Feature Enhancement
priority: Medium
---

# AA
`, 'utf8')

    await expect(fileChange).resolves.toEqual(expect.objectContaining({
      eventType: 'add',
      filename: 'MDT-150.md',
      projectId: 'MDT',
      subdocument: null,
      source: 'main',
    }))
  })
})
