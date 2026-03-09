/**
 * MDT-131: MobileLogo Component Unit Tests
 *
 * Tests conditional logo rendering based on viewport.
 * Coverage: BR-7.2
 */

import { describe, it, expect, beforeEach, mock, afterEach } from 'bun:test'
import { render, screen, cleanup } from '@testing-library/react'
import { MobileLogo } from './MobileLogo'

const createMatchMedia = (matches: boolean) => mock().mockImplementation((query: string) => ({
  matches,
  media: query,
  onchange: null,
  addListener: mock(),
  removeListener: mock(),
  addEventListener: mock(),
  removeEventListener: mock(),
  dispatchEvent: mock(),
}))

describe('MobileLogo', () => {
  afterEach(() => {
    cleanup()
    // @ts-expect-error - resetting mock
    delete window.matchMedia
  })

  describe('desktop view', () => {
    beforeEach(() => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      })

      window.matchMedia = createMatchMedia(true)
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

      window.matchMedia = createMatchMedia(false)
    })

    it('should display mobile logo on mobile (<768px) (BR-7.2)', () => {
      render(<MobileLogo />)

      const logo = screen.getByTestId('app-logo')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('src', expect.stringContaining('logo-mdt-m-dark_64x64.png'))
    })
  })
})
