import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { HamburgerMenu } from './HamburgerMenu'

describe('HamburgerMenu', () => {
  beforeEach(() => {
    window.matchMedia = mock(() => ({
      matches: false,
      media: '',
      onchange: null,
      addEventListener: mock(),
      removeEventListener: mock(),
      addListener: mock(),
      removeListener: mock(),
      dispatchEvent: mock(() => false),
    })) as unknown as typeof window.matchMedia
  })

  afterEach(() => {
    cleanup()
  })

  it('shows lock inside the menu for owner-admin access', () => {
    const onLock = mock()

    render(
      <HamburgerMenu
        accessMode="owner-admin"
        onLock={onLock}
      />,
    )

    fireEvent.click(screen.getByTestId('hamburger-menu'))

    fireEvent.click(screen.getByTestId('auth-lock-button'))

    expect(onLock).toHaveBeenCalled()
  })

  it('does not show owner lock actions for read-only access', () => {
    render(
      <HamburgerMenu
        accessMode="read-only"
        onLock={mock()}
        canUseOwnerEndpoints={false}
      />,
    )

    fireEvent.click(screen.getByTestId('hamburger-menu'))

    expect(screen.queryByTestId('auth-status-chip')).toBeNull()
    expect(screen.queryByTestId('auth-lock-button')).toBeNull()
  })
})
