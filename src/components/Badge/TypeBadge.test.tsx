/**
 * MDT-135: TypeBadge Component Unit Tests
 *
 * Tests type badge rendering with gradient styling.
 * Coverage: BR-5, BR-7
 */

import { render, screen } from '@testing-library/react'
import { TypeBadge } from './TypeBadge'

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
      const badge = container.firstChild

      expect(badge).toHaveClass('rounded-full')
    })
  })

  describe('gradient styling (BR-5)', () => {
    it.each(allTypes)('should use gradient styling for type "%s"', (type) => {
      const { container } = render(<TypeBadge type={type} />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toContain('bg-gradient-to-r')
    })

    it('should apply blue/indigo gradient for Feature Enhancement', () => {
      const { container } = render(<TypeBadge type="Feature Enhancement" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/blue|indigo/)
    })

    it('should apply orange/amber gradient for Bug Fix', () => {
      const { container } = render(<TypeBadge type="Bug Fix" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/orange|amber/)
    })

    it('should apply purple/violet gradient for Architecture', () => {
      const { container } = render(<TypeBadge type="Architecture" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/purple|violet/)
    })

    it('should apply slate/gray gradient for Technical Debt', () => {
      const { container } = render(<TypeBadge type="Technical Debt" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/slate|gray/)
    })

    it('should apply cyan/teal gradient for Documentation', () => {
      const { container } = render(<TypeBadge type="Documentation" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/cyan|teal/)
    })

    it('should apply pink/rose gradient for Research', () => {
      const { container } = render(<TypeBadge type="Research" />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/pink|rose/)
    })
  })

  describe('dark mode consistency', () => {
    it.each(allTypes)('should include dark mode classes for type "%s"', (type) => {
      const { container } = render(<TypeBadge type={type} />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toContain('dark:')
    })
  })

  describe('unknown type handling', () => {
    it('should render unknown type with fallback styling', () => {
      const { container } = render(<TypeBadge type="Unknown" />)
      const badge = container.firstChild

      expect(screen.getByText('Unknown')).toBeInTheDocument()
      expect(badge).toBeTruthy()
    })
  })
})
