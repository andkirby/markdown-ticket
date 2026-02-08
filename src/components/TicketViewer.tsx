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
import { Modal, ModalBody, ModalHeader } from './UI/Modal'

interface TicketViewerProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
}

const TicketViewer: React.FC<TicketViewerProps> = ({ ticket, isOpen, onClose }) => {
  const { projectCode } = useParams<{ projectCode: string }>()
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(ticket)

  // Update internal state when prop changes
  useEffect(() => {
    const timeoutId = setTimeout(() => setCurrentTicket(ticket), 0)
    return () => clearTimeout(timeoutId)
  }, [ticket])

  // Listen for real-time updates to this specific ticket
  useEventBus('ticket:updated', useCallback(async (event) => {
    const updatedTicket = event.payload.ticket
    if (!updatedTicket) {
      return
    }

    setCurrentTicket((prev) => {
      if (prev && prev.code === updatedTicket.code) {
        // Fetch complete ticket data including content
        dataLayer.fetchTicket(event.payload.projectId, updatedTicket.code)
          .then((fullTicket) => {
            if (fullTicket) {
              setCurrentTicket(fullTicket)
            }
          })
          .catch(err => console.error('Failed to fetch updated ticket:', err))
        return prev // Keep current ticket while fetching
      }
      return prev
    })
  }, []))

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

  if (!currentTicket)
    return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <TableOfContents items={tocItems} view="ticket" />
      <ModalHeader
        title={(
          <span>
            <TicketCode code={currentTicket.code} />
            {' '}
            •
            {currentTicket.title}
          </span>
        )}
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          {/* Ticket Metadata */}
          <div className="p-5 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <TicketAttributes ticket={currentTicket} />
          </div>

          {/* Rendered Markdown Content */}
          {isOpen && processedContent && projectCode && (
            <MarkdownContent
              markdown={processedContent}
              currentProject={projectCode}
              headerLevelStart={3}
            />
          )}
        </div>
      </ModalBody>
    </Modal>
  )
}

export default TicketViewer
