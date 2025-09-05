import React from 'react';
import { Ticket } from '../types';

interface TicketCardProps {
  ticket: Ticket;
  onMove: (newStatus: string) => void;
  onEdit: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onEdit }) => {
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
      case 'Backlog':
        return 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200';
      case 'To Do':
        return 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200';
      case 'In Progress':
        return 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200';
      case 'In Review':
        return 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200';
      case 'Done':
        return 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200';
      default:
        return 'bg-gray-100 dark:bg-gray-950 text-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div 
      className="ticket-card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="ticket-title font-semibold text-gray-900 dark:text-white text-sm truncate">{ticket.code}: {ticket.title}</h4>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
          {ticket.code}
        </span>
      </div>
      
      <p className="ticket-content text-gray-600 dark:text-gray-300 text-xs mb-3 line-clamp-2">
        {ticket.content ? ticket.content.substring(0, 100) + '...' : 'No content'}
        {ticket.implementationDate && <><br/>implementationDate: {ticket.implementationDate.toString()}</>}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 flex-wrap">
          <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(ticket.priority)}`}>
            {ticket.priority}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
            {ticket.status}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full border ${getTypeColor(ticket.type || 'Unknown')}`}>
            {ticket.type || 'Unknown'}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title="Edit ticket"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
      
    </div>
  );
};

export default TicketCard;