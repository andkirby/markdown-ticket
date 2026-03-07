/**
 * TicketViewer - MDT-093.
 *
 * Composes sub-document navigation, content loading, and realtime sync.
 * - Shows sticky tab navigation when sub-documents exist (BR-3.3, BR-3.4)
 * - Hides tab navigation when no sub-documents (BR-1.5)
 * - Integrates SSE reconciliation (BR-5.1, BR-5.2, BR-5.4)
 * - Shows loading/error states localized to content area (BR-3.1, BR-3.2)
 */

import type { SubDocument } from '@mdt/shared/models/SubDocument.js'
import type { Ticket } from '../../types'
import MarkdownContent from '../MarkdownContent'
import { TicketDocumentTabs } from './TicketDocumentTabs'
import { useTicketDocumentContent } from './useTicketDocumentContent'
import { useTicketDocumentNavigation } from './useTicketDocumentNavigation'
import { useTicketDocumentRealtime } from './useTicketDocumentRealtime'

interface TicketViewerProps {
  ticket: Ticket
  projectId: string
}

export function TicketViewer({ ticket, projectId }: TicketViewerProps) {
  const initialSubdocuments = (ticket as unknown as { subdocuments?: SubDocument[] }).subdocuments ?? []

  const { selectedPath, folderStack, selectPath, pendingPath, confirmPathSwitch } = useTicketDocumentNavigation({
    subdocuments: initialSubdocuments,
    ticketCode: ticket.code,
    projectCode: projectId, // projectId is the project code (e.g., "MDT")
  })

  const { subdocuments } = useTicketDocumentRealtime({
    initialSubdocuments,
    selectedPath,
    onActiveRemoved: () => selectPath('main'),
  })

  const { content, loading, error } = useTicketDocumentContent({
    projectId,
    ticketCode: ticket.code,
    selectedPath,
    mainContent: ticket.content ?? '',
    pendingPath,
    onContentLoaded: confirmPathSwitch,
  })

  return (
    <div className="ticket-viewer flex flex-col h-full">
      <TicketDocumentTabs
        subdocuments={subdocuments}
        selectedPath={selectedPath}
        folderStack={folderStack}
        onSelect={selectPath}
        pendingPath={pendingPath}
      />

      {/* @testid subdoc-content — content area displaying the currently selected sub-document */}
      <div data-testid="subdoc-content" className="ticket-viewer-content flex-1 overflow-auto p-4">
        {pendingPath && !loading && (
          /* @testid subdoc-preloading — initial loading state when tab is clicked */
          <div data-testid="subdoc-preloading" className="text-muted-foreground text-sm">Loading…</div>
        )}
        {!pendingPath && loading && (
          /* @testid subdoc-loading — loading indicator shown while sub-document content is fetching */
          <div data-testid="subdoc-loading" className="text-muted-foreground text-sm">Loading…</div>
        )}
        {error && (
          /* @testid subdoc-error — error message shown when sub-document content fails to load */
          <div data-testid="subdoc-error" className="text-destructive text-sm" role="alert">
            {error}
          </div>
        )}
        {!pendingPath && !loading && !error && (
          <MarkdownContent
            markdown={content}
            currentProject={projectId}
          />
        )}
      </div>
    </div>
  )
}
