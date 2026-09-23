/**
 * MDT-248: Ticket side reading pane — unit closure
 *
 * Closes what E2E cannot cheaply: the session state machine (history,
 * forward-truncation, dedupe, scroll map), pane chrome contracts (landmark,
 * prose parity, disabled history bounds), fetch failure retention (Edge-2),
 * pill visibility semantics (Edge-1), session death (Edge-5), and the
 * delivery-context default (C6).
 *
 * Layout/geometry (C1) and rendered scroll preservation (C2) are E2E-owned
 * (happy-dom does not apply layered CSS — layout assertions belong there).
 *
 * @tags MDT-248
 */
import type { ReactNode } from 'react'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { DocumentDeliveryContext, useDocumentDelivery } from '../SmartLink/documentDelivery'
import { clampTicketColumnWidth } from './splitLayout'
import { SidePanePill, SplitDivider, TicketSidePane } from './TicketSidePane'
import { useSidePane } from './useSidePane'

afterEach(cleanup)

/* ---------- useSidePane state machine ---------- */

describe('useSidePane state machine', () => {
  it('opens and reveals on first openDocument', () => {
    const { result } = renderHook(() => useSidePane())
    expect(result.current.paneVisible).toBe(false)
    expect(result.current.hasSession).toBe(false)
    act(() => result.current.openDocument('docs/a.md'))
    expect(result.current.hasSession).toBe(true)
    expect(result.current.paneVisible).toBe(true)
    expect(result.current.currentPath).toBe('docs/a.md')
  })

  it('pushes new documents and truncates the forward stack (browser-tab model)', () => {
    const { result } = renderHook(() => useSidePane())
    act(() => result.current.openDocument('docs/a.md'))
    act(() => result.current.openDocument('docs/b.md'))
    act(() => result.current.back())
    expect(result.current.canFwd).toBe(true)
    act(() => result.current.openDocument('docs/c.md'))
    expect(result.current.canFwd).toBe(false) // forward stack truncated
    expect(result.current.currentPath).toBe('docs/c.md')
  })

  it('does not push consecutive duplicate opens', () => {
    const { result } = renderHook(() => useSidePane())
    act(() => result.current.openDocument('docs/a.md'))
    act(() => result.current.openDocument('docs/a.md'))
    expect(result.current.state.hist).toHaveLength(1)
  })

  it('captures scroll per entry and exposes restore targets on back/forward', () => {
    const { result } = renderHook(() => useSidePane())
    act(() => result.current.openDocument('docs/a.md'))
    act(() => result.current.openDocument('docs/b.md'))
    act(() => result.current.captureScroll(480))
    act(() => result.current.back())
    expect(result.current.currentPath).toBe('docs/a.md')
    act(() => result.current.fwd())
    expect(result.current.currentPath).toBe('docs/b.md')
    expect(result.current.state.scrolls['docs/b.md']).toBe(480)
  })

  it('reveal from hidden keeps the session and current document (Edge-1)', () => {
    const { result } = renderHook(() => useSidePane())
    act(() => result.current.openDocument('docs/a.md'))
    act(() => result.current.openDocument('docs/b.md'))
    act(() => result.current.hide())
    expect(result.current.paneVisible).toBe(false)
    expect(result.current.hasSession).toBe(true)
    act(() => result.current.openDocument('docs/b.md')) // same-doc click from hidden reveals, no push
    expect(result.current.paneVisible).toBe(true)
    expect(result.current.state.hist).toHaveLength(2)
  })

  it('discard clears the session entirely (Edge-5 unit part)', () => {
    const { result } = renderHook(() => useSidePane())
    act(() => result.current.openDocument('docs/a.md'))
    act(() => result.current.discard())
    expect(result.current.hasSession).toBe(false)
    expect(result.current.paneVisible).toBe(false)
  })
})

/* ---------- TicketSidePane chrome contracts ---------- */

describe('TicketSidePane', () => {
  const fetchOk = mock(async () => '# Deep dive\n\nBody.')

  function renderPane(history: string[] = ['docs/deep-dive.md'], hi = 0) {
    return render(
      <TicketSidePane
        projectId="MDT"
        hist={history}
        hi={hi}
        visible
        scrolls={{}}
        fetchContent={fetchOk as unknown as (path: string) => Promise<string>}
        onBack={() => {}}
        onForward={() => {}}
        onHide={() => {}}
        onDiscard={() => {}}
        onOpenInDocuments={() => {}}
        onScrollChange={() => {}}
      />,
    )
  }

  it('renders a complementary landmark labelled with the document title (C5)', async () => {
    renderPane()
    const aside = await screen.findByRole('complementary')
    expect(aside.getAttribute('aria-label')).toContain('Deep dive')
  })

  it('renders the document path and the document prose variant (C4)', async () => {
    renderPane()
    await screen.findByTestId('ticket-side-pane-title')
    expect(screen.getByTestId('ticket-side-pane-path').textContent).toContain('docs/deep-dive.md')
    const prose = document.querySelector('.prose--document')
    expect(prose).toBeTruthy()
  })

  it('disables back at the history bottom and forward at the top', async () => {
    renderPane(['docs/a.md', 'docs/b.md'], 1) // at top of stack
    await screen.findByTestId('ticket-side-pane-title')
    expect((screen.getByTestId('ticket-side-pane-forward') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByTestId('ticket-side-pane-back') as HTMLButtonElement).disabled).toBe(false)
  })

  it('keeps the previous document and shows an inline error when the next fetch fails (Edge-2)', async () => {
    const failing = mock(async (path: string) => {
      if (path === 'docs/broken.md') {
        throw new Error('fetch failed')
      }
      return '# Deep dive\n\nBody.'
    })
    const { rerender } = render(
      <TicketSidePane
        projectId="MDT"
        hist={['docs/deep-dive.md']}
        hi={0}
        visible
        scrolls={{}}
        fetchContent={failing as unknown as (path: string) => Promise<string>}
        onBack={() => {}}
        onForward={() => {}}
        onHide={() => {}}
        onDiscard={() => {}}
        onOpenInDocuments={() => {}}
        onScrollChange={() => {}}
      />,
    )
    await screen.findByTestId('ticket-side-pane-title')

    rerender(
      <TicketSidePane
        projectId="MDT"
        hist={['docs/deep-dive.md', 'docs/broken.md']}
        hi={1}
        visible
        scrolls={{}}
        fetchContent={failing as unknown as (path: string) => Promise<string>}
        onBack={() => {}}
        onForward={() => {}}
        onHide={() => {}}
        onDiscard={() => {}}
        onOpenInDocuments={() => {}}
        onScrollChange={() => {}}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('docs/broken.md')
    })
    // previous document retained: its title still heads the pane and its body
    // is still rendered (the H1 was extracted into the title)
    expect(screen.getByTestId('ticket-side-pane-title').textContent).toBe('Deep dive')
    expect(document.querySelector('.prose--document')?.textContent).toContain('Body.')
  })
})

/* ---------- SidePanePill ---------- */

describe('SidePanePill', () => {
  it('names the current document and reveals on click (Edge-1)', async () => {
    const onReveal = mock(() => {})
    render(<SidePanePill title="Deep dive" onReveal={onReveal} />)
    const pill = screen.getByTestId('ticket-side-pane-pill')
    expect(pill.textContent).toContain('Deep dive')
    pill.click()
    await waitFor(() => expect(onReveal).toHaveBeenCalled())
    expect(pill.getAttribute('aria-label')).toContain('Deep dive')
  })
})

/* ---------- delivery context (C6) ---------- */

describe('documentDelivery', () => {
  it('returns null without a provider — delivery outside the ticket modal is untouched (C6)', () => {
    let captured: unknown = 'unset'
    function Probe() {
      captured = useDocumentDelivery()
      return null
    }
    render(<Probe />)
    expect(captured).toBeNull()
  })

  it('exposes the handler to consumers inside the provider (C6)', () => {
    const openDocument = mock(() => {})
    let captured: { openDocument: (path: string) => void } | null = null
    function Probe(): ReactNode {
      captured = useDocumentDelivery()
      return null
    }
    render(
      <DocumentDeliveryContext.Provider value={{ openDocument }}>
        <Probe />
      </DocumentDeliveryContext.Provider>,
    )
    expect(captured?.openDocument).toBe(openDocument)
  })
})

/* ---------- split divider (UAT r2) ---------- */

describe('clampTicketColumnWidth', () => {
  it('keeps both columns at or above the 340px minimum', () => {
    expect(clampTicketColumnWidth(100, 1200)).toBe(340)
    expect(clampTicketColumnWidth(1000, 1200)).toBe(860) // bodyWidth - min
  })

  it('passes through widths inside the range', () => {
    expect(clampTicketColumnWidth(560, 1200)).toBe(560)
  })

  it('falls back to the minimum when the body cannot fit two minimums', () => {
    expect(clampTicketColumnWidth(500, 600)).toBe(340)
  })
})

describe('SplitDivider', () => {
  it('resizes on pointer drag and resets on double-click', () => {
    const onResize = mock(() => {})
    const onReset = mock(() => {})
    const { container } = render(
      <SplitDivider
        measureColumn={() => 560}
        measureBody={() => 1200}
        onResize={onResize}
        onCommit={() => {}}
        onReset={onReset}
      />,
    )
    const divider = container.querySelector('[data-testid="ticket-side-pane-divider"]') as HTMLElement

    divider.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, clientX: 500, button: 0, bubbles: true }))
    divider.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 660, bubbles: true }))
    divider.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }))
    // 560 + 160 = 720, within [340, 860]
    expect(onResize).toHaveBeenLastCalledWith(720)

    divider.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    expect(onReset).toHaveBeenCalled()
  })

  it('nudges by 32px with arrow keys', () => {
    const onResize = mock(() => {})
    const { container } = render(
      <SplitDivider
        measureColumn={() => 560}
        measureBody={() => 1200}
        onResize={onResize}
        onCommit={() => {}}
        onReset={() => {}}
      />,
    )
    const divider = container.querySelector('[data-testid="ticket-side-pane-divider"]') as HTMLElement
    divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    expect(onResize).toHaveBeenLastCalledWith(528)
    divider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(onResize).toHaveBeenLastCalledWith(592)
  })
})
