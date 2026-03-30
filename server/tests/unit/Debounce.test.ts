/**
 * Debounce Logic Unit Tests.
 *
 * Tests debouncing behavior to prevent rapid duplicate events.
 * Covers: TEST-debounce-unit
 * Requirements: C-2.5 (debouncing within 100ms window)
 */

import { SSEBroadcaster } from '../../services/fileWatcher/SSEBroadcaster.js'

describe('SSEBroadcaster Debounce', () => {
  let broadcaster: SSEBroadcaster

  beforeEach(() => {
    jest.useFakeTimers()
    broadcaster = new SSEBroadcaster()
  })

  afterEach(() => {
    jest.useRealTimers()
    broadcaster.stop()
  })

  describe('debouncedBroadcast', () => {
    it('should delay execution by specified delay', () => {
      const mockFn = jest.fn()

      broadcaster.debouncedBroadcast('test-key', mockFn, 200)

      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(199)
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(1)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should use 100ms default delay', () => {
      const mockFn = jest.fn()

      broadcaster.debouncedBroadcast('test-key', mockFn)

      jest.advanceTimersByTime(99)
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(1)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should reset timer on subsequent calls with same key', () => {
      const mockFn = jest.fn()

      broadcaster.debouncedBroadcast('key', mockFn, 100)

      jest.advanceTimersByTime(50)
      expect(mockFn).not.toHaveBeenCalled()

      // Reset timer
      broadcaster.debouncedBroadcast('key', mockFn, 100)

      jest.advanceTimersByTime(50)
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(50)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should execute multiple debounced functions with different keys', () => {
      const fn1 = jest.fn()
      const fn2 = jest.fn()
      const fn3 = jest.fn()

      broadcaster.debouncedBroadcast('key-1', fn1, 100)
      broadcaster.debouncedBroadcast('key-2', fn2, 150)
      broadcaster.debouncedBroadcast('key-3', fn3, 200)

      jest.advanceTimersByTime(100)
      expect(fn1).toHaveBeenCalledTimes(1)
      expect(fn2).not.toHaveBeenCalled()
      expect(fn3).not.toHaveBeenCalled()

      jest.advanceTimersByTime(50)
      expect(fn2).toHaveBeenCalledTimes(1)
      expect(fn3).not.toHaveBeenCalled()

      jest.advanceTimersByTime(50)
      expect(fn3).toHaveBeenCalledTimes(1)
    })

    it('should handle rapid successive calls efficiently', () => {
      const mockFn = jest.fn()

      // Simulate rapid file changes (20 calls in 10ms)
      for (let i = 0; i < 20; i++) {
        broadcaster.debouncedBroadcast('rapid-key', mockFn, 100)
      }

      jest.advanceTimersByTime(100)

      // Should only execute once
      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should handle calls with different delay values', () => {
      const fnShort = jest.fn()
      const fnLong = jest.fn()

      broadcaster.debouncedBroadcast('short', fnShort, 50)
      broadcaster.debouncedBroadcast('long', fnLong, 200)

      jest.advanceTimersByTime(50)
      expect(fnShort).toHaveBeenCalledTimes(1)
      expect(fnLong).not.toHaveBeenCalled()

      jest.advanceTimersByTime(150)
      expect(fnLong).toHaveBeenCalledTimes(1)
    })

    it('should allow re-debounce after execution completes', () => {
      const mockFn = jest.fn()

      broadcaster.debouncedBroadcast('key', mockFn, 100)
      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(1)

      // Can debounce again
      broadcaster.debouncedBroadcast('key', mockFn, 100)
      jest.advanceTimersByTime(100)
      expect(mockFn).toHaveBeenCalledTimes(2)
    })

    it('should not interfere with other keys when one is reset', () => {
      const fn1 = jest.fn()
      const fn2 = jest.fn()

      broadcaster.debouncedBroadcast('key-1', fn1, 100)
      broadcaster.debouncedBroadcast('key-2', fn2, 100)

      jest.advanceTimersByTime(50)

      // Reset key-1 only
      broadcaster.debouncedBroadcast('key-1', fn1, 100)

      jest.advanceTimersByTime(50)
      expect(fn1).not.toHaveBeenCalled()
      expect(fn2).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(50)
      expect(fn1).toHaveBeenCalledTimes(1)
    })

    it('should clear pending timer when stop is called', () => {
      const mockFn = jest.fn()

      broadcaster.debouncedBroadcast('key', mockFn, 1000)

      broadcaster.stop()

      jest.advanceTimersByTime(1000)

      expect(mockFn).not.toHaveBeenCalled()
    })

    it('should handle zero delay (immediate execution)', () => {
      const mockFn = jest.fn()

      broadcaster.debouncedBroadcast('key', mockFn, 0)

      // Even with 0 delay, timers need to advance
      jest.advanceTimersByTime(0)

      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should preserve function context and arguments', () => {
      let context: unknown = null
      let receivedArgs: unknown[] = []

      const fn = function (this: unknown, ...args: unknown[]) {
        // eslint-disable-next-line ts/no-this-alias
        context = this
        receivedArgs = args
      }

      const boundFn = fn.bind('test-context', 'arg1', 'arg2')

      broadcaster.debouncedBroadcast('key', boundFn, 100)
      jest.advanceTimersByTime(100)

      expect(context).toBe('test-context')
      expect(receivedArgs).toEqual(['arg1', 'arg2'])
    })
  })

  describe('Real-World Scenarios', () => {
    it('should prevent duplicate SSE broadcasts for rapid file changes', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      const event = {
        type: 'file-change',
        data: { filename: 'test.md', eventType: 'change' },
      }

      // Simulate rapid file changes (same debounce key)
      for (let i = 0; i < 10; i++) {
        broadcaster.debouncedBroadcast(
          'change:test.md:project1',
          () => {
            broadcaster.broadcast(event)
          },
          100,
        )
      }

      jest.advanceTimersByTime(100)

      // Should only broadcast once despite 10 triggers
      expect(client.write).toHaveBeenCalledTimes(1)
    })

    it('should allow different files to broadcast independently', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      const event1 = {
        type: 'file-change',
        data: { filename: 'file1.md', eventType: 'change' },
      }
      const event2 = {
        type: 'file-change',
        data: { filename: 'file2.md', eventType: 'change' },
      }

      broadcaster.debouncedBroadcast(
        'change:file1.md:project1',
        () => broadcaster.broadcast(event1),
        100,
      )
      broadcaster.debouncedBroadcast(
        'change:file2.md:project1',
        () => broadcaster.broadcast(event2),
        100,
      )

      jest.advanceTimersByTime(100)

      // Both should broadcast (different debounce keys)
      expect(client.write).toHaveBeenCalledTimes(2)
    })
  })
})

/**
 * Create a mock SSE client for testing.
 */
function createMockClient() {
  return {
    write: jest.fn(),
    on: jest.fn(),
    headersSent: false,
    destroyed: false,
    closed: false,
  }
}
