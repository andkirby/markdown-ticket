import type { SubDocument } from '@mdt/shared/models/SubDocument'
import type { Ticket } from '../types/ticket'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { dataLayer } from '../services/dataLayer'
import { useEventBus } from '../services/eventBus'
import { extractTableOfContents } from '../utils/tableOfContents'
import { processContentForDisplay } from '../utils/titleExtraction'
import MarkdownContent from './MarkdownContent'
import TableOfContents from './shared/TableOfContents'
import TicketAttributes from './TicketAttributes'
import { TicketCode } from './TicketCode'
import { TicketDocumentTabs } from './TicketViewer/TicketDocumentTabs'
import { useTicketDocumentContent } from './TicketViewer/useTicketDocumentContent'
import { useTicketDocumentNavigation } from './TicketViewer/useTicketDocumentNavigation'
import { useTicketDocumentRealtime } from './TicketViewer/useTicketDocumentRealtime'
import { Modal, ModalBody, ModalHeader } from './UI/Modal'

interface TicketViewerProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
}

const TicketViewer: React.FC<TicketViewerProps> = ({ ticket, isOpen, onClose }) => {
  const { projectCode } = useParams<{ projectCode: string }>()
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(ticket)

  // MDT-094: Update internal state when prop changes.
  // When a ticket is selected, fetch full ticket content if not already present.
  useEffect(() => {
    setCurrentTicket(ticket)

    // If ticket is opened but has no content, fetch the full ticket
    if (ticket && isOpen && !ticket.content && projectCode) {
      dataLayer.fetchTicket(projectCode, ticket.code)
        .then((fullTicket) => {
          if (fullTicket) {
            setCurrentTicket(fullTicket)
          }
        })
        .catch(err => console.error('Failed to fetch ticket content:', err))
    }
  }, [ticket, isOpen, projectCode])

  // Listen for real-time updates to this specific ticket
  useEventBus('ticket:updated', useCallback((event) => {
    const updatedTicket = event.payload.ticket
    if (!updatedTicket || typeof updatedTicket !== 'object' || !('code' in updatedTicket)) {
      return
    }

    setCurrentTicket((prev) => {
      const openTicket = prev ?? ticket

      if (!openTicket || openTicket.code !== updatedTicket.code) {
        return prev
      }

      // Fetch complete ticket data including content
      dataLayer.fetchTicket(event.payload.projectId, updatedTicket.code)
        .then((fullTicket) => {
          if (fullTicket) {
            setCurrentTicket((current) => {
              if (!current || current.code !== fullTicket.code) {
                return current
              }

              return { ...current, ...fullTicket }
            })
          }
        })
        .catch(err => console.error('Failed to fetch updated ticket:', err))

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

  // Extract ToC items from processed content
  const tocItems = useMemo(() => {
    return processedContent ? extractTableOfContents(processedContent, 3) : []
  }, [processedContent])

  const subdocuments = useMemo(
    () => (currentTicket as (Ticket & { subdocuments?: SubDocument[] }) | null)?.subdocuments ?? [],
    [currentTicket],
  )

  const { selectedPath, folderStack, selectPath, pendingPath, confirmPathSwitch } = useTicketDocumentNavigation({
    subdocuments,
    ticketCode: currentTicket?.code ?? '',
    projectCode: projectCode ?? '',
  })

  const { subdocuments: liveSubdocs } = useTicketDocumentRealtime({
    initialSubdocuments: subdocuments,
    selectedPath,
    onActiveRemoved: () => selectPath('main'),
  })

  const { content: subdocContent, loading: subdocLoading, error: subdocError } = useTicketDocumentContent({
    projectId: projectCode ?? '',
    ticketCode: currentTicket?.code ?? '',
    selectedPath,
    mainContent: processedContent,
    pendingPath,
    onContentLoaded: confirmPathSwitch,
  })

  if (!currentTicket)
    return null

  return (
    /* @testid ticket-detail — Ticket detail modal container */
    <Modal isOpen={isOpen} onClose={onClose} size="xl" data-testid="ticket-detail">
      <TableOfContents items={tocItems} view="ticket" />
      <ModalHeader
        title={(
          /* @testid ticket-title — Ticket title display */
          <span data-testid="ticket-title">
            <TicketCode code={currentTicket.code} ticket={currentTicket} />
            {' '}
            •
            {currentTicket.title}
          </span>
        )}
        onClose={onClose}
        /* @testid close-detail — Close button for ticket modal */
        closeTestId="close-detail"
      />
      <ModalBody>
        <div className="space-y-4 min-w-0">
          {/* Ticket Metadata */}
          <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <TicketAttributes ticket={currentTicket} />
          </div>

          {/* Sub-document navigation tabs (MDT-093) */}
          <TicketDocumentTabs
            subdocuments={liveSubdocs}
            selectedPath={selectedPath}
            folderStack={folderStack}
            onSelect={selectPath}
            pendingPath={pendingPath}
          />

          {/* Content area: sub-document or main ticket content */}
          {/* @testid subdoc-content — content area for selected sub-document */}
          <div data-testid="subdoc-content" className="relative">
            {subdocError && (
              /* @testid subdoc-error — error message when sub-document fails to load */
              <div data-testid="subdoc-error" className="text-destructive text-sm py-2" role="alert">
                {subdocError}
              </div>
            )}
            {!subdocError && isOpen && projectCode && (
              <>
                {(pendingPath || subdocLoading) && (
                  /* @testid subdoc-loading — loading overlay preserving previous content height */
                  <div data-testid="subdoc-loading" className="absolute inset-0 z-10 flex items-start justify-center pt-8 bg-background/50">
                    <span className="text-muted-foreground text-sm animate-pulse">Loading…</span>
                  </div>
                )}
                {/* @testid ticket-content — Markdown content area (stays mounted to prevent layout collapse) */}
                <div data-testid="ticket-content" className={pendingPath || subdocLoading ? 'opacity-50 pointer-events-none' : ''}>
                  <MarkdownContent
                    markdown={subdocContent}
                    currentProject={projectCode}
                    headerLevelStart={3}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </ModalBody>
    </Modal>
  )
}

export default TicketViewer
