import React, { useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Ticket, Status } from '../types';
import { getVisibleColumns, getColumnForStatus } from '../config';
import Column from './Column';
import { Button } from './UI/index';
import { useMultiProjectData } from '../hooks/useMultiProjectData';

interface BoardProps {
  onTicketClick: (ticket: Ticket) => void;
  enableProjectSwitching?: boolean;
}

// Note: TicketItem removed - drag functionality handled in Column.tsx

const BoardContent: React.FC<BoardProps> = ({ onTicketClick, enableProjectSwitching = true }) => {
  const { 
    projects, 
    selectedProject, 
    setSelectedProject, 
    projectConfig,
    tickets, 
    loading, 
    error, 
    createTicket, 
    refreshTickets: refreshProjectTickets, 
    updateTicket,
    generateNextTicketCode,
    clearError
  } = useMultiProjectData({ autoSelectFirst: true });
  
  const handleDrop = useCallback(async (status: Status, ticket: Ticket) => {
    console.log('Board: handleDrop called with:', { status, ticketCode: ticket.code, ticketStatus: ticket.status });
    
    try {
      // Use direct updateTicket to ensure immediate UI state update
      await updateTicket(ticket.code, { status });
      console.log('Board: Ticket moved successfully');
      
      // Auto-set implementation date when status changes to "Implemented"
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
      await refreshProjectTickets();
    }
  }, [updateTicket, refreshProjectTickets]);

  const handleTicketCreate = useCallback(async () => {
    if (!selectedProject) {
      console.error('No project selected');
      return;
    }
    
    try {
      // Ticket code will be auto-generated based on project configuration
      await createTicket('New Change Request', 'Feature Enhancement');
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  }, [selectedProject, createTicket]);

  const handleTicketEdit = useCallback((ticket: Ticket) => {
    onTicketClick(ticket);
  }, [onTicketClick]);

  const handleRefresh = useCallback(async () => {
    try {
      await refreshProjectTickets();
    } catch (error) {
      console.error('Failed to refresh tickets:', error);
    }
  }, [refreshProjectTickets]);

  // Group tickets by column
  const ticketsByColumn: Record<string, Ticket[]> = {};
  const visibleColumns = getVisibleColumns();

  // Initialize with empty arrays
  visibleColumns.forEach((column) => {
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

  // Check for duplicate tickets by code and log warnings
  const ticketCodes = new Set<string>();
  let hasDuplicates = false;
  tickets.forEach(ticket => {
    console.log(`Ticket ${ticket.code}: status=${ticket.status}, column=${getColumnForStatus(ticket.status as Status).label}`);
    if (ticketCodes.has(ticket.code)) {
      console.error(`WARNING: Duplicate ticket found: ${ticket.code} with status ${ticket.status}`);
      hasDuplicates = true;
    } else {
      ticketCodes.add(ticket.code);
    }
  });

  if (hasDuplicates) {
    console.error('DUPLICATE TICKETS DETECTED: This may cause React key conflicts');
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-6">
        <div className="flex items-center space-x-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-lg text-gray-600">
            {projects.length === 0 ? 'Loading projects...' : 'Loading tickets...'}
          </div>
        </div>
      </div>
    );
  }

  // Show no project selected state
  if (enableProjectSwitching && !selectedProject) {
    return (
      <div className="p-6 space-y-6">
        {/* Header with project selector */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-4 mb-2">
              <h1 className="text-2xl font-bold text-gray-800">Change Request Board</h1>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Project:</label>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const project = projects.find(p => p.id === e.target.value);
                    setSelectedProject(project || null);
                    clearError();
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.project.name} ({project.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-600 font-normal">
              Select a project to view and manage change requests
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <div className="text-6xl text-gray-300 mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
            <p className="text-sm text-gray-600 mb-4">Choose a project from the dropdown above to view its change requests.</p>
            {projects.length === 0 && (
              <p className="text-sm text-red-600">No projects found. Make sure projects are properly configured.</p>
            )}
          </div>
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
        <div className="flex-1">
          <div className="flex items-center space-x-4 mb-2">
            <h1 className="text-2xl font-bold text-gray-800">Change Request Board</h1>
            {enableProjectSwitching && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Project:</label>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const project = projects.find(p => p.id === e.target.value);
                    setSelectedProject(project || null);
                    clearError();
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="">Select a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.project.name} ({project.id})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 font-normal">
            {selectedProject ? 
              `Track and manage change requests for ${selectedProject.project.name}` :
              'Select a project to view and manage change requests'
            }
          </p>
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
            disabled={!selectedProject}
          >
            Add Ticket
          </Button>
        </div>
      </div>

      {/* Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full overflow-x-auto">
        {visibleColumns.map((column) => (
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