import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { authFetch } from '@/auth/authFetch'
import { getMarkdownDensity, getMarkdownDensityClass, MARKDOWN_DENSITY_CHANGE_EVENT } from '@/config/settingsPreferences'
import { useToast } from '@/hooks/useToast'
import CopyPathButton from '../DocumentsView/CopyPathButton'
import HtmlSandboxViewer from '../DocumentsView/HtmlSandboxViewer'
import MarkdownContent from '../MarkdownContent'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../ui/context-menu'
import { ModalCloseButton } from '../ui/Modal'
import { humanizePaneTitle } from './sidePaneDocs'
import { clampTicketColumnWidth } from './splitLayout'

/**
 * @testid ticket-side-pane — the pane (aside) while visible
 * @testid ticket-side-pane-title — document title in the pane header
 * @testid ticket-side-pane-path — mono document path in the pane header (copy via shared copy-path-btn)
 * @testid ticket-side-pane-nav — floating history chip over the pane body
 * @testid ticket-side-pane-back — pane history back (in the floating chip)
 * @testid ticket-side-pane-forward — pane history forward (in the floating chip)
 * @testid ticket-side-pane-menu — right-click history menu on back/forward
 * @testid ticket-side-pane-menu-item — one history entry in that menu
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
  /** Last-known document titles from the session (menu rows, no refetch) */
  titles: Record<string, string>
  /** Injectable for tests; defaults to the documents content endpoint */
  fetchContent?: (filePath: string) => Promise<string>
  onBack: () => void
  onForward: () => void
  /** Jump to a history index (right-click menu); the stack is kept intact */
  onJump: (index: number) => void
  onHide: () => void
  onDiscard: () => void
  onOpenInDocuments: (filePath: string) => void
  /** Scroll capture at navigation boundaries (pane scroll offset) */
  onScrollChange: (top: number) => void
  /** Title recording into the session (pill + menu rows without refetch) */
  onTitleKnown?: (path: string, title: string) => void
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
  return { path, title: humanizePaneTitle(path), body: markdown, isHtml }
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

interface HistoryNavButtonProps {
  direction: 'back' | 'forward'
  hist: string[]
  hi: number
  titles: Record<string, string>
  disabled: boolean
  onClick: () => void
  /** Menu jump with the caller's scroll capture; the stack is kept intact */
  onJumpEntry: (index: number) => void
}

/**
 * One history control in the floating chip. Right-click opens the stack menu
 * for that direction (back = past entries nearest first, forward = future
 * entries in order); rows follow the documents nav-tree format — title over
 * mono file path. Left-click stays a single step.
 */
const HistoryNavButton: React.FC<HistoryNavButtonProps> = ({
  direction,
  hist,
  hi,
  titles,
  disabled,
  onClick,
  onJumpEntry,
}) => {
  const past = direction === 'back'
  const indices = past
    ? Array.from({ length: hi }, (_, k) => hi - 1 - k)
    : Array.from({ length: hist.length - 1 - hi }, (_, k) => hi + 1 + k)
  const testid = past ? 'ticket-side-pane-back' : 'ticket-side-pane-forward'
  const button = (
    <button
      type="button"
      className="ticket-side-pane__btn"
      data-testid={testid}
      aria-label={past ? 'Back' : 'Forward'}
      title={indices.length > 0 ? `${past ? 'Back' : 'Forward'} — right-click for history` : past ? 'Back' : 'Forward'}
      disabled={disabled}
      onClick={onClick}
    >
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={past ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'} />
      </svg>
    </button>
  )
  if (indices.length === 0)
    return button
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {button}
      </ContextMenuTrigger>
      <ContextMenuContent data-testid="ticket-side-pane-menu">
        {indices.map(index => (
          <ContextMenuItem
            key={hist[index]}
            className="ticket-side-pane__menu-item"
            data-testid="ticket-side-pane-menu-item"
            onSelect={() => onJumpEntry(index)}
          >
            <span className="ticket-side-pane__menu-title">{titles[hist[index]] ?? humanizePaneTitle(hist[index])}</span>
            <span className="ticket-side-pane__menu-path">{hist[index]}</span>
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export const TicketSidePane: React.FC<TicketSidePaneProps> = ({
  projectId,
  hist,
  hi,
  visible,
  scrolls,
  titles,
  fetchContent,
  onBack,
  onForward,
  onJump,
  onHide,
  onDiscard,
  onOpenInDocuments,
  onScrollChange,
  onTitleKnown,
}) => {
  const [doc, setDoc] = useState<PaneDoc | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorPath, setErrorPath] = useState<string | null>(null)
  const [markdownDensity, setMarkdownDensity] = useState(getMarkdownDensity)
  const cacheRef = useRef(new Map<string, PaneDoc>())
  const docRef = useRef<PaneDoc | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const notify = useToast()
  const currentPath = hist[hi] ?? null

  const applyDoc = useCallback((next: PaneDoc | null) => {
    docRef.current = next
    setDoc(next)
  }, [])

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
      applyDoc(cached)
      setErrorPath(null)
      onTitleKnown?.(currentPath, cached.title)
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
        applyDoc(parsed)
        setErrorPath(null)
        onTitleKnown?.(currentPath, parsed.title)
      })
      .catch(() => {
        // Edge-2: the session survives. With a previous document on screen,
        // a toast reports the failure and the previous document stays; with
        // nothing loaded, the pane shows an inline empty error state.
        if (cancelled)
          return
        setErrorPath(currentPath)
        if (docRef.current)
          notify.error(`Couldn’t load ${currentPath}`, { description: 'The document could not be read. Showing the previous document.' })
      })
      .finally(() => {
        if (!cancelled)
          setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentPath, fetcher, applyDoc, notify, onTitleKnown])

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

  const jumpWithCapture = (index: number) => {
    if (scrollRef.current)
      onScrollChange(scrollRef.current.scrollTop)
    onJump(index)
  }

  const title = doc?.title ?? humanizePaneTitle(currentPath)

  return (
    <aside
      className="ticket-side-pane"
      role="complementary"
      aria-label={`Document preview — ${title}`}
      data-testid="ticket-side-pane"
    >
      <div className="ticket-side-pane__header" ref={headerRef} tabIndex={-1}>
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
        <div className="ticket-side-pane__path-wrap">
          <span className="ticket-side-pane__path" data-testid="ticket-side-pane-path" title={currentPath}>{currentPath}</span>
          <CopyPathButton path={currentPath} />
        </div>
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
          <ModalCloseButton
            data-testid="ticket-side-pane-close"
            aria-label="Close reading session"
            title="Close — discards this reading session"
            onClose={withCapture(onDiscard)}
          />
        </div>
      </div>
      <div className="ticket-side-pane__body">
        <div
          className="ticket-side-pane__nav"
          role="group"
          aria-label="Reading history"
          data-testid="ticket-side-pane-nav"
        >
          <HistoryNavButton
            direction="back"
            hist={hist}
            hi={hi}
            titles={titles}
            disabled={hi <= 0}
            onClick={withCapture(onBack)}
            onJumpEntry={jumpWithCapture}
          />
          <HistoryNavButton
            direction="forward"
            hist={hist}
            hi={hi}
            titles={titles}
            disabled={hi >= hist.length - 1}
            onClick={withCapture(onForward)}
            onJumpEntry={jumpWithCapture}
          />
        </div>
        <div className="ticket-side-pane__scroll" ref={scrollRef} data-testid="ticket-side-pane-scroll">
          {loading && !doc && <div className="ticket-side-pane__loading">Loading…</div>}
          {errorPath && !doc && (
            <div className="ticket-side-pane__empty" role="alert">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
              <div className="ticket-side-pane__empty-title">Couldn’t load this document</div>
              <div className="ticket-side-pane__empty-path" data-testid="ticket-side-pane-error-path">{errorPath}</div>
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
