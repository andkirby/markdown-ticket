/**
 * MDT-135: PriorityBadge Component Unit Tests
 *
 * Tests priority badge rendering with gradient styling.
 * Uses data attributes for color mapping (see badge.css).
 * Coverage: BR-4, BR-6
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { render, screen, cleanup } from '@testing-library/react'
import { PriorityBadge } from './PriorityBadge'

// Cleanup DOM between tests
afterEach(() => {
  cleanup()
})

describe('PriorityBadge', () => {
  const allPriorities = ['Critical', 'High', 'Medium', 'Low']

  describe('rendering', () => {
    it.each(allPriorities)('should render priority "%s"', (priority) => {
      render(<PriorityBadge priority={priority} />)
      expect(screen.getByText(priority)).toBeInTheDocument()
    })

    it('should apply Badge base styling', () => {
      const { container } = render(<PriorityBadge priority="High" />)
      const badge = container.firstChild as HTMLElement

      expect(badge).toHaveClass('badge')
      expect(badge).toHaveClass('rounded-full')
    })
  })

  describe('data attribute mapping', () => {
    it('should set data-priority="critical" for Critical priority', () => {
      const { container } = render(<PriorityBadge priority="Critical" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-priority')).toBe('critical')
    })

    it('should set data-priority="high" for High priority', () => {
      const { container } = render(<PriorityBadge priority="High" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-priority')).toBe('high')
    })

    it('should set data-priority="medium" for Medium priority', () => {
      const { container } = render(<PriorityBadge priority="Medium" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-priority')).toBe('medium')
    })

    it('should set data-priority="low" for Low priority', () => {
      const { container } = render(<PriorityBadge priority="Low" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-priority')).toBe('low')
    })

    it('should set data-priority for unknown priority (lowercase)', () => {
      const { container } = render(<PriorityBadge priority="Unknown Priority" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-priority')).toBe('unknown-priority')
    })
  })

  describe('unknown priority handling', () => {
    it('should render unknown priority with fallback styling', () => {
      const { container } = render(<PriorityBadge priority="Unknown" />)
      const badge = container.firstChild as HTMLElement

      expect(screen.getByText('Unknown')).toBeInTheDocument()
      expect(badge).toHaveClass('badge')
    })
  })
})
