import React from 'react';
import { Ticket } from '../types';

interface TicketAttributesProps {
  ticket: Ticket;
  className?: string;
}

const TicketAttributes: React.FC<TicketAttributesProps> = ({ ticket, className = '' }) => {
  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatArray = (arr: string[]) => {
    return arr.length > 0 ? arr.join(', ') : 'None';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
          <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.status}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Type</dt>
          <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.type}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Priority</dt>
          <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.priority}</dd>
        </div>
        {ticket.phaseEpic && (
          <>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Phase/Epic</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.phaseEpic}</dd>
            </div>
            <div></div>
          </>
        )}
        {ticket.assignee && (
          <>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Assignee</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.assignee}</dd>
            </div>
            <div></div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
          <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.dateCreated)}</dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Modified</dt>
          <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.lastModified)}</dd>
        </div>
        {ticket.implementationDate && (
          <>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Implementation Date</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">{formatDate(ticket.implementationDate)}</dd>
            </div>
            <div></div>
          </>
        )}
      </div>

      {(ticket.relatedTickets.length > 0 || ticket.dependsOn.length > 0 || ticket.blocks.length > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Relationships</h4>
          <div className="space-y-1">
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Related Tickets</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">{formatArray(ticket.relatedTickets)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Depends On</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">{formatArray(ticket.dependsOn)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Blocks</dt>
              <dd className="text-sm text-gray-900 dark:text-gray-100">{formatArray(ticket.blocks)}</dd>
            </div>
          </div>
        </div>
      )}

      {(ticket.description || ticket.rationale || ticket.implementationNotes) && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Details</h4>
          <div className="space-y-2">
            {ticket.description && (
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Description</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.description}</dd>
              </div>
            )}
            {ticket.rationale && (
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Rationale</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.rationale}</dd>
              </div>
            )}
            {ticket.implementationNotes && (
              <div>
                <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Implementation Notes</dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100">{ticket.implementationNotes}</dd>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketAttributes;
