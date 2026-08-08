/**
 * MobileLogo Component Unit Tests
 *
 * The logo is now a single theme-aware masked element (`.app-logo`); there is
 * no longer a per-viewport asset swap. These tests assert the rendered element
 * and its accessibility contract.
 */

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { MobileLogo } from './MobileLogo'

describe('MobileLogo', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the masked logo element', () => {
    render(<MobileLogo />)

    const logo = screen.getByTestId('app-logo')
    expect(logo).toBeInTheDocument()
    // The colour/asset lives in CSS (.app-logo), not on a per-instance basis.
    expect(logo).toHaveClass('app-logo')
  })

  it('uses the same element at any viewport (no per-size asset swap)', () => {
    // Simulate a mobile viewport width; the component must not branch.
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })

    render(<MobileLogo />)

    const logo = screen.getByTestId('app-logo')
    expect(logo).toBeInTheDocument()
    expect(logo).toHaveClass('app-logo')
  })

  it('exposes an accessible label', () => {
    render(<MobileLogo />)

    const logo = screen.getByTestId('app-logo')
    expect(logo).toHaveAttribute('role', 'img')
    expect(logo).toHaveAttribute('aria-label', 'Markdown Ticket')
  })
})
