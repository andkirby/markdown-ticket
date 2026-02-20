/**
 * MDT-095: Git Worktree Support - WorktreeTypes Unit Tests
 *
 * Tests for WorktreeMapping and WorktreeConfig interfaces/types.
 *
 * @module shared/models/__tests__/WorktreeTypes.test.ts
 */

import { validateWorktreeConfig, WorktreeConfigSchema, WorktreeMappingSchema } from '../WorktreeTypes'

describe('WorktreeTypes', () => {
  describe('WorktreeConfigSchema', () => {
    it('should accept valid config with enabled=true', () => {
      const config = { enabled: true }
      const result = WorktreeConfigSchema.parse(config)
      expect(result.enabled).toBe(true)
    })

    it('should accept valid config with enabled=false', () => {
      const config = { enabled: false }
      const result = WorktreeConfigSchema.parse(config)
      expect(result.enabled).toBe(false)
    })

    it('should use enabled=true as default when absent', () => {
      const config = {}
      const result = WorktreeConfigSchema.parse(config)
      expect(result.enabled).toBe(true)
    })

    it('should reject non-boolean enabled value', () => {
      const config = { enabled: 'yes' }
      expect(() => WorktreeConfigSchema.parse(config)).toThrow()
    })
  })

  describe('WorktreeMappingSchema', () => {
    it('should accept valid mapping with ticketCode and path', () => {
      const mapping = {
        ticketCode: 'MDT-095',
        path: '/test/worktrees/MDT-095',
      }
      const result = WorktreeMappingSchema.parse(mapping)
      expect(result.ticketCode).toBe('MDT-095')
      expect(result.path).toBe('/test/worktrees/MDT-095')
    })

    it('should reject invalid ticket code format', () => {
      const mapping = {
        ticketCode: 'invalid',
        path: '/test/worktrees/invalid',
      }
      expect(() => WorktreeMappingSchema.parse(mapping)).toThrow()
    })

    it('should accept different project code prefixes', () => {
      const mapping = {
        ticketCode: 'API-123',
        path: '/test/worktrees/API-123',
      }
      const result = WorktreeMappingSchema.parse(mapping)
      expect(result.ticketCode).toBe('API-123')
    })

    it('should include branch name when present', () => {
      const mapping = {
        ticketCode: 'MDT-095',
        path: '/test/worktrees/MDT-095',
        branch: 'refs/heads/feature/MDT-095',
      }
      const result = WorktreeMappingSchema.parse(mapping)
      expect(result.branch).toBe('refs/heads/feature/MDT-095')
    })
  })

  describe('validateWorktreeConfig', () => {
    it('should return valid config for valid input', () => {
      const input = { enabled: true }
      const result = validateWorktreeConfig(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.enabled).toBe(true)
      }
    })

    it('should return error for invalid input', () => {
      const input = { enabled: 'invalid' }
      const result = validateWorktreeConfig(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeDefined()
      }
    })
  })
})
