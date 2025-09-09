import React from 'react';
import { Ticket } from '../types';

interface TicketAttributeTagsProps {
  ticket: Ticket;
  className?: string;
}

const TicketAttributeTags: React.FC<TicketAttributeTagsProps> = ({ ticket, className = '' }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      case 'Medium':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
      case 'Low':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      default:
        return 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Bug Fix':
        return 'bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700';
      case 'Feature Enhancement':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'Technical Debt':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700';
      case 'Architecture':
        return 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700';
      case 'Documentation':
        return 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-700';
      default:
        return 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Proposed':
        return 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
      case 'Approved':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
      case 'In Progress':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700';
      case 'Implemented':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
      case 'Rejected':
        return 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
      default:
        return 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(ticket.status)}`}>
        {ticket.status}
      </span>
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(ticket.priority)}`}>
        {ticket.priority}
      </span>
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor(ticket.type || 'Unknown')}`}>
        {ticket.type || 'Unknown'}
      </span>
      {ticket.phaseEpic && (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200 rounded-full border border-gray-200 dark:border-gray-700">
          {ticket.phaseEpic}
        </span>
      )}
      {ticket.relatedTickets && ticket.relatedTickets.length > 0 && (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-200 rounded-full border border-cyan-200 dark:border-cyan-700" title={`Related: ${ticket.relatedTickets.join(', ')}`}>
          🔗 {ticket.relatedTickets.join(', ')}
        </span>
      )}
      {ticket.dependsOn && ticket.dependsOn.length > 0 && (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 rounded-full border border-amber-200 dark:border-amber-700" title={`Depends on: ${ticket.dependsOn.join(', ')}`}>
          ⬅️ {ticket.dependsOn.join(', ')}
        </span>
      )}
      {ticket.blocks && ticket.blocks.length > 0 && (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 rounded-full border border-rose-200 dark:border-rose-700" title={`Blocks: ${ticket.blocks.join(', ')}`}>
          ➡️ {ticket.blocks.join(', ')}
        </span>
      )}
    </div>
  );
};

export default TicketAttributeTags;
