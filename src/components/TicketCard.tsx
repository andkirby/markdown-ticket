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
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Backlog':
        return 'bg-gray-100 text-gray-800';
      case 'To Do':
        return 'bg-blue-100 text-blue-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Review':
        return 'bg-purple-100 text-purple-800';
      case 'Done':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div 
      className="ticket-card bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="ticket-title font-semibold text-gray-900 text-sm truncate">{ticket.code}: {ticket.title}</h4>
        <span className="text-xs font-medium text-gray-500 ml-2 flex-shrink-0">
          {ticket.code}
        </span>
      </div>
      
      <p className="ticket-content text-gray-600 text-xs mb-3 line-clamp-2">
        {ticket.content ? ticket.content.substring(0, 100) + '...' : 'No content'}
        {ticket.implementationDate && <><br/>implementationDate: {ticket.implementationDate.toString()}</>}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(ticket.priority)}`}>
            {ticket.priority}
          </span>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
            {ticket.status}
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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