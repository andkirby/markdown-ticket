/**
 * MDT-135: RelationshipBadge Component Unit Tests
 *
 * Tests relationship badges (related, depends, blocks).
 * Uses data attributes for color mapping (see badge.css).
 * Coverage: BR-8
 */

import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { RelationshipBadge } from './RelationshipBadge'

// Cleanup DOM between tests
afterEach(() => {
  cleanup()
})

// Test harness component to provide Router context with projectCode param
function TestHarness({
  children,
  projectCode = 'TEST',
}: {
  children: ReactNode
  projectCode?: string
}) {
  return (
    <MemoryRouter initialEntries={[`/prj/${projectCode}`]}>
      <Routes>
        <Route path="/prj/:projectCode" element={<>{children}</>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RelationshipBadge', () => {
  describe('related variant', () => {
    it('should render related icon and links', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant="related" links={['TEST-100', 'TEST-101']} />
        </TestHarness>,
      )

      expect(screen.getByText('🔗')).toBeInTheDocument()
      expect(screen.getByText('TEST-100')).toBeInTheDocument()
      expect(screen.getByText('TEST-101')).toBeInTheDocument()
    })

    it('should set data-relationship="related" for related variant', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant="related" links={['TEST-100']} />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge') as HTMLElement

      expect(badge?.getAttribute('data-relationship')).toBe('related')
    })
  })

  describe('depends variant', () => {
    it('should render depends icon and links', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant="depends" links={['TEST-050']} />
        </TestHarness>,
      )

      expect(screen.getByText('⬅️')).toBeInTheDocument()
      expect(screen.getByText('TEST-050')).toBeInTheDocument()
    })

    it('should set data-relationship="depends" for depends variant', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant="depends" links={['TEST-050']} />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge') as HTMLElement

      expect(badge?.getAttribute('data-relationship')).toBe('depends')
    })
  })

  describe('blocks variant', () => {
    it('should render blocks icon and links', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant="blocks" links={['TEST-200']} />
        </TestHarness>,
      )

      expect(screen.getByText('➡️')).toBeInTheDocument()
      expect(screen.getByText('TEST-200')).toBeInTheDocument()
    })

    it('should set data-relationship="blocks" for blocks variant', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant="blocks" links={['TEST-200']} />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge') as HTMLElement

      expect(badge?.getAttribute('data-relationship')).toBe('blocks')
    })
  })

  describe('multiple links', () => {
    it('should render multiple links separated by comma', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant="related" links={['TEST-100', 'TEST-101', 'TEST-102']} />
        </TestHarness>,
      )

      expect(screen.getByText('TEST-100')).toBeInTheDocument()
      expect(screen.getByText('TEST-101')).toBeInTheDocument()
      expect(screen.getByText('TEST-102')).toBeInTheDocument()
    })
  })

  describe('base styling', () => {
    it.each(['related', 'depends', 'blocks'] as const)('should apply Badge base styling for variant "%s"', (variant) => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant={variant} links={['TEST-100']} />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge')

      expect(badge).toBeTruthy()
    })
  })

  describe('title attribute', () => {
    it('should include all links in title attribute', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant="related" links={['TEST-100', 'TEST-101']} />
        </TestHarness>,
      )
      // Title should show all related tickets
      const badge = document.querySelector('[title*="TEST-100"]')
      expect(badge).toBeTruthy()
    })
  })

  describe('clickable links', () => {
    it('should render links as SmartLink components', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant="related" links={['TEST-100']} />
        </TestHarness>,
      )

      // SmartLink renders an anchor for ticket links
      const link = screen.getByText('TEST-100').closest('a')
      expect(link).toBeTruthy()
      // href is relative to current route: /prj/TEST resolves TEST-100 to /prj/TEST/TEST-100
      expect(link?.getAttribute('href')).toBe('/prj/TEST/TEST-100')
    })

    it('should handle cross-project links', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge variant="related" links={['OTHER-123']} />
        </TestHarness>,
      )

      const link = screen.getByText('OTHER-123').closest('a')
      expect(link).toBeTruthy()
      // Cross-project link resolves relative to current project route
      expect(link?.getAttribute('href')).toBe('/prj/TEST/OTHER-123')
    })
  })
})
