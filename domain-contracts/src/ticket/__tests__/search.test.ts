/**
 * Search Schema Tests - MDT-152
 *
 * Tests for the cross-project search request/response contracts
 * defined in domain-contracts/src/ticket/search.ts
 *
 * These are RED tests — they will fail until the search module is implemented.
 * They verify: mode enum values, request schema validation, response shape,
 * result-limit enforcement, and project-code validation.
 */

/// <reference types="jest" />

import { describe, expect, it } from '@jest/globals'

// The search module will be implemented; import will fail until then
// but the test file structure defines the contract expectations

describe('search contracts — domain-contracts/src/ticket/search.ts', () => {
  describe('SearchMode enum', () => {
    it('defines TICKET_KEY mode for cross-project ticket-key lookup', async () => {
      const { SearchMode } = await import('../search')
      expect(SearchMode.TICKET_KEY).toBe('ticket_key')
    })

    it('defines PROJECT_SCOPE mode for project-scoped search', async () => {
      const { SearchMode } = await import('../search')
      expect(SearchMode.PROJECT_SCOPE).toBe('project_scope')
    })

    it('contains exactly two mode values', async () => {
      const { SearchMode } = await import('../search')
      const values = Object.values(SearchMode)
      expect(values).toHaveLength(2)
      expect(values).toContain('ticket_key')
      expect(values).toContain('project_scope')
    })
  })

  describe('SearchRequestSchema', () => {
    it('validates a well-formed ticket_key request', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'ticket_key',
        query: 'ABC-42',
      })
      expect(result.success).toBe(true)
    })

    it('validates a well-formed project_scope request', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'project_scope',
        query: 'login',
        projectCode: 'ABC',
      })
      expect(result.success).toBe(true)
    })

    it('requires mode field', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        query: 'ABC-42',
      })
      expect(result.success).toBe(false)
    })

    it('requires query field', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'ticket_key',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid mode values', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'invalid_mode',
        query: 'test',
      })
      expect(result.success).toBe(false)
    })

    it('accepts optional limitPerProject with default of 5', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'ticket_key',
        query: 'ABC-42',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limitPerProject).toBe(5)
      }
    })

    it('accepts optional limitTotal with default of 15', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'ticket_key',
        query: 'ABC-42',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limitTotal).toBe(15)
      }
    })

    it('rejects limitPerProject greater than 5', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'project_scope',
        query: 'test',
        projectCode: 'ABC',
        limitPerProject: 6,
      })
      expect(result.success).toBe(false)
    })

    it('rejects limitTotal greater than 15', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'project_scope',
        query: 'test',
        projectCode: 'ABC',
        limitTotal: 16,
      })
      expect(result.success).toBe(false)
    })

    it('accepts limitPerProject at boundary of 5', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'project_scope',
        query: 'test',
        projectCode: 'ABC',
        limitPerProject: 5,
      })
      expect(result.success).toBe(true)
    })

    it('accepts limitTotal at boundary of 15', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'project_scope',
        query: 'test',
        projectCode: 'ABC',
        limitTotal: 15,
      })
      expect(result.success).toBe(true)
    })

    it('project_scope mode requires projectCode', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'project_scope',
        query: 'test',
      })
      expect(result.success).toBe(false)
    })

    it('ticket_key mode does not require projectCode (resolved from query)', async () => {
      const { SearchRequestSchema } = await import('../search')
      const result = SearchRequestSchema.safeParse({
        mode: 'ticket_key',
        query: 'ABC-42',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('SearchResponseSchema', () => {
    it('validates a response with results', async () => {
      const { SearchResponseSchema } = await import('../search')
      const result = SearchResponseSchema.safeParse({
        results: [
          {
            ticket: { code: 'ABC-42', title: 'Auth service refactor' },
            project: { code: 'ABC', name: 'Another Project' },
          },
        ],
        total: 1,
      })
      expect(result.success).toBe(true)
    })

    it('validates an empty results response', async () => {
      const { SearchResponseSchema } = await import('../search')
      const result = SearchResponseSchema.safeParse({
        results: [],
        total: 0,
      })
      expect(result.success).toBe(true)
    })

    it('requires total field', async () => {
      const { SearchResponseSchema } = await import('../search')
      const result = SearchResponseSchema.safeParse({
        results: [],
      })
      expect(result.success).toBe(false)
    })

    it('each result requires ticket.code', async () => {
      const { SearchResponseSchema } = await import('../search')
      const result = SearchResponseSchema.safeParse({
        results: [
          {
            ticket: { title: 'No code' },
            project: { code: 'ABC', name: 'Project' },
          },
        ],
        total: 1,
      })
      expect(result.success).toBe(false)
    })

    it('each result requires project.code and project.name', async () => {
      const { SearchResponseSchema } = await import('../search')
      const result = SearchResponseSchema.safeParse({
        results: [
          {
            ticket: { code: 'ABC-42', title: 'Test' },
            project: { code: 'ABC' },
          },
        ],
        total: 1,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('ErrorCode enum', () => {
    it('defines PROJECT_NOT_FOUND error code', async () => {
      const { SearchErrorCode } = await import('../search')
      expect(SearchErrorCode.PROJECT_NOT_FOUND).toBe('project_not_found')
    })

    it('defines TICKET_NOT_FOUND error code', async () => {
      const { SearchErrorCode } = await import('../search')
      expect(SearchErrorCode.TICKET_NOT_FOUND).toBe('ticket_not_found')
    })

    it('defines VALIDATION_ERROR error code', async () => {
      const { SearchErrorCode } = await import('../search')
      expect(SearchErrorCode.VALIDATION_ERROR).toBe('validation_error')
    })
  })
})
