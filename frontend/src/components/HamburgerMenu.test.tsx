import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { EventHistory } from './DevTools/EventHistory'
import { setEventHistoryForceHidden, setEventHistoryOpen, useEventHistoryState } from './DevTools/useEventHistoryState'
import { HamburgerMenu } from './HamburgerMenu'

function EventHistoryHarness() {
  const [isOpen, forceHidden, setEventHistoryState] = useEventHistoryState()

  return (
    <>
      <HamburgerMenu />
      <EventHistory
        isOpen={isOpen}
        forceHidden={forceHidden}
        onOpenChange={open => setEventHistoryState(open, false)}
      />
    </>
  )
}

describe('HamburgerMenu', () => {
  beforeEach(() => {
    localStorage.clear()
    setEventHistoryForceHidden(false)
    setEventHistoryOpen(false)
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
    setEventHistoryForceHidden(false)
    setEventHistoryOpen(false)
    localStorage.clear()
  })

  it('shows lock inside the menu for owner-admin access', () => {
    const onLock = mock()

    render(
      <HamburgerMenu
        accessMode="owner-admin"
        accessIndicator="owner"
        onLock={onLock}
      />,
    )

    expect(screen.getByTestId('auth-access-indicator')).toBeInTheDocument()

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
    expect(screen.getByTestId('sharing-readonly-badge')).toHaveTextContent('Read only')
  })

  it('shows shared access indicator for token or share read access', () => {
    render(
      <HamburgerMenu
        accessMode="read-only"
        accessIndicator="shared"
      />,
    )

    expect(screen.getByTestId('auth-access-indicator')).toBeInTheDocument()
  })

  it('toggles event history visibility from the menu', () => {
    setEventHistoryForceHidden(true)

    render(<EventHistoryHarness />)

    expect(screen.queryByTestId('event-history-open-button')).toBeNull()

    fireEvent.click(screen.getByTestId('hamburger-menu'))
    fireEvent.click(screen.getByTestId('event-history-toggle'))

    expect(localStorage.getItem('mdt-eventHistory-hidden')).toBe('false')
    expect(screen.getByTestId('event-history-open-button')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('hamburger-menu'))
    fireEvent.click(screen.getByTestId('event-history-toggle'))

    expect(localStorage.getItem('mdt-eventHistory-hidden')).toBe('true')
    expect(screen.queryByTestId('event-history-open-button')).toBeNull()
  })
})
