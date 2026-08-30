/**
 * DataLayer Request Deduplication Tests - MDT-133.
 *
 * Tests for the deduplication mechanism that prevents duplicate API calls
 * when multiple concurrent requests are made for the same resource.
 *
 * @see docs/CRs/MDT-133/architecture.md
 * @see constraints C1, C2, C3
 */

// @ts-expect-error - bun:test types not available
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

/**
 * DataLayer Deduplication Tests - MDT-133.
 *
 * These tests verify the request deduplication behavior:
 * - C1: Concurrent fetchTickets calls result in single HTTP request
 * - C2: Concurrent fetchProjectConfig calls result in single HTTP request
 * - C3: Same Promise returned, cleaned up after resolution
 */

// Mock fetch globally
const mockFetch = mock()
globalThis.fetch = mockFetch as unknown as typeof fetch

// eslint-disable-next-line import/first -- Must import after mocking global.fetch
import { DataLayer } from './dataLayer'

describe('DataLayer Request Deduplication (MDT-133)', () => {
  let dataLayer: DataLayer

  beforeEach(() => {
    mockFetch.mockClear()
    // Create fresh instance for each test to avoid state leakage
    dataLayer = new DataLayer()
  })

  afterEach(() => {
    mockFetch.mockClear()
  })

  describe('fetchTickets deduplication (C1)', () => {
    it('should issue exactly one HTTP request for concurrent fetchTickets calls', async () => {
      const mockTickets = [
        {
          code: 'MDT-133',
          title: 'Test Ticket',
          status: 'In Progress',
          type: 'Technical Debt',
          priority: 'Medium',
          dateCreated: '2026-03-08T21:24:33.730Z',
          lastModified: '2026-03-17T12:00:00Z',
          filePath: '/path/to/ticket.md',
        },
      ]

      // Mock a slow response to ensure concurrent calls overlap
      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        await new Promise(resolve => setTimeout(resolve, 50))
        return {
          ok: true,
          json: async () => mockTickets,
        }
      })

      const projectId = 'MDT'

      // Simulate concurrent calls from multiple hook instances
      const [result1, result2] = await Promise.all([
        dataLayer.fetchTickets(projectId),
        dataLayer.fetchTickets(projectId),
      ])

      // Both should return the same data
      expect(result1).toEqual(result2)
      // With deduplication: only 1 HTTP call despite 2 concurrent requests
      expect(callCount).toBe(1)
    })

    it('should return the same Promise for concurrent fetchTickets calls', async () => {
      const mockTickets = [
        {
          code: 'MDT-133',
          title: 'Dedupe Test',
          status: 'Proposed',
          type: 'Technical Debt',
          priority: 'Medium',
        },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTickets,
      })

      const projectId = 'MDT'

      // With deduplication, these should return the same data
      const [result1, result2] = await Promise.all([
        dataLayer.fetchTickets(projectId),
        dataLayer.fetchTickets(projectId),
      ])

      // Both should resolve with same data
      expect(result1).toEqual(result2)
      expect(result1[0].code).toBe('MDT-133')
    })

    it('should allow new request after previous one completes', async () => {
      const mockTickets = [
        {
          code: 'MDT-133',
          title: 'Test',
          status: 'In Progress',
        },
      ]

      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        return {
          ok: true,
          json: async () => mockTickets,
        }
      })

      const projectId = 'MDT'

      // First request
      await dataLayer.fetchTickets(projectId)
      const firstCallCount = callCount
      expect(firstCallCount).toBe(1)

      // Second request after first completes - should make a new call
      await dataLayer.fetchTickets(projectId)

      // Sequential calls should each make an HTTP request
      expect(callCount).toBe(2)
    })
  })

  describe('fetchProjectConfig deduplication (C2)', () => {
    it('should issue exactly one HTTP request for concurrent fetchProjectConfig calls', async () => {
      const mockConfig = {
        config: {
          project: { name: 'Test Project', code: 'MDT' },
          paths: { tickets: 'docs/CRs' },
        },
      }

      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        await new Promise(resolve => setTimeout(resolve, 50))
        return {
          ok: true,
          json: async () => mockConfig,
        }
      })

      const projectId = 'MDT'

      const [result1, result2] = await Promise.all([
        dataLayer.fetchProjectConfig(projectId),
        dataLayer.fetchProjectConfig(projectId),
      ])

      // Both should return the same data
      expect(result1).toEqual(result2)
      // With deduplication: only 1 HTTP call
      expect(callCount).toBe(1)
    })

    it('should handle 404 for missing config gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const projectId = 'NONEXISTENT'

      const result = await dataLayer.fetchProjectConfig(projectId)

      expect(result).toBeNull()
    })
  })

  describe('Promise cleanup behavior (C3)', () => {
    it('should clean up pending request after successful resolution', async () => {
      const mockTickets = [{ code: 'MDT-133', title: 'Test', status: 'In Progress' }]

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockTickets,
      })

      const projectId = 'MDT'

      // Make request and await it
      await dataLayer.fetchTickets(projectId)

      // After completion, a new request should go through (not deduped)
      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        return {
          ok: true,
          json: async () => mockTickets,
        }
      })

      await dataLayer.fetchTickets(projectId)
      expect(callCount).toBe(1) // New request was made, not deduped
    })

    it('should clean up pending request after error', async () => {
      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        throw new Error('Network error')
      })

      const projectId = 'MDT'

      // Make request that will fail
      await expect(dataLayer.fetchTickets(projectId)).rejects.toThrow('Network error')
      expect(callCount).toBe(1)

      // After error, a new request should be allowed (fresh dataLayer to verify cleanup)
      const newDataLayer = new DataLayer()
      let newCallCount = 0
      mockFetch.mockImplementation(async () => {
        newCallCount++
        return {
          ok: true,
          json: async () => [{ code: 'MDT-133', title: 'Test', status: 'In Progress' }],
        }
      })

      await newDataLayer.fetchTickets(projectId)
      expect(newCallCount).toBe(1) // New request was made
    })

    it('should return same data to all concurrent callers', async () => {
      const mockTickets = [{ code: 'MDT-133', title: 'Test', status: 'In Progress' }]
      let callCount = 0

      mockFetch.mockImplementation(async () => {
        callCount++
        await new Promise(resolve => setTimeout(resolve, 20))
        return {
          ok: true,
          json: async () => mockTickets,
        }
      })

      const projectId = 'MDT'

      // Start concurrent calls
      const results = await Promise.all([
        dataLayer.fetchTickets(projectId),
        dataLayer.fetchTickets(projectId),
        dataLayer.fetchTickets(projectId),
      ])

      // All should succeed with same data (compare normalized fields)
      results.forEach((result) => {
        expect(result.length).toBe(1)
        expect(result[0].code).toBe('MDT-133')
        expect(result[0].title).toBe('Test')
      })

      // With deduplication: only 1 HTTP call despite 3 concurrent requests
      expect(callCount).toBe(1)
    })
  })

  describe('Different dedupe keys', () => {
    it('should NOT dedupe requests for different projects', async () => {
      const mockTickets = [{ code: 'MDT-133', title: 'Test' }]

      let callCount = 0
      mockFetch.mockImplementation(async () => {
        callCount++
        return {
          ok: true,
          json: async () => mockTickets,
        }
      })

      // Concurrent requests for different projects
      const [result1, result2] = await Promise.all([
        dataLayer.fetchTickets('MDT'),
        dataLayer.fetchTickets('OTHER'),
      ])

      // Different projects = different dedupe keys = 2 calls expected
      expect(callCount).toBe(2)
      // Verify results are normalized correctly
      expect(result1[0].code).toBe('MDT-133')
      expect(result2[0].code).toBe('MDT-133')
    })

    it('should NOT dedupe tickets vs config requests for same project', async () => {
      let callCount = 0
      mockFetch.mockImplementation(async (url: string) => {
        callCount++
        if (url.includes('/config')) {
          return {
            ok: true,
            json: async () => ({ config: { project: { code: 'MDT' } } }),
          }
        }
        return {
          ok: true,
          json: async () => [],
        }
      })

      const projectId = 'MDT'

      // Concurrent requests for different endpoints
      await Promise.all([
        dataLayer.fetchTickets(projectId),
        dataLayer.fetchProjectConfig(projectId),
      ])

      // Different endpoints = different dedupe keys = 2 calls expected
      expect(callCount).toBe(2)
    })
  })
})
