/**
 * MDT-131: MobileLogo Component Unit Tests
 *
 * Tests conditional logo rendering based on viewport.
 * Coverage: BR-7.2
 */

import { render, screen } from '@testing-library/react'
import { MobileLogo } from './MobileLogo'

describe('MobileLogo', () => {
  describe('desktop view', () => {
    beforeEach(() => {
      // Mock desktop viewport
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
    })

    it('should display default logo on desktop (≥768px)', () => {
      render(<MobileLogo />)

      const logo = screen.getByTestId('app-logo')
      expect(logo).toBeInTheDocument()
      expect(logo).not.toHaveAttribute('src', 'logo-mdt-m-dark_64x64.png')
    })
  })

  describe('mobile view', () => {
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

    it('should display mobile logo on mobile (<768px) (BR-7.2)', () => {
      render(<MobileLogo />)

      const logo = screen.getByTestId('app-logo')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('src', expect.stringContaining('logo-mdt-m-dark_64x64.png'))
    })
  })
})
