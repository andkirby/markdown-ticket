/**
 * MDT-135: TypeBadge Component Unit Tests
 *
 * Tests type badge rendering with gradient styling.
 * Uses data attributes for color mapping (see badge.css).
 * Coverage: BR-5, BR-7
 */

import { describe, it, expect, afterEach } from 'bun:test'
import { render, screen, cleanup } from '@testing-library/react'
import { TypeBadge } from './TypeBadge'

// Cleanup DOM between tests
afterEach(() => {
  cleanup()
})

describe('TypeBadge', () => {
  const allTypes = [
    'Feature Enhancement',
    'Bug Fix',
    'Architecture',
    'Technical Debt',
    'Documentation',
    'Research',
  ]

  describe('rendering', () => {
    it.each(allTypes)('should render type "%s"', (type) => {
      render(<TypeBadge type={type} />)
      expect(screen.getByText(type)).toBeInTheDocument()
    })

    it('should apply Badge base styling', () => {
      const { container } = render(<TypeBadge type="Feature Enhancement" />)
      const badge = container.firstChild as HTMLElement

      expect(badge).toHaveClass('badge')
      expect(badge).toHaveClass('rounded-full')
    })
  })

  describe('data attribute mapping', () => {
    it('should set data-type="feature-enhancement" for Feature Enhancement', () => {
      const { container } = render(<TypeBadge type="Feature Enhancement" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-type')).toBe('feature-enhancement')
    })

    it('should set data-type="bug-fix" for Bug Fix', () => {
      const { container } = render(<TypeBadge type="Bug Fix" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-type')).toBe('bug-fix')
    })

    it('should set data-type="architecture" for Architecture', () => {
      const { container } = render(<TypeBadge type="Architecture" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-type')).toBe('architecture')
    })

    it('should set data-type="technical-debt" for Technical Debt', () => {
      const { container } = render(<TypeBadge type="Technical Debt" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-type')).toBe('technical-debt')
    })

    it('should set data-type="documentation" for Documentation', () => {
      const { container } = render(<TypeBadge type="Documentation" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-type')).toBe('documentation')
    })

    it('should set data-type="research" for Research', () => {
      const { container } = render(<TypeBadge type="Research" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-type')).toBe('research')
    })

    it('should set data-type for unknown type (lowercase with hyphens)', () => {
      const { container } = render(<TypeBadge type="Unknown Type" />)
      const badge = container.firstChild as HTMLElement

      expect(badge?.getAttribute('data-type')).toBe('unknown-type')
    })
  })

  describe('unknown type handling', () => {
    it('should render unknown type with fallback styling', () => {
      const { container } = render(<TypeBadge type="Unknown" />)
      const badge = container.firstChild as HTMLElement

      expect(screen.getByText('Unknown')).toBeInTheDocument()
      expect(badge).toHaveClass('badge')
    })
  })
})
