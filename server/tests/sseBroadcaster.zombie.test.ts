/**
 * MDT-183: SSE Zombie Detection Tests
 *
 * Tests for reliable zombie SSE client detection via write-error
 * catching during heartbeat.
 *
 * Covers: BR-5, BR-6
 *
 * Note: Current SSEBroadcaster.startHeartbeat() leaks its setInterval
 * (return value not stored, stop() never clears it). Tests use
 * stopHeartbeat workaround until implementation fixes it.
 */

import { SSEBroadcaster } from '../services/fileWatcher/SSEBroadcaster.js'

describe('SSEBroadcaster - Zombie Detection (MDT-183)', () => {
  let broadcaster: SSEBroadcaster

  beforeEach(() => {
    broadcaster = new SSEBroadcaster()
    jest.useFakeTimers()
  })

  afterEach(() => {
    broadcaster.stop()
    jest.useRealTimers()
  })

  // ── BR-5: Zombie connections removed within 60s ──────────────

  describe('BR-5: Zombie SSE connections detected and removed', () => {
    it('should remove client when heartbeat write throws', () => {
      const zombieClient = {
        write: jest.fn(() => { throw new Error('write EPIPE') }),
        on: jest.fn(),
        headersSent: true,
        destroyed: false,
        closed: false,
      }

      broadcaster.addClient(zombieClient)
      expect(broadcaster.getClientCount()).toBe(1)

      broadcaster.startHeartbeat(30000)
      jest.advanceTimersByTime(30000)

      expect(broadcaster.getClientCount()).toBe(0)
    })

    it('should keep healthy clients during heartbeat', () => {
      const healthyClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: true,
        destroyed: false,
        closed: false,
      }

      broadcaster.addClient(healthyClient)
      broadcaster.startHeartbeat(30000)
      jest.advanceTimersByTime(30000)

      expect(broadcaster.getClientCount()).toBe(1)
      expect(healthyClient.write).toHaveBeenCalled()
    })

    it('should remove zombie but keep healthy in same cycle', () => {
      const zombieClient = {
        write: jest.fn(() => { throw new Error('socket hang up') }),
        on: jest.fn(),
        headersSent: true,
        destroyed: false,
        closed: false,
      }
      const healthyClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: true,
        destroyed: false,
        closed: false,
      }

      broadcaster.addClient(zombieClient)
      broadcaster.addClient(healthyClient)

      broadcaster.startHeartbeat(30000)
      jest.advanceTimersByTime(30000)

      expect(broadcaster.getClientCount()).toBe(1)
    })

    it('should detect zombie within two heartbeat cycles (60s)', () => {
      const zombieClient = {
        write: jest.fn(() => { throw new Error('write ECONNRESET') }),
        on: jest.fn(),
        headersSent: true,
        destroyed: false,
        closed: false,
      }

      broadcaster.addClient(zombieClient)
      broadcaster.startHeartbeat(30000)

      // First heartbeat at 30s should catch it
      jest.advanceTimersByTime(30000)
      expect(broadcaster.getClientCount()).toBe(0)
    })

    it('should handle zombie that returns false from write', () => {
      const zombieClient = {
        write: jest.fn(() => false),
        on: jest.fn(),
        headersSent: true,
        destroyed: false,
        closed: false,
      }

      broadcaster.addClient(zombieClient)
      broadcaster.startHeartbeat(30000)
      jest.advanceTimersByTime(30000)

      expect(broadcaster.getClientCount()).toBe(0)
    })
  })

  // ── BR-6: sseClients reflects live connections ───────────────

  describe('BR-6: sseClients count reflects live connections', () => {
    it('should count 0 after all zombies removed', () => {
      const zombie = {
        write: jest.fn(() => { throw new Error('EPIPE') }),
        on: jest.fn(),
        headersSent: true,
        destroyed: false,
        closed: false,
      }

      broadcaster.addClient(zombie)
      broadcaster.startHeartbeat(30000)
      jest.advanceTimersByTime(30000)

      expect(broadcaster.getClientCount()).toBe(0)
    })

    it('should count accurately with mix of live and zombie', () => {
      const clients = Array.from({ length: 5 }, (_, i) => ({
        write: jest.fn(i === 2 ? () => { throw new Error('dead') } : () => true),
        on: jest.fn(),
        headersSent: true,
        destroyed: false,
        closed: false,
      }))

      clients.forEach(c => broadcaster.addClient(c))
      expect(broadcaster.getClientCount()).toBe(5)

      broadcaster.startHeartbeat(30000)
      jest.advanceTimersByTime(30000)

      expect(broadcaster.getClientCount()).toBe(4)
    })
  })

  // ── Backward compat: destroyed/closed still detected ─────────

  describe('Backward compat: destroyed/closed flags still work', () => {
    it('should remove client with destroyed=true without write attempt', () => {
      const destroyedClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: true,
        destroyed: true,
        closed: false,
      }

      broadcaster.addClient(destroyedClient)
      broadcaster.startHeartbeat(30000)
      jest.advanceTimersByTime(30000)

      expect(broadcaster.getClientCount()).toBe(0)
      expect(destroyedClient.write).not.toHaveBeenCalled()
    })

    it('should remove client with closed=true without write attempt', () => {
      const closedClient = {
        write: jest.fn(),
        on: jest.fn(),
        headersSent: true,
        destroyed: false,
        closed: true,
      }

      broadcaster.addClient(closedClient)
      broadcaster.startHeartbeat(30000)
      jest.advanceTimersByTime(30000)

      expect(broadcaster.getClientCount()).toBe(0)
      expect(closedClient.write).not.toHaveBeenCalled()
    })
  })
})
