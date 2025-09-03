import React, { useState, useCallback } from 'react';
import { DndProvider, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Ticket, Status } from '../types';
import { BOARD_COLUMNS, getVisibleColumns, getColumnForStatus } from '../config';
import Column from './Column';
import TicketCard from './TicketCard';
import { Button } from './UI/index';
import { useTicketData, useTicketStatusAutomation } from '../hooks/useTicketData';

interface BoardProps {
  onTicketClick: (ticket: Ticket) => void;
}

interface TicketItemProps {
  ticket: Ticket;
  index: number;
  onMove: (newStatus: Status) => void;
  onEdit: () => void;
}

// Note: Drag functionality is now handled in Column.tsx with DraggableTicketCard
// This component is kept for compatibility but doesn't handle drag anymore
const TicketItem: React.FC<TicketItemProps> = ({ ticket, index, onMove, onEdit }) => {
  return (
    <div>
      <TicketCard ticket={ticket} onMove={(newStatus: string) => onMove(newStatus as Status)} onEdit={onEdit} />
    </div>
  );
};

const BoardContent: React.FC<BoardProps> = ({ onTicketClick }) => {
  const { tickets, loading, error, createTicket, refreshTickets, updateTicket } = useTicketData({
    autoRefresh: true,
    pollingInterval: 5000,
    enableFileWatcher: true
  });
  
  const { moveTicket } = useTicketStatusAutomation();
  
  const handleDrop = useCallback(async (status: Status, ticket: Ticket) => {
    console.log('Board: handleDrop called with:', { status, ticketCode: ticket.code, ticketStatus: ticket.status });
    
    try {
      // Use direct updateTicket to ensure immediate UI state update
      await updateTicket(ticket.code, { status });
      console.log('Board: Ticket moved successfully');
      
      // Auto-set implementation date when status changes to "Implemented" (replicate moveTicket logic)
      if (status === 'Implemented' || status === 'Partially Implemented') {
        await updateTicket(ticket.code, {
          implementationDate: new Date(),
          implementationNotes: `Status changed to ${status} on ${new Date().toLocaleDateString()}`
        });
        console.log('Board: Implementation date set');
      }
    } catch (error) {
      console.error('Board: Failed to move ticket:', error);
      // Refresh to ensure UI is in sync with backend
      await refreshTickets();
    }
  }, [updateTicket, refreshTickets]);

  const handleTicketCreate = useCallback(async () => {
    try {
      // Generate a unique ticket code
      const ticketCode = `CR-${String(tickets.length + 1).padStart(3, '0')}`;
      await createTicket(ticketCode, 'New Change Request', 'Feature Enhancement');
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  }, [tickets.length, createTicket]);

  const handleTicketEdit = useCallback((ticket: Ticket) => {
    onTicketClick(ticket);
  }, [onTicketClick]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshTickets();
    } catch (error) {
      console.error('Failed to refresh tickets:', error);
    }
  }, [refreshTickets]);

  // Group tickets by column
  const ticketsByColumn: Record<string, Ticket[]> = {};
  const visibleColumns = getVisibleColumns();

  // Initialize with empty arrays
  visibleColumns.forEach((column: any) => {
    ticketsByColumn[column.label] = [];
  });

  // Group tickets by their column
  tickets.forEach(ticket => {
    const column = getColumnForStatus(ticket.status as Status);
    if (ticketsByColumn[column.label]) {
      ticketsByColumn[column.label].push(ticket);
    } else {
      // Handle unknown status - put in backlog
      ticketsByColumn['Backlog'].push(ticket);
    }
  });

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-lg text-gray-600">Loading tickets...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 text-md font-medium mb-2">Error loading tickets</div>
          <div className="text-red-600 mb-4">{error.message}</div>
          <Button 
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Change Request Board</h1>
          <p className="text-sm text-gray-600 font-normal">Track and manage your change requests</p>
        </div>
        <div className="flex space-x-4">
          <Button 
            onClick={handleRefresh}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
          >
            Refresh
          </Button>
          <Button 
            onClick={handleTicketCreate}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-lg"
          >
            Add Ticket
          </Button>
        </div>
      </div>

      {/* Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full overflow-x-auto">
        {visibleColumns.map((column: any) => (
          <Column
            key={column.label}
            column={column}
            tickets={ticketsByColumn[column.label]}
            onDrop={(status: string, ticket: Ticket) => {
              console.log('Board: Column onDrop called with:', { status, ticketCode: ticket.code });
              handleDrop(status as Status, ticket);
            }}
            onTicketEdit={handleTicketEdit}
          />
        ))}
      </div>
    </div>
  );
};

const Board: React.FC<BoardProps> = ({ onTicketClick }) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <BoardContent onTicketClick={onTicketClick} />
    </DndProvider>
  );
};

export default Board;