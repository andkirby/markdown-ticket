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

// Mock dependencies
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

describe('RegistryWatcher (BR-1.6)', () => {
  let service: PathWatcherService
  let mockWatcher: any

  beforeEach(() => {
    mockExistsSync.mockReturnValue(true)
    service = new PathWatcherService()
    mockWatcher = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined),
    }
    ;(chokidar.watch as jest.Mock).mockClear().mockReturnValue(mockWatcher)
  })

  afterEach(() => {
    service.stop()
    jest.clearAllMocks()
  })

  describe('Global registry watcher initialization', () => {
    it('should initialize global registry watcher', () => {
      service.initGlobalRegistryWatcher()

      expect(chokidar.watch).toHaveBeenCalledWith(
        '/mock/config/projects/*.toml',
        expect.objectContaining({
          ignoreInitial: true,
          persistent: true,
        }),
      )
    })

    it('should not initialize if registry directory does not exist', () => {
      mockExistsSync.mockReturnValue(false)

      service.initGlobalRegistryWatcher()

      expect(chokidar.watch).not.toHaveBeenCalled()
    })

    it('should set up event handlers for registry events', () => {
      service.initGlobalRegistryWatcher()

      expect(mockWatcher.on).toHaveBeenCalledWith('add', expect.any(Function))
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function))
      expect(mockWatcher.on).toHaveBeenCalledWith('unlink', expect.any(Function))
      expect(mockWatcher.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(mockWatcher.on).toHaveBeenCalledWith('ready', expect.any(Function))
    })

    it('should emit error on watcher creation failure', () => {
      ;(chokidar.watch as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to create watcher')
      })

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const errorSpy = jest.fn()
      service.on('error', errorSpy)

      service.initGlobalRegistryWatcher()

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(errorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Registry change detection', () => {
    it('should emit project-created event on file add', () => {
      const createdSpy = jest.fn()
      service.on('project-created', createdSpy)

      service.initGlobalRegistryWatcher()

      const addCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'add',
      )?.[1]

      addCallback?.('/mock/config/projects/MDT.toml')

      expect(createdSpy).toHaveBeenCalledWith({
        projectId: 'MDT',
        timestamp: expect.any(Number),
        eventId: expect.stringMatching(/^evt_\d+_\w+$/),
        source: 'file_watcher',
      })
    })

    it('should emit project-updated event on file change', () => {
      const updatedSpy = jest.fn()
      service.on('project-updated', updatedSpy)

      service.initGlobalRegistryWatcher()

      const changeCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'change',
      )?.[1]

      changeCallback?.('/mock/config/projects/MDT.toml')

      expect(updatedSpy).toHaveBeenCalledWith({
        projectId: 'MDT',
        timestamp: expect.any(Number),
        eventId: expect.stringMatching(/^evt_\d+_\w+$/),
        source: 'file_watcher',
      })
    })

    it('should emit project-deleted event on file unlink', () => {
      const deletedSpy = jest.fn()
      service.on('project-deleted', deletedSpy)

      service.initGlobalRegistryWatcher()

      const unlinkCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'unlink',
      )?.[1]

      unlinkCallback?.('/mock/config/projects/MDT.toml')

      expect(deletedSpy).toHaveBeenCalledWith({
        projectId: 'MDT',
        timestamp: expect.any(Number),
        eventId: expect.stringMatching(/^evt_\d+_\w+$/),
        source: 'file_watcher',
      })
    })

    it('should extract project ID from filename', () => {
      const events: any[] = []
      service.on('project-created', data => events.push(data))
      service.on('project-updated', data => events.push(data))
      service.on('project-deleted', data => events.push(data))

      service.initGlobalRegistryWatcher()

      const addCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'add',
      )?.[1]
      const changeCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'change',
      )?.[1]
      const unlinkCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'unlink',
      )?.[1]

      addCallback?.('/mock/config/projects/TEST-PROJECT.toml')
      changeCallback?.('/mock/config/projects/ANOTHER-PROJECT.toml')
      unlinkCallback?.('/mock/config/projects/THIRD-PROJECT.toml')

      expect(events).toHaveLength(3)
      expect(events[0].projectId).toBe('TEST-PROJECT')
      expect(events[1].projectId).toBe('ANOTHER-PROJECT')
      expect(events[2].projectId).toBe('THIRD-PROJECT')
    })

    it('should generate unique event IDs', () => {
      const eventIds = new Set<string>()
      service.on('project-created', (data: any) => eventIds.add(data.eventId))

      service.initGlobalRegistryWatcher()

      const addCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'add',
      )?.[1]

      addCallback?.('/mock/config/projects/proj1.toml')
      addCallback?.('/mock/config/projects/proj2.toml')
      addCallback?.('/mock/config/projects/proj3.toml')

      expect(eventIds.size).toBe(3)
    })

    it('should emit registry-change event with full event data', () => {
      const changeSpy = jest.fn()
      service.on('registry-change', changeSpy)

      service.initGlobalRegistryWatcher()

      const changeCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'change',
      )?.[1]

      changeCallback?.('/mock/config/projects/MDT.toml')

      expect(changeSpy).toHaveBeenCalledWith({
        type: 'project-updated',
        data: {
          projectId: 'MDT',
          timestamp: expect.any(Number),
          eventId: expect.stringMatching(/^evt_\d+_\w+$/),
          source: 'file_watcher',
        },
      })
    })
  })

  describe('Registry watcher error handling', () => {
    it('should handle watcher errors gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      service.initGlobalRegistryWatcher()

      const errorCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'error',
      )?.[1]

      const testError = new Error('Registry watcher failed')
      errorCallback?.(testError)

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it('should log when registry watcher is ready', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      service.initGlobalRegistryWatcher()

      const readyCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'ready',
      )?.[1]

      readyCallback?.()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Global registry watcher ready'),
      )
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Multiple registry events', () => {
    it('should handle multiple registry changes in sequence', () => {
      const events: string[] = []
      service.on('project-created', () => events.push('created'))
      service.on('project-updated', () => events.push('updated'))
      service.on('project-deleted', () => events.push('deleted'))

      service.initGlobalRegistryWatcher()

      const addCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'add',
      )?.[1]
      const changeCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'change',
      )?.[1]
      const unlinkCallback = mockWatcher.on.mock.calls.find(
        (call: unknown[]) => call[0] === 'unlink',
      )?.[1]

      addCallback?.('/mock/config/projects/proj1.toml')
      changeCallback?.('/mock/config/projects/proj1.toml')
      unlinkCallback?.('/mock/config/projects/proj1.toml')

      expect(events).toEqual(['created', 'updated', 'deleted'])
    })
  })

  describe('Coexistence with project watchers', () => {
    it('should not interfere with project file watchers', () => {
      const projectSpy = jest.fn()
      const registrySpy = jest.fn()

      service.on('ready', projectSpy)
      service.on('project-created', registrySpy)

      // Initialize project watchers
      service.initMultiProjectWatcher([{ id: 'test', path: '/test/*.md' }])

      // Initialize registry watcher
      service.initGlobalRegistryWatcher()

      // Simulate project watcher ready - get first ready callback
      const readyCalls = mockWatcher.on.mock.calls.filter(
        (call: unknown[]): call is [string, () => void] => call[0] === 'ready',
      )
      readyCalls[0]?.[1]() // Project watcher ready

      // Find the last 'add' callback (from registry watcher, which was initialized second)
      const addCalls = mockWatcher.on.mock.calls.filter(
        (call: unknown[]): call is [string, (path: string) => void] => call[0] === 'add',
      )
      const registryAddCallback = addCalls[addCalls.length - 1]?.[1]
      registryAddCallback?.('/mock/config/projects/NEW.toml')

      expect(projectSpy).toHaveBeenCalled()
      expect(registrySpy).toHaveBeenCalled()
    })
  })
})
