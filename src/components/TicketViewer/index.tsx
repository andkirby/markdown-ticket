import type { SubDocument } from '@mdt/shared/models/SubDocument'
import type { TypedEvent } from '../../services/eventBus'
import type { Ticket } from '../../types'
import * as React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { dataLayer } from '../../services/dataLayer'
import { useEventBus } from '../../services/eventBus'
import { filePathToApiPath } from '../../utils/subdocPathValidation'
import { extractTableOfContents } from '../../utils/tableOfContents'
import { processContentForDisplay } from '../../utils/titleExtraction'
import MarkdownContent from '../MarkdownContent'
// eslint-disable-next-line no-restricted-imports
import { RelativeTimestamp } from '../shared/RelativeTimestamp'
// eslint-disable-next-line no-restricted-imports
import TableOfContents from '../shared/TableOfContents'
import { Modal, ModalBody } from '../ui/Modal'
import { CompactTicketHeader } from './CompactTicketHeader'
import { TicketDocumentTabs } from './TicketDocumentTabs'
import { useTicketDocumentContent } from './useTicketDocumentContent'
import { useTicketDocumentNavigation } from './useTicketDocumentNavigation'
import { useTicketDocumentRealtime } from './useTicketDocumentRealtime'

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

  const { content: subdocContent, loading: subdocLoading, error: subdocError, invalidateCache, invalidateAndRefetch } = useTicketDocumentContent({
    projectId: projectCode ?? '',
    ticketCode: currentTicket?.code ?? '',
    selectedPath,
    mainContent: processedContent,
    pendingPath,
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

  if (!currentTicket)
    return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" data-testid="ticket-detail">
      <TableOfContents items={tocItems} view="ticket" />
      <button
        type="button"
        aria-label="Close ticket viewer"
        data-testid="close-detail"
        className="absolute right-3 top-3 z-20 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-gray-500 dark:hover:bg-slate-800 dark:hover:text-gray-200"
        onClick={onClose}
      >
        <svg
          className="h-5 w-5"
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
      <ModalBody className="p-0">
        <div className="min-w-0">
          <CompactTicketHeader ticket={currentTicket} />

          <TicketDocumentTabs
            subdocuments={liveSubdocs}
            selectedPath={selectedPath}
            folderStack={folderStack}
            onSelect={selectPath}
            ticketCode={currentTicket?.code ?? ''}
          />

          <div data-testid="subdoc-content" className="relative">
            {subdocError && (
              <div data-testid="subdoc-error" className="px-4 py-3 text-sm text-destructive" role="alert">
                {subdocError}
              </div>
            )}
            {!subdocError && isOpen && projectCode && (
              <>
                {(pendingPath || subdocLoading) && (
                  <div data-testid="subdoc-loading" className="absolute inset-0 z-10 flex items-start justify-center pt-8 bg-background/50">
                    <span className="text-muted-foreground text-sm animate-pulse">
                      Loading…
                    </span>
                  </div>
                )}
                <div data-testid="ticket-content" className={pendingPath || subdocLoading ? 'pointer-events-none opacity-50' : ''}>
                  <div className="relative px-4 py-4 sm:px-5">
                    <div className="absolute right-4 top-4 z-[1] sm:right-5">
                      <RelativeTimestamp
                        createdAt={currentTicket.dateCreated}
                        updatedAt={currentTicket.lastModified}
                      />
                    </div>
                    <MarkdownContent
                      markdown={subdocContent}
                      currentProject={projectCode}
                      headerLevelStart={3}
                    />
                  </div>
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
