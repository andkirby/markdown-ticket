import React, { useMemo } from 'react';
import showdown from 'showdown';
import { Ticket } from '../types/ticket';
import { Modal, ModalHeader, ModalBody } from './UI/Modal';
import TicketAttributes from './TicketAttributes';

interface TicketViewerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
}

const TicketViewer: React.FC<TicketViewerProps> = ({ ticket, isOpen, onClose }) => {
  const converter = useMemo(() => {
    return new showdown.Converter({
      tables: true,
      tasklists: true,
      ghCodeBlocks: true,
      simpleLineBreaks: true,
      headerLevelStart: 3, // Start headers from h3 to avoid conflicts with modal title
      ghCompatibleHeaderId: true,
    });
  }, []);

  const htmlContent = useMemo(() => {
    if (!ticket?.content) return '';
    return converter.makeHtml(ticket.content);
  }, [ticket?.content, converter]);

  if (!ticket) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalHeader
        title={ticket.title}
        description={`${ticket.code} • ${ticket.type} • ${ticket.priority} Priority`}
        onClose={onClose}
      />
      <ModalBody>
        <div className="space-y-4">
          {/* Ticket Metadata */}
          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <TicketAttributes ticket={ticket} />
          </div>

          {/* Rendered Markdown Content */}
          <div
            className="prose prose-sm max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-strong:text-gray-900 dark:prose-strong:text-gray-100 prose-code:bg-gray-100 dark:prose-code:bg-slate-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-gray-900 dark:prose-code:text-gray-100 prose-pre:bg-gray-100 dark:prose-pre:bg-slate-800 prose-pre:border dark:prose-pre:border-slate-700 prose-blockquote:text-gray-700 dark:prose-blockquote:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-ol:text-gray-700 dark:prose-ol:text-gray-300 prose-ul:text-gray-700 dark:prose-ul:text-gray-300"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Additional Information */}
          {(ticket.implementationDate || ticket.implementationNotes) && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Implementation Details</h4>
              {ticket.implementationDate && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-gray-100">Implementation Date:</strong> {ticket.implementationDate.toLocaleDateString()}
                </p>
              )}
              {ticket.implementationNotes && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  <strong>Notes:</strong> {ticket.implementationNotes}
                </p>
              )}
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
};

export default TicketViewer;