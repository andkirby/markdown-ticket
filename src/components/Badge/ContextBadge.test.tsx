/**
 * MDT-135: ContextBadge Component Unit Tests
 *
 * Tests context badges (phase/epic, assignee, worktree).
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

    it('should apply gray colors for phase', () => {
      const { container } = render(<ContextBadge variant="phase" value="Epic A" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/gray/)
    })
  })

  describe('assignee variant', () => {
    it('should render assignee value with icon', () => {
      render(<ContextBadge variant="assignee" value="john" />)
      expect(screen.getByText('john')).toBeInTheDocument()
    })

    it('should apply purple colors for assignee', () => {
      const { container } = render(<ContextBadge variant="assignee" value="jane" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/purple/)
    })
  })

  describe('worktree variant', () => {
    it('should render worktree badge', () => {
      render(<ContextBadge variant="worktree" />)
      expect(screen.getByText(/worktree/i)).toBeInTheDocument()
    })

    it('should apply emerald colors for worktree', () => {
      const { container } = render(<ContextBadge variant="worktree" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/emerald/)
    })

    it('should show worktree path in title when provided', () => {
      const { container } = render(<ContextBadge variant="worktree" worktreePath="/path/to/worktree" />)
      const badge = container.firstChild as HTMLElement

      // Title attribute should contain path
      expect(badge?.getAttribute('title')).toContain('/path/to/worktree')
    })
  })

  describe('base styling', () => {
    it.each(['phase', 'assignee', 'worktree'] as const)('should apply Badge base styling for variant "%s"', (variant) => {
      const { container } = render(
        <ContextBadge variant={variant} value={variant === 'worktree' ? undefined : 'test'} />,
      )
      const badge = container.firstChild

      expect(badge).toHaveClass('rounded-full')
    })
  })

  describe('dark mode consistency', () => {
    it.each(['phase', 'assignee', 'worktree'] as const)('should include dark mode classes for variant "%s"', (variant) => {
      const { container } = render(
        <ContextBadge variant={variant} value={variant === 'worktree' ? undefined : 'test'} />,
      )
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toContain('dark:')
    })
  })
})
