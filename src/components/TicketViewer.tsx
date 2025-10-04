import React, { useMemo } from 'react';
import { Ticket } from '../types/ticket';
import { Modal, ModalHeader, ModalBody } from './UI/Modal';
import TicketAttributes from './TicketAttributes';
import { TicketCode } from './TicketCode';
import MarkdownRenderer from './shared/MarkdownRenderer';
import { extractTableOfContents } from '../utils/tableOfContents';
import TableOfContents from './shared/TableOfContents';

interface TicketViewerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
}

const TicketViewer: React.FC<TicketViewerProps> = ({ ticket, isOpen, onClose }) => {
  // Extract ToC items from ticket content
  const tocItems = useMemo(() => {
    return ticket?.content ? extractTableOfContents(ticket.content) : [];
  }, [ticket?.content]);

  if (!ticket) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <TableOfContents items={tocItems} />
      <ModalHeader
        title={
          <span>
            <TicketCode code={ticket.code} /> • {ticket.title}
          </span>
        }
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          {/* Ticket Metadata */}
          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <TicketAttributes ticket={ticket} />
          </div>

          {/* Rendered Markdown Content */}
          {isOpen && ticket.content && (
            <MarkdownRenderer
              content={ticket.content}
              headerLevelStart={3}
            />
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default TicketViewer;