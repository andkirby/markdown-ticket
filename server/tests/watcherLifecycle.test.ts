/**
 * MDT-183: WatcherLifecycleManager Tests
 *
 * Tests for lazy watcher provisioning: start on first SSE subscriber,
 * stop on last unsubscribe, debounce rapid connect/disconnect.
 *
 * Covers: BR-1, BR-2, BR-3, BR-4, C-3, Edge-1, Edge-3
 */

import type { PathWatcherService } from '../services/fileWatcher/PathWatcherService.js'
import { EventEmitter } from 'node:events'
import { WatcherLifecycleManager } from '../services/fileWatcher/WatcherLifecycleManager.js'

// Mock PathWatcherService
function createMockPathWatcher(): jest.Mocked<PathWatcherService> & EventEmitter {
  const emitter = new EventEmitter()
  return Object.assign(emitter, {
    initMultiProjectWatcher: jest.fn().mockReturnThis(),
    initDocumentWatchers: jest.fn().mockReturnValue(0),
    initWorktreeWatchers: jest.fn().mockResolvedValue(0),
    stop: jest.fn(),
    getProjectPath: jest.fn().mockReturnValue('/mock/project'),
    getProjectRoot: jest.fn().mockReturnValue('/mock/project'),
  }) as any
}

describe('WatcherLifecycleManager (MDT-183)', () => {
  let manager: WatcherLifecycleManager
  let mockPathWatcher: ReturnType<typeof createMockPathWatcher>

  const projectA = { id: 'project-a', path: '/path/a/*.md', projectRoot: '/path/a', projectCode: 'PA' }
  const projectB = { id: 'project-b', path: '/path/b/*.md', projectRoot: '/path/b', projectCode: 'PB' }

  beforeEach(() => {
    jest.useFakeTimers()
    mockPathWatcher = createMockPathWatcher()
    manager = new WatcherLifecycleManager(mockPathWatcher)
  })

  afterEach(() => {
    manager.stop()
    jest.useRealTimers()
  })

  // ── BR-1: Zero watchers at startup ──────────────────────────

  describe('BR-1: Server starts with zero chokidar watchers', () => {
    it('should have zero active watchers on construction', () => {
      expect(manager.activeWatcherCount()).toBe(0)
    })

    it('should not call initMultiProjectWatcher on construction', () => {
      expect(mockPathWatcher.initMultiProjectWatcher).not.toHaveBeenCalled()
    })
  })

  // ── BR-2: SSE connection triggers watcher creation ───────────

  describe('BR-2: SSE connection triggers watcher creation', () => {
    it('should create watchers on first client subscribe', async () => {
      manager.registerProject(projectA)
      await manager.ensureWatchers('client-1', ['project-a'])

      expect(mockPathWatcher.initMultiProjectWatcher).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'project-a' })]),
      )
    })

    it('should not re-create watchers for already-active project', async () => {
      manager.registerProject(projectA)
      await manager.ensureWatchers('client-1', ['project-a'])
      await manager.ensureWatchers('client-2', ['project-a'])

      // initMultiProjectWatcher called only once for project-a
      const calls = mockPathWatcher.initMultiProjectWatcher.mock.calls
      const projectACalls = calls.filter((c: any[]) =>
        c[0].some((p: any) => p.id === 'project-a'),
      )
      expect(projectACalls).toHaveLength(1)
    })

    it('should create watchers for multiple projects in client scope', async () => {
      manager.registerProject(projectA)
      manager.registerProject(projectB)
      await manager.ensureWatchers('client-1', ['project-a', 'project-b'])

      expect(manager.activeWatcherCount()).toBe(2)
    })
  })

  // ── BR-3: Shared watchers across clients ─────────────────────

  describe('BR-3: Multiple SSE clients share one watcher set', () => {
    it('should increment refcount, not create duplicate watchers', async () => {
      manager.registerProject(projectA)
      await manager.ensureWatchers('client-1', ['project-a'])
      await manager.ensureWatchers('client-2', ['project-a'])

      expect(manager.activeWatcherCount()).toBe(1)
      expect(manager.refCount('project-a')).toBe(2)
    })
  })

  // ── BR-4: Watchers stop on last disconnect ───────────────────

  describe('BR-4: Watchers stop when all clients disconnect', () => {
    it('should stop watchers when last client releases', async () => {
      manager.registerProject(projectA)
      await manager.ensureWatchers('client-1', ['project-a'])
      manager.releaseProject('client-1', ['project-a'])

      // Debounce: advance past 5s
      jest.advanceTimersByTime(5500)

      expect(manager.activeWatcherCount()).toBe(0)
    })

    it('should NOT stop watchers when one client remains', async () => {
      manager.registerProject(projectA)
      await manager.ensureWatchers('client-1', ['project-a'])
      await manager.ensureWatchers('client-2', ['project-a'])

      manager.releaseProject('client-1', ['project-a'])
      jest.advanceTimersByTime(5500)

      expect(manager.activeWatcherCount()).toBe(1)
      expect(manager.refCount('project-a')).toBe(1)
    })
  })

  // ── C-3: Zero watchers when no clients ───────────────────────

  describe('C-3: Zero watchers when no SSE clients connected', () => {
    it('should have zero watchers after all clients released and debounce', async () => {
      manager.registerProject(projectA)
      manager.registerProject(projectB)

      await manager.ensureWatchers('client-1', ['project-a', 'project-b'])
      await manager.ensureWatchers('client-2', ['project-a'])

      manager.releaseProject('client-1', ['project-a', 'project-b'])
      manager.releaseProject('client-2', ['project-a'])
      jest.advanceTimersByTime(5500)

      expect(manager.activeWatcherCount()).toBe(0)
    })
  })

  // ── Edge-1: Debounce rapid connect/disconnect ────────────────

  describe('Edge-1: Debounce rapid connect/disconnect', () => {
    it('should NOT stop watchers if client reconnects within debounce window', async () => {
      manager.registerProject(projectA)
      await manager.ensureWatchers('client-1', ['project-a'])

      // Disconnect
      manager.releaseProject('client-1', ['project-a'])

      // Reconnect within 5s
      jest.advanceTimersByTime(3000)
      await manager.ensureWatchers('client-1', ['project-a'])

      // Advance past original debounce
      jest.advanceTimersByTime(3000)

      // Watchers should still be active (reconnect cancelled the stop)
      expect(manager.activeWatcherCount()).toBe(1)
    })
  })

  // ── Edge-1 extension: Zombie detection → auto-reconnect ──────

  describe('Edge-1: Zombie detection triggers reconnect within debounce', () => {
    it('should keep watchers alive when zombie removed then client reconnects', async () => {
      manager.registerProject(projectA)
      await manager.ensureWatchers('client-1', ['project-a'])
      expect(manager.refCount('project-a')).toBe(1)

      // Zombie detected by heartbeat → removeClient + releaseProject
      manager.releaseProject('client-1', ['project-a'])
      expect(manager.refCount('project-a')).toBe(0)

      // EventSource auto-reconnects within 1s (well within 5s debounce)
      jest.advanceTimersByTime(500)
      await manager.ensureWatchers('client-1-reconnect', ['project-a'])

      // Advance past original debounce — watchers should still be alive
      jest.advanceTimersByTime(5000)
      expect(manager.activeWatcherCount()).toBe(1)
      expect(manager.refCount('project-a')).toBe(1)
    })
  })

  // ── Edge-3: Multiple tabs share watchers ─────────────────────

  describe('Edge-3: Multiple browser tabs share watchers', () => {
    it('should share watchers across 3 tabs and stop only after last closes', async () => {
      manager.registerProject(projectA)

      await manager.ensureWatchers('tab-1', ['project-a'])
      await manager.ensureWatchers('tab-2', ['project-a'])
      await manager.ensureWatchers('tab-3', ['project-a'])

      expect(manager.activeWatcherCount()).toBe(1)
      expect(manager.refCount('project-a')).toBe(3)

      manager.releaseProject('tab-1', ['project-a'])
      jest.advanceTimersByTime(5500)
      expect(manager.activeWatcherCount()).toBe(1)

      manager.releaseProject('tab-2', ['project-a'])
      jest.advanceTimersByTime(5500)
      expect(manager.activeWatcherCount()).toBe(1)

      manager.releaseProject('tab-3', ['project-a'])
      jest.advanceTimersByTime(5500)
      expect(manager.activeWatcherCount()).toBe(0)
    })
  })

  // ── BR-7: Runtime project registration (UAT 2026-09-02) ──

  describe('BR-7: Runtime project registration', () => {
    it('should log loudly and hold the subscription when project is unknown', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

      try {
        await manager.ensureWatchers('client-1', ['late-project'])

        // Never a silent skip: the miss is logged
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('late-project'))
        // The subscriber's reservation is held for late provisioning (D5)
        expect(manager.refCount('late-project')).toBe(1)

        // No watchers were created for the unknown project
        expect(mockPathWatcher.initMultiProjectWatcher).not.toHaveBeenCalled()
      }
      finally {
        warnSpy.mockRestore()
      }
    })

    it('should provision watchers immediately on late registration with waiting subscribers', async () => {
      await manager.ensureWatchers('client-1', ['late-project']) // unknown → held
      expect(mockPathWatcher.initMultiProjectWatcher).not.toHaveBeenCalled()

      manager.registerProject(projectB) // id: 'project-b' — not the late one

      // Still nothing: the late project itself was not registered
      expect(mockPathWatcher.initMultiProjectWatcher).not.toHaveBeenCalled()

      const lateProject = { id: 'late-project', path: '/path/late/*.md', projectRoot: '/path/late', projectCode: 'LP' }
      manager.registerProject(lateProject)

      // Late registration provisions waiting subscribers synchronously
      expect(mockPathWatcher.initMultiProjectWatcher).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'late-project' })]),
      )
      expect(manager.activeWatcherCount()).toBe(1)
    })

    it('should not provision watchers on late registration when nobody subscribes', () => {
      manager.registerProject(projectA)

      expect(mockPathWatcher.initMultiProjectWatcher).not.toHaveBeenCalled()
      expect(manager.activeWatcherCount()).toBe(0)
    })

    it('should treat re-ensure of an already-subscribed project as a no-op', async () => {
      manager.registerProject(projectA)
      await manager.ensureWatchers('client-1', ['project-a'])
      await manager.ensureWatchers('client-1', ['project-a']) // D5 resubscribe path

      // Refcount reflects one subscription for the client, not two
      expect(manager.refCount('project-a')).toBe(1)
    })

    it('releaseClient should release ALL recorded subscriptions, including late-added projects', async () => {
      manager.registerProject(projectA)
      await manager.ensureWatchers('client-1', ['project-a'])
      // D5 resubscribe: project added to the same client after connect
      const lateProject = { id: 'late-project', path: '/path/late/*.md', projectRoot: '/path/late', projectCode: 'LP' }
      manager.registerProject(lateProject)
      await manager.ensureWatchers('client-1', ['late-project'])

      expect(manager.refCount('project-a')).toBe(1)
      expect(manager.refCount('late-project')).toBe(1)

      manager.releaseClient('client-1')

      expect(manager.refCount('project-a')).toBe(0)
      expect(manager.refCount('late-project')).toBe(0)
    })
  })
})
