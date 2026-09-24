import type { ReactNode } from 'react'
import * as React from 'react'
import { Component } from 'react'

/**
 * MDT-248 UAT r8 — the side pane must never take the app down.
 *
 * A render error inside the pane subtree (a bad dependency chunk, a hostile
 * document, a future regression) degrades to this inline state instead of
 * unmounting the ticket modal. The ticket column and the modal chrome are
 * OUTSIDE this boundary and keep working; the session is untouched — Esc
 * tucks the pane, the pill still reveals, × still discards.
 */
interface PaneErrorBoundaryProps {
  children: ReactNode
}

interface PaneErrorBoundaryState {
  error: Error | null
}

export class PaneErrorBoundary extends Component<PaneErrorBoundaryProps, PaneErrorBoundaryState> {
  state: PaneErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): PaneErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Side pane render error:', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <aside className="ticket-side-pane" role="complementary" aria-label="Document preview — unavailable" data-testid="ticket-side-pane-error">
          <div className="ticket-side-pane__empty" role="alert">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <div className="ticket-side-pane__empty-title">Something went wrong showing this document</div>
            <div className="ticket-side-pane__empty-path">The ticket is unharmed — tuck the pane (Esc) and try opening the document again.</div>
          </div>
        </aside>
      )
    }
    return this.props.children
  }
}
