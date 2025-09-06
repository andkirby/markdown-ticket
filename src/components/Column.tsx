import React, { useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { Ticket, Status } from '../types';
import TicketCard from './TicketCard';
import { ResolutionDialog } from './ResolutionDialog';

interface ColumnProps {
  column: {
    label: string;
    statuses: Status[];
    color: string;
  };
  tickets: Ticket[];
  onDrop: (status: Status, ticket: Ticket) => void;
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

  // Monitor drag state changes for debugging
  useEffect(() => {
    if (isDragging) {
      console.log('Drag: Ticket', ticket.code, 'is being dragged');
    }
  }, [isDragging, ticket.code]);

  return (
    <div
      ref={drag}
      className={`draggable-ticket ${isDragging ? 'dragging' : ''}`}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
      data-testid="ticket-card"
      data-ticket-key={ticket.code}
    >
      <TicketCard ticket={ticket} onMove={onMove} onEdit={onEdit} />
    </div>
  );
};

const Column: React.FC<ColumnProps> = ({ column, tickets, onDrop, onTicketEdit }) => {
  const [resolutionDialog, setResolutionDialog] = useState<{
    isOpen: boolean;
    ticket: Ticket | null;
  }>({
    isOpen: false,
    ticket: null,
  });

  const handleDrop = (ticket: Ticket) => {
    // If this is the "Done" column with multiple statuses, show resolution dialog
    if (column.label === 'Done' && column.statuses.length > 1) {
      console.log('Column: Showing resolution dialog for Done column');
      setResolutionDialog({
        isOpen: true,
        ticket: ticket,
      });
    } else {
      // For other columns, use the first (and usually only) status
      console.log('Column: Direct drop to', column.statuses[0]);
      onDrop(column.statuses[0], ticket);
    }
  };

  const handleResolutionChoice = (status: Status) => {
    if (resolutionDialog.ticket) {
      console.log('Column: Resolution chosen:', status);
      onDrop(status, resolutionDialog.ticket);
    }
    setResolutionDialog({ isOpen: false, ticket: null });
  };

  const handleResolutionCancel = () => {
    console.log('Column: Resolution dialog cancelled');
    setResolutionDialog({ isOpen: false, ticket: null });
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ticket',
    drop: (item: any) => {
      console.log('Column: Drop event triggered');
      console.log('Column: Dropped ticket:', item.ticket);
      console.log('Column: Target column:', column.label, 'with statuses:', column.statuses);

      try {
        handleDrop(item.ticket);
        console.log('Column: Drop handling completed');
      } catch (error) {
        console.error('Column: Error in drop handler:', error);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));


  return (
    <div
      ref={drop}
      className={`column flex flex-col rounded-lg border-2 ${
        isOver ? 'border-primary-400 bg-primary-50 drag-over' : 'border-gray-200'
      }`}
      style={{ minHeight: '400px' }}
    >
      {/* Column Header */}
      <div className={`p-4 rounded-t-lg ${column.color}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">{column.label}</h3>
          <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">
            {tickets.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="column-drop-zone flex-1 p-4 space-y-3 overflow-y-auto" style={{ minHeight: '300px' }}>
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

      {/* Resolution Dialog for Done column */}
      {resolutionDialog.ticket && (
        <ResolutionDialog
          isOpen={resolutionDialog.isOpen}
          ticketCode={resolutionDialog.ticket.code}
          ticketTitle={resolutionDialog.ticket.title}
          availableStatuses={column.statuses}
          onResolve={handleResolutionChoice}
          onCancel={handleResolutionCancel}
        />
      )}
    </div>
  );
};

export default Column;