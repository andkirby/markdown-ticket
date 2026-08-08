import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { ViewModeSwitcher } from './ViewModeSwitcher'

describe('ViewModeSwitcher', () => {
  const mockOnModeChange = mock()

  beforeEach(() => {
    mockOnModeChange.mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  describe('peer view group', () => {
    it('renders Board, Swimlanes, List, and Docs as one icon-only semantic button group', () => {
      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
        />,
      )

      expect(screen.getByTestId('view-mode-switcher')).toHaveAttribute('role', 'group')
      expect(screen.getByTestId('board-mode-flat-toggle')).toHaveAccessibleName('Board')
      expect(screen.getByTestId('board-mode-epics-toggle')).toHaveAccessibleName('Swimlanes')
      expect(screen.getByTestId('view-mode-list-toggle')).toHaveAccessibleName('List')
      expect(screen.getByTestId('documents-button')).toHaveAccessibleName('Docs')
      expect(screen.getByTestId('board-mode-flat-toggle')).toHaveTextContent('')
      expect(screen.getByTestId('board-mode-epics-toggle')).toHaveTextContent('')
      expect(screen.getByTestId('view-mode-list-toggle')).toHaveTextContent('')
      expect(screen.getByTestId('documents-button')).toHaveTextContent('')
    })

    it('does not mount visible text labels', () => {
      render(
        <ViewModeSwitcher
          currentMode="swimlanes"
          onModeChange={mockOnModeChange}
        />,
      )

      expect(screen.queryByTestId('view-mode-label-board')).not.toBeInTheDocument()
      expect(screen.queryByTestId('view-mode-label-swimlanes')).not.toBeInTheDocument()
      expect(screen.queryByTestId('view-mode-label-list')).not.toBeInTheDocument()
      expect(screen.queryByTestId('view-mode-label-documents')).not.toBeInTheDocument()
    })

    it('marks only the current peer view active', () => {
      render(
        <ViewModeSwitcher
          currentMode="swimlanes"
          onModeChange={mockOnModeChange}
        />,
      )

      expect(screen.getByTestId('board-mode-flat-toggle')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByTestId('board-mode-epics-toggle')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('view-mode-list-toggle')).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByTestId('documents-button')).toHaveAttribute('aria-pressed', 'false')
    })

    it('routes selections through explicit peer view ids', () => {
      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
        />,
      )

      fireEvent.click(screen.getByTestId('board-mode-epics-toggle'))
      fireEvent.click(screen.getByTestId('view-mode-list-toggle'))
      fireEvent.click(screen.getByTestId('documents-button'))
      fireEvent.click(screen.getByTestId('board-mode-flat-toggle'))

      expect(mockOnModeChange).toHaveBeenNthCalledWith(1, 'swimlanes')
      expect(mockOnModeChange).toHaveBeenNthCalledWith(2, 'list')
      expect(mockOnModeChange).toHaveBeenNthCalledWith(3, 'documents')
      expect(mockOnModeChange).toHaveBeenNthCalledWith(4, 'board')
    })
  })
})
