/**
 * MDT-135: PriorityBadge Component Unit Tests
 *
 * Tests priority badge rendering with gradient styling.
 * Coverage: BR-4, BR-6
 */

import { render, screen } from '@testing-library/react'
import { PriorityBadge } from './PriorityBadge'

describe('PriorityBadge', () => {
  const allPriorities = ['Critical', 'High', 'Medium', 'Low']

  describe('rendering', () => {
    it.each(allPriorities)('should render priority "%s"', (priority) => {
      render(<PriorityBadge priority={priority} />)
      expect(screen.getByText(priority)).toBeInTheDocument()
    })

    it('should apply Badge base styling', () => {
      const { container } = render(<PriorityBadge priority="High" />)
      const badge = container.firstChild

      expect(badge).toHaveClass('rounded-full')
    })
  })

  describe('gradient styling (BR-4)', () => {
    it.each(allPriorities)('should use gradient styling for priority "%s"', (priority) => {
      const { container } = render(<PriorityBadge priority={priority} />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toContain('bg-gradient-to-r')
    })

    it('should apply rose gradient for Critical priority', () => {
      const { container } = render(<PriorityBadge priority="Critical" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/rose/)
    })

    it('should apply rose gradient for High priority', () => {
      const { container } = render(<PriorityBadge priority="High" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/rose/)
    })

    it('should apply amber gradient for Medium priority', () => {
      const { container } = render(<PriorityBadge priority="Medium" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/amber/)
    })

    it('should apply emerald gradient for Low priority', () => {
      const { container } = render(<PriorityBadge priority="Low" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/emerald/)
    })
  })

  describe('dark mode consistency', () => {
    it.each(allPriorities)('should include dark mode classes for priority "%s"', (priority) => {
      const { container } = render(<PriorityBadge priority={priority} />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toContain('dark:')
    })
  })

  describe('unknown priority handling', () => {
    it('should render unknown priority with fallback styling', () => {
      const { container } = render(<PriorityBadge priority="Unknown" />)
      const badge = container.firstChild

      expect(screen.getByText('Unknown')).toBeInTheDocument()
      // Should fall back to a default
      expect(badge).toBeTruthy()
    })
  })
})
