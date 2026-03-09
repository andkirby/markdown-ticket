/**
 * MDT-135: RelationshipBadge Component Unit Tests
 *
 * Tests relationship badges (related, depends, blocks).
 * Coverage: BR-8
 */

import { render, screen, cleanup } from '@testing-library/react'
import { RelationshipBadge } from './RelationshipBadge'

// Cleanup DOM between tests
afterEach(() => {
  cleanup()
})

describe('RelationshipBadge', () => {
  describe('related variant', () => {
    it('should render related icon and links', () => {
      render(<RelationshipBadge variant="related" links={['MDT-100', 'MDT-101']} />)

      expect(screen.getByText('🔗')).toBeInTheDocument()
      expect(screen.getByText('MDT-100')).toBeInTheDocument()
      expect(screen.getByText('MDT-101')).toBeInTheDocument()
    })

    it('should apply cyan colors for related', () => {
      const { container } = render(<RelationshipBadge variant="related" links={['MDT-100']} />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/cyan/)
    })
  })

  describe('depends variant', () => {
    it('should render depends icon and links', () => {
      render(<RelationshipBadge variant="depends" links={['MDT-050']} />)

      expect(screen.getByText('⬅️')).toBeInTheDocument()
      expect(screen.getByText('MDT-050')).toBeInTheDocument()
    })

    it('should apply amber colors for depends', () => {
      const { container } = render(<RelationshipBadge variant="depends" links={['MDT-050']} />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/amber/)
    })
  })

  describe('blocks variant', () => {
    it('should render blocks icon and links', () => {
      render(<RelationshipBadge variant="blocks" links={['MDT-200']} />)

      expect(screen.getByText('➡️')).toBeInTheDocument()
      expect(screen.getByText('MDT-200')).toBeInTheDocument()
    })

    it('should apply rose colors for blocks', () => {
      const { container } = render(<RelationshipBadge variant="blocks" links={['MDT-200']} />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toMatch(/rose/)
    })
  })

  describe('multiple links', () => {
    it('should render multiple links separated by comma', () => {
      render(<RelationshipBadge variant="related" links={['MDT-100', 'MDT-101', 'MDT-102']} />)

      expect(screen.getByText('MDT-100')).toBeInTheDocument()
      expect(screen.getByText('MDT-101')).toBeInTheDocument()
      expect(screen.getByText('MDT-102')).toBeInTheDocument()
    })
  })

  describe('base styling', () => {
    it.each(['related', 'depends', 'blocks'] as const)('should apply Badge base styling for variant "%s"', (variant) => {
      const { container } = render(<RelationshipBadge variant={variant} links={['MDT-100']} />)
      const badge = container.firstChild

      expect(badge).toHaveClass('rounded-full')
    })
  })

  describe('dark mode consistency', () => {
    it.each(['related', 'depends', 'blocks'] as const)('should include dark mode classes for variant "%s"', (variant) => {
      const { container } = render(<RelationshipBadge variant={variant} links={['MDT-100']} />)
      const badge = container.firstChild as HTMLElement

      expect(badge.className).toContain('dark:')
    })
  })

  describe('title attribute', () => {
    it('should include all links in title attribute', () => {
      render(<RelationshipBadge variant="related" links={['MDT-100', 'MDT-101']} />)
      // Title should show all related tickets
      const badge = document.querySelector('[title*="MDT-100"]')
      expect(badge).toBeTruthy()
    })
  })
})
