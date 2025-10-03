import React from 'react';
import { Ticket } from '../types/ticket';
import { Modal, ModalHeader, ModalBody } from './UI/Modal';
import TicketAttributes from './TicketAttributes';
import { TicketCode } from './TicketCode';
import MarkdownRenderer from './shared/MarkdownRenderer';

interface TicketViewerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
}

const TicketViewer: React.FC<TicketViewerProps> = ({ ticket, isOpen, onClose }) => {
  if (!ticket) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
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