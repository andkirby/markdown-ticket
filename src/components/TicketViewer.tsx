import React, { useMemo } from 'react';
import showdown from 'showdown';
import { Ticket } from '../types/ticket';
import { Modal, ModalHeader, ModalBody } from './UI/Modal';

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
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {ticket.status}
            </span>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
              {ticket.priority}
            </span>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
              {ticket.type}
            </span>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
              {ticket.phaseEpic}
            </span>
          </div>

          {/* Rendered Markdown Content */}
          <div 
            className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-100 prose-pre:border"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Additional Information */}
          {(ticket.implementationDate || ticket.implementationNotes) && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Implementation Details</h4>
              {ticket.implementationDate && (
                <p className="text-sm text-gray-600">
                  <strong>Implementation Date:</strong> {ticket.implementationDate.toLocaleDateString()}
                </p>
              )}
              {ticket.implementationNotes && (
                <p className="text-sm text-gray-600 mt-1">
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