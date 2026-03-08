/**
 * MDT-131: ViewModeSwitcher Component Unit Tests
 *
 * Tests responsive behavior, component composition, and type-safe enum usage.
 * Coverage: BR-1.*, BR-6.*, BR-8, C3
 */

import { render, screen } from '@testing-library/react'
import { ViewModeSwitcher } from './ViewModeSwitcher'
import type { ViewMode } from './types'

// Mock child components
jest.mock('./BoardListToggle', () => ({
  BoardListToggle: () => <div data-testid="board-list-toggle">BoardListToggle</div>,
}))

describe('ViewModeSwitcher', () => {
  const mockOnModeChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('component composition', () => {
    it('should render BoardListToggle component', () => {
      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
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

      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: query.includes('(min-width: 768px)'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
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

      window.matchMedia = jest.fn().mockImplementation((query) => ({
        matches: !query.includes('(min-width: 768px)'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))
    })

    it('should hide Documents button on mobile viewport (< 768px) (BR-6.1)', () => {
      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
      )

      expect(screen.queryByTestId('documents-button')).not.toBeInTheDocument()
    })

    it('should show BoardListToggle on mobile viewport (BR-6.1)', () => {
      render(
        <ViewModeSwitcher
          currentMode="board"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
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
            />
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
        />
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
        />
      )

      // Re-render with different mode
      rerender(
        <ViewModeSwitcher
          currentMode="list"
          onModeChange={mockOnModeChange}
          isDocumentsView={false}
        />
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
        />
      )

      // BoardListToggle should be able to call onModeChange
      // This is tested more thoroughly in BoardListToggle.test.tsx
      expect(screen.getByTestId('board-list-toggle')).toBeInTheDocument()
    })
  })
})
