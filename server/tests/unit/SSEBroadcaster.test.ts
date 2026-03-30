/**
 * SSEBroadcaster Unit Tests.
 *
 * Tests client lifecycle management, event broadcasting, and cleanup behavior.
 * Covers: TEST-sse-broadcaster-unit
 * Requirements: BR-1.2, C-2.2
 */

import type { ResponseLike, SSEEvent } from '../../services/fileWatcher/SSEBroadcaster.js'
import { SSEBroadcaster } from '../../services/fileWatcher/SSEBroadcaster.js'

describe('SSEBroadcaster', () => {
  let broadcaster: SSEBroadcaster

  beforeEach(() => {
    broadcaster = new SSEBroadcaster()
  })

  afterEach(() => {
    broadcaster.stop()
  })

  describe('Client Lifecycle', () => {
    it('should add client and increment count', () => {
      const mockClient = createMockClient()
      expect(broadcaster.getClientCount()).toBe(0)

      broadcaster.addClient(mockClient)

      expect(broadcaster.getClientCount()).toBe(1)
    })

    it('should remove client and decrement count', () => {
      const mockClient = createMockClient()
      broadcaster.addClient(mockClient)
      expect(broadcaster.getClientCount()).toBe(1)

      broadcaster.removeClient(mockClient)

      expect(broadcaster.getClientCount()).toBe(0)
    })

    it('should remove client on close event', () => {
      const mockClient = createMockClient()
      broadcaster.addClient(mockClient)
      expect(broadcaster.getClientCount()).toBe(1)

      // Simulate client close by calling the registered callback
      const onCalls = (mockClient.on as jest.Mock).mock.calls
      const closeCallback = onCalls.find((call: unknown[]) => call[0] === 'close')?.[1]
      if (closeCallback) {
        closeCallback()
      }

      expect(broadcaster.getClientCount()).toBe(0)
    })

    it('should remove client on error event', () => {
      const mockClient = createMockClient()
      broadcaster.addClient(mockClient)
      expect(broadcaster.getClientCount()).toBe(1)

      // Simulate client error by calling the registered callback
      const onCalls = (mockClient.on as jest.Mock).mock.calls
      const errorCallback = onCalls.find((call: unknown[]) => call[0] === 'error')?.[1]
      if (errorCallback) {
        errorCallback()
      }

      expect(broadcaster.getClientCount()).toBe(0)
    })

    it('should not add duplicate clients', () => {
      const mockClient = createMockClient()
      broadcaster.addClient(mockClient)
      broadcaster.addClient(mockClient)

      expect(broadcaster.getClientCount()).toBe(1)
    })

    it('should handle removing non-existent client gracefully', () => {
      const mockClient = createMockClient()
      expect(() => broadcaster.removeClient(mockClient)).not.toThrow()
      expect(broadcaster.getClientCount()).toBe(0)
    })
  })

  describe('Event Broadcasting', () => {
    it('should broadcast event to all connected clients', () => {
      const client1 = createMockClient()
      const client2 = createMockClient()
      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      const event: SSEEvent = {
        type: 'test-event',
        data: { message: 'test' },
      }

      broadcaster.broadcast(event)

      expect(client1.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(event)}\n\n`,
      )
      expect(client2.write).toHaveBeenCalledWith(
        `data: ${JSON.stringify(event)}\n\n`,
      )
    })

    it('should add event to queue when broadcasting', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      const event: SSEEvent = {
        type: 'test-event',
        data: { message: 'test' },
      }

      broadcaster.broadcast(event)

      const queue = broadcaster.getEventQueue()
      expect(queue).toHaveLength(1)
      expect(queue[0]).toEqual(event)
    })

    it('should limit event queue to 50 events', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      // Add 55 events
      for (let i = 0; i < 55; i++) {
        broadcaster.broadcast({
          type: `event-${i}`,
          data: { index: i },
        })
      }

      const queue = broadcaster.getEventQueue()
      expect(queue).toHaveLength(50)
      expect(queue[0].type).toBe('event-5')
      expect(queue[49].type).toBe('event-54')
    })

    it('should not write to destroyed clients', () => {
      const client1 = createMockClient({ destroyed: true })
      const client2 = createMockClient()
      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      const event: SSEEvent = {
        type: 'test-event',
        data: { message: 'test' },
      }

      broadcaster.broadcast(event)

      expect(client1.write).not.toHaveBeenCalled()
      expect(client2.write).toHaveBeenCalled()
      expect(broadcaster.getClientCount()).toBe(1)
    })

    it('should not write to closed clients', () => {
      const client1 = createMockClient({ closed: true })
      const client2 = createMockClient()
      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      const event: SSEEvent = {
        type: 'test-event',
        data: { message: 'test' },
      }

      broadcaster.broadcast(event)

      expect(client1.write).not.toHaveBeenCalled()
      expect(client2.write).toHaveBeenCalled()
      expect(broadcaster.getClientCount()).toBe(1)
    })

    it('should remove client when write throws error', () => {
      const client1 = createMockClient()
      const client2 = createMockClient()
      ;(client1.write as jest.Mock).mockImplementation(() => {
        throw new Error('Write error')
      })
      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      const event: SSEEvent = {
        type: 'test-event',
        data: { message: 'test' },
      }

      broadcaster.broadcast(event)

      expect(broadcaster.getClientCount()).toBe(1)
    })

    it('should emit broadcast event', () => {
      const mockCallback = jest.fn()
      broadcaster.on('broadcast', mockCallback)

      const event: SSEEvent = {
        type: 'test-event',
        data: { message: 'test' },
      }

      broadcaster.broadcast(event)

      expect(mockCallback).toHaveBeenCalledWith(event)
    })
  })

  describe('Debouncing', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should debounce rapid calls with same key', () => {
      const mockFn = jest.fn()

      broadcaster.debouncedBroadcast('test-key', mockFn, 100)
      broadcaster.debouncedBroadcast('test-key', mockFn, 100)
      broadcaster.debouncedBroadcast('test-key', mockFn, 100)

      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(100)

      expect(mockFn).toHaveBeenCalledTimes(1)
    })

    it('should not debounce calls with different keys', () => {
      const mockFn1 = jest.fn()
      const mockFn2 = jest.fn()

      broadcaster.debouncedBroadcast('key-1', mockFn1, 100)
      broadcaster.debouncedBroadcast('key-2', mockFn2, 100)

      jest.advanceTimersByTime(100)

      expect(mockFn1).toHaveBeenCalledTimes(1)
      expect(mockFn2).toHaveBeenCalledTimes(1)
    })

    it('should use default 100ms delay when not specified', () => {
      const mockFn = jest.fn()

      broadcaster.debouncedBroadcast('test-key', mockFn)

      jest.advanceTimersByTime(99)
      expect(mockFn).not.toHaveBeenCalled()

      jest.advanceTimersByTime(1)
      expect(mockFn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Heartbeat', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should send heartbeat events at specified interval', () => {
      const client1 = createMockClient()
      const client2 = createMockClient()
      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      broadcaster.startHeartbeat(5000)

      jest.advanceTimersByTime(5000)

      // Verify the write was called with correct structure
      expect(client1.write).toHaveBeenCalled()
      expect(client2.write).toHaveBeenCalled()

      // Parse and verify the event structure
      const writtenData = (client1.write as jest.Mock).mock.calls[0][0] as string
      const parsedEvent = JSON.parse(writtenData.split('data: ')[1].split('\n\n')[0])

      expect(parsedEvent.type).toBe('heartbeat')
      expect(typeof parsedEvent.data.timestamp).toBe('number')
    })

    it('should use default 30s interval when not specified', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      broadcaster.startHeartbeat()

      jest.advanceTimersByTime(29999)
      expect(client.write).not.toHaveBeenCalled()

      jest.advanceTimersByTime(1)
      expect(client.write).toHaveBeenCalled()
    })

    it('should skip clients that already sent headers', () => {
      const client1 = createMockClient({ headersSent: true })
      const client2 = createMockClient()
      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      broadcaster.startHeartbeat(5000)
      jest.advanceTimersByTime(5000)

      expect(client1.write).not.toHaveBeenCalled()
      expect(client2.write).toHaveBeenCalled()
    })

    it('should remove clients that fail during heartbeat', () => {
      const client1 = createMockClient()
      const client2 = createMockClient()
      ;(client1.write as jest.Mock).mockImplementation(() => {
        throw new Error('Heartbeat error')
      })
      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      broadcaster.startHeartbeat(5000)
      jest.advanceTimersByTime(5000)

      expect(broadcaster.getClientCount()).toBe(1)
    })
  })

  describe('Stop', () => {
    it('should clear all clients', () => {
      const client1 = createMockClient()
      const client2 = createMockClient()
      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      broadcaster.stop()

      expect(broadcaster.getClientCount()).toBe(0)
    })

    it('should clear event queue', () => {
      const client = createMockClient()
      broadcaster.addClient(client)
      broadcaster.broadcast({ type: 'test', data: {} })

      broadcaster.stop()

      expect(broadcaster.getEventQueue()).toHaveLength(0)
    })

    it('should clear all debounce timers', () => {
      jest.useFakeTimers()
      const mockFn = jest.fn()
      broadcaster.debouncedBroadcast('test', mockFn, 1000)

      broadcaster.stop()
      jest.advanceTimersByTime(1000)

      expect(mockFn).not.toHaveBeenCalled()
      jest.useRealTimers()
    })

    it('should end client connections if not headers sent', () => {
      const client1 = createMockClient({ headersSent: false })
      const client2 = createMockClient({ headersSent: true })
      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      broadcaster.stop()

      expect(client1.end).toHaveBeenCalled()
      expect(client2.end).not.toHaveBeenCalled()
    })

    it('should handle errors when ending client connections', () => {
      const client = createMockClient({ headersSent: false })
      ;(client.end as jest.Mock)?.mockImplementation(() => {
        throw new Error('End error')
      })
      broadcaster.addClient(client)

      expect(() => broadcaster.stop()).not.toThrow()
    })
  })
})

/**
 * Create a mock SSE client for testing.
 */
function createMockClient(overrides: Partial<ResponseLike> = {}): ResponseLike {
  const eventListeners = new Map<string, (...args: unknown[]) => void>()

  return {
    write: jest.fn(),
    on: jest.fn((event: string, callback: (...args: unknown[]) => void) => {
      eventListeners.set(event, callback)
      // Return mock that can emit events
      return {
        emit: (eventName: string, ...args: unknown[]) => {
          const cb = eventListeners.get(eventName)
          if (cb) {
            cb(...args)
          }
        },
      } as unknown as ResponseLike
    }),
    headersSent: false,
    destroyed: false,
    closed: false,
    end: jest.fn(),
    ...overrides,
  }
}
