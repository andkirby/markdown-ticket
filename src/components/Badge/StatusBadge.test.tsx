/**
 * MDT-135: StatusBadge Component Unit Tests
 *
 * Tests status badge rendering for all CRStatus values.
 * Uses data attributes for color mapping (see badge.css).
 * Coverage: BR-1, BR-2, BR-3
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
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
      const badge = container.firstChild as HTMLElement

      expect(badge).toHaveClass('badge')
      expect(badge).toHaveClass('rounded-full')
    })

    it('should apply outline variant styling', () => {
      const { container } = render(<StatusBadge status="Approved" />)
      const badge = container.firstChild as HTMLElement

      expect(badge).toHaveClass('border')
    })
  })

  describe('data attribute mapping', () => {
    it('should set data-status="proposed" for Proposed status', () => {
      const { container } = render(<StatusBadge status="Proposed" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-status')).toBe('proposed')
    })

    it('should set data-status="approved" for Approved status', () => {
      const { container } = render(<StatusBadge status="Approved" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-status')).toBe('approved')
    })

    it('should set data-status="in-progress" for In Progress status', () => {
      const { container } = render(<StatusBadge status="In Progress" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-status')).toBe('in-progress')
    })

    it('should set data-status="implemented" for Implemented status', () => {
      const { container } = render(<StatusBadge status="Implemented" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-status')).toBe('implemented')
    })

    it('should set data-status="rejected" for Rejected status', () => {
      const { container } = render(<StatusBadge status="Rejected" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-status')).toBe('rejected')
    })

    it('should set data-status="on-hold" for On Hold status', () => {
      const { container } = render(<StatusBadge status="On Hold" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-status')).toBe('on-hold')
    })

    it('should set data-status="partially-implemented" for Partially Implemented status', () => {
      const { container } = render(<StatusBadge status="Partially Implemented" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-status')).toBe('partially-implemented')
    })

    it('should set data-status for unknown status (lowercase with hyphens)', () => {
      const { container } = render(<StatusBadge status="Unknown Status" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-status')).toBe('unknown-status')
    })
  })

  describe('unknown status handling', () => {
    it('should render unknown status with fallback styling', () => {
      const { container } = render(<StatusBadge status="Unknown Status" />)
      const badge = container.firstChild as HTMLElement

      expect(screen.getByText('Unknown Status')).toBeInTheDocument()
      expect(badge).toHaveClass('badge')
    })
  })

  describe('accessibility', () => {
    it('should have accessible text content', () => {
      render(<StatusBadge status="In Progress" />)
      expect(screen.getByText('In Progress')).toBeVisible()
    })
  })
})
