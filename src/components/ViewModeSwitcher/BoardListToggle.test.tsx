/**
 * MDT-131: BoardListToggle Component Unit Tests
 *
 * Tests hover overlay behavior, click toggling, and animation constraints.
 * Coverage: BR-2.1, BR-2.2, BR-3.1, C1, C2
 */

import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { BoardListToggle } from './BoardListToggle'

describe('BoardListToggle', () => {
  const mockOnModeChange = mock()

  beforeEach(() => {
    mockOnModeChange.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  describe('current mode display (BR-1.1, BR-1.2, BR-8)', () => {
    it('should display board icon when current mode is board', () => {
      render(
        <BoardListToggle
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
      )

      const boardIcon = screen.getByTestId('board-icon')
      expect(boardIcon).toBeInTheDocument()
      expect(boardIcon.tagName.toLowerCase()).toBe('img')
      expect(boardIcon).toHaveAttribute('src', '/icon_board_col_64.webp')
      expect(boardIcon).toHaveAttribute('alt', 'Board view')
    })

    it('should display list icon when current mode is list', () => {
      render(
        <BoardListToggle
          currentMode="list"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
      )

      const listIcon = screen.getByTestId('list-icon')
      expect(listIcon).toBeInTheDocument()
      expect(listIcon.tagName.toLowerCase()).toBe('img')
      expect(listIcon).toHaveAttribute('src', '/icon_list_64.webp')
      expect(listIcon).toHaveAttribute('alt', 'List view')
    })
  })

  describe('hover overlay (BR-2.1, BR-2.2)', () => {
    it('should show alternate view icon overlay when hovering in board/list view (BR-2.1)', () => {
      render(
        <BoardListToggle
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
      )

      const toggle = screen.getByTestId('board-list-toggle')
      const overlay = screen.getByTestId('board-list-toggle-overlay')

      // Overlay should be hidden initially
      expect(overlay).not.toHaveClass('opacity-100')

      // Hover should show overlay
      fireEvent.mouseEnter(toggle)

      // Check for transition class (150ms animation - C1)
      expect(overlay).toHaveClass('transition-opacity', 'duration-150')
    })

    it('should not show overlay when hovering in documents view (BR-2.2)', () => {
      render(
        <BoardListToggle
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={true}
        />
      )

      const toggle = screen.getByTestId('board-list-toggle')
      const overlay = screen.getByTestId('board-list-toggle-overlay')

      // Overlay should be hidden in documents view
      expect(overlay).toHaveClass('hidden')

      // Hover should not show overlay
      fireEvent.mouseEnter(toggle)

      expect(overlay).toHaveClass('hidden')
    })
  })

  describe('click behavior (BR-3.1)', () => {
    it('should toggle from board to list when clicked (BR-3.1)', () => {
      render(
        <BoardListToggle
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
      )

      const toggle = screen.getByTestId('board-list-toggle')
      fireEvent.click(toggle)

      expect(mockOnModeChange).toHaveBeenCalledWith('list')
    })

    it('should toggle from list to board when clicked (BR-3.1)', () => {
      render(
        <BoardListToggle
          currentMode="list"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
      )

      const toggle = screen.getByTestId('board-list-toggle')
      fireEvent.click(toggle)

      expect(mockOnModeChange).toHaveBeenCalledWith('board')
    })

    it('should return to last-used board mode when clicking from documents view (BR-3.2)', () => {
      render(
        <BoardListToggle
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={true}
        />
      )

      const toggle = screen.getByTestId('board-list-toggle')
      fireEvent.click(toggle)

      expect(mockOnModeChange).toHaveBeenCalledWith('board')
    })
  })

  describe('overlay constraints (C1, C2)', () => {
    it('should have pointer-events-none on overlay (C2)', () => {
      render(
        <BoardListToggle
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
      )

      const overlay = screen.getByTestId('board-list-toggle-overlay')
      expect(overlay).toHaveClass('pointer-events-none')
    })

    it('should have fade-in animation with 150ms duration (C1)', () => {
      render(
        <BoardListToggle
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
      )

      const overlay = screen.getByTestId('board-list-toggle-overlay')
      expect(overlay).toHaveClass('transition-opacity', 'duration-150')
    })
  })
})
