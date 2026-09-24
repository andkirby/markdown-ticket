/**
 * MDT-248 UAT r8 — the pane error boundary containment contract.
 *
 * A render error anywhere in the pane subtree must degrade to the inline
 * fallback WITHOUT unmounting siblings or the app tree (a duplicate-React
 * crash took the whole modal down before this boundary existed).
 *
 * @tags MDT-248
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'bun:test'
import { PaneErrorBoundary } from './PaneErrorBoundary'

function Bomb(): never {
  throw new Error('duplicate react says hi')
}

describe('PaneErrorBoundary', () => {
  it('contains a throwing pane subtree and shows the inline fallback', () => {
    render(
      <PaneErrorBoundary>
        <Bomb />
      </PaneErrorBoundary>,
    )
    const fallback = screen.getByRole('alert')
    expect(fallback.textContent).toContain('Something went wrong showing this document')
    expect(fallback.textContent).toContain('ticket is unharmed')
  })

  it('renders children unchanged when they are healthy', () => {
    render(
      <PaneErrorBoundary>
        <aside data-testid="healthy-pane">ok</aside>
      </PaneErrorBoundary>,
    )
    expect(screen.getByTestId('healthy-pane').textContent).toBe('ok')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('keeps siblings outside the boundary alive when the pane throws', () => {
    render(
      <div>
        <section data-testid="ticket-column">ticket column</section>
        <PaneErrorBoundary>
          <Bomb />
        </PaneErrorBoundary>
      </div>,
    )
    expect(screen.getByTestId('ticket-column').textContent).toBe('ticket column')
    expect(screen.getByRole('alert')).toBeTruthy()
  })
})
