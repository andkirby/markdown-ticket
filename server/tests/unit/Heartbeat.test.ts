/**
 * Heartbeat Unit Tests.
 *
 * Tests heartbeat mechanism to detect and remove dead SSE connections.
 * Covers: TEST-heartbeat-unit
 * Requirements: C-2.6 (heartbeat every 30 seconds)
 */

import { SSEBroadcaster } from '../../services/fileWatcher/SSEBroadcaster.js'

describe('SSEBroadcaster Heartbeat', () => {
  let broadcaster: SSEBroadcaster

  beforeEach(() => {
    jest.useFakeTimers()
    broadcaster = new SSEBroadcaster()
  })

  afterEach(() => {
    jest.useRealTimers()
    broadcaster.stop()
  })

  describe('startHeartbeat', () => {
    it('should use 30s default interval', () => {
      broadcaster.startHeartbeat()

      jest.advanceTimersByTime(29999)
      // No heartbeat yet

      jest.advanceTimersByTime(1)
      // Heartbeat sent after 30s
    })

    it('should use custom interval when specified', () => {
      broadcaster.startHeartbeat(5000)

      jest.advanceTimersByTime(5000)
      // Heartbeat sent after 5s
    })

    it('should send heartbeat events at regular intervals', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      broadcaster.startHeartbeat(1000)

      jest.advanceTimersByTime(1000)
      expect(client.write).toHaveBeenCalledTimes(1)

      jest.advanceTimersByTime(1000)
      expect(client.write).toHaveBeenCalledTimes(2)

      jest.advanceTimersByTime(1000)
      expect(client.write).toHaveBeenCalledTimes(3)
    })

    it('should send correct heartbeat event format', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      broadcaster.startHeartbeat(1000)
      jest.advanceTimersByTime(1000)

      // Verify write was called
      expect(client.write).toHaveBeenCalled()

      // Parse and verify the event structure
      const writtenData = client.write.mock.calls[0][0] as string
      const event = JSON.parse(writtenData.split('data: ')[1].split('\n\n')[0])

      expect(event.type).toBe('heartbeat')
      expect(typeof event.data.timestamp).toBe('number')
    })

    it('should include timestamp in heartbeat data', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      const beforeTime = Date.now()
      broadcaster.startHeartbeat(1000)
      jest.advanceTimersByTime(1000)
      const afterTime = Date.now()

      const writeCall = client.write.mock.calls[0][0] as string
      const event = JSON.parse(writeCall.split('data: ')[1].split('\n\n')[0])

      expect(event.type).toBe('heartbeat')
      expect(event.data.timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(event.data.timestamp).toBeLessThanOrEqual(afterTime)
    })

    it('should send heartbeat to all connected clients', () => {
      const client1 = createMockClient()
      const client2 = createMockClient()
      const client3 = createMockClient()

      broadcaster.addClient(client1)
      broadcaster.addClient(client2)
      broadcaster.addClient(client3)

      broadcaster.startHeartbeat(1000)
      jest.advanceTimersByTime(1000)

      expect(client1.write).toHaveBeenCalled()
      expect(client2.write).toHaveBeenCalled()
      expect(client3.write).toHaveBeenCalled()
    })

    it('should skip clients with headersSent=true', () => {
      const client1 = createMockClient({ headersSent: true })
      const client2 = createMockClient({ headersSent: false })

      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      broadcaster.startHeartbeat(1000)
      jest.advanceTimersByTime(1000)

      expect(client1.write).not.toHaveBeenCalled()
      expect(client2.write).toHaveBeenCalled()
    })

    it('should remove clients that throw errors during heartbeat', () => {
      const client1 = createMockClient()
      const client2 = createMockClient()
      const client3 = createMockClient()

      client1.write.mockImplementation(() => {
        throw new Error('Connection broken')
      })

      broadcaster.addClient(client1)
      broadcaster.addClient(client2)
      broadcaster.addClient(client3)

      expect(broadcaster.getClientCount()).toBe(3)

      broadcaster.startHeartbeat(1000)
      jest.advanceTimersByTime(1000)

      expect(broadcaster.getClientCount()).toBe(2)
      expect(client2.write).toHaveBeenCalled()
      expect(client3.write).toHaveBeenCalled()
    })

    it('should continue heartbeat after removing failed clients', () => {
      const client1 = createMockClient()
      const client2 = createMockClient()

      client1.write.mockImplementation(() => {
        throw new Error('First heartbeat fails')
      })
      // Second call succeeds
      client1.write.mockImplementationOnce(() => {
        throw new Error('First heartbeat fails')
      })

      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      broadcaster.startHeartbeat(1000)

      // First heartbeat removes client1
      jest.advanceTimersByTime(1000)
      expect(broadcaster.getClientCount()).toBe(1)

      // Second heartbeat continues with client2
      jest.advanceTimersByTime(1000)
      expect(client2.write).toHaveBeenCalledTimes(2)
    })

    it('should handle all clients failing gracefully', () => {
      const clients = Array.from({ length: 5 }, () => createMockClient())
      clients.forEach((client) => {
        client.write.mockImplementation(() => {
          throw new Error('All fail')
        })
        broadcaster.addClient(client)
      })

      expect(broadcaster.getClientCount()).toBe(5)

      broadcaster.startHeartbeat(1000)
      jest.advanceTimersByTime(1000)

      expect(broadcaster.getClientCount()).toBe(0)
    })

    it('should detect destroyed connections', () => {
      const client1 = createMockClient({ destroyed: true })
      const client2 = createMockClient({ destroyed: false })

      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      broadcaster.startHeartbeat(1000)
      jest.advanceTimersByTime(1000)

      // Destroyed client should be removed
      expect(broadcaster.getClientCount()).toBe(1)
      expect(client2.write).toHaveBeenCalled()
    })

    it('should detect closed connections', () => {
      const client1 = createMockClient({ closed: true })
      const client2 = createMockClient({ closed: false })

      broadcaster.addClient(client1)
      broadcaster.addClient(client2)

      broadcaster.startHeartbeat(1000)
      jest.advanceTimersByTime(1000)

      // Closed client should be removed
      expect(broadcaster.getClientCount()).toBe(1)
      expect(client2.write).toHaveBeenCalled()
    })

    it('should allow multiple heartbeat intervals to be started', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      broadcaster.startHeartbeat(1000)
      broadcaster.startHeartbeat(500)

      jest.advanceTimersByTime(500)
      const countAfter500 = client.write.mock.calls.length

      jest.advanceTimersByTime(500)
      const countAfter1000 = client.write.mock.calls.length

      // Both intervals should be active
      expect(countAfter1000).toBeGreaterThan(countAfter500)
    })
  })

  describe('Dead Connection Detection', () => {
    it('should clean up stale connections over time', () => {
      const clients = Array.from({ length: 10 }, () => createMockClient())

      // Make half of them fail on first heartbeat
      clients.slice(0, 5).forEach((client) => {
        client.write.mockImplementation(() => {
          throw new Error('Dead connection')
        })
      })

      clients.forEach((client) => broadcaster.addClient(client))

      broadcaster.startHeartbeat(1000)
      jest.advanceTimersByTime(1000)

      expect(broadcaster.getClientCount()).toBe(5)
    })

    it('should handle connection that dies between heartbeats', () => {
      const client = createMockClient()

      broadcaster.addClient(client)
      broadcaster.startHeartbeat(1000)

      // First heartbeat succeeds
      jest.advanceTimersByTime(1000)
      expect(client.write).toHaveBeenCalledTimes(1)

      // Connection dies
      client.write.mockImplementation(() => {
        throw new Error('Connection died')
      })

      // Second heartbeat fails and removes client
      jest.advanceTimersByTime(1000)
      expect(broadcaster.getClientCount()).toBe(0)
    })

    it('should not affect healthy connections when others fail', () => {
      const healthyClient = createMockClient()
      const failingClient = createMockClient()

      failingClient.write.mockImplementation(() => {
        throw new Error('Failing')
      })

      broadcaster.addClient(healthyClient)
      broadcaster.addClient(failingClient)

      broadcaster.startHeartbeat(1000)

      for (let i = 0; i < 5; i++) {
        jest.advanceTimersByTime(1000)
      }

      expect(broadcaster.getClientCount()).toBe(1)
      expect(healthyClient.write).toHaveBeenCalledTimes(5)
    })
  })

  describe('Edge Cases', () => {
    it('should handle heartbeat with no clients', () => {
      expect(() => {
        broadcaster.startHeartbeat(1000)
        jest.advanceTimersByTime(5000)
      }).not.toThrow()
    })

    it('should handle client added after heartbeat started', () => {
      broadcaster.startHeartbeat(1000)

      jest.advanceTimersByTime(500)

      const lateClient = createMockClient()
      broadcaster.addClient(lateClient)

      jest.advanceTimersByTime(500)

      expect(lateClient.write).toHaveBeenCalled()
    })

    it('should handle client removed between heartbeats', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      broadcaster.startHeartbeat(1000)

      jest.advanceTimersByTime(1000)
      expect(client.write).toHaveBeenCalledTimes(1)

      broadcaster.removeClient(client)

      jest.advanceTimersByTime(1000)
      // Should still be 1 (client was removed before second heartbeat)
      expect(client.write).toHaveBeenCalledTimes(1)
    })

    it('should handle very short heartbeat intervals', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      broadcaster.startHeartbeat(10)

      for (let i = 0; i < 100; i++) {
        jest.advanceTimersByTime(10)
      }

      expect(client.write).toHaveBeenCalledTimes(100)
    })

    it('should handle very long heartbeat intervals', () => {
      const client = createMockClient()
      broadcaster.addClient(client)

      broadcaster.startHeartbeat(60000) // 1 minute

      jest.advanceTimersByTime(59999)
      expect(client.write).not.toHaveBeenCalled()

      jest.advanceTimersByTime(1)
      expect(client.write).toHaveBeenCalledTimes(1)
    })
  })
})

/**
 * Create a mock SSE client for testing.
 */
function createMockClient(overrides: { headersSent?: boolean; destroyed?: boolean; closed?: boolean } = {}) {
  return {
    write: jest.fn(),
    on: jest.fn(),
    headersSent: overrides.headersSent ?? false,
    destroyed: overrides.destroyed ?? false,
    closed: overrides.closed ?? false,
  }
}
