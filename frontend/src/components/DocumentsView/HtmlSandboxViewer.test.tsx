import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import HtmlSandboxViewer from './HtmlSandboxViewer'

function renderViewer(props: Partial<React.ComponentProps<typeof HtmlSandboxViewer>> = {}) {
  return render(
    <MemoryRouter initialEntries={['/projects/MDT/documents']}>
      <Routes>
        <Route
          path="/projects/:projectCode/documents"
          element={<HtmlSandboxViewer projectId="project-1" filePath="docs/site/index.html" {...props} />}
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HtmlSandboxViewer (MDT-221)', () => {
  const mockFetch = mock(async (_input: RequestInfo | URL, _init?: RequestInit) => {
    return new Response(JSON.stringify({ token: 'tok.abc', expiresAt: '2026-08-03T01:00:00Z' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  beforeEach(() => {
    localStorage.clear()
    globalThis.fetch = mockFetch as unknown as typeof fetch
    mockFetch.mockClear()
  })

  afterEach(() => {
    cleanup()
    mock.restore()
  })

  describe('security invariant — sandbox attribute', () => {
    it('renders an iframe with sandbox="allow-scripts" once the token is minted', async () => {
      renderViewer()
      await waitFor(() => {
        const iframe = document.querySelector('iframe')
        expect(iframe).not.toBeNull()
      })
      const iframe = document.querySelector('iframe')!
      expect(iframe.getAttribute('sandbox')).toBe('allow-scripts')
    })

    it('NEVER includes allow-same-origin in the sandbox attribute', async () => {
      // This is the load-bearing contract guard (C-2.6, Edge-3.6). If this test
      // fails, someone added allow-same-origin and collapsed the isolation.
      renderViewer()
      await waitFor(() => {
        expect(document.querySelector('iframe')).not.toBeNull()
      })
      const sandbox = document.querySelector('iframe')!.getAttribute('sandbox') ?? ''
      expect(sandbox).not.toContain('allow-same-origin')
    })

    it('sets referrerPolicy="no-referrer"', async () => {
      renderViewer()
      await waitFor(() => {
        expect(document.querySelector('iframe')).not.toBeNull()
      })
      expect(document.querySelector('iframe')!.getAttribute('referrerpolicy')).toBe('no-referrer')
    })
  })

  describe('panel-filling layout (BR-1.12)', () => {
    it('wraps the iframe in a .html-sandbox-viewer container that fills the panel', async () => {
      // Guards against the regression where the iframe collapsed to its
      // intrinsic 300x150 because no CSS sized the wrapper. happy-dom does
      // not do real layout, so we assert the contract carriers: the wrapper
      // class is present, the iframe carries the frame class, and the CSS
      // file actually defines the full-height rules. A computed-style check
      // lives in the E2E (html-preview.spec.ts) for real layout proof.
      const { container } = renderViewer()
      await waitFor(() => {
        expect(document.querySelector('iframe')).not.toBeNull()
      })

      const wrapper = container.querySelector('.html-sandbox-viewer')
      expect(wrapper).not.toBeNull()
      const iframe = wrapper!.querySelector('iframe.html-sandbox-viewer__frame')
      expect(iframe).not.toBeNull()
    })

    it('the CSS file defines the full-height rules for the wrapper and frame', async () => {
      // Static guard: the classes must have real CSS, not just be applied.
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const cssPath = resolve(import.meta.dir, 'documents-view.css')
      const css = readFileSync(cssPath, 'utf8')

      // wrapper must be full-height (h-full) so the iframe has something to fill
      expect(css).toMatch(/\.html-sandbox-viewer\s*\{[^}]*h-full/)
      // frame must be full-width AND full-height, borderless
      expect(css).toMatch(/\.html-sandbox-viewer__frame\s*\{[^}]*h-full[^}]*w-full/)
      expect(css).toMatch(/\.html-sandbox-viewer__frame\s*\{[^}]*border-0/)
    })
  })

  describe('iframe src — token in the path prefix', () => {
    it('builds the src as /api/documents/raw-preview/:token/*filePath with the token in the path, not a query param', async () => {
      renderViewer({ filePath: 'docs/site/index.html' })
      await waitFor(() => {
        expect(document.querySelector('iframe')).not.toBeNull()
      })
      const src = document.querySelector('iframe')!.getAttribute('src') ?? ''
      expect(src).toContain('/api/documents/raw-preview/')
      expect(src).toContain('tok.abc')
      // relative path segments are URL-encoded and joined
      expect(src).toContain('docs/site/index.html')
      // token must NOT be in a query string (Edge-3.7)
      expect(src.split('?')[0]).toContain('tok.abc')
      expect(src.includes('?token=') || src.includes('&token=')).toBe(false)
    })
  })

  describe('mint call', () => {
    it('POSTs to /api/documents/preview-token with projectId and filePath', async () => {
      renderViewer({ projectId: 'P1', filePath: 'docs/x.html' })
      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(1)
      })
      const call = mockFetch.mock.calls[0]
      expect(String(call[0])).toBe('/api/documents/preview-token')
      const init = call[1] as RequestInit
      expect(init.method).toBe('POST')
      expect(String(init.body)).toContain('"projectId":"P1"')
      expect(String(init.body)).toContain('"filePath":"docs/x.html"')
    })
  })

  describe('fullscreen overlay (BR-1.16, C-2.27)', () => {
    async function renderReadyViewer() {
      const { container } = renderViewer()
      await waitFor(() => {
        expect(document.querySelector('iframe')).not.toBeNull()
      })
      return container
    }

    it('renders the fullscreen control in the ready state', async () => {
      await renderReadyViewer()
      const button = screen.getByTestId<HTMLButtonElement>('html-fullscreen-toggle')
      expect(button.title).toBe('Enter fullscreen')
      expect(button.getAttribute('aria-pressed')).toBe('false')
    })

    it('repositions the SAME wrapper (no remount, no re-mint) when toggled', async () => {
      const container = await renderReadyViewer()
      const wrapper = container.querySelector('.html-sandbox-viewer')!
      const iframeBefore = document.querySelector('iframe')!
      const srcBefore = iframeBefore.getAttribute('src')
      const mintCallsAfterInitialLoad = mockFetch.mock.calls.length

      fireEvent.click(screen.getByTestId('html-fullscreen-toggle'))

      expect(wrapper.classList.contains('html-sandbox-viewer--fullscreen')).toBe(true)
      // C-2.27: the iframe DOM node, its src, and the sandbox attr survive the
      // toggle untouched, and no second mint was issued for the transition.
      expect(document.querySelector('iframe')).toBe(iframeBefore)
      expect(iframeBefore.getAttribute('src')).toBe(srcBefore)
      expect(iframeBefore.getAttribute('sandbox')).toBe('allow-scripts')
      expect(mockFetch.mock.calls.length).toBe(mintCallsAfterInitialLoad)

      fireEvent.click(screen.getByTestId('html-fullscreen-toggle'))

      expect(wrapper.classList.contains('html-sandbox-viewer--fullscreen')).toBe(false)
      expect(document.querySelector('iframe')).toBe(iframeBefore)
      expect(mockFetch.mock.calls.length).toBe(mintCallsAfterInitialLoad)
    })

    it('Escape exits fullscreen and stops before bubble-phase handlers (ticket-modal shield)', async () => {
      const container = await renderReadyViewer()
      const wrapper = container.querySelector('.html-sandbox-viewer')!
      fireEvent.click(screen.getByTestId('html-fullscreen-toggle'))
      expect(wrapper.classList.contains('html-sandbox-viewer--fullscreen')).toBe(true)

      // The ticket modal registers its Escape close as a bubble-phase document
      // listener (ui/Modal.tsx); the overlay's capture-phase handler must win.
      const bubbleSpy = mock(() => {})
      document.addEventListener('keydown', bubbleSpy)

      fireEvent.keyDown(document, { key: 'Escape' })

      expect(wrapper.classList.contains('html-sandbox-viewer--fullscreen')).toBe(false)
      expect(bubbleSpy).not.toHaveBeenCalled()

      document.removeEventListener('keydown', bubbleSpy)

      // Non-fullscreen Escape is not intercepted by the viewer at all.
      const idleSpy = mock(() => {})
      document.addEventListener('keydown', idleSpy)
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(idleSpy).toHaveBeenCalled()
      document.removeEventListener('keydown', idleSpy)
    })

    it('locks body overflow while fullscreen and restores it on exit', async () => {
      const container = await renderReadyViewer()
      const wrapper = container.querySelector('.html-sandbox-viewer')!
      expect(document.body.style.overflow).toBe('')

      fireEvent.click(screen.getByTestId('html-fullscreen-toggle'))
      expect(wrapper.classList.contains('html-sandbox-viewer--fullscreen')).toBe(true)
      expect(document.body.style.overflow).toBe('hidden')

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(document.body.style.overflow).toBe('')
    })

    it('the CSS file defines the fixed inset-0 overlay rules (static guard)', async () => {
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      const css = readFileSync(resolve(import.meta.dir, 'documents-view.css'), 'utf8')

      expect(css).toMatch(/\.html-sandbox-viewer--fullscreen\s*\{[^}]*position:\s*fixed/)
      expect(css).toMatch(/\.html-sandbox-viewer--fullscreen\s*\{[^}]*z-index:\s*9999/)
      expect(css).toMatch(/\.html-sandbox-viewer__fullscreen-btn\s*\{[^}]*position:\s*absolute/)
    })
  })

  describe('failure states', () => {
    it('shows a deleted state when fileDeleted is true (no mint attempt)', async () => {
      renderViewer({ fileDeleted: true })
      await waitFor(() => {
        expect(screen.getByText('File was deleted')).toBeDefined()
      })
      // no iframe rendered in deleted state
      expect(document.querySelector('iframe')).toBeNull()
    })

    it('shows a failure message when token mint returns non-2xx (no markdown fallback)', async () => {
      const failFetch = mock(async () => new Response('Forbidden', { status: 403 }))
      globalThis.fetch = failFetch as unknown as typeof fetch
      renderViewer()
      await waitFor(() => {
        expect(screen.getByText('Preview unavailable for this document.')).toBeDefined()
      })
      expect(document.querySelector('iframe')).toBeNull()
    })
  })
})
