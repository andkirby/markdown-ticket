import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { AuthStatusAction } from './AuthStatusAction'

describe('AuthStatusAction', () => {
  afterEach(() => {
    cleanup()
  })

  it('does not render read-only status because the shell owns that badge', () => {
    render(
      <AuthStatusAction
        accessMode="read-only"
      />,
    )

    expect(screen.queryByTestId('auth-status-chip')).toBeNull()
  })

  it('does not render owner session because the hamburger menu owns it', () => {
    render(
      <AuthStatusAction
        accessMode="owner-admin"
      />,
    )

    expect(screen.queryByTestId('auth-status-chip')).toBeNull()
    expect(screen.queryByTestId('auth-lock-button')).toBeNull()
  })

  it('keeps locked unlock as an explicit action', () => {
    const onUnlockClick = mock()

    render(
      <AuthStatusAction
        accessMode="locked"
        onUnlockClick={onUnlockClick}
      />,
    )

    screen.getByTestId('auth-unlock-affordance').click()
    expect(onUnlockClick).toHaveBeenCalled()
  })
})
