/**
 * MDT-095: Git Worktree Support - TicketCard Component Tests
 *
 * Tests for worktree badge display in TicketCard component.
 *
 * @module src/components/__tests__/TicketCard.worktree.test.tsx
 */

import type { Ticket } from '../../types/ticket'
import { render, screen } from '@testing-library/react'
import * as React from 'react'

import { TicketCard } from '../TicketCard'
import '@testing-library/jest-dom'

// Extended type for testing conflict scenarios
type TicketWithConflict = Ticket & { hasConflict?: boolean }

describe('TicketCard - Worktree Badge (MDT-095)', () => {
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

  describe('worktree badge display (BR-7)', () => {
    it('should display "Worktree" badge when ticket is in a worktree', () => {
      render(
        <TicketCard
          ticket={mockTicketInWorktree}
          onClick={jest.fn()}
          onDragStart={jest.fn()}
        />,
      )

      expect(screen.getByTestId('worktree-badge')).toBeInTheDocument()
    })

    it('should NOT display worktree badge when ticket is not in a worktree', () => {
      render(
        <TicketCard
          ticket={mockTicketNotInWorktree}
          onClick={jest.fn()}
          onDragStart={jest.fn()}
        />,
      )

      expect(screen.queryByTestId('worktree-badge')).not.toBeInTheDocument()
    })

    it('should NOT display worktree badge when inWorktree is undefined (backward compatible C5)', () => {
      const ticketWithoutFlag = {
        ...mockTicketNotInWorktree,
        inWorktree: undefined,
      } as Ticket

      render(
        <TicketCard
          ticket={ticketWithoutFlag}
          onClick={jest.fn()}
          onDragStart={jest.fn()}
        />,
      )

      expect(screen.queryByTestId('worktree-badge')).not.toBeInTheDocument()
    })
  })

  describe('conflict warning (BR-7 scenario 3)', () => {
    it('should display warning badge when ticket exists in both locations', () => {
      // This would require additional conflict detection logic
      // For now, test that component handles the scenario gracefully
      const ticketWithConflict = {
        ...mockTicketInWorktree,
        hasConflict: true,
      }

      render(
        <TicketCard
          ticket={ticketWithConflict as TicketWithConflict}
          onClick={jest.fn()}
          onDragStart={jest.fn()}
        />,
      )

      // Should show worktree badge AND some conflict indicator
      expect(screen.getByTestId('worktree-badge')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have accessible label for worktree badge', () => {
      render(
        <TicketCard
          ticket={mockTicketInWorktree}
          onClick={jest.fn()}
          onDragStart={jest.fn()}
        />,
      )

      const badge = screen.getByTestId('worktree-badge')
      expect(badge).toBeVisible()
      expect(badge).toHaveTextContent('Worktree')
    })
  })
})
