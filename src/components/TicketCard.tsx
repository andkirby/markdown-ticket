import React from 'react';
import { Ticket } from '../types';
import { TicketCode } from './TicketCode';
import TicketAttributes from './TicketAttributes';

interface TicketCardProps {
  ticket: Ticket;
  onMove: (newStatus: string) => void;
  onEdit: () => void;
}

const TicketCard: React.FC<TicketCardProps> = ({ ticket, onEdit }) => {

  return (
    <div 
      className="ticket-card bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onEdit}
      data-testid="ticket-card"
      data-ticket-key={ticket.code}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="ticket-title font-semibold text-gray-900 dark:text-white text-sm">
          <TicketCode code={ticket.code} /> • {ticket.title}
        </h4>
      </div>
      
      <div className="flex items-center justify-between">
        <TicketAttributes ticket={ticket} />
        
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