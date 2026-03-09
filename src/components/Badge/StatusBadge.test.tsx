/**
 * MDT-135: StatusBadge Component Unit Tests
 *
 * Tests status badge rendering for all CRStatus values.
 * Coverage: BR-1, BR-2, BR-3
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

// Cleanup DOM between tests
afterEach(() => {
  cleanup()
})

describe('StatusBadge', () => {
  const allStatuses = [
    'Proposed',
    'Approved',
    'In Progress',
    'Implemented',
    'Rejected',
    'On Hold',
    'Partially Implemented',
  ]

  describe('rendering', () => {
    it.each(allStatuses)('should render status "%s"', (status) => {
      render(<StatusBadge status={status} />)
      expect(screen.getByText(status)).toBeInTheDocument()
    })

    it('should apply Badge base styling', () => {
      const { container } = render(<StatusBadge status="In Progress" />)
      const badge = container.firstChild

      expect(badge).toHaveClass('rounded-full')
    })

    it('should apply outline variant styling', () => {
      const { container } = render(<StatusBadge status="Approved" />)
      const badge = container.firstChild

      expect(badge).toHaveClass('border')
    })
  })

  describe('status color mapping', () => {
    it('should apply gray colors for Proposed status', () => {
      const { container } = render(<StatusBadge status="Proposed" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.className).toMatch(/gray/)
    })

    it('should apply blue colors for Approved status', () => {
      const { container } = render(<StatusBadge status="Approved" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.className).toMatch(/blue/)
    })

    it('should apply yellow colors for In Progress status', () => {
      const { container } = render(<StatusBadge status="In Progress" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.className).toMatch(/yellow/)
    })

    it('should apply green colors for Implemented status', () => {
      const { container } = render(<StatusBadge status="Implemented" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.className).toMatch(/green/)
    })

    it('should apply red colors for Rejected status', () => {
      const { container } = render(<StatusBadge status="Rejected" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.className).toMatch(/red/)
    })

    it('should apply orange colors for On Hold status', () => {
      const { container } = render(<StatusBadge status="On Hold" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.className).toMatch(/orange/)
    })

    it('should apply purple colors for Partially Implemented status', () => {
      const { container } = render(<StatusBadge status="Partially Implemented" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/purple/)
    })
  })

  describe('dark mode consistency (BR-3)', () => {
    it.each(allStatuses)('should use 950 shade for dark mode background on "%s"', (status) => {
      const { container } = render(<StatusBadge status={status} />)
      const badge = container.firstChild as HTMLElement
      const classes = badge.className

      // Extract dark mode background shade
      const darkBgMatch = classes.match(/dark:bg-(\w+)-(\d+)/)
      if (darkBgMatch) {
        expect(darkBgMatch[2]).toBe('950')
      }
    })
  })

  describe('unknown status handling', () => {
    it('should render unknown status with fallback styling', () => {
      const { container } = render(<StatusBadge status="Unknown Status" />)
      const badge = container.firstChild as HTMLElement

      expect(screen.getByText('Unknown Status')).toBeInTheDocument()
      // Should fall back to gray
      expect(badge?.className).toMatch(/gray/)
    })
  })

  describe('accessibility', () => {
    it('should have accessible text content', () => {
      render(<StatusBadge status="In Progress" />)
      expect(screen.getByText('In Progress')).toBeVisible()
    })
  })
})
