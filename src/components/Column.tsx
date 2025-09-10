import React, { useEffect, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useDrag } from 'react-dnd';
import { Ticket, Status } from '../types';
import TicketCard from './TicketCard';
import { ResolutionDialog } from './ResolutionDialog';
import { sortTickets } from '../utils/sorting';

interface ColumnProps {
  column: {
    label: string;
    statuses: Status[];
    color: string;
  };
  tickets: Ticket[];
  allTickets: Ticket[]; // All tickets to access deferred ones
  onDrop: (status: Status, ticket: Ticket) => void;
  onTicketEdit: (ticket: Ticket) => void;
  sortAttribute?: string;
  sortDirection?: 'asc' | 'desc';
}

interface StatusToggleProps {
  status: Status;
  isActive: boolean;
  ticketCount: number;
  onToggle: () => void;
  onDrop: (status: Status, ticket: Ticket) => void;
}

const StatusToggle: React.FC<StatusToggleProps> = ({ status, isActive, ticketCount, onToggle, onDrop }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ticket',
    drop: (item: any, _monitor) => {
      onDrop(status, item.ticket);
      return { handled: true }; // Prevent further drop handling
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const getIcon = () => {
    if (status === 'On Hold') return '⏸';
    if (status === 'Rejected') return '✕';
    return '';
  };

  return (
    <button
      ref={drop}
      onClick={onToggle}
      className={`
        flex items-center justify-between px-3 py-2 text-sm rounded-md border transition-all
        ${isActive 
          ? 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300' 
          : 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'
        }
        ${isOver ? 'ring-2 ring-blue-400 bg-blue-50 dark:bg-blue-950/20' : ''}
        hover:bg-opacity-80
      `}
    >
      <span className="flex items-center space-x-1">
        <span>{getIcon()}</span>
        <span>{status}</span>
      </span>
      {ticketCount > 0 && (
        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white/50 dark:bg-black/20">
          {ticketCount}
        </span>
      )}
    </button>
  );
};

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
      // Ticket being dragged
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

const Column: React.FC<ColumnProps> = ({ column, tickets, allTickets, onDrop, onTicketEdit, sortAttribute = 'code', sortDirection = 'desc' }) => {
  const [resolutionDialog, setResolutionDialog] = useState<{
    isOpen: boolean;
    ticket: Ticket | null;
  }>({
    isOpen: false,
    ticket: null,
  });

  // Toggle states for status filters
  const [toggleStates, setToggleStates] = useState<Record<Status, boolean>>({
    'On Hold': false,
    'Rejected': false,
  } as Record<Status, boolean>);

  // Get toggle status for this column
  const getToggleStatus = (): Status | null => {
    if (column.label === 'In Progress') return 'On Hold';
    if (column.label === 'Done') return 'Rejected';
    return null;
  };

  const toggleStatus = getToggleStatus();

  // Filter tickets based on toggle state
  const getVisibleTickets = () => {
    const toggleTickets = allTickets.filter(ticket => ticket.status === toggleStatus);
    
    if (!toggleStatus) return tickets;
    
    const isToggleActive = toggleStates[toggleStatus];
    if (isToggleActive) {
      // Show main tickets (excluding toggle status) + toggle tickets, then sort the combined list
      const mainTickets = tickets.filter(ticket => ticket.status !== toggleStatus);
      const combinedTickets = [...mainTickets, ...toggleTickets];
      return sortTickets(combinedTickets, sortAttribute, sortDirection);
    } else {
      // Show only main tickets, excluding toggle status tickets
      const mainTickets = tickets.filter(ticket => ticket.status !== toggleStatus);
      return mainTickets;
    }
  };

  const visibleTickets = getVisibleTickets();
  const toggleTicketCount = allTickets.filter(ticket => ticket.status === toggleStatus).length;

  const handleToggle = (status: Status) => {
    setToggleStates(prev => ({
      ...prev,
      [status]: !prev[status]
    }));
  };

  const handleToggleDrop = (status: Status, ticket: Ticket) => {
    onDrop(status, ticket);
  };
  const handleDrop = (ticket: Ticket) => {
    // If this is the "Done" column with multiple statuses, show resolution dialog
    if (column.label === 'Done' && column.statuses.length > 1) {
      // Show resolution dialog for Done column
      setResolutionDialog({
        isOpen: true,
        ticket: ticket,
      });
    } else {
      // For other columns, use the first (and usually only) status
      // Direct drop to first status
      onDrop(column.statuses[0], ticket);
    }
  };

  const handleResolutionChoice = (status: Status) => {
    if (resolutionDialog.ticket) {
      // Resolution chosen
      onDrop(status, resolutionDialog.ticket);
    }
    setResolutionDialog({ isOpen: false, ticket: null });
  };

  const handleResolutionCancel = () => {
    // Resolution dialog cancelled
    setResolutionDialog({ isOpen: false, ticket: null });
  };

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'ticket',
    drop: (item: any, monitor) => {
      try {
        const dropResult = monitor.getDropResult();
        if (dropResult && dropResult.handled) {
          // Drop was already handled by a child component (like StatusToggle)
          return;
        }
        handleDrop(item.ticket);
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
      className={`column flex flex-col rounded-lg border-2 transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-700'
      }`}
      style={{ minHeight: '400px' }}
    >
      {/* Column Header */}
      <div className={`p-4 rounded-t-lg ${column.color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="font-semibold text-foreground">{column.label}</h3>
            {/* Status Toggle */}
            {toggleStatus && (
              <StatusToggle
                status={toggleStatus}
                isActive={toggleStates[toggleStatus]}
                ticketCount={toggleTicketCount}
                onToggle={() => handleToggle(toggleStatus)}
                onDrop={handleToggleDrop}
              />
            )}
          </div>
          <span className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full">
            {visibleTickets.length}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div className="column-drop-zone flex-1 p-4 space-y-3 overflow-y-auto" style={{ minHeight: '300px' }}>
        {visibleTickets.map((ticket) => (
          <DraggableTicketCard
            key={ticket.code}
            ticket={ticket}
            onMove={() => {}} // Not needed since drop is handled by column
            onEdit={() => onTicketEdit(ticket)}
          />
        ))}
        
        {visibleTickets.length === 0 && (
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