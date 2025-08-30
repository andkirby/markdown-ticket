import React, { useState } from 'react';
import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { Ticket } from '../types';
import TicketCard from './TicketCard';

interface ColumnProps {
  column: {
    label: string;
    status: string;
    color: string;
  };
  tickets: Ticket[];
  onDrop: (status: string, ticket: Ticket) => void;
  onTicketEdit: (ticket: Ticket) => void;
}

interface DraggableTicketCardProps {
  ticket: Ticket;
  onMove: (newStatus: string) => void;
  onEdit: () => void;
}

const DraggableTicketCard: React.FC<DraggableTicketCardProps> = ({ ticket, onMove, onEdit }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'ticket',
    item: { ticket },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      <TicketCard ticket={ticket} onMove={onMove} onEdit={onEdit} />
    </div>
  );
};

const Column: React.FC<ColumnProps> = ({ column, tickets, onDrop, onTicketEdit }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ticket',
    drop: (item: any) => {
      console.log('Dropped ticket:', item.ticket, 'on column:', column.status);
      onDrop(column.status, item.ticket);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

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

  return (
    <div
      ref={drop}
      className={`flex flex-col rounded-lg border-2 ${
        isOver ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
      }`}
      style={{ minHeight: '400px' }}
    >
      {/* Column Header */}
      <div className={`p-4 rounded-t-lg ${column.color}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{column.label}</h3>
          <span className="bg-white bg-opacity-20 text-white text-xs px-2 py-1 rounded-full">
            {tickets.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto" style={{ minHeight: '300px' }}>
        {tickets.map((ticket) => (
          <DraggableTicketCard
            key={ticket.code}
            ticket={ticket}
            onMove={() => {}} // Not needed since drop is handled by column
            onEdit={() => onTicketEdit(ticket)}
          />
        ))}
        
        {tickets.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <p className="text-sm">No tickets</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Column;