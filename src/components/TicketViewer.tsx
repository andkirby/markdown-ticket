import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Ticket } from '../types/ticket';
import { Modal, ModalHeader, ModalBody } from './UI/Modal';
import TicketAttributes from './TicketAttributes';
import { TicketCode } from './TicketCode';
import MarkdownRenderer from './shared/MarkdownRenderer';
import { extractTableOfContents } from '../utils/tableOfContents';
import TableOfContents from './shared/TableOfContents';
import { useEventBus } from '../services/eventBus';
import { dataLayer } from '../services/dataLayer';

interface TicketViewerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
}

const TicketViewer: React.FC<TicketViewerProps> = ({ ticket, isOpen, onClose }) => {
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

  // Extract ToC items from ticket content
  const tocItems = useMemo(() => {
    return currentTicket?.content ? extractTableOfContents(currentTicket.content, 3) : [];
  }, [currentTicket?.content]);

  if (!currentTicket) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <TableOfContents items={tocItems} />
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
          {isOpen && currentTicket.content && (
            <MarkdownRenderer
              content={currentTicket.content}
              headerLevelStart={3}
            />
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default TicketViewer;