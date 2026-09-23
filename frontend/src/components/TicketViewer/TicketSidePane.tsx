import * as React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { authFetch } from '@/auth/authFetch'
import { getMarkdownDensity, getMarkdownDensityClass, MARKDOWN_DENSITY_CHANGE_EVENT } from '@/config/settingsPreferences'
import HtmlSandboxViewer from '../DocumentsView/HtmlSandboxViewer'
import MarkdownContent from '../MarkdownContent'
import { clampTicketColumnWidth } from './splitLayout'

/**
 * @testid ticket-side-pane — the pane (aside) while visible
 * @testid ticket-side-pane-title — document title in the pane header
 * @testid ticket-side-pane-path — mono document path in the pane header
 * @testid ticket-side-pane-back — pane history back
 * @testid ticket-side-pane-forward — pane history forward
 * @testid ticket-side-pane-close — discard session (×)
 * @testid ticket-side-pane-open-documents — hand-off to Documents view
 * @testid ticket-side-pane-back-to-ticket — overlay return control (narrow only)
 * @testid ticket-side-pane-scroll — pane scroll region
 * @testid ticket-side-pane-pill — reading pill while pane hidden
 * @testid ticket-side-pane-divider — draggable column divider (split only)
 */

interface PaneDoc {
  path: string
  title: string
  body: string
  isHtml: boolean
}

interface TicketSidePaneProps {
  projectId: string
  /** Session history from useSidePane */
  hist: string[]
  hi: number
  visible: boolean
  scrolls: Record<string, number>
  /** Injectable for tests; defaults to the documents content endpoint */
  fetchContent?: (filePath: string) => Promise<string>
  onBack: () => void
  onForward: () => void
  onHide: () => void
  onDiscard: () => void
  onOpenInDocuments: (filePath: string) => void
  /** Scroll capture at navigation boundaries (pane scroll offset) */
  onScrollChange: (top: number) => void
  onTitleChange?: (title: string) => void
}

function humanizeBasename(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '')
  return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())
}

function isHtmlPath(path: string): boolean {
  return /\.html?$/i.test(path)
}

/**
 * First `# ` heading becomes the pane title and is stripped from the body
 *  (mirrors how the ticket viewer strips its own H1).
 */
function parseDocument(path: string, markdown: string): PaneDoc {
  const isHtml = isHtmlPath(path)
  const lines = markdown.split('\n')
  const h1Index = lines.findIndex(line => /^#[ \t]/.test(line))
  if (h1Index >= 0) {
    const title = lines[h1Index].slice(1).trim()
    const body = lines.filter((_, index) => index !== h1Index).join('\n').replace(/^\n+/, '')
    return { path, title, body, isHtml }
  }
  return { path, title: humanizeBasename(path), body: markdown, isHtml }
}

async function defaultFetchContent(projectId: string, filePath: string): Promise<string> {
  const response = await authFetch(
    `/api/documents/content?projectId=${encodeURIComponent(projectId)}&filePath=${encodeURIComponent(filePath)}`,
  )
  if (!response.ok) {
    throw new Error(`Failed to load ${filePath}`)
  }
  return response.text()
}

export const TicketSidePane: React.FC<TicketSidePaneProps> = ({
  projectId,
  hist,
  hi,
  visible,
  scrolls,
  fetchContent,
  onBack,
  onForward,
  onHide,
  onDiscard,
  onOpenInDocuments,
  onScrollChange,
  onTitleChange,
}) => {
  const [doc, setDoc] = useState<PaneDoc | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorPath, setErrorPath] = useState<string | null>(null)
  const [markdownDensity, setMarkdownDensity] = useState(getMarkdownDensity)
  const cacheRef = useRef(new Map<string, PaneDoc>())
  const scrollRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const currentPath = hist[hi] ?? null

  const fetcher = useMemo(
    () => fetchContent ?? ((filePath: string) => defaultFetchContent(projectId, filePath)),
    [fetchContent, projectId],
  )

  useEffect(() => {
    const sync = () => setMarkdownDensity(getMarkdownDensity())
    window.addEventListener(MARKDOWN_DENSITY_CHANGE_EVENT, sync)
    return () => window.removeEventListener(MARKDOWN_DENSITY_CHANGE_EVENT, sync)
  }, [])

  useEffect(() => {
    if (!currentPath)
      return
    const cached = cacheRef.current.get(currentPath)
    if (cached) {
      setDoc(cached)
      setErrorPath(null)
      return
    }
    let cancelled = false
    setLoading(true)
    fetcher(currentPath)
      .then((markdown) => {
        if (cancelled)
          return
        const parsed = parseDocument(currentPath, markdown)
        cacheRef.current.set(currentPath, parsed)
        setDoc(parsed)
        setErrorPath(null)
      })
      .catch(() => {
        // Edge-2: retain the previously loaded document and the session
        if (!cancelled)
          setErrorPath(currentPath)
      })
      .finally(() => {
        if (!cancelled)
          setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentPath, fetcher])

  useEffect(() => {
    if (doc)
      onTitleChange?.(doc.title)
  }, [doc, onTitleChange])

  // Restore the per-entry scroll offset once the entry's content has painted
  useEffect(() => {
    if (!visible || !currentPath)
      return
    const raf = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el)
        el.scrollTop = scrolls[currentPath] ?? 0
    })
    return () => cancelAnimationFrame(raf)
  }, [visible, currentPath, doc, scrolls])

  // Focus lands in the pane when it opens (interactions.md keyboard contract)
  useEffect(() => {
    if (visible)
      headerRef.current?.focus()
  }, [visible])

  if (!visible || !currentPath)
    return null

  const withCapture = (fn: () => void) => () => {
    if (scrollRef.current)
      onScrollChange(scrollRef.current.scrollTop)
    fn()
  }

  const title = doc?.title ?? humanizeBasename(currentPath)

  return (
    <aside
      className="ticket-side-pane"
      role="complementary"
      aria-label={`Document preview — ${title}`}
      data-testid="ticket-side-pane"
    >
      <div className="ticket-side-pane__header" ref={headerRef} tabIndex={-1}>
        <div className="ticket-side-pane__title-bar">
          <button
            type="button"
            className="ticket-side-pane__back-to-ticket"
            data-testid="ticket-side-pane-back-to-ticket"
            aria-label="Back to ticket"
            onClick={withCapture(onHide)}
          >
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            </svg>
            Ticket
          </button>
          <span className="modal__headline ticket-side-pane__title" data-testid="ticket-side-pane-title">{title}</span>
          <div className="ticket-side-pane__actions">
            <button
              type="button"
              className="ticket-side-pane__btn"
              data-testid="ticket-side-pane-open-documents"
              aria-label="Open in Documents view"
              title="Open in Documents view"
              onClick={() => onOpenInDocuments(currentPath)}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M9 7h8v8" />
              </svg>
            </button>
            <button
              type="button"
              className="ticket-side-pane__btn"
              data-testid="ticket-side-pane-close"
              aria-label="Close reading session"
              title="Close — discards this reading session"
              onClick={withCapture(onDiscard)}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="ticket-side-pane__meta-bar">
          <div className="ticket-side-pane__nav">
            <button
              type="button"
              className="ticket-side-pane__btn"
              data-testid="ticket-side-pane-back"
              aria-label="Back"
              title="Back"
              disabled={hi <= 0}
              onClick={withCapture(onBack)}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              className="ticket-side-pane__btn"
              data-testid="ticket-side-pane-forward"
              aria-label="Forward"
              title="Forward"
              disabled={hi >= hist.length - 1}
              onClick={withCapture(onForward)}
            >
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <span className="ticket-side-pane__path" data-testid="ticket-side-pane-path" title={currentPath}>{currentPath}</span>
        </div>
      </div>
      <div className="ticket-side-pane__scroll" ref={scrollRef} data-testid="ticket-side-pane-scroll">
        {loading && !doc && <div className="ticket-side-pane__loading">Loading…</div>}
        {errorPath && (
          <div className="ticket-side-pane__error" role="alert">
            Couldn’t load
            {' '}
            {errorPath}
          </div>
        )}
        {doc && !doc.isHtml && (
          <MarkdownContent
            markdown={doc.body}
            currentProject={projectId}
            sourcePath={currentPath}
            className={`prose prose--document ${getMarkdownDensityClass(markdownDensity)}`}
          />
        )}
        {doc && doc.isHtml && (
          <div className="ticket-side-pane__html">
            <HtmlSandboxViewer projectId={projectId} filePath={currentPath} />
          </div>
        )}
      </div>
    </aside>
  )
}

interface SidePanePillProps {
  title: string
  onReveal: () => void
}

export const SidePanePill: React.FC<SidePanePillProps> = ({ title, onReveal }) => (
  <button
    type="button"
    className="ticket-side-pane__pill"
    data-testid="ticket-side-pane-pill"
    aria-label={`Show ${title} side pane`}
    onClick={onReveal}
  >
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6" />
    </svg>
    <span className="ticket-side-pane__pill-label">Reading</span>
    <span className="ticket-side-pane__pill-title">{title}</span>
    <span className="ticket-side-pane__pill-show">Show&nbsp;›</span>
  </button>
)

interface SplitDividerProps {
  /** Measured ticket-column width, read at drag/keyboard start */
  measureColumn: () => number
  /** Split body (row) width, for clamping */
  measureBody: () => number
  onResize: (widthPx: number) => void
  /** Persistence commit point: drag end and each arrow nudge */
  onCommit: () => void
  onReset: () => void
}

/**
 * The draggable wall between the ticket column and the pane. Pointer drag,
 * ArrowLeft/ArrowRight (±32px), double-click resets to the CSS default.
 * The host persists the wall position at commit points (config/sidePaneLayout).
 */
export const SplitDivider: React.FC<SplitDividerProps> = ({ measureColumn, measureBody, onResize, onCommit, onReset }) => {
  const dragRef = useRef<{ pointerId: number, startX: number, startWidth: number } | null>(null)

  const beginDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0)
      return
    const startWidth = measureColumn()
    if (!startWidth)
      return
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.classList.add('is-dragging')
    document.body.classList.add('ticket-side-pane--resizing')
  }

  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId)
      return
    onResize(clampTicketColumnWidth(drag.startWidth + event.clientX - drag.startX, measureBody()))
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current)
      return
    dragRef.current = null
    event.currentTarget.classList.remove('is-dragging')
    document.body.classList.remove('ticket-side-pane--resizing')
    onCommit()
  }

  const nudge = (delta: number) => () => {
    onResize(clampTicketColumnWidth(measureColumn() + delta, measureBody()))
    onCommit()
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize ticket and document columns"
      tabIndex={0}
      className="ticket-side-pane__divider"
      data-testid="ticket-side-pane-divider"
      title="Drag to resize · double-click to reset"
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          nudge(-32)()
        }
        else if (event.key === 'ArrowRight') {
          event.preventDefault()
          nudge(32)()
        }
      }}
    />
  )
}

export default TicketSidePane
