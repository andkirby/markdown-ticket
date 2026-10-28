import * as chokidar from 'chokidar'
import { PathWatcherService } from '../../services/fileWatcher/PathWatcherService.js'

// Mock chokidar
jest.mock('chokidar', () => {
  const mockWatcher = {
    on: jest.fn().mockReturnThis(),
    close: jest.fn().mockResolvedValue(undefined),
  }

  return {
    watch: jest.fn().mockReturnValue(mockWatcher),
  }
})

const mockDetectWorktrees = jest.fn().mockResolvedValue(new Map())

// Mock WorktreeService and getConfigDir
jest.mock('@mdt/shared/services/WorktreeService.js', () => ({
  WorktreeService: jest.fn().mockImplementation(() => ({
    enabled: true,
    detect: mockDetectWorktrees,
    extractTicketCode: jest.requireActual<typeof import('@mdt/shared/services/WorktreeService.js')>('@mdt/shared/services/WorktreeService.js').WorktreeService.prototype.extractTicketCode,
  })),
}))

jest.mock('@mdt/shared/utils/constants.js', () => ({
  getConfigDir: jest.fn().mockReturnValue('/mock/config'),
}))

// Mock fs module
const mockExistsSync = jest.fn().mockReturnValue(true)
const mockReadFileSync = jest.fn()
const mockReaddirSync = jest.fn().mockReturnValue([])
jest.mock('node:fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
  readdirSync: () => mockReaddirSync(),
}))

describe('PathWatcherService', () => {
  let service: PathWatcherService
  let mockWatcher: any

  beforeEach(() => {
    mockReaddirSync.mockReturnValue([])
    mockExistsSync.mockReturnValue(true)
    mockDetectWorktrees.mockReset().mockResolvedValue(new Map())
    service = new PathWatcherService()
    mockWatcher = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined),
    }
    ;(chokidar.watch as jest.Mock).mockReturnValue(mockWatcher)
  })

  afterEach(() => {
    service.stop()
    jest.clearAllMocks()
  })

  describe('Multi-path monitoring (BR-1.1)', () => {
    it.each(['startup', 'live'])('resolves a relative gitdir backlink during %s discovery', async (mode) => {
      mockReaddirSync.mockReturnValue(mode === 'startup' ? ['first'] : [])
      mockReadFileSync.mockImplementation((filePath: string) => filePath.endsWith('/HEAD')
        ? 'ref: refs/heads/TP0-042'
        : '../../../../worktrees/first/.git')
      if (mode === 'startup')
        service.addWatcher('p', 'TP0-042', '/worktrees/first')
      const added = jest.fn()
      const removed = jest.fn()
      service.on('worktree-added', added)
      service.on('worktree-removed', removed)
      service.initWorktreeHeadWatcher('/project', 'p', 'TP0')
      const onAdd = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'add')[1]
      const onUnlink = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'unlink')[1]
      const headPath = '/project/.git/worktrees/first/HEAD'
      if (mode === 'live') {
        onAdd(headPath)
        expect(added).toHaveBeenCalledWith({ projectId: 'p', ticketCode: 'TP0-042', worktreePath: '/worktrees/first' })
      }
      onUnlink(headPath)
      await new Promise(resolve => setImmediate(resolve))
      expect(removed).toHaveBeenCalledWith({ projectId: 'p', ticketCode: 'TP0-042' })
    })

    function deferredWorktrees() {
      let resolve!: (mapping: Map<string, string>) => void
      const promise = new Promise<Map<string, string>>((fulfill) => {
        resolve = fulfill
      })
      mockDetectWorktrees.mockReturnValueOnce(promise)
      return resolve
    }

    function startPendingHead() {
      const resolve = deferredWorktrees()
      mockReadFileSync.mockImplementation((filePath: string) => filePath.endsWith('/HEAD')
        ? 'ref: refs/heads/TP0-042'
        : 'gitdir: /project/.git/worktrees/first')
      service.initWorktreeHeadWatcher('/project', 'p', 'TP0')
      mockExistsSync.mockImplementation((filePath: string) => !filePath.endsWith('/gitdir'))
      const onAdd = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'add')[1]
      const onUnlink = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'unlink')[1]
      onAdd('/project/.git/worktrees/first/HEAD')
      return { resolve, onAdd, onUnlink }
    }

    it.each(['stop', 'stopProject', 'unlink'])('cancels pending HEAD discovery on %s', async (action) => {
      const { resolve, onAdd, onUnlink } = startPendingHead()
      const added = jest.fn()
      service.on('worktree-added', added)
      if (action === 'stop')
        service.stop()
      else if (action === 'stopProject')
        await service.stopProject('p')
      else
        onUnlink('/project/.git/worktrees/first/HEAD')
      const watchCount = (chokidar.watch as jest.Mock).mock.calls.length
      resolve(new Map([['TP0-042', '/worktrees/first']]))
      await new Promise(fulfill => setImmediate(fulfill))
      expect(service.getWorktreeWatcherCount()).toBe(0)
      expect(added).not.toHaveBeenCalled()
      if (action !== 'unlink') {
        // Queued events from a detached old watcher cannot provision a new owner.
        onAdd('/project/.git/worktrees/first/HEAD')
        await new Promise(fulfill => setImmediate(fulfill))
        expect((chokidar.watch as jest.Mock).mock.calls).toHaveLength(watchCount)
      }
    })

    it.each(['stop', 'stopProject'])('cancels pending initial discovery on %s', async (action) => {
      const resolve = deferredWorktrees()
      const starting = service.initWorktreeWatchers('p', '/project', 'TP0')
      if (action === 'stop')
        service.stop()
      else
        await service.stopProject('p')
      resolve(new Map([['TP0-042', '/worktrees/first']]))
      expect(await starting).toBe(0)
      expect(service.getWorktreeWatcherCount()).toBe(0)
      expect(chokidar.watch).not.toHaveBeenCalled()
    })

    it('detaches old project ownership before awaiting close and preserves its replacement', async () => {
      let finishClose!: () => void
      mockWatcher.close.mockReturnValue(new Promise<void>((resolve) => {
        finishClose = resolve
      }))
      service.addWatcher('p', 'TP0-042', '/worktrees/old')
      const stopping = service.stopProject('p')
      const replacement = { on: jest.fn().mockReturnThis(), close: jest.fn().mockResolvedValue(undefined) }
      ;(chokidar.watch as jest.Mock).mockReturnValue(replacement)
      service.addWatcher('p', 'TP0-042', '/worktrees/new')
      finishClose()
      await stopping
      expect(service.getProjectWorktreeWatchers('p')[0]?.worktreePath).toBe('/worktrees/new')
      expect(replacement.close).not.toHaveBeenCalled()
    })

    it('detaches a removed worktree before awaiting close and preserves the next root', async () => {
      let finishClose!: () => void
      mockWatcher.close.mockReturnValue(new Promise<void>((resolve) => {
        finishClose = resolve
      }))
      service.addWatcher('p', 'TP0-042', '/worktrees/old')
      const stopping = service.removeWorktreeWatcher('p', 'TP0-042')
      const replacement = { on: jest.fn().mockReturnThis(), close: jest.fn().mockResolvedValue(undefined) }
      ;(chokidar.watch as jest.Mock).mockReturnValue(replacement)
      service.addWatcher('p', 'TP0-042', '/worktrees/new')
      finishClose()
      await stopping
      expect(service.getProjectWorktreeWatchers('p')[0]?.worktreePath).toBe('/worktrees/new')
      expect(replacement.close).not.toHaveBeenCalled()
    })

    it('keeps another project whose id has the same prefix', async () => {
      service.initMultiProjectWatcher([{ id: 'p', path: '/p/*.md' }])
      const other = { on: jest.fn().mockReturnThis(), close: jest.fn().mockResolvedValue(undefined) }
      ;(chokidar.watch as jest.Mock).mockReturnValue(other)
      service.initMultiProjectWatcher([{ id: 'p2', path: '/p2/*.md' }])
      await service.stopProject('p')
      expect(other.close).not.toHaveBeenCalled()
    })

    it('does not resurrect a removed selected root from another HEAD discovery', async () => {
      mockReaddirSync.mockReturnValue(['first'])
      mockReadFileSync.mockImplementation((filePath: string) => filePath.endsWith('/HEAD')
        ? 'ref: refs/heads/TP0-042'
        : filePath.endsWith('/.git') ? 'gitdir: /project/.git/worktrees/first' : '/worktrees/first/.git')
      service.addWatcher('p', 'TP0-042', '/worktrees/first')
      service.initWorktreeHeadWatcher('/project', 'p', 'TP0')
      const resolve = deferredWorktrees()
      mockExistsSync.mockImplementation((filePath: string) => !filePath.endsWith('/second/gitdir'))
      const added = jest.fn()
      service.on('worktree-added', added)
      const onAdd = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'add')[1]
      const onUnlink = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'unlink')[1]
      onAdd('/project/.git/worktrees/second/HEAD')
      onUnlink('/project/.git/worktrees/first/HEAD')
      resolve(new Map([['TP0-042', '/worktrees/first']]))
      await new Promise(fulfill => setImmediate(fulfill))
      expect(service.getWorktreeWatcherCount()).toBe(0)
      expect(added).not.toHaveBeenCalled()
    })

    it('releases worktree exclusions when a project is restarted without a worktree', async () => {
      service.addWatcher('p', 'TP0-042', '/worktrees/old')
      await service.stopProject('p')
      const main = { on: jest.fn().mockReturnThis(), close: jest.fn().mockResolvedValue(undefined) }
      ;(chokidar.watch as jest.Mock).mockReturnValue(main)
      service.initMultiProjectWatcher([{ id: 'p', path: '/project/docs/CRs/*.md' }])
      const fileChanged = jest.fn()
      service.on('file-change', fileChanged)
      const onAdd = main.on.mock.calls.find((call: [string]) => call[0] === 'add')[1]
      onAdd('/project/docs/CRs/TP0-042-title.md')
      expect(fileChanged).toHaveBeenCalledWith(expect.objectContaining({ filename: 'TP0-042.md', projectId: 'p', source: 'main' }))
    })

    it('removes a worktree that was present before HEAD watching began', async () => {
      mockReaddirSync.mockReturnValue(['arbitrary-name'])
      mockReadFileSync.mockImplementation((filePath: string) => filePath.endsWith('/HEAD')
        ? 'ref: refs/heads/TP0-042-description'
        : '/worktrees/arbitrary-name/.git')
      service.addWatcher('p', 'TP0-042', '/worktrees/arbitrary-name')
      service.initWorktreeHeadWatcher('/project', 'p', 'TP0')
      const removed = jest.fn()
      service.on('worktree-removed', removed)
      const onUnlink = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'unlink')[1]
      onUnlink('/project/.git/worktrees/arbitrary-name/HEAD')
      await new Promise(resolve => setImmediate(resolve))
      expect(removed).toHaveBeenCalledWith({ projectId: 'p', ticketCode: 'TP0-042' })
    })

    it('keeps the selected watcher when an unselected duplicate HEAD disappears', async () => {
      mockReaddirSync.mockReturnValue(['first', 'second'])
      mockReadFileSync.mockImplementation((filePath: string) => filePath.endsWith('/HEAD')
        ? 'ref: refs/heads/TP0-042'
        : `/worktrees/${filePath.includes('/first/') ? 'first' : 'second'}/.git`)
      service.addWatcher('p', 'TP0-042', '/worktrees/first')
      service.initWorktreeHeadWatcher('/project', 'p', 'TP0')
      const removed = jest.fn()
      service.on('worktree-removed', removed)
      const onUnlink = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'unlink')[1]
      onUnlink('/project/.git/worktrees/second/HEAD')
      await new Promise(resolve => setImmediate(resolve))
      expect(removed).not.toHaveBeenCalled()
      expect(service.getWorktreeWatcherCount()).toBe(1)
    })

    it('does not announce a duplicate root while retaining the first watcher', () => {
      mockReadFileSync.mockImplementation((filePath: string) => filePath.endsWith('/HEAD')
        ? 'ref: refs/heads/TP0-042'
        : '/worktrees/second/.git')
      service.addWatcher('p', 'TP0-042', '/worktrees/first')
      service.initWorktreeHeadWatcher('/project', 'p', 'TP0')
      const added = jest.fn()
      service.on('worktree-added', added)
      const onAdd = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'add')[1]
      onAdd('/project/.git/worktrees/second/HEAD')
      expect(added).not.toHaveBeenCalled()
      expect(service.getWorktreeWatcherCount()).toBe(1)
    })

    it('attributes a missing-gitdir fallback through the selected root, not the triggering duplicate HEAD', async () => {
      mockReadFileSync.mockImplementation((filePath: string) => filePath.endsWith('/HEAD')
        ? 'ref: refs/heads/TP0-042'
        : 'gitdir: /project/.git/worktrees/first')
      mockDetectWorktrees.mockResolvedValue(new Map([['TP0-042', '/worktrees/first']]))
      service.addWatcher('p', 'TP0-042', '/worktrees/first')
      service.initWorktreeHeadWatcher('/project', 'p', 'TP0')
      mockExistsSync.mockImplementation((filePath: string) => !filePath.endsWith('/gitdir'))
      const removed = jest.fn()
      service.on('worktree-removed', removed)
      const onAdd = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'add')[1]
      const onUnlink = [...mockWatcher.on.mock.calls].reverse().find((call: [string]) => call[0] === 'unlink')[1]
      onAdd('/project/.git/worktrees/second/HEAD')
      await new Promise(resolve => setImmediate(resolve))
      onUnlink('/project/.git/worktrees/second/HEAD')
      await new Promise(resolve => setImmediate(resolve))
      expect(removed).not.toHaveBeenCalled()
      expect(service.getWorktreeWatcherCount()).toBe(1)
      const removal = new Promise<void>(resolve => service.once('worktree-removed', () => resolve()))
      onUnlink('/project/.git/worktrees/first/HEAD')
      await removal
      expect(service.getWorktreeWatcherCount()).toBe(0)
    })

    it.each(['TP0-042', 'TP0-10000', 'MDT-042'])('routes HEAD additions and removal to the exact worktree root for %s', async (key) => {
      const projectCode = key.split('-')[0]
      mockReadFileSync.mockImplementation((filePath: string) => filePath.endsWith('/HEAD')
        ? `ref: refs/heads/feature/${key}-description`
        : `/worktrees/arbitrary-name/.git\n`)
      const added = jest.fn()
      const removed = jest.fn()
      service.on('worktree-added', added)
      service.on('worktree-removed', removed)
      service.initWorktreeHeadWatcher('/project', 'p', projectCode)
      const headPath = '/project/.git/worktrees/arbitrary-name/HEAD'
      const onAdd = mockWatcher.on.mock.calls.find((call: [string]) => call[0] === 'add')[1]
      const onUnlink = mockWatcher.on.mock.calls.find((call: [string]) => call[0] === 'unlink')[1]
      onAdd(headPath)
      expect(added).toHaveBeenCalledWith({ projectId: 'p', ticketCode: key, worktreePath: '/worktrees/arbitrary-name' })
      const removal = new Promise<void>(resolve => service.once('worktree-removed', () => resolve()))
      onUnlink(headPath)
      await removal
      expect(removed).toHaveBeenCalledWith({ projectId: 'p', ticketCode: key })
    })

    it('should initialize watchers for multiple project paths', () => {
      const projectPaths = [
        { id: 'project1', path: '/path1/*.md' },
        { id: 'project2', path: '/path2/*.md' },
      ]

      const readySpy = jest.fn()
      service.on('ready', readySpy)

      service.initMultiProjectWatcher(projectPaths)

      expect(chokidar.watch).toHaveBeenCalledTimes(2)
      expect(chokidar.watch).toHaveBeenCalledWith('/path1/**/*.md', expect.any(Object))
      expect(chokidar.watch).toHaveBeenCalledWith('/path2/**/*.md', expect.any(Object))
      expect(mockWatcher.on).toHaveBeenCalledWith('ready', expect.any(Function))
    })

    it('should skip duplicate project IDs', () => {
      const projectPaths = [
        { id: 'project1', path: '/path1/*.md' },
        { id: 'project1', path: '/path2/*.md' },
      ]

      service.initMultiProjectWatcher(projectPaths)

      expect(chokidar.watch).toHaveBeenCalledTimes(1)
    })

    it('should emit ready event when watcher is ready', () => {
      const readySpy = jest.fn()
      service.on('ready', readySpy)

      service.initMultiProjectWatcher([{ id: 'test', path: '/test/*.md' }])

      // Get the 'ready' callback and call it
      const readyCallback = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'ready',
      )?.[1]
      readyCallback?.()

      expect(readySpy).toHaveBeenCalledWith({ projectId: 'test' })
    })

    // MDT-186: chokidar must not follow symlinks. An outward symlink in a watched
    // tree (e.g. a DMG-build staging `Applications -> /Applications` inside an
    // Xcode project) lets the watcher escape the project root and hit macOS symlink
    // loops (Xcode's Ruby.framework/Headers/ruby/...), causing ELOOP crashes.
    it('should disable symlink following to contain the watch tree (MDT-186)', () => {
      service.initMultiProjectWatcher([{ id: 'test', path: '/test/*.md' }])

      expect(chokidar.watch).toHaveBeenCalledWith(
        '/test/**/*.md',
        expect.objectContaining({ followSymlinks: false }),
      )
    })
  })

  describe('Dynamic path addition (BR-1.3)', () => {
    it('should add a worktree watcher successfully', () => {
      const addSpy = jest.fn()
      service.on('worktree-ready', addSpy)

      const watcherId = service.addWatcher('MDT', 'MDT-095', '/path/to/worktree')

      expect(watcherId).toBe('MDT__worktree__MDT-095')
      expect(chokidar.watch).toHaveBeenCalledWith(
        expect.stringContaining('*.md'),
        expect.any(Object),
      )

      // Simulate ready event
      const readyCallback = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'ready',
      )?.[1]
      readyCallback?.()

      expect(addSpy).toHaveBeenCalledWith({
        projectId: 'MDT',
        ticketCode: 'MDT-095',
        watcherId: 'MDT__worktree__MDT-095',
      })
    })

    it('should return existing watcher ID if already exists', () => {
      service.addWatcher('MDT', 'MDT-095', '/path/to/worktree')

      const watcherId2 = service.addWatcher('MDT', 'MDT-095', '/path/to/worktree')

      expect(watcherId2).toBe('MDT__worktree__MDT-095')
      expect(chokidar.watch).toHaveBeenCalledTimes(1)
    })

    it('should emit worktree-error on watcher error', () => {
      const errorSpy = jest.fn()
      service.on('worktree-error', errorSpy)

      service.addWatcher('MDT', 'MDT-095', '/path/to/worktree')

      const errorCallback = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'error',
      )?.[1]
      const testError = new Error('Watcher failed')
      errorCallback?.(testError)

      expect(errorSpy).toHaveBeenCalledWith({
        error: testError,
        projectId: 'MDT',
        ticketCode: 'MDT-095',
      })
    })

    it('should gracefully degrade if watcher creation fails', () => {
      ;(chokidar.watch as jest.Mock).mockImplementation(() => {
        throw new Error('Watch path not found')
      })

      const errorSpy = jest.fn()
      service.on('error', errorSpy)

      const watcherId = service.addWatcher('MDT', 'MDT-095', '/invalid/path')

      expect(watcherId).toBeNull()
      expect(errorSpy).toHaveBeenCalled()
    })
  })

  describe('Dynamic path removal (BR-1.4)', () => {
    it('should remove worktree watcher successfully', async () => {
      service.addWatcher('MDT', 'MDT-095', '/path/to/worktree')

      await service.removeWorktreeWatcher('MDT', 'MDT-095')

      expect(mockWatcher.close).toHaveBeenCalled()
      expect(service.getWorktreeWatcherCount()).toBe(0)
    })

    it('should handle removal of non-existent watcher gracefully', async () => {
      await expect(
        service.removeWorktreeWatcher('MDT', 'NONEXISTENT'),
      ).resolves.not.toThrow()
    })

    it('should continue if close fails', async () => {
      service.addWatcher('MDT', 'MDT-095', '/path/to/worktree')

      mockWatcher.close.mockRejectedValue(new Error('Close failed'))

      await expect(
        service.removeWorktreeWatcher('MDT', 'MDT-095'),
      ).resolves.not.toThrow()

      expect(service.getWorktreeWatcherCount()).toBe(0)
    })

    it('should only remove the specified watcher', async () => {
      service.addWatcher('MDT', 'MDT-095', '/path1')
      service.addWatcher('MDT', 'MDT-096', '/path2')

      await service.removeWorktreeWatcher('MDT', 'MDT-095')

      expect(service.getWorktreeWatcherCount()).toBe(1)
      const watchers = service.getProjectWorktreeWatchers('MDT')
      expect(watchers).toHaveLength(1)
      expect(watchers[0].ticketCode).toBe('MDT-096')
    })
  })

  describe('Worktree watcher management', () => {
    it('should return worktree watchers for a project', () => {
      service.addWatcher('MDT', 'MDT-095', '/path1')
      service.addWatcher('MDT', 'MDT-096', '/path2')
      service.addWatcher('OTHER', 'OTHER-001', '/path3')

      const mdtWatchers = service.getProjectWorktreeWatchers('MDT')

      expect(mdtWatchers).toHaveLength(2)
      expect(mdtWatchers.map(w => w.ticketCode)).toEqual(['MDT-095', 'MDT-096'])
    })

    it('should return worktree watcher count', () => {
      expect(service.getWorktreeWatcherCount()).toBe(0)

      service.addWatcher('MDT', 'MDT-095', '/path1')
      service.addWatcher('MDT', 'MDT-096', '/path2')

      expect(service.getWorktreeWatcherCount()).toBe(2)
    })
  })

  describe('File change handling', () => {
    it('preserves distinct physical paths for same-key slugged files internally', () => {
      const changeSpy = jest.fn()
      service.on('file-change', changeSpy)
      service.initMultiProjectWatcher([{ id: 'test', path: '/test/*.md' }])
      const addCallback = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'add',
      )?.[1]
      addCallback?.('/test/MDT-258-original.md')
      addCallback?.('/test/MDT-258-manual.md')
      expect(changeSpy.mock.calls.map(([event]) => event.physicalFilePath)).toEqual([
        '/test/MDT-258-original.md',
        '/test/MDT-258-manual.md',
      ])
      expect(changeSpy.mock.calls.map(([event]) => event.filename)).toEqual(['MDT-258.md', 'MDT-258.md'])
    })

    it('should emit file-change event for ticket markdown files', () => {
      const changeSpy = jest.fn()
      service.on('file-change', changeSpy)

      service.initMultiProjectWatcher([{ id: 'test', path: '/test/*.md' }])

      const changeCallback = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'change',
      )?.[1]

      changeCallback?.('/test/MDT-095.md')

      expect(changeSpy).toHaveBeenCalledWith({
        eventType: 'change',
        filename: 'MDT-095.md',
        physicalFilePath: '/test/MDT-095.md',
        projectId: 'test',
        source: 'main',
        subdocument: null,
        timestamp: expect.any(Number),
      })
    })

    it('should ignore non-.md files', () => {
      const changeSpy = jest.fn()
      service.on('file-change', changeSpy)

      service.initMultiProjectWatcher([{ id: 'test', path: '/test/*' }])

      const changeCallback = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'change',
      )?.[1]

      changeCallback?.('/test/file.txt')

      expect(changeSpy).not.toHaveBeenCalled()
    })

    it('should emit subdocument metadata for ticket subdocument files', () => {
      const changeSpy = jest.fn()
      service.on('file-change', changeSpy)

      service.initMultiProjectWatcher([{ id: 'test', path: '/test/*' }])

      const changeCallback = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'change',
      )?.[1]

      changeCallback?.('/test/MDT-095/architecture.md')

      expect(changeSpy).toHaveBeenCalledWith({
        eventType: 'change',
        filename: 'MDT-095/architecture.md',
        physicalFilePath: '/test/MDT-095/architecture.md',
        projectId: 'test',
        source: 'main',
        subdocument: {
          code: 'architecture',
          filePath: 'MDT-095/architecture.md',
        },
        timestamp: expect.any(Number),
      })
    })
  })

  describe('Document watcher handling (MDT-160)', () => {
    it('should watch configured document directories and files only', () => {
      const count = service.initDocumentWatchers(
        'test',
        '/project',
        ['docs', 'README.md'],
        'docs/CRs',
      )

      expect(count).toBe(2)
      expect(chokidar.watch).toHaveBeenCalledWith('/project/docs/**/*.{md,html,htm}', expect.any(Object))
      expect(chokidar.watch).toHaveBeenCalledWith('/project/README.md', expect.any(Object))
    })

    it('should not create document watchers inside tickets path', () => {
      const count = service.initDocumentWatchers(
        'test',
        '/project',
        ['docs/CRs', 'docs/CRs/MDT-160.md'],
        'docs/CRs',
      )

      expect(count).toBe(0)
      expect(chokidar.watch).not.toHaveBeenCalled()
    })

    it('should emit document-change with project-relative file path', () => {
      const changeSpy = jest.fn()
      service.on('document-change', changeSpy)

      service.initDocumentWatchers('test', '/project', ['docs'], 'docs/CRs')

      const changeCallback = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'change',
      )?.[1]

      changeCallback?.('/project/docs/guide.md')

      expect(changeSpy).toHaveBeenCalledWith({
        eventType: 'change',
        filePath: 'docs/guide.md',
        absoluteFilePath: '/project/docs/guide.md',
        projectId: 'test',
        timestamp: expect.any(Number),
      })
    })

    it('should ignore document events for ticket files', () => {
      const changeSpy = jest.fn()
      service.on('document-change', changeSpy)

      service.initDocumentWatchers('test', '/project', ['docs'], 'docs/CRs')

      const changeCallback = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'change',
      )?.[1]

      changeCallback?.('/project/docs/CRs/MDT-160.md')

      expect(changeSpy).not.toHaveBeenCalled()
    })

    it('should replace existing document watchers when reconfigured', async () => {
      service.initDocumentWatchers('test', '/project', ['docs'], 'docs/CRs')

      const count = await service.reconfigureDocumentWatchers(
        'test',
        '/project',
        ['guides', 'README.md'],
        'docs/CRs',
      )

      expect(count).toBe(2)
      expect(mockWatcher.close).toHaveBeenCalled()
      expect(chokidar.watch).toHaveBeenCalledWith('/project/guides/**/*.{md,html,htm}', expect.any(Object))
      expect(chokidar.watch).toHaveBeenCalledWith('/project/README.md', expect.any(Object))
    })
  })

  describe('Project path resolution', () => {
    it('should return registered path', () => {
      service.initMultiProjectWatcher([{ id: 'test', path: '/test/path/*.md' }])

      const projectPath = service.getProjectPath('test')

      expect(projectPath).toBe('/test/path/')
    })

    it('should handle legacy debug project', () => {
      const debugPath = service.getProjectPath('debug')

      expect(debugPath).toContain('debug-tasks')
    })

    it('should handle legacy markdown-ticket project', () => {
      const mdtPath = service.getProjectPath('markdown-ticket')

      expect(mdtPath).toContain('docs')
      expect(mdtPath).toContain('CRs')
    })
  })

  describe('Race condition handling (Edge-3.1)', () => {
    it('should handle concurrent add operations safely', () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(
          service.addWatcher('MDT', `MDT-${i}`, `/path/${i}`),
        ))

      return Promise.all(promises).then((watcherIds) => {
        expect(watcherIds.every(id => id !== null)).toBe(true)
        expect(service.getWorktreeWatcherCount()).toBe(10)
      })
    })

    it('should handle concurrent add/remove operations', async () => {
      // Add multiple watchers
      service.addWatcher('MDT', 'MDT-095', '/path1')
      service.addWatcher('MDT', 'MDT-096', '/path2')
      service.addWatcher('MDT', 'MDT-097', '/path3')

      // Concurrent remove operations
      await Promise.all([
        service.removeWorktreeWatcher('MDT', 'MDT-095'),
        service.removeWorktreeWatcher('MDT', 'MDT-096'),
      ])

      expect(service.getWorktreeWatcherCount()).toBe(1)
    })
  })

  describe('Graceful degradation (C-2.4, Edge-3.2)', () => {
    it('should continue if one project watcher fails', () => {
      ;(chokidar.watch as jest.Mock)
        .mockImplementationOnce(() => {
          throw new Error('Path 1 failed')
        })
        .mockReturnValue(mockWatcher)

      const errorSpy = jest.fn()
      service.on('error', errorSpy)

      service.initMultiProjectWatcher([
        { id: 'project1', path: '/path1/*.md' },
        { id: 'project2', path: '/path2/*.md' },
      ])

      expect(errorSpy).toHaveBeenCalledTimes(1)
      // Second watcher should still be created
      expect(chokidar.watch).toHaveBeenCalledTimes(2)
    })

    it('should emit error event without crashing', () => {
      const errorSpy = jest.fn()
      service.on('error', errorSpy)

      service.initMultiProjectWatcher([{ id: 'test', path: '/test/*.md' }])

      const errorCallback = mockWatcher.on.mock.calls.find(
        (call: [string, (...args: unknown[]) => void]) => call[0] === 'error',
      )?.[1]

      errorCallback?.(new Error('Watcher error'))

      expect(errorSpy).toHaveBeenCalledWith({
        error: expect.any(Error),
        projectId: 'test',
      })
    })
  })

  describe('Stop and cleanup', () => {
    it('should stop all watchers', () => {
      service.initMultiProjectWatcher([
        { id: 'project1', path: '/path1/*.md' },
        { id: 'project2', path: '/path2/*.md' },
      ])
      service.addWatcher('MDT', 'MDT-095', '/worktree')

      service.stop()

      expect(mockWatcher.close).toHaveBeenCalled()
      expect(service.getWorktreeWatcherCount()).toBe(0)
    })

    it('should handle close errors during stop', () => {
      service.initMultiProjectWatcher([{ id: 'test', path: '/test/*.md' }])

      mockWatcher.close.mockRejectedValue(new Error('Close failed'))

      expect(() => service.stop()).not.toThrow()
    })
  })

  describe('EventEmitter interface', () => {
    it('should support on() method', () => {
      const listener = jest.fn()
      service.on('test-event', listener)

      service.emit('test-event', { data: 'test' })

      expect(listener).toHaveBeenCalledWith({ data: 'test' })
    })
  })
})
