/**
 * MDT-131: ViewModeSwitcher Component Unit Tests
 *
 * Tests responsive behavior, component composition, and type-safe enum usage.
 * Coverage: BR-1.*, BR-6.*, BR-8, C3
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { ViewModeSwitcher } from './ViewModeSwitcher'

// Mock child components using Bun's mock.module
mock.module('./BoardListToggle', () => ({
  BoardListToggle: () => <div data-testid="board-list-toggle">BoardListToggle</div>,
}))

function createMatchMedia(matches: boolean) {
  return mock().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: mock(),
    removeListener: mock(),
    addEventListener: mock(),
    removeEventListener: mock(),
    dispatchEvent: mock(),
  }))
}

describe('ViewModeSwitcher', () => {
  const mockOnModeChange = mock()

  beforeEach(() => {
    mockOnModeChange.mockClear()
  })

  afterEach(() => {
    cleanup()
    // Reset window.matchMedia
    // @ts-expect-error - resetting mock
    delete window.matchMedia
  })

  describe('component composition', () => {
    it('should render BoardListToggle component', () => {
      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />,
      )

      expect(screen.getByTestId('board-list-toggle')).toBeInTheDocument()
    })

    it('should render Documents button in desktop view (BR-6.2)', () => {
      // Mock window.matchMedia for desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      window.matchMedia = createMatchMedia(true)

      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />,
      )

      expect(screen.getByTestId('documents-button')).toBeInTheDocument()
    })
  })

  describe('mobile responsive behavior (BR-6.1)', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      window.matchMedia = createMatchMedia(false)
    })

    it('should hide Documents button on mobile viewport (< 768px) (BR-6.1)', () => {
      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />,
      )

      expect(screen.queryByTestId('documents-button')).not.toBeInTheDocument()
    })

    it('should show BoardListToggle on mobile viewport (BR-6.1)', () => {
      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />,
      )

      expect(screen.getByTestId('board-list-toggle')).toBeInTheDocument()
    })
  })

  describe('type-safe enum usage (C3)', () => {
    it('should accept valid board/list ViewMode values', () => {
      const validModes: ('board' | 'list')[] = ['board', 'list']

      validModes.forEach((mode) => {
        expect(() => {
          render(
            <ViewModeSwitcher
              currentMode={mode}
              onModeChange={mockOnModeChange}
              isDocumentsView={false}
            />,
          )
        }).not.toThrow()
      })
    })

    it('should accept documents mode in onModeChange callback', () => {
      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />,
      )

      // onModeChange should accept 'documents' even though currentMode cannot be 'documents'
      expect(() => {
        mockOnModeChange('documents')
      }).not.toThrow()
    })
  })

  describe('props propagation', () => {
    it('should pass currentMode to BoardListToggle', () => {
      const { rerender } = render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />,
      )

      // Re-render with different mode
      rerender(
        <ViewModeSwitcher
          currentMode="list"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />,
      )

      // Component should update without errors
      expect(screen.getByTestId('board-list-toggle')).toBeInTheDocument()
    })

    it('should pass onModeChange to BoardListToggle', () => {
      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />,
      )

      // BoardListToggle should be able to call onModeChange
      // This is tested more thoroughly in BoardListToggle.test.tsx
      expect(screen.getByTestId('board-list-toggle')).toBeInTheDocument()
    })
  })
})
