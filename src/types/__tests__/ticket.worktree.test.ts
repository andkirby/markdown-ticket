/**
 * MDT-095: Git Worktree Support - Frontend Ticket Type Tests
 *
 * Tests for extended ticket types with worktree fields.
 *
 * @module src/types/__tests__/ticket.worktree.test.ts
 */

import { isTicketInWorktree, TicketSchema, TicketWithWorktreeSchema } from '../ticket'

describe('Ticket Types - Worktree Extensions (MDT-095)', () => {
  describe('TicketSchema extended fields', () => {
    it('should accept ticket without inWorktree field (backward compatible C5)', () => {
      const ticket = {
        code: 'MDT-095',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      }

      const result = TicketSchema.safeParse(ticket)
      expect(result.success).toBe(true)
    })

    it('should accept ticket with inWorktree: false', () => {
      const ticket = {
        code: 'MDT-095',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        inWorktree: false,
      }

      const result = TicketSchema.safeParse(ticket)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.inWorktree).toBe(false)
      }
    })

    it('should accept ticket with inWorktree: true', () => {
      const ticket = {
        code: 'MDT-095',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        inWorktree: true,
        worktreePath: '/test/worktrees/MDT-095',
      }

      const result = TicketWithWorktreeSchema.safeParse(ticket)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.inWorktree).toBe(true)
        expect(result.data.worktreePath).toBe('/test/worktrees/MDT-095')
      }
    })
  })

  describe('isTicketInWorktree helper', () => {
    it('should return true when ticket has inWorktree: true', () => {
      const ticket = {
        code: 'MDT-095',
        title: 'Test',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        inWorktree: true,
      }

      expect(isTicketInWorktree(ticket)).toBe(true)
    })

    it('should return false when ticket has inWorktree: false', () => {
      const ticket = {
        code: 'MDT-095',
        title: 'Test',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        inWorktree: false,
      }

      expect(isTicketInWorktree(ticket)).toBe(false)
    })

    it('should return false when inWorktree is undefined (backward compatible C5)', () => {
      const ticket = {
        code: 'MDT-095',
        title: 'Test',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
      }

      expect(isTicketInWorktree(ticket)).toBe(false)
    })
  })

  describe('worktreePath field', () => {
    it('should be optional in ticket schema', () => {
      const ticket = {
        code: 'MDT-095',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        inWorktree: true,
        // worktreePath omitted
      }

      const result = TicketWithWorktreeSchema.safeParse(ticket)
      expect(result.success).toBe(true)
    })

    it('should accept valid absolute path', () => {
      const ticket = {
        code: 'MDT-095',
        title: 'Test CR',
        status: 'Proposed',
        type: 'Feature Enhancement',
        priority: 'Medium',
        inWorktree: true,
        worktreePath: '/Users/dev/worktrees/MDT-095',
      }

      const result = TicketWithWorktreeSchema.safeParse(ticket)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.worktreePath).toBe('/Users/dev/worktrees/MDT-095')
      }
    })
  })
})
