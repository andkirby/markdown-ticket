import type * as React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { TraceGraphShell } from './TraceGraphShell'

mock.module('../ui/Modal', () => ({
  Modal: ({
    isOpen,
    children,
    className,
    'data-testid': dataTestId,
  }: {
    'isOpen': boolean
    'children': React.ReactNode
    'className'?: string
    'data-testid'?: string
  }) => isOpen ? <div className={className} data-testid={dataTestId}>{children}</div> : null,
  ModalBody: ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <section className={className}>{children}</section>
  ),
}))

describe('TraceGraphShell', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders a ticket-scoped iframe URL without filesystem paths', () => {
    render(
      <TraceGraphShell
        isOpen={true}
        projectCode="MDT"
        ticketCode="MDT-174"
        onClose={mock()}
      />,
    )

    const iframe = screen.getByTitle('MDT-174 Trace Graph')
    expect(iframe).toHaveAttribute('src', '/spec-trace/trace-dashboard.html?project=MDT&ticket=MDT-174')
    expect(iframe.getAttribute('src')).not.toContain('docs/CRs')
    expect(iframe.getAttribute('src')).not.toContain('store.json')
  })

  it('floats Back over the iframe without header chrome', () => {
    const onClose = mock()

    render(
      <TraceGraphShell
        isOpen={true}
        projectCode="MDT"
        ticketCode="MDT-174"
        onClose={onClose}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Back to ticket' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('MDT-174')).toBeNull()
    expect(screen.queryByText('MDT-174/store.json')).toBeNull()
  })

  it('renders a compact unavailable state when requested', () => {
    render(
      <TraceGraphShell
        isOpen={true}
        projectCode="MDT"
        ticketCode="MDT-174"
        error="Trace store unavailable"
        onClose={mock()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Trace store unavailable' })).toBeInTheDocument()
    expect(screen.queryByTitle('MDT-174 Trace Graph')).toBeNull()
  })
})
