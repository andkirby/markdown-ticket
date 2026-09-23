import type { SubDocument } from '@mdt/shared/models/SubDocument'
import type { CSSProperties } from 'react'
import type { TypedEvent } from '../../services/eventBus'
import type { Ticket } from '../../types'
import { AlertTriangle, Network } from 'lucide-react'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  getMarkdownDensity,
  getMarkdownDensityClass,
  MARKDOWN_DENSITY_CHANGE_EVENT,
  MARKDOWN_DENSITY_KEY,
} from '../../config/settingsPreferences'
import { formatTicketPageTitle, PageTitlePriority, usePageTitle } from '../../hooks/usePageTitle'
import { cn } from '../../lib/utils'
import { buildDocumentPath, isTraceGraphHash, TRACE_GRAPH_HASH_FRAGMENT } from '../../routes'
import { dataLayer } from '../../services/dataLayer'
import { useEventBus } from '../../services/eventBus'
import { filePathToApiPath } from '../../utils/subdocPathValidation'
import { extractTableOfContents } from '../../utils/tableOfContents'
import { isEpicTicket } from '../../utils/ticketLevels'
import { processContentForDisplay } from '../../utils/titleExtraction'
import HtmlSandboxViewer from '../DocumentsView/HtmlSandboxViewer'
import MarkdownContent from '../MarkdownContent'
// eslint-disable-next-line no-restricted-imports
import { RelativeTimestamp } from '../shared/RelativeTimestamp'
// eslint-disable-next-line no-restricted-imports
import TableOfContents from '../shared/TableOfContents'
import { DocumentDeliveryContext } from '../SmartLink/documentDelivery'
import { Modal, ModalBody } from '../ui/Modal'
import { CompactTicketHeader } from './CompactTicketHeader'
import { EpicBoardAction } from './EpicBoardAction'
import { ROOT_DOCUMENT_PATH, splitPathSegments } from './subdocumentPath'
import { TicketDocumentTabs } from './TicketDocumentTabs'
import { SidePanePill, SplitDivider, TicketSidePane } from './TicketSidePane'
import { TraceGraphShell } from './TraceGraphShell'
import { useSidePane } from './useSidePane'
import { useTicketDocumentContent } from './useTicketDocumentContent'
import { useTicketDocumentNavigation } from './useTicketDocumentNavigation'
import { useTicketDocumentRealtime } from './useTicketDocumentRealtime'
import { useTraceStoreAvailability } from './useTraceStoreAvailability'

interface TicketViewerProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
  ticketsPath?: string
  ticketError?: string | null
}

function humanizeTitleSegment(value: string): string {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, character => character.toUpperCase())
}

function findSubdocument(subdocuments: SubDocument[], selectedPath: string, ticketCode: string): SubDocument | null {
  for (const subdocument of subdocuments) {
    if (subdocument.filePath && filePathToApiPath(subdocument.filePath, ticketCode) === selectedPath) {
      return subdocument
    }

    if (subdocument.children.length > 0) {
      const child = findSubdocument(subdocument.children, selectedPath, ticketCode)
      if (child) {
        return child
      }
    }
  }

  return null
}

function deriveTicketContextLabel(
  subdocuments: SubDocument[],
  selectedPath: string,
  ticketCode: string,
  isTraceGraphOpen: boolean,
): string | null {
  if (isTraceGraphOpen) {
    return 'Trace Graph'
  }

  if (!selectedPath || selectedPath === ROOT_DOCUMENT_PATH) {
    return null
  }

  const fallbackLabel = splitPathSegments(selectedPath).map(humanizeTitleSegment).filter(Boolean).join(' ')
  const subdocument = findSubdocument(subdocuments, selectedPath, ticketCode)
  return (subdocument && humanizeTitleSegment(subdocument.name)) ?? (fallbackLabel || null)
}

const TicketViewer: React.FC<TicketViewerProps> = ({ ticket, isOpen, onClose, ticketsPath, ticketError }) => {
  const { projectCode } = useParams<{ projectCode: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(ticket)
  const [markdownDensity, setMarkdownDensity] = useState(getMarkdownDensity)
  // MDT-174 hot-fix: Trace Graph open state is URL-synced via the reserved
  // `#trace` hash so the URL is a deep link into the graph view.
  const isTraceGraphOpen = isTraceGraphHash(location.hash)
  const [tabNavigationHeight, setTabNavigationHeight] = useState<number | null>(null)

  // MDT-248 — side reading pane session (state machine: useSidePane;
  // contract: docs/design/surfaces/ticket-side-doc.interactions.md).
  const sidePane = useSidePane()
  const {
    state: sidePaneState,
    paneVisible,
    hasSession: hasSidePaneSession,
    openDocument: openSideDoc,
    back: backSidePane,
    fwd: fwdSidePane,
    hide: hideSidePane,
    reveal: revealSidePane,
    discard: discardSidePane,
    captureScroll: captureSidePaneScroll,
  } = sidePane
  // C2: the pre-split scroll offset must be captured at click time — the
  // pane-header focus (child effect) scrolls the overlay before the transfer
  // effect (parent) gets to read it.
  const preSplitScrollRef = useRef(0)
  const openDocumentWithTransfer = useCallback((filePath: string) => {
    const overlay = document.querySelector<HTMLElement>('.modal.ticket-detail-overlay')
    preSplitScrollRef.current = overlay?.scrollTop ?? 0
    openSideDoc(filePath)
  }, [openSideDoc])
  const sidePaneDelivery = useMemo(
    () => ({ openDocument: openDocumentWithTransfer }),
    [openDocumentWithTransfer],
  )
  const [sidePaneTitle, setSidePaneTitle] = useState('')
  const [sidePaneAnnouncement, setSidePaneAnnouncement] = useState('')
  const sidePaneTitleRef = useRef('')
  const ticketColumnRef = useRef<HTMLDivElement>(null)
  const paneWasVisibleRef = useRef(false)
  // UAT r2 — user-resizable wall between the columns; null = CSS default.
  // Session-local: dies with the modal like the rest of the pane session.
  const [splitTicketWidth, setSplitTicketWidth] = useState<number | null>(null)
  const splitBodyRef = useRef<HTMLDivElement>(null)
  const measureSplitColumn = useCallback(
    () => ticketColumnRef.current?.getBoundingClientRect().width ?? 0,
    [],
  )
  const measureSplitBody = useCallback(() => splitBodyRef.current?.clientWidth ?? 0, [])
  const modalSplitStyle = useMemo(
    () => (splitTicketWidth != null
      ? ({ '--ticket-col-width': `${splitTicketWidth}px` } as CSSProperties)
      : undefined),
    [splitTicketWidth],
  )

  const handlePaneTitle = useCallback((title: string) => {
    sidePaneTitleRef.current = title
    setSidePaneTitle(title)
  }, [])

  const handlePaneDiscard = useCallback(() => {
    discardSidePane()
    sidePaneTitleRef.current = ''
    setSidePaneTitle('')
    setSidePaneAnnouncement('Reading session closed')
  }, [discardSidePane])

  const openPaneDocInDocuments = useCallback((filePath: string) => {
    if (!projectCode)
      return
    navigate(buildDocumentPath(projectCode, filePath))
  }, [navigate, projectCode])

  // Esc while the pane is visible hides it (session kept). The Modal's own
  // Escape handler is gated off via closeOnEscape in the same state, so one
  // press walks out exactly one layer: trace shell → pane → modal (C3).
  useEffect(() => {
    if (!paneVisible)
      return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape')
        hideSidePane()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [paneVisible, hideSidePane])

  // C2 no-jump: when the split activates, the ticket column's content region
  // (.subdoc-content) becomes the scroll container — transfer the overlay's
  // scroll offset into it, and back when the split deactivates. The modal's
  // top-left anchor never moves.
  useEffect(() => {
    const overlay = document.querySelector<HTMLElement>('.modal.ticket-detail-overlay')
    const scroller = ticketColumnRef.current?.querySelector<HTMLElement>('[data-testid="subdoc-content"]')
    if (!overlay || !scroller)
      return
    if (paneVisible) {
      const top = preSplitScrollRef.current
      requestAnimationFrame(() => {
        scroller.scrollTop = top
      })
    }
    else if (scroller.scrollTop > 0) {
      overlay.scrollTop = scroller.scrollTop
    }
  }, [paneVisible])

  // C5 announcements + focus routing for the hide transition
  useEffect(() => {
    const was = paneWasVisibleRef.current
    paneWasVisibleRef.current = paneVisible
    if (paneVisible === was)
      return
    setSidePaneAnnouncement(paneVisible
      ? `Opening ${sidePaneTitleRef.current || 'document'} beside ticket`
      : `${sidePaneTitleRef.current || 'Document'} tucked — show it from the reading pill`)
    if (!paneVisible && hasSidePaneSession) {
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLButtonElement>('[data-testid="ticket-side-pane-pill"]')
          ?.focus()
      })
    }
  }, [paneVisible, hasSidePaneSession])

  const openTraceGraph = useCallback(() => {
    navigate(location.pathname + location.search + TRACE_GRAPH_HASH_FRAGMENT, { replace: true })
  }, [location.pathname, location.search, navigate])

  const closeTraceGraph = useCallback(() => {
    navigate(location.pathname + location.search, { replace: true })
  }, [location.pathname, location.search, navigate])

  // MDT-094: Update internal state when prop changes.
  // When a ticket is selected, fetch full ticket content if not already present.
  useEffect(() => {
    setCurrentTicket((prev) => {
      if (!ticket) {
        return null
      }

      if (prev && prev.code === ticket.code) {
        return {
          ...prev,
          ...ticket,
          // Preserve richer viewer-local data when list metadata refreshes.
          content: ticket.content || prev.content,
          subdocuments: ticket.subdocuments || prev.subdocuments,
        }
      }

      return ticket
    })

    // If ticket is opened but has no content, fetch the full ticket
    if (ticket && isOpen && !ticket.content && projectCode) {
      dataLayer.fetchTicket(projectCode, ticket.code)
        .then((fullTicket: Ticket | null) => {
          if (fullTicket) {
            setCurrentTicket(fullTicket)
          }
        })
        .catch((err: Error) => console.error('Failed to fetch ticket content:', err))
    }
  }, [ticket, isOpen, projectCode])

  useEffect(() => {
    const syncMarkdownDensity = () => setMarkdownDensity(getMarkdownDensity())
    const handleStorage = (event: StorageEvent) => {
      if (event.key === MARKDOWN_DENSITY_KEY)
        syncMarkdownDensity()
    }

    window.addEventListener(MARKDOWN_DENSITY_CHANGE_EVENT, syncMarkdownDensity)
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener(MARKDOWN_DENSITY_CHANGE_EVENT, syncMarkdownDensity)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  // Listen for real-time updates to this specific ticket
  useEventBus('ticket:updated', useCallback((event: TypedEvent<'ticket:updated'>) => {
    const updatedTicket = event.payload.ticket
    const updatedTicketCode = typeof updatedTicket === 'object' && updatedTicket && 'code' in updatedTicket
      ? String(updatedTicket.code)
      : event.payload.ticketCode

    setCurrentTicket((prev: Ticket | null) => {
      const openTicket = prev ?? ticket

      if (!openTicket || openTicket.code !== updatedTicketCode) {
        return prev
      }

      // Always refetch the full ticket when the open ticket file changes.
      // SSE metadata parsing can legitimately fail or be partial for filesystem events.
      dataLayer.fetchTicket(event.payload.projectId, updatedTicketCode)
        .then((fullTicket: Ticket | null) => {
          if (fullTicket) {
            setCurrentTicket((current: Ticket | null) => {
              if (!current || current.code !== fullTicket.code) {
                return current
              }

              return { ...current, ...fullTicket }
            })
          }
        })
        .catch((err: Error) => console.error('Failed to fetch updated ticket:', err))

      if (!updatedTicket || typeof updatedTicket !== 'object' || !('code' in updatedTicket)) {
        return openTicket
      }

      const lastModified = updatedTicket.lastModified instanceof Date
        ? updatedTicket.lastModified
        : typeof updatedTicket.lastModified === 'string'
          ? new Date(updatedTicket.lastModified)
          : openTicket.lastModified
      return { ...openTicket, ...updatedTicket, lastModified }
    })
  }, [ticket]))

  // MDT-064: Process content to hide H1 headers and extract title
  const processedContent = useMemo(() => {
    if (!currentTicket?.content)
      return ''

    // Process content to remove additional H1 headers (keep only first, then skip it)
    return processContentForDisplay(currentTicket.content)
  }, [currentTicket?.content])

  const subdocuments = useMemo(
    () => (currentTicket as (Ticket & { subdocuments?: SubDocument[] }) | null)?.subdocuments ?? [],
    [currentTicket],
  )

  const { selectedPath, folderStack, selectPath, pendingPath, confirmPathSwitch } = useTicketDocumentNavigation({
    subdocuments,
    ticketCode: currentTicket?.code ?? '',
    projectCode: projectCode ?? '',
  })

  const { subdocuments: liveSubdocs, handleSSEUpdate } = useTicketDocumentRealtime({
    initialSubdocuments: subdocuments,
    selectedPath,
    onActiveRemoved: () => selectPath('main'),
  })

  useEffect(() => {
    if (liveSubdocs.length === 0) {
      setTabNavigationHeight(null)
    }
  }, [liveSubdocs.length])

  const handleTabNavigationHeightChange = useCallback((height: number) => {
    setTabNavigationHeight(currentHeight => currentHeight === height ? currentHeight : height)
  }, [])

  const traceStoreAvailability = useTraceStoreAvailability({
    projectCode: projectCode ?? '',
    ticketCode: currentTicket?.code ?? '',
    isEnabled: isOpen && !!currentTicket,
  })

  // MDT-174: Trace Graph open state is URL-synced via the reserved `#trace`
  // hash. The hash is the single source of truth — we do NOT auto-close it
  // here. Closing the ticket modal (App.tsx handleTicketClose) and switching
  // tickets (handleTicketClick) both navigate to hash-less URLs, which drops
  // `#trace` naturally. Auto-closing in this component raced the modal's
  // initial isOpen=false state on deep-link load and stripped the hash.

  // MDT-221 UAT r2: the selected subdocument itself (not just its label) —
  // docKind drives the viewer switch and the raw-preview path for HTML.
  const selectedSubdoc = useMemo(() => {
    if (!currentTicket || selectedPath === ROOT_DOCUMENT_PATH) {
      return null
    }
    return findSubdocument(liveSubdocs, selectedPath, currentTicket.code)
  }, [currentTicket, liveSubdocs, selectedPath])

  const isHtmlSubdoc = selectedSubdoc?.docKind === 'html'

  const { content: subdocContent, loading: subdocLoading, error: subdocError, invalidateCache, invalidateAndRefetch } = useTicketDocumentContent({
    projectId: projectCode ?? '',
    ticketCode: currentTicket?.code ?? '',
    selectedPath,
    mainContent: processedContent,
    pendingPath,
    // HTML renders through the token-minted sandboxed iframe; there is no
    // markdown text to fetch (BR-1.15).
    skipFetch: isHtmlSubdoc,
    onContentLoaded: confirmPathSwitch,
  })

  // MDT-142: Handle subdocument change events
  useEventBus('ticket:subdocument:changed', useCallback((event: TypedEvent<'ticket:subdocument:changed'>) => {
    const { ticketCode, eventType, subdocument } = event.payload
    if (import.meta.env.DEV)
      console.warn('[TicketViewer] SSE subdocument event', { ticketCode, eventType, subdocument, currentTicketCode: currentTicket?.code, selectedPath })

    // Ignore if not for this ticket
    if (!currentTicket || currentTicket.code !== ticketCode) {
      if (import.meta.env.DEV)
        console.warn('[TicketViewer] Ignoring - ticket mismatch')
      return
    }

    const subdocumentPath = filePathToApiPath(subdocument.filePath, currentTicket.code)
    if (import.meta.env.DEV)
      console.warn('[TicketViewer] Converted path', { subdocumentPath, selectedPath })

    switch (eventType) {
      case 'change': {
        // MDT-142 Case 1 & 2: Invalidate cache and refetch if viewing
        if (import.meta.env.DEV)
          console.warn('[TicketViewer] change event - calling invalidateAndRefetch')
        invalidateAndRefetch(subdocumentPath)
        break
      }
      case 'add': {
        // Case 3: Refetch ticket to refresh tabs list
        if (projectCode) {
          dataLayer.fetchTicket(projectCode, ticketCode)
            .then((fullTicket: Ticket | null) => {
              if (fullTicket) {
                handleSSEUpdate(fullTicket.subdocuments ?? [])
                setCurrentTicket(prev => prev?.code === fullTicket.code ? { ...prev, ...fullTicket } : prev)
              }
            })
            .catch((err: Error) => console.error('Failed to refetch ticket after add:', err))
        }
        break
      }
      case 'unlink': {
        // Invalidate cache for the removed subdocument
        invalidateCache(subdocumentPath)

        if (selectedPath === subdocumentPath) {
          // Case 5: Viewing the deleted subdocument - switch to main
          selectPath('main')
        }
        // Case 4 & 5: Refetch ticket to refresh tabs list
        if (projectCode) {
          dataLayer.fetchTicket(projectCode, ticketCode)
            .then((fullTicket: Ticket | null) => {
              if (fullTicket) {
                handleSSEUpdate(fullTicket.subdocuments ?? [])
                setCurrentTicket(prev => prev?.code === fullTicket.code ? { ...prev, ...fullTicket } : prev)
              }
            })
            .catch((err: Error) => console.error('Failed to refetch ticket after unlink:', err))
        }
        break
      }
    }
  }, [currentTicket, selectedPath, invalidateCache, invalidateAndRefetch, selectPath, projectCode, handleSSEUpdate]))

  // Extract ToC items from the currently displayed content (main or subdoc)
  const tocItems = useMemo(() => {
    return subdocContent ? extractTableOfContents(subdocContent, 3) : []
  }, [subdocContent])

  const ticketContextLabel = useMemo(() => {
    if (!currentTicket) {
      return null
    }

    return deriveTicketContextLabel(liveSubdocs, selectedPath, currentTicket.code, isTraceGraphOpen)
  }, [currentTicket, isTraceGraphOpen, liveSubdocs, selectedPath])

  const markdownSourcePath = useMemo(() => {
    if (!currentTicket) {
      return undefined
    }

    if (selectedPath === ROOT_DOCUMENT_PATH) {
      return `${currentTicket.code}.md`
    }

    return selectedSubdoc?.filePath ?? undefined
  }, [currentTicket, selectedSubdoc, selectedPath])

  const ticketPageTitle = currentTicket
    ? formatTicketPageTitle(currentTicket.code, currentTicket.title, ticketContextLabel)
    : null

  usePageTitle(isOpen ? ticketPageTitle : null, PageTitlePriority.TICKET)

  if (!currentTicket && !ticketError)
    return null

  const traceGraphAction = traceStoreAvailability.hasTraceStore
    ? (
        <button
          type="button"
          className="ticket-viewer-action"
          onClick={openTraceGraph}
        >
          <Network aria-hidden="true" />
          <span>Trace Graph</span>
        </button>
      )
    : null

  // MDT-246: the epic's own way out to its board lane — epic tickets carry no
  // phase badge, so the CTA is their jump entry point. Renders before Trace
  // Graph (nearest the badges; ticket-viewer.spec.md § layout).
  const epicBoardAction = currentTicket && isEpicTicket(currentTicket) && projectCode
    ? (
        <EpicBoardAction projectCode={projectCode} ticketCode={currentTicket.code} />
      )
    : null
  const headerActions = (epicBoardAction || traceGraphAction)
    ? (
        <>
          {epicBoardAction}
          {traceGraphAction}
        </>
      )
    : null

  const ticketContentStyle = {
    '--prose-anchor-offset': liveSubdocs.length === 0 ? '0px' : `${tabNavigationHeight ?? 36}px`,
  } as CSSProperties

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size={paneVisible ? 'split' : 'xl'}
        className="ticket-detail-modal"
        overlayClassName={cn('ticket-detail-overlay', paneVisible && 'ticket-detail-overlay--split')}
        style={modalSplitStyle}
        closeOnEscape={!isTraceGraphOpen && !paneVisible}
        closeOnOverlayClick={!isTraceGraphOpen}
        data-testid="ticket-detail"
      >
        <TableOfContents items={tocItems} view="ticket" />
        <button
          type="button"
          aria-label="Close ticket viewer"
          data-testid="close-detail"
          className={cn('modal__close--absolute', paneVisible && 'modal__close--split')}
          onClick={onClose}
        >
          <svg
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <ModalBody
          ref={splitBodyRef}
          className={cn('ticket-viewer-body', paneVisible && 'ticket-viewer-body--split')}
        >
          <DocumentDeliveryContext.Provider value={sidePaneDelivery}>
            {ticketError && !ticket
              ? (
                  <div data-testid="ticket-not-found" className="ticket-not-found">
                    <AlertTriangle className="ticket-not-found__icon text-muted-foreground" />
                    <h1 className="modal__headline ticket-not-found__headline">Ticket Not Found</h1>
                    <p className="text-muted-foreground ticket-not-found__text">{ticketError}</p>
                  </div>
                )
              : (
                  <div
                    className="ticket-viewer-content"
                    ref={ticketColumnRef}
                    style={splitTicketWidth != null
                      ? { ...ticketContentStyle, flexBasis: `${splitTicketWidth}px` }
                      : ticketContentStyle}
                  >
                    <CompactTicketHeader ticket={currentTicket!} action={headerActions} />

                    <TicketDocumentTabs
                      subdocuments={liveSubdocs}
                      selectedPath={selectedPath}
                      folderStack={folderStack}
                      onSelect={selectPath}
                      ticketCode={currentTicket?.code ?? ''}
                      onHeightChange={handleTabNavigationHeightChange}
                    />

                    <div data-testid="subdoc-content" className="subdoc-content">
                      {subdocError && (
                        <div data-testid="subdoc-error" className="subdoc-error" role="alert">
                          {subdocError}
                        </div>
                      )}
                      {!subdocError && isOpen && projectCode && (
                        <>
                          {(pendingPath || subdocLoading) && (
                            <div data-testid="subdoc-loading" className="subdoc-loading">
                              <span className="subdoc-loading__message text-muted-foreground">
                                Loading…
                              </span>
                            </div>
                          )}
                          <div data-testid="ticket-content" className={pendingPath || subdocLoading ? 'ticket-content--pending' : ''}>
                            {isHtmlSubdoc && selectedSubdoc?.filePath
                              ? (
                                  // MDT-221 UAT r2: sandboxed HTML preview — the
                                  // identical component, mint flow, and raw route as
                                  // Documents View; iframe sandbox invariants (OBL-13)
                                  // apply unchanged.
                                  <div className="ticket-html-preview" data-testid="ticket-html-preview">
                                    <HtmlSandboxViewer
                                      projectId={projectCode}
                                      filePath={`${ticketsPath}/${selectedSubdoc.filePath}`}
                                    />
                                  </div>
                                )
                              : (
                                  <div className="ticket-viewer__section modal__section--content">
                                    <div className="relative-timestamp__floating">
                                      <RelativeTimestamp
                                        createdAt={currentTicket!.dateCreated}
                                        updatedAt={currentTicket!.lastModified}
                                      />
                                    </div>
                                    <MarkdownContent
                                      markdown={subdocContent}
                                      currentProject={projectCode}
                                      sourcePath={markdownSourcePath}
                                      ticketsPath={ticketsPath}
                                      headerLevelStart={3}
                                      className={`prose prose--ticket ${getMarkdownDensityClass(markdownDensity)} dark:prose-invert`}
                                    />
                                  </div>
                                )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
            {paneVisible && (
              <SplitDivider
                measureColumn={measureSplitColumn}
                measureBody={measureSplitBody}
                onResize={setSplitTicketWidth}
                onReset={() => setSplitTicketWidth(null)}
              />
            )}
            {hasSidePaneSession && currentTicket && (
              <TicketSidePane
                projectId={projectCode ?? ''}
                hist={sidePaneState.hist}
                hi={sidePaneState.hi}
                visible={paneVisible}
                scrolls={sidePaneState.scrolls}
                onBack={backSidePane}
                onForward={fwdSidePane}
                onHide={hideSidePane}
                onDiscard={handlePaneDiscard}
                onOpenInDocuments={openPaneDocInDocuments}
                onScrollChange={captureSidePaneScroll}
                onTitleChange={handlePaneTitle}
              />
            )}
            {hasSidePaneSession && !paneVisible && currentTicket && (
              <SidePanePill title={sidePaneTitle || 'Document'} onReveal={revealSidePane} />
            )}
            <div className="ticket-side-pane__announcer" aria-live="polite">
              {sidePaneAnnouncement}
            </div>
          </DocumentDeliveryContext.Provider>
        </ModalBody>
      </Modal>

      {currentTicket && (
        <TraceGraphShell
          isOpen={isTraceGraphOpen}
          projectCode={projectCode ?? ''}
          ticketCode={currentTicket.code}
          onClose={closeTraceGraph}
        />
      )}
    </>
  )
}

export default TicketViewer
