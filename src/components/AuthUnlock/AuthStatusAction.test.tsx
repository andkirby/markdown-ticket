import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { AuthStatusAction } from './AuthStatusAction'

describe('AuthStatusAction', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows a read-only session with an owner unlock affordance', () => {
    const onUnlockClick = mock()

    render(
      <AuthStatusAction
        accessMode="read-only"
        onUnlockClick={onUnlockClick}
      />,
    )

    expect(screen.getByTestId('auth-status-chip')).toHaveTextContent('Read only')

    fireEvent.click(screen.getByTestId('auth-unlock-affordance'))

    expect(onUnlockClick).toHaveBeenCalled()
  })
})
