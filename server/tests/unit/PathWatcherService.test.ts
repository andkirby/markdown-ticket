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

// Mock WorktreeService and getConfigDir
jest.mock('@mdt/shared/services/WorktreeService.js', () => ({
  WorktreeService: jest.fn().mockImplementation(() => ({
    enabled: true,
  })),
}))

jest.mock('@mdt/shared/utils/constants.js', () => ({
  getConfigDir: jest.fn().mockReturnValue('/mock/config'),
}))

// Mock fs module
const mockExistsSync = jest.fn().mockReturnValue(true)
jest.mock('node:fs', () => ({
  existsSync: () => mockExistsSync(),
}))

describe('PathWatcherService', () => {
  let service: PathWatcherService
  let mockWatcher: any

  beforeEach(() => {
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
    it('should initialize watchers for multiple project paths', () => {
      const projectPaths = [
        { id: 'project1', path: '/path1/*.md' },
        { id: 'project2', path: '/path2/*.md' },
      ]

      const readySpy = jest.fn()
      service.on('ready', readySpy)

      service.initMultiProjectWatcher(projectPaths)

      expect(chokidar.watch).toHaveBeenCalledTimes(2)
      expect(chokidar.watch).toHaveBeenCalledWith('/path1/{*.md,*/*.md}', expect.any(Object))
      expect(chokidar.watch).toHaveBeenCalledWith('/path2/{*.md,*/*.md}', expect.any(Object))
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
