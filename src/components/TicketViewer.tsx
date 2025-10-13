import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Ticket } from '../types/ticket';
import { Modal, ModalHeader, ModalBody } from './UI/Modal';
import TicketAttributes from './TicketAttributes';
import { TicketCode } from './TicketCode';
import MarkdownContent from './MarkdownContent';
import { extractTableOfContents } from '../utils/tableOfContents';
import TableOfContents from './shared/TableOfContents';
import { useEventBus } from '../services/eventBus';
import { dataLayer } from '../services/dataLayer';
import { processContentForDisplay } from '../utils/titleExtraction';

interface TicketViewerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
}

const TicketViewer: React.FC<TicketViewerProps> = ({ ticket, isOpen, onClose }) => {
  const { projectCode } = useParams<{ projectCode: string }>();
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(ticket);

  // Update internal state when prop changes
  useEffect(() => {
    setCurrentTicket(ticket);
  }, [ticket]);

  // Listen for real-time updates to this specific ticket
  useEventBus('ticket:updated', useCallback(async (event) => {
    if (event.payload.ticket) {
      setCurrentTicket(prev => {
        if (prev && prev.code === event.payload.ticket.code) {
          // Fetch complete ticket data including content
          dataLayer.fetchTicket(event.payload.projectId, event.payload.ticket.code)
            .then(fullTicket => {
              if (fullTicket) {
                setCurrentTicket(fullTicket);
              }
            })
            .catch(err => console.error('Failed to fetch updated ticket:', err));
          return prev; // Keep current ticket while fetching
        }
        return prev;
      });
    }
  }, []));

  // MDT-064: Process content to hide H1 headers and extract title
  const processedContent = useMemo(() => {
    if (!currentTicket?.content) return '';

    // Process content to remove additional H1 headers (keep only first, then skip it)
    return processContentForDisplay(currentTicket.content);
  }, [currentTicket?.content]);

  // Extract ToC items from processed content
  const tocItems = useMemo(() => {
    return processedContent ? extractTableOfContents(processedContent, 3) : [];
  }, [processedContent]);

  if (!currentTicket) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <TableOfContents items={tocItems} view="ticket" />
      <ModalHeader
        title={
          <span>
            <TicketCode code={currentTicket.code} /> • {currentTicket.title}
          </span>
        }
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          {/* Ticket Metadata */}
          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
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
  );
};

export default TicketViewer;