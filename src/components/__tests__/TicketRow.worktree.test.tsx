/**
 * MDT-095: Git Worktree Support - TicketAttributeTags Component Tests
 *
 * Tests for worktree badge display in TicketAttributeTags component (list view).
 *
 * @module src/components/__tests__/TicketRow.worktree.test.tsx
 */

import type { Ticket } from '../../types/ticket'
import { render, screen } from '@testing-library/react'
import * as React from 'react'

import TicketAttributeTags from '../TicketAttributeTags'
import '@testing-library/jest-dom'

describe('TicketAttributeTags - Worktree Badge (MDT-095)', () => {
  const mockTicketNotInWorktree: Ticket = {
    code: 'MDT-001',
    title: 'Test CR in Main',
    status: 'Proposed',
    type: 'Feature Enhancement',
    priority: 'Medium',
    inWorktree: false,
  }

  const mockTicketInWorktree: Ticket = {
    code: 'MDT-095',
    title: 'Test CR in Worktree',
    status: 'In Progress',
    type: 'Feature Enhancement',
    priority: 'High',
    inWorktree: true,
    worktreePath: '/test/worktrees/MDT-095',
  }

  describe('worktree badge display in list view (BR-7)', () => {
    it('should display "Worktree" badge when ticket is in a worktree', () => {
      render(<TicketAttributeTags ticket={mockTicketInWorktree} />)

      expect(screen.getByText(/Worktree/i)).toBeInTheDocument()
    })

    it('should NOT display worktree badge when ticket is not in a worktree', () => {
      render(<TicketAttributeTags ticket={mockTicketNotInWorktree} />)

      expect(screen.queryByText(/Worktree/i)).not.toBeInTheDocument()
    })

    it('should NOT display worktree badge when inWorktree is undefined', () => {
      const ticketWithoutFlag = {
        ...mockTicketNotInWorktree,
        inWorktree: undefined,
      } as Ticket

      render(<TicketAttributeTags ticket={ticketWithoutFlag} />)

      expect(screen.queryByText(/Worktree/i)).not.toBeInTheDocument()
    })
  })

  describe('badge styling', () => {
    it('should have appropriate styling for worktree badge', () => {
      render(<TicketAttributeTags ticket={mockTicketInWorktree} />)

      const badge = screen.getByTestId('worktree-badge')
      expect(badge).toBeInTheDocument()
      // Check that badge has a specific class or data attribute for styling
    })
  })
})
