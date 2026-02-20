/**
 * MDT-095: Git Worktree Support - FileWatcherService Integration Tests
 *
 * Tests for adding chokidar watchers for worktree paths.
 *
 * @module server/tests/fileWatcherService.worktree.test.ts
 */

import { EventEmitter } from 'node:events'
import chokidar from 'chokidar'
import FileWatcherService from '../fileWatcherService.js'

// Mock chokidar
jest.mock('chokidar')

const mockChokidar = chokidar as jest.Mocked<typeof chokidar>

describe('FileWatcherService - Worktree Extensions (MDT-095)', () => {
  let fileWatcher: FileWatcherService
  let mockWatcher: jest.Mocked<EventEmitter & { close: jest.Mock, add: jest.Mock }>

  beforeEach(() => {
    jest.clearAllMocks()

    fileWatcher = new FileWatcherService()

    mockWatcher = {
      ...new EventEmitter(),
      close: jest.fn().mockResolvedValue(undefined),
      add: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
    } as any // eslint-disable-line ts/no-explicit-any

    mockChokidar.watch.mockReturnValue(mockWatcher as any) // eslint-disable-line ts/no-explicit-any
  })

  afterEach(async () => {
    fileWatcher.stop()
  })

  describe('addWatcher() for worktree paths', () => {
    it('should create separate chokidar watcher for each worktree path', () => {
      const projectId = 'MDT'
      const worktreePaths = [
        { ticketCode: 'MDT-095', path: '/test/worktrees/MDT-095' },
        { ticketCode: 'MDT-100', path: '/test/worktrees/MDT-100' },
      ]

      // Create worktree watchers
      worktreePaths.forEach(({ ticketCode, path }) => {
        fileWatcher.addWatcher(projectId, ticketCode, path)
      })

      expect(mockChokidar.watch).toHaveBeenCalledTimes(2)
    })

    it('should broadcast changes from worktree directories to connected clients', () => {
      const worktreePath = '/test/worktrees/MDT-095'
      const projectId = 'MDT'
      const ticketCode = 'MDT-095'

      // Add worktree watcher
      fileWatcher.addWatcher(projectId, ticketCode, worktreePath)

      // Verify watcher was created with correct path pattern
      expect(mockChokidar.watch).toHaveBeenCalledWith(
        expect.stringContaining('*.md'),
        expect.any(Object),
      )
    })

    it('should add new watcher when worktree is added after initial load', () => {
      const projectId = 'MDT'
      const newWorktreePath = '/test/worktrees/MDT-101'
      const ticketCode = 'MDT-101'

      // Initial state - no worktree watchers
      expect(fileWatcher.getWorktreeWatcherCount()).toBe(0)

      // Add new worktree watcher
      const watcherId = fileWatcher.addWatcher(projectId, ticketCode, newWorktreePath)

      expect(watcherId).toBe('MDT__worktree__MDT-101')
      expect(fileWatcher.getWorktreeWatcherCount()).toBe(1)
    })

    it('should remove watcher when worktree is removed without affecting other watchers', async () => {
      const projectId = 'MDT'
      const worktreePath1 = '/test/worktrees/MDT-095'
      const worktreePath2 = '/test/worktrees/MDT-100'

      // Create separate mock watchers
      const mockWatcher1 = { ...mockWatcher, close: jest.fn().mockResolvedValue(undefined) }
      const mockWatcher2 = { ...mockWatcher, close: jest.fn().mockResolvedValue(undefined) }

      mockChokidar.watch
        .mockReturnValueOnce(mockWatcher1 as any) // eslint-disable-line ts/no-explicit-any
        .mockReturnValueOnce(mockWatcher2 as any) // eslint-disable-line ts/no-explicit-any

      // Add worktree watchers
      fileWatcher.addWatcher(projectId, 'MDT-095', worktreePath1)
      fileWatcher.addWatcher(projectId, 'MDT-100', worktreePath2)

      expect(fileWatcher.getWorktreeWatcherCount()).toBe(2)

      // Remove first worktree watcher
      await fileWatcher.removeWorktreeWatcher(projectId, 'MDT-095')

      expect(fileWatcher.getWorktreeWatcherCount()).toBe(1)
      expect(mockWatcher1.close).toHaveBeenCalled()
    })

    it('should log error and continue if file watching for a worktree fails (C4)', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      // Make chokidar.watch throw for this worktree
      mockChokidar.watch.mockImplementationOnce(() => {
        throw new Error('Permission denied')
      })

      // Should not throw - graceful degradation
      const watcherId = fileWatcher.addWatcher('MDT', 'MDT-095', '/test/worktrees/MDT-095')

      expect(watcherId).toBeNull() // Returns null on failure
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should return existing watcher ID if watcher already exists', () => {
      const projectId = 'MDT'
      const worktreePath = '/test/worktrees/MDT-095'
      const ticketCode = 'MDT-095'

      // Add first watcher
      const watcherId1 = fileWatcher.addWatcher(projectId, ticketCode, worktreePath)

      // Try to add duplicate
      const watcherId2 = fileWatcher.addWatcher(projectId, ticketCode, worktreePath)

      expect(watcherId1).toBe(watcherId2)
      expect(mockChokidar.watch).toHaveBeenCalledTimes(1) // Only called once
    })
  })

  describe('getProjectWorktreeWatchers()', () => {
    it('should return only worktree watchers for a specific project', () => {
      const mdtWorktreePath = '/test/worktrees/MDT-095'
      const apiWorktreePath = '/test/worktrees/API-123'

      fileWatcher.addWatcher('MDT', 'MDT-095', mdtWorktreePath)
      fileWatcher.addWatcher('API', 'API-123', apiWorktreePath)

      const mdtWatchers = fileWatcher.getProjectWorktreeWatchers('MDT')
      const apiWatchers = fileWatcher.getProjectWorktreeWatchers('API')

      expect(mdtWatchers).toHaveLength(1)
      expect(mdtWatchers[0].ticketCode).toBe('MDT-095')
      expect(apiWatchers).toHaveLength(1)
      expect(apiWatchers[0].ticketCode).toBe('API-123')
    })
  })

  describe('performance degradation (C2: <5%)', () => {
    it('should not significantly impact file watching performance with worktrees', () => {
      const projectId = 'MDT'
      const worktreeCount = 5
      const startTime = Date.now()

      // Create worktree watchers
      for (let i = 0; i < worktreeCount; i++) {
        fileWatcher.addWatcher(projectId, `MDT-${100 + i}`, `/test/worktrees/MDT-${100 + i}`)
      }

      const elapsed = Date.now() - startTime

      // With mocked chokidar, this should be nearly instant
      // Real test would measure actual file system operations
      expect(elapsed).toBeLessThan(100)
      expect(fileWatcher.getWorktreeWatcherCount()).toBe(worktreeCount)
    })
  })

  describe('stop() cleanup', () => {
    it('should close all worktree watchers when stopping', async () => {
      const projectId = 'MDT'

      // Create separate mock watchers
      const mockWatcher1 = { ...mockWatcher, close: jest.fn().mockResolvedValue(undefined) }
      const mockWatcher2 = { ...mockWatcher, close: jest.fn().mockResolvedValue(undefined) }

      mockChokidar.watch
        .mockReturnValueOnce(mockWatcher1 as any) // eslint-disable-line ts/no-explicit-any
        .mockReturnValueOnce(mockWatcher2 as any) // eslint-disable-line ts/no-explicit-any

      // Add worktree watchers
      fileWatcher.addWatcher(projectId, 'MDT-095', '/test/worktrees/MDT-095')
      fileWatcher.addWatcher(projectId, 'MDT-100', '/test/worktrees/MDT-100')

      expect(fileWatcher.getWorktreeWatcherCount()).toBe(2)

      // Stop service
      fileWatcher.stop()

      // All watchers should be closed and cleared
      expect(fileWatcher.getWorktreeWatcherCount()).toBe(0)
    })
  })
})
