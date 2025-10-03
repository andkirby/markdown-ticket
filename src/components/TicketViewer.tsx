import React, { useMemo, useEffect } from 'react';
import showdown from 'showdown';
import { Ticket } from '../types/ticket';
import { Modal, ModalHeader, ModalBody } from './UI/Modal';
import TicketAttributes from './TicketAttributes';
import { TicketCode } from './TicketCode';
import { processMermaidBlocks, renderMermaid } from '../utils/mermaid';
import { highlightCodeBlocks, loadPrismTheme } from '../utils/syntaxHighlight';
import { useTheme } from '../hooks/useTheme';

interface TicketViewerProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
}

const TicketViewer: React.FC<TicketViewerProps> = ({ ticket, isOpen, onClose }) => {
  const { theme } = useTheme();

  // Load Prism theme based on current theme
  useEffect(() => {
    loadPrismTheme(theme);
  }, [theme]);

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
    const html = converter.makeHtml(ticket.content);
    const mermaidProcessed = processMermaidBlocks(html);
    return highlightCodeBlocks(mermaidProcessed);
  }, [ticket?.content, converter]);

  useEffect(() => {
    if (isOpen && htmlContent) {
      setTimeout(() => renderMermaid(), 100);
    }
  }, [isOpen, htmlContent]);

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
          <div
            className="prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />


        </div>
      </ModalBody>
    </Modal>
  );
};

export default TicketViewer;