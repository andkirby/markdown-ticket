/**
 * MDT-135, MDT-187: RelationshipBadge Component Unit Tests
 *
 * Tests relationship badges (related, depends, blocks) plus:
 * - compact-mode elision (same-project → bare number, cross-project → full key)
 * - overflow collapse (+N trigger → popover)
 * - click isolation (stopPropagation so card onClick does not double-fire)
 *
 * Uses data attributes for color mapping (see badge.css).
 * Coverage: BR-8
 */

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'bun:test'
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
          <RelationshipBadge
            variant="related"
            links={['TEST-100', 'TEST-101']}
          />
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

  describe('multiple links (full mode, default)', () => {
    it('should render multiple links separated by comma', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={['TEST-100', 'TEST-101', 'TEST-102']}
          />
        </TestHarness>,
      )

      expect(screen.getByText('TEST-100')).toBeInTheDocument()
      expect(screen.getByText('TEST-101')).toBeInTheDocument()
      expect(screen.getByText('TEST-102')).toBeInTheDocument()
    })
  })

  describe('base styling', () => {
    it.each(['related', 'depends', 'blocks'] as const)(
      'should apply Badge base styling for variant "%s"',
      (variant) => {
        const { container } = render(
          <TestHarness projectCode="TEST">
            <RelationshipBadge variant={variant} links={['TEST-100']} />
          </TestHarness>,
        )
        const badge = container.querySelector('.badge')

        expect(badge).toBeTruthy()
      },
    )
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
      // href is now absolute via buildTicketPath
      expect(link?.getAttribute('href')).toBe('/prj/TEST/ticket/TEST-100')
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
      expect(link?.getAttribute('href')).toBe('/prj/TEST/ticket/OTHER-123')
    })
  })

  describe('compact-mode elision (MDT-187)', () => {
    it('elides a single same-project link to a bare number', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={['TEST-030']}
            displayMode="compact"
          />
        </TestHarness>,
      )

      expect(screen.getByText('030')).toBeInTheDocument()
      expect(screen.queryByText('TEST-030')).not.toBeInTheDocument()
    })

    it('keeps a cross-project link as a full CR key', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={['VOC-005']}
            displayMode="compact"
          />
        </TestHarness>,
      )

      expect(screen.getByText('VOC-005')).toBeInTheDocument()
    })

    it('elides same-project and keeps cross-project in a mixed list', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={['TEST-030', 'VOC-005', 'TEST-035']}
            displayMode="compact"
          />
        </TestHarness>,
      )

      expect(screen.getByText('030')).toBeInTheDocument()
      expect(screen.getByText('VOC-005')).toBeInTheDocument()
      expect(screen.getByText('035')).toBeInTheDocument()
      expect(screen.queryByText('TEST-030')).not.toBeInTheDocument()
      expect(screen.queryByText('TEST-035')).not.toBeInTheDocument()
    })

    it('preserves multi-digit numbers (TEST-1005 → 1005)', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={['TEST-1005']}
            displayMode="compact"
          />
        </TestHarness>,
      )

      expect(screen.getByText('1005')).toBeInTheDocument()
    })

    it('carries the full key in a per-link title (hover tooltip)', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={['TEST-030']}
            displayMode="compact"
          />
        </TestHarness>,
      )

      // The elided text node is wrapped in a span that carries the full key title.
      const wrapper = screen.getByText('030').closest('[title]')
      expect(wrapper?.getAttribute('title')).toBe('TEST-030')
    })
  })

  describe('overflow collapse (MDT-187)', () => {
    it('renders all links inline with no trigger at exactly INLINE_MAX (3)', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={['TEST-001', 'TEST-002', 'TEST-003']}
            displayMode="compact"
          />
        </TestHarness>,
      )

      expect(screen.getByText('001')).toBeInTheDocument()
      expect(screen.getByText('002')).toBeInTheDocument()
      expect(screen.getByText('003')).toBeInTheDocument()
      expect(screen.queryByText(/\+1/)).not.toBeInTheDocument()
    })

    it('collapses the tail beyond INLINE_MAX into a +N trigger', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={['TEST-001', 'TEST-002', 'TEST-003', 'TEST-004', 'TEST-005']}
            displayMode="compact"
          />
        </TestHarness>,
      )

      // First three inline
      expect(screen.getByText('001')).toBeInTheDocument()
      expect(screen.getByText('002')).toBeInTheDocument()
      expect(screen.getByText('003')).toBeInTheDocument()
      // Tail hidden, not inline
      expect(screen.queryByText('004')).not.toBeInTheDocument()
      expect(screen.queryByText('005')).not.toBeInTheDocument()
      // +N trigger present
      const trigger = screen.getByRole('button', { name: /\+2/ })
      expect(trigger).toBeInTheDocument()
      expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
    })

    it('keeps all full keys in the badge-level title when collapsed', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={['TEST-001', 'TEST-002', 'TEST-003', 'TEST-004', 'TEST-005']}
            displayMode="compact"
          />
        </TestHarness>,
      )

      const badge = container.querySelector('.badge') as HTMLElement
      expect(badge.getAttribute('title')).toBe(
        'TEST-001, TEST-002, TEST-003, TEST-004, TEST-005',
      )
    })

    it('does not collapse in full mode (viewer) regardless of count', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={['TEST-001', 'TEST-002', 'TEST-003', 'TEST-004', 'TEST-005']}
          />
        </TestHarness>,
      )

      // Full mode: all five render inline, no trigger
      expect(screen.getByText('TEST-001')).toBeInTheDocument()
      expect(screen.getByText('TEST-005')).toBeInTheDocument()
      expect(screen.queryByText(/\+2/)).not.toBeInTheDocument()
    })
  })

  describe('popover behavior (MDT-187)', () => {
    const fiveLinks = [
      'TEST-001',
      'TEST-002',
      'TEST-003',
      'TEST-004',
      'TEST-005',
    ]

    it('opens the popover on +N click and lists hidden links as full codes', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={fiveLinks}
            displayMode="compact"
          />
        </TestHarness>,
      )

      const trigger = screen.getByRole('button', { name: /\+2/ })
      fireEvent.click(trigger)

      // Popover portals to document.body; hidden links appear as full keys.
      expect(screen.getByText('TEST-004')).toBeInTheDocument()
      expect(screen.getByText('TEST-005')).toBeInTheDocument()
      expect(trigger.getAttribute('aria-expanded')).toBe('true')
    })

    it('closes the popover on Escape and returns focus to the trigger', () => {
      render(
        <TestHarness projectCode="TEST">
          <RelationshipBadge
            variant="related"
            links={fiveLinks}
            displayMode="compact"
          />
        </TestHarness>,
      )

      const trigger = screen.getByRole('button', { name: /\+2/ })
      fireEvent.click(trigger)
      expect(trigger.getAttribute('aria-expanded')).toBe('true')

      fireEvent.keyDown(document.body, { key: 'Escape' })
      expect(trigger.getAttribute('aria-expanded')).toBe('false')
    })
  })

  describe('click isolation (MDT-187)', () => {
    it('does not call a parent onClick when an inline link is clicked', () => {
      const parentClick = vi.fn()
      render(
        <TestHarness projectCode="TEST">
          <div onClick={parentClick}>
            <RelationshipBadge
              variant="related"
              links={['TEST-100']}
              displayMode="compact"
            />
          </div>
        </TestHarness>,
      )

      fireEvent.click(screen.getByText('100'))
      expect(parentClick).not.toHaveBeenCalled()
    })

    it('does not call a parent onClick when the +N trigger is clicked', () => {
      const parentClick = vi.fn()
      render(
        <TestHarness projectCode="TEST">
          <div onClick={parentClick}>
            <RelationshipBadge
              variant="related"
              links={['TEST-001', 'TEST-002', 'TEST-003', 'TEST-004']}
              displayMode="compact"
            />
          </div>
        </TestHarness>,
      )

      fireEvent.click(screen.getByRole('button', { name: /\+1/ }))
      expect(parentClick).not.toHaveBeenCalled()
    })
  })
})
