import React, { useCallback, useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Ticket, Status } from '../types';
import { getVisibleColumns, getColumnForStatus } from '../config';
import Column from './Column';
import { Button } from './UI/index';
import { useMultiProjectData } from '../hooks/useMultiProjectData';
import { SortControls } from './SortControls';
import { getSortPreferences, setSortPreferences, SortPreferences } from '../config/sorting';
import { sortTickets } from '../utils/sorting';

interface BoardProps {
  onTicketClick: (ticket: Ticket) => void;
  enableProjectSwitching?: boolean;
  showHeader?: boolean;
}

// Note: TicketItem removed - drag functionality handled in Column.tsx

const BoardContent: React.FC<BoardProps> = ({ onTicketClick, enableProjectSwitching = true, showHeader = true }) => {
  const [sortPreferences, setSortPreferencesState] = useState<SortPreferences>(getSortPreferences);
  
  const {
    projects,
    selectedProject,
    setSelectedProject,
    // projectConfig, // TODO: Implement project config usage
    tickets,
    loading,
    error,
    createTicket,
    refreshTickets: refreshProjectTickets,
    updateTicket,
    // generateNextTicketCode, // TODO: Implement ticket code generation
    clearError
  } = useMultiProjectData({ autoSelectFirst: true });

  // Save preferences when they change
  const handleSortPreferencesChange = (newPreferences: SortPreferences) => {
    setSortPreferencesState(newPreferences);
    setSortPreferences(newPreferences);
  };
  
  const handleDrop = useCallback(async (status: Status, ticket: Ticket) => {
    console.log('Board: handleDrop called with:', { status, ticketKey: ticket.code, ticketStatus: ticket.status });

    // Don't process if status is the same
    if (ticket.status === status) {
      console.log('Board: No status change needed');
      return;
    }

    try {
      // Use direct updateTicket to ensure immediate UI state update
      console.log('Board: Starting updateTicket call...');
      
      // Send only the status - let backend handle implementation fields automatically
      const updateData: Partial<Ticket> = { status };
      
      const result = await updateTicket(ticket.code, updateData);
      console.log('Board: updateTicket completed, result:', result);
      console.log('Board: Ticket moved successfully');
    } catch (error) {
      console.error('Board: Failed to move ticket:', error);
      // Refresh to ensure UI is in sync with backend
      console.log('Board: Refreshing tickets after error...');
      await refreshProjectTickets();
      console.log('Board: Refresh completed');
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

  // Group tickets by column with sorting
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

  // Sort tickets in each column
  Object.keys(ticketsByColumn).forEach(columnLabel => {
    ticketsByColumn[columnLabel] = sortTickets(
      ticketsByColumn[columnLabel],
      sortPreferences.selectedAttribute,
      sortPreferences.selectedDirection
    );
  });

  // Check for duplicate tickets by key and log warnings
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <div className="text-lg text-muted-foreground">
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
              <h1 className="text-2xl font-bold text-foreground">Change Request Board</h1>
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-muted-foreground">Project:</label>
                <div className="flex gap-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        clearError();
                      }}
                      className="h-12 px-3 py-1 border border-border rounded-md text-center transition-colors bg-background hover:bg-muted cursor-pointer"
                    >
                      <div className="text-sm font-medium">{project.id}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-20">{project.project.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-normal">
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
            variant="secondary"
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
            <h1 className="text-2xl font-bold text-foreground">Change Request Board</h1>
            {enableProjectSwitching && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-muted-foreground">Project:</label>
                <div className="flex gap-2">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProject(project);
                        clearError();
                      }}
                      disabled={loading}
                      className={`h-12 px-3 py-1 border rounded-md text-center transition-colors ${
                        selectedProject?.id === project.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border hover:bg-muted'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="text-sm font-medium">{project.id}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-20">{project.project.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-normal">
            {selectedProject ?
              `Track and manage change requests for ${selectedProject.project.name}` :
              'Select a project to view and manage change requests'
            }
          </p>
        </div>
        <div className="flex space-x-4">
          <SortControls
            preferences={sortPreferences}
            onPreferencesChange={handleSortPreferencesChange}
          />
          <Button
            onClick={handleRefresh}
            variant="secondary"
          >
            Refresh
          </Button>
          <Button
            onClick={handleTicketCreate}
            className="btn btn-primary btn-lg"
            disabled={!selectedProject}
          >
            Create
          </Button>
        </div>
      </div>

      {/* Board Grid */}
      <div className="board-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full overflow-x-auto">
        {visibleColumns.map((column) => (
          <Column
            key={column.label}
            column={column}
            tickets={ticketsByColumn[column.label]}
            onDrop={(status: Status, ticket: Ticket) => {
              console.log('Board: Column onDrop called with:', { status, ticketKey: ticket.code });
              handleDrop(status, ticket);
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