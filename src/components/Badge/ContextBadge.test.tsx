/**
 * MDT-135, MDT-193: ContextBadge Component Unit Tests
 *
 * Tests context badges (phase/epic, assignee, worktree).
 * Uses data attributes for color mapping (see badge.css).
 *
 * MDT-193 additions (phase variant only):
 * - Whole-string ticket keys render as SmartLinks (same + cross-project)
 * - `.md` and `#anchor` suffixes still linkify
 * - Free text, malformed values, and embedded refs render as plain text
 * - `enableTicketLinks=false` global toggle disables Epic linking
 * - Link click stops propagation (no parent onClick double-fire)
 *
 * Coverage: BR-8
 */

import type { ReactNode } from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'bun:test'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ContextBadge } from './ContextBadge'

// Cleanup DOM between tests
afterEach(() => {
  cleanup()
})

// Reset link-config localStorage so toggle state doesn't leak between tests.
beforeEach(() => {
  localStorage.removeItem('markdown-ticket-link-config')
})

// Test harness component to provide Router context with projectCode param.
// Required because ContextBadge (phase variant) calls useParams to resolve
// same- vs. cross-project ticket refs.
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

describe('ContextBadge', () => {
  describe('phase variant', () => {
    it('should render phase value', () => {
      render(
        <TestHarness>
          <ContextBadge variant="phase" value="Phase 1" />
        </TestHarness>,
      )
      expect(screen.getByText('Phase 1')).toBeInTheDocument()
    })

    it('should set data-context="phase" for phase variant', () => {
      const { container } = render(
        <TestHarness>
          <ContextBadge variant="phase" value="Epic A" />
        </TestHarness>,
      )
      // The badge root is the element carrying data-context; find it via class.
      const badge = container.querySelector('.badge') as HTMLElement

      expect(badge?.getAttribute('data-context')).toBe('phase')
    })
  })

  // ── MDT-193: phase variant ticket-link rendering ──────────────────────
  describe('phase variant ticket linking (MDT-193)', () => {
    it('renders a same-project bare ticket key as a link', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value="TEST-012" />
        </TestHarness>,
      )

      const link = container.querySelector('[data-link-type="ticket"]')
      expect(link).not.toBeNull()
      expect(link?.getAttribute('href')).toContain('/prj/TEST/ticket/TEST-012')
      expect(screen.getByText('TEST-012')).toBeInTheDocument()
    })

    it('renders a cross-project bare ticket key as a link', () => {
      // NOTE: classifyLink's ticket regex ([A-Z]+-[A-Z]?\d+) matches before its
      // cross-project branch, so ABC-012 classifies as TICKET and resolves
      // against the current project route — same behavior RelationshipBadge
      // exhibits (see RelationshipBadge.test.tsx:172-183). This is a known
      // pre-existing classifyLink limitation (see linkProcessor.mdt150.test.ts:119),
      // not an MDT-193 regression. The MDT-193 contract is "whole-string ticket
      // keys render as links"; we do not assert cross-project routing here.
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value="ABC-012" />
        </TestHarness>,
      )

      const link = container.querySelector('[data-link-type="ticket"]')
      expect(link).not.toBeNull()
      expect(link?.getAttribute('href')).toContain('/prj/TEST/ticket/ABC-012')
    })

    it('linkifies a ticket key with a `.md` suffix', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value="TEST-012.md" />
        </TestHarness>,
      )

      expect(container.querySelector('[data-link-type="ticket"]')).not.toBeNull()
    })

    it('linkifies a ticket key with an anchor suffix', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value="TEST-012#section" />
        </TestHarness>,
      )

      const link = container.querySelector('[data-link-type="ticket"]')
      expect(link).not.toBeNull()
      expect(link?.getAttribute('href')).toContain('#section')
    })

    it('renders free text as plain text (no link)', () => {
      const { container } = render(
        <TestHarness>
          <ContextBadge variant="phase" value="Phase 2" />
        </TestHarness>,
      )

      expect(container.querySelector('[data-link-type]')).toBeNull()
      expect(screen.getByText('Phase 2')).toBeInTheDocument()
    })

    it('renders an embedded ticket ref in prose as plain text (non-goal)', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value="Epic: TEST-012" />
        </TestHarness>,
      )

      // Embedded refs are explicitly out of scope; whole-string match only.
      expect(container.querySelector('[data-link-type]')).toBeNull()
    })

    it('renders malformed near-keys as plain text', () => {
      // TEST- is not a valid key (no digits); -012 has no project prefix.
      // Either falls through classifyLink to UNKNOWN → plain text.
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value="TEST-" />
        </TestHarness>,
      )

      expect(container.querySelector('[data-link-type]')).toBeNull()
      expect(screen.getByText('TEST-')).toBeInTheDocument()
    })

    it('renders the value as plain text when enableTicketLinks is disabled', () => {
      localStorage.setItem(
        'markdown-ticket-link-config',
        JSON.stringify({ enableTicketLinks: false }),
      )
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value="TEST-012" />
        </TestHarness>,
      )

      // SmartLink renders a plain span when ticket links are globally off.
      expect(container.querySelector('[data-link-type="ticket"]')).toBeNull()
      expect(screen.getByText('TEST-012')).toBeInTheDocument()
    })

    it('stops click propagation so the parent onClick does not fire', () => {
      const parentClick = vi.fn()
      const { container } = render(
        <div onClick={parentClick}>
          <TestHarness projectCode="TEST">
            <ContextBadge variant="phase" value="TEST-012" />
          </TestHarness>
        </div>,
      )

      const link = container.querySelector('[data-link-type="ticket"]') as HTMLElement
      expect(link).not.toBeNull()
      fireEvent.click(link)

      expect(parentClick).not.toHaveBeenCalled()
    })
  })

  describe('assignee variant', () => {
    it('should render assignee value', () => {
      render(
        <TestHarness>
          <ContextBadge variant="assignee" value="john" />
        </TestHarness>,
      )
      expect(screen.getByText('john')).toBeInTheDocument()
    })

    it('should set data-context="assignee" for assignee variant', () => {
      const { container } = render(
        <TestHarness>
          <ContextBadge variant="assignee" value="jane" />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge') as HTMLElement

      expect(badge?.getAttribute('data-context')).toBe('assignee')
    })

    it('never linkifies the assignee value (phase-only feature)', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="assignee" value="TEST-012" />
        </TestHarness>,
      )

      expect(container.querySelector('[data-link-type]')).toBeNull()
    })
  })

  describe('worktree variant', () => {
    it('should render worktree badge', () => {
      render(
        <TestHarness>
          <ContextBadge variant="worktree" />
        </TestHarness>,
      )
      expect(screen.getByText(/worktree/i)).toBeInTheDocument()
    })

    it('should set data-context="worktree" for worktree variant', () => {
      const { container } = render(
        <TestHarness>
          <ContextBadge variant="worktree" />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge') as HTMLElement

      expect(badge?.getAttribute('data-context')).toBe('worktree')
    })

    it('should show worktree path in title when provided', () => {
      const { container } = render(
        <TestHarness>
          <ContextBadge variant="worktree" worktreePath="/path/to/worktree" />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge') as HTMLElement

      expect(badge?.getAttribute('title')).toContain('/path/to/worktree')
    })
  })

  describe('base styling', () => {
    it.each(['phase', 'assignee', 'worktree'] as const)('should apply Badge base styling for variant "%s"', (variant) => {
      const { container } = render(
        <TestHarness>
          <ContextBadge variant={variant} value={variant === 'worktree' ? undefined : 'test'} />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge') as HTMLElement

      expect(badge).toHaveClass('badge')
      expect(badge).toHaveClass('rounded')
    })
  })
})
