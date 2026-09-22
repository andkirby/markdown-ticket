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
    })

    it('should render a flat badge with no border', () => {
      const { container } = render(<StatusBadge status="Approved" />)
      const badge = container.firstChild as HTMLElement

      expect(badge).toHaveClass('badge')
      expect(badge).not.toHaveClass('border')
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

  describe('leading status glyph (MDT-247)', () => {
    it('renders a leading glyph with the badge icon class and data-status', () => {
      const { container } = render(<StatusBadge status="In Progress" />)
      const badge = container.firstChild as HTMLElement
      const icon = badge.querySelector('svg.badge__icon[data-status="in-progress"]')
      expect(icon).not.toBeNull()
      expect(icon?.getAttribute('aria-hidden')).toBe('true')
      // Glyph precedes the label: the label text node comes after the svg.
      expect(badge.textContent).toBe('In Progress')
    })

    it('renders a glyph for each of the 7 statuses', () => {
      for (const status of allStatuses) {
        const { container } = render(<StatusBadge status={status} />)
        const kebab = status.toLowerCase().replace(/\s+/g, '-')
        expect(container.querySelector(`svg.badge__icon[data-status="${kebab}"]`)).not.toBeNull()
      }
    })

    it('uses the rejected glyph under invalid colors when isInvalid (BR-1.10)', () => {
      const { container } = render(<StatusBadge status="In Review" isInvalid />)
      const badge = container.firstChild as HTMLElement
      expect(badge.getAttribute('data-status')).toBe('invalid')
      expect(badge.querySelector('svg.badge__icon[data-status="rejected"]')).not.toBeNull()
      // Label unchanged.
      expect(badge.textContent).toBe('In Review')
    })

    it('renders no glyph for an unmapped status without isInvalid (BR-1.9)', () => {
      const { container } = render(<StatusBadge status="In Review" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.querySelector('svg')).toBeNull()
      expect(badge.textContent).toBe('In Review')
    })
  })
})
