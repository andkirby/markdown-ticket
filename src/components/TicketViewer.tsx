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
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-700">
              {ticket.status}
            </span>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 rounded-full border border-green-200 dark:border-green-700">
              {ticket.priority}
            </span>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 rounded-full border border-purple-200 dark:border-purple-700">
              {ticket.type}
            </span>
            {ticket.phaseEpic && (
              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 rounded-full border border-gray-200 dark:border-gray-700">
                {ticket.phaseEpic}
              </span>
            )}
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