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
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { __testResetLinkConfig, __testSetGlobalLinkConfig } from '../../config/linkConfig'
import { ContextBadge } from './ContextBadge'

// Cleanup DOM between tests
afterEach(() => {
  __testResetLinkConfig()
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

    it('marks a ticket-ref phase value as an epic (data-context="epic" + Zap icon)', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value="TEST-012" />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge') as HTMLElement
      expect(badge?.getAttribute('data-context')).toBe('epic')
      expect(badge?.querySelector('svg')).not.toBeNull()
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
      // Link config is owner/file-level: simulate the global config value
      // (config.toml [links]) instead of the removed localStorage override.
      __testSetGlobalLinkConfig({
        enableAutoLinking: true,
        enableTicketLinks: false,
        enableDocumentLinks: true,
      })
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
    })
  })

  describe('split chip on detail surfaces (MDT-246 BR-1.2)', () => {
    function renderDetailBadge(value = 'TEST-012') {
      return render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value={value} detail />
        </TestHarness>,
      )
    }

    /**
     * Router harness whose location probe stays mounted across navigation
     * (the probe is a direct child of MemoryRouter, outside Routes).
     */
    function renderWithLocationProbe(value: string) {
      const locationLog: string[] = []
      function LocationProbe() {
        const location = useLocation()
        locationLog.push(`${location.pathname}${location.search}`)
        return null
      }
      const { container } = render(
        <MemoryRouter initialEntries={['/prj/TEST']}>
          <LocationProbe />
          <Routes>
            <Route path="/prj/:projectCode" element={<ContextBadge variant="phase" value={value} detail />} />
            <Route path="/prj/:projectCode/epics" element={<div data-testid="epics-route" />} />
          </Routes>
        </MemoryRouter>,
      )
      return { container, locationLog }
    }

    it('renders one badge with two interactive zones when detail is set', () => {
      const { container } = renderDetailBadge()
      const badge = container.querySelector('.badge[data-context="epic"]') as HTMLElement
      expect(badge).not.toBeNull()
      expect(badge.classList.contains('badge--split')).toBe(true)

      // Identity zone: passive Zap + key link.
      const idZone = badge.querySelector('.badge__id') as HTMLElement
      expect(idZone).not.toBeNull()
      expect(idZone.querySelector('[data-link-type="ticket"]')).not.toBeNull()
      expect(idZone.querySelector('svg[aria-hidden="true"]')).not.toBeNull()

      // Action zone: a real button sibling — never nested inside the link.
      const action = badge.querySelector('button.badge-action') as HTMLElement
      expect(action).not.toBeNull()
      expect(action.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
      expect(idZone.contains(action)).toBe(false)
    })

    it('labels the action zone with the full sentence (C-1 Label-in-Name)', () => {
      const { container } = renderDetailBadge('TEST-012')
      const action = container.querySelector('button.badge-action') as HTMLElement
      expect(action.getAttribute('aria-label')).toBe('Show TEST-012 on Epics board')
      expect(action.getAttribute('title')).toBe('Show TEST-012 on Epics board')
    })

    it('navigates to the focused epics deep link when the action zone is clicked (BR-1.3)', () => {
      const { container, locationLog } = renderWithLocationProbe('TEST-012')
      fireEvent.click(container.querySelector('button.badge-action') as HTMLElement)
      expect(locationLog[locationLog.length - 1]).toBe('/prj/TEST/epics?epic=TEST-012')
    })

    it('stops click propagation so the parent onClick does not fire', () => {
      const parentClick = vi.fn()
      const { container } = render(
        <div onClick={parentClick}>
          <TestHarness projectCode="TEST">
            <ContextBadge variant="phase" value="TEST-012" detail />
          </TestHarness>
        </div>,
      )
      fireEvent.click(container.querySelector('button.badge-action') as HTMLElement)
      expect(parentClick).not.toHaveBeenCalled()
    })

    it('keeps the compact single-zone badge by default — board cards stay compact (C-3)', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value="TEST-012" />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge[data-context="epic"]') as HTMLElement
      expect(badge.classList.contains('badge--split')).toBe(false)
      expect(badge.querySelector('.badge__id')).toBeNull()
      expect(badge.querySelector('button.badge-action')).toBeNull()
      // The key link still renders (unchanged MDT-193 behavior).
      expect(badge.querySelector('[data-link-type="ticket"]')).not.toBeNull()
    })

    it('does not split free-text phase values even on detail surfaces', () => {
      const { container } = render(
        <TestHarness projectCode="TEST">
          <ContextBadge variant="phase" value="Phase 1" detail />
        </TestHarness>,
      )
      const badge = container.querySelector('.badge') as HTMLElement
      expect(badge.classList.contains('badge--split')).toBe(false)
      expect(badge.querySelector('button.badge-action')).toBeNull()
    })

    it('resolves the epic key from suffixed values (TEST-012.md → TEST-012)', () => {
      const { container, locationLog } = renderWithLocationProbe('TEST-012.md')
      fireEvent.click(container.querySelector('button.badge-action') as HTMLElement)
      expect(locationLog[locationLog.length - 1]).toBe('/prj/TEST/epics?epic=TEST-012')
    })
  })
})
