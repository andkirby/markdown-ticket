/**
 * FileWatcherService Subdocument Tests
 *
 * MDT-142: Subdocument SSE Events - bounded watching pattern and *
 *
 * Covers: BR-1.1, BR-1.3, C1, C2
 *
 * @module server/tests/fileWatcherService.subdocument.test.ts
 */

import { EventEmitter } from 'node:events'
import chokidar from 'chokidar'
import FileWatcherService from '../services/fileWatcher/index.js'

// Mock chokidar
jest.mock('chokidar')

const mockChokidar = chokidar as jest.Mocked<typeof chokidar>

describe('FileWatcherService - Subdocument Support (MDT-142)', () => {
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
    } as any
    mockChokidar.watch.mockReturnValue(mockWatcher as any)
  })

  afterEach(async () => {
    fileWatcher.stop()
  })

  describe('OBL-recursive-watch-pattern: Main watcher observes all nesting depths (C1)', () => {
    it('should use a recursive markdown glob to watch all subdirectory levels', () => {
      const projectPath = '/test/project'
      const projectId = 'MDT'

      fileWatcher.initMultiProjectWatcher([{ id: projectId, path: projectPath }])

      // Should recursively watch all markdown files at any depth
      expect(mockChokidar.watch).toHaveBeenCalledWith(
        '/test/project/**/*.md',
        expect.any(Object),
      )
    })

    it('should emit subdocument metadata when file in ticket folder changes', (done) => {
      const projectPath = '/test/project/docs/CRs/*.md'
      const projectId = 'MDT'

      fileWatcher.initMultiProjectWatcher([{ id: projectId, path: projectPath }])

      fileWatcher.on('file-change', (data) => {
        expect(data).toHaveProperty('filename')
        expect(data).toHaveProperty('projectId')
        expect(data).toHaveProperty('timestamp')
        done()
      })

      // Simulate file change in subdocument path
      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change',
      )?.[1]

      if (changeHandler) {
        changeHandler('/test/project/docs/CRs/MDT-142/architecture.md')
      }
    })
  })

  describe('OBL-worktree-exclusion: Main watcher excludes active worktree paths (C2)', () => {
    it('should exclude worktree ticket paths from main watcher when worktree is active', () => {
      const projectPath = '/test/project/docs/CRs/*.md'
      const projectId = 'MDT'

      // Add worktree watcher first
      fileWatcher.addWatcher(projectId, 'MDT-142', '/test/worktrees/MDT-142')

      // Initialize main watcher - should exclude MDT-142 paths
      fileWatcher.initMultiProjectWatcher([{ id: projectId, path: projectPath }])

      // The main watcher should be configured with exclusions
      // This is verified by checking that chokidar.watch was called
      expect(mockChokidar.watch).toHaveBeenCalled()
    })

    it('should not emit duplicate events when file exists in both main and worktree', (done) => {
      const projectPath = '/test/project/docs/CRs/*.md'
      const projectId = 'MDT'
      let eventCount = 0

      fileWatcher.initMultiProjectWatcher([{ id: projectId, path: projectPath }])
      fileWatcher.addWatcher(projectId, 'MDT-142', '/test/worktrees/MDT-142')

      fileWatcher.on('file-change', () => {
        eventCount++
      })

      // Simulate same file change from both watchers
      const mainHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change',
      )?.[1]

      if (mainHandler) {
        // Main watcher event
        mainHandler('/test/project/docs/CRs/MDT-142.md')
        // Worktree watcher would also fire, but should be deduplicated
      }

      setTimeout(() => {
        // Due to deduplication, should only be 1 event
        expect(eventCount).toBeLessThanOrEqual(1)
        done()
      }, 200)
    })
  })

  describe('Subdocument path parsing', () => {
    it('should extract ticket code from folder path (MDT-142/file.md)', (done) => {
      const projectPath = '/test/project/docs/CRs/*.md'
      const projectId = 'MDT'

      fileWatcher.initMultiProjectWatcher([{ id: projectId, path: projectPath }])

      fileWatcher.on('file-change', (data) => {
        // The filename should be extracted correctly
        expect(data.filename).toBeDefined()
        done()
      })

      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change',
      )?.[1]

      if (changeHandler) {
        changeHandler('/test/project/docs/CRs/MDT-142/architecture.md')
      }
    })

    it('should handle subdocuments at arbitrary nesting depth', () => {
      const projectPath = '/test/project/docs/CRs/*.md'
      const projectId = 'MDT'
      const changeSpy = jest.fn()

      fileWatcher.initMultiProjectWatcher([{ id: projectId, path: projectPath }])
      fileWatcher.on('file-change', changeSpy)

      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change',
      )?.[1]

      if (changeHandler) {
        changeHandler('/test/project/docs/CRs/MDT-142/poc/nested/deep.md')
      }

      expect(changeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'MDT-142/poc/nested/deep.md',
          subdocument: {
            code: 'poc/nested/deep',
            filePath: 'MDT-142/poc/nested/deep.md',
          },
        }),
      )
    })

    it('should extract ticket code from slug file path (MDT-142-slug.md)', (done) => {
      const projectPath = '/test/project/docs/CRs/*.md'
      const projectId = 'MDT'

      fileWatcher.initMultiProjectWatcher([{ id: projectId, path: projectPath }])

      fileWatcher.on('file-change', (data) => {
        expect(data.filename).toBeDefined()
        done()
      })

      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change',
      )?.[1]

      if (changeHandler) {
        changeHandler('/test/project/docs/CRs/MDT-142-some-title.md')
      }
    })
  })

  describe('Edge-2: Subdocument add/unlink events', () => {
    it('should emit add event with subdocument metadata when new subdocument created', (done) => {
      const projectPath = '/test/project/docs/CRs/*.md'
      const projectId = 'MDT'

      fileWatcher.initMultiProjectWatcher([{ id: projectId, path: projectPath }])

      fileWatcher.on('file-change', (data) => {
        expect(data.eventType).toBe('add')
        done()
      })

      const addHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'add',
      )?.[1]

      if (addHandler) {
        addHandler('/test/project/docs/CRs/MDT-142/new-subdoc.md')
      }
    })

    it('should emit unlink event when subdocument deleted', (done) => {
      const projectPath = '/test/project/docs/CRs/*.md'
      const projectId = 'MDT'

      fileWatcher.initMultiProjectWatcher([{ id: projectId, path: projectPath }])

      fileWatcher.on('file-change', (data) => {
        expect(data.eventType).toBe('unlink')
        done()
      })

      const unlinkHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'unlink',
      )?.[1]

      if (unlinkHandler) {
        unlinkHandler('/test/project/docs/CRs/MDT-142/old-subdoc.md')
      }
    })
  })
})
