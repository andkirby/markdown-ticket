/**
 * MDT-135: ContextBadge Component Unit Tests
 *
 * Tests context badges (phase/epic, assignee, worktree).
 * Uses data attributes for color mapping (see badge.css).
 * Coverage: BR-8
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { ContextBadge } from './ContextBadge'

// Cleanup DOM between tests
afterEach(() => {
  cleanup()
})

describe('ContextBadge', () => {
  describe('phase variant', () => {
    it('should render phase value', () => {
      render(<ContextBadge variant="phase" value="Phase 1" />)
      expect(screen.getByText('Phase 1')).toBeInTheDocument()
    })

    it('should set data-context="phase" for phase variant', () => {
      const { container } = render(<ContextBadge variant="phase" value="Epic A" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-context')).toBe('phase')
    })
  })

  describe('assignee variant', () => {
    it('should render assignee value', () => {
      render(<ContextBadge variant="assignee" value="john" />)
      expect(screen.getByText('john')).toBeInTheDocument()
    })

    it('should set data-context="assignee" for assignee variant', () => {
      const { container } = render(<ContextBadge variant="assignee" value="jane" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-context')).toBe('assignee')
    })
  })

  describe('worktree variant', () => {
    it('should render worktree badge', () => {
      render(<ContextBadge variant="worktree" />)
      expect(screen.getByText(/worktree/i)).toBeInTheDocument()
    })

    it('should set data-context="worktree" for worktree variant', () => {
      const { container } = render(<ContextBadge variant="worktree" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-context')).toBe('worktree')
    })

    it('should show worktree path in title when provided', () => {
      const { container } = render(<ContextBadge variant="worktree" worktreePath="/path/to/worktree" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('title')).toContain('/path/to/worktree')
    })
  })

  describe('base styling', () => {
    it.each(['phase', 'assignee', 'worktree'] as const)('should apply Badge base styling for variant "%s"', (variant) => {
      const { container } = render(
        <ContextBadge variant={variant} value={variant === 'worktree' ? undefined : 'test'} />,
      )
      const badge = container.firstChild as HTMLElement

      expect(badge).toHaveClass('badge')
      expect(badge).toHaveClass('rounded-full')
    })
  })
})
