import React, { useCallback, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Ticket, Status } from '../types';
import { getVisibleColumns, getColumnForStatus } from '../config';
import Column from './Column';
import { Button } from './UI/index';
import { useMultiProjectData } from '../hooks/useMultiProjectData';
import { SortControls } from './SortControls';
import { HamburgerMenu } from './HamburgerMenu';
import { getSortPreferences, setSortPreferences, SortPreferences } from '../config/sorting';
import { sortTickets } from '../utils/sorting';

interface Project {
  id: string;
  project: {
    name: string;
    path: string;
    configFile: string;
    active: boolean;
    description: string;
  };
  metadata: {
    dateRegistered: string;
    lastAccessed: string;
    version: string;
  };
  tickets?: {
    codePattern?: string;
  };
  autoDiscovered?: boolean;
}

interface BoardProps {
  onTicketClick: (ticket: Ticket) => void;
  onTicketUpdate?: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>;
  enableProjectSwitching?: boolean;
  showHeader?: boolean;
  selectedProject?: Project | null;
  tickets?: Ticket[];
  loading?: boolean;
  sortPreferences?: SortPreferences;
}

// Note: TicketItem removed - drag functionality handled in Column.tsx

const BoardContent: React.FC<BoardProps> = ({ 
  onTicketClick, 
  onTicketUpdate,
  enableProjectSwitching = true, 
  showHeader = true, 
  selectedProject: propSelectedProject,
  tickets: propTickets,
  loading: propLoading,
  sortPreferences: propSortPreferences
}) => {
  const [sortPreferences, setSortPreferencesState] = useState<SortPreferences>(
    propSortPreferences || getSortPreferences
  );
  
  // Only use the hook when no selectedProject prop is provided (multi-project mode)
  const hookData = useMultiProjectData({ autoSelectFirst: enableProjectSwitching });
  
  // IMPORTANT: Always use hook data for multi-project mode to ensure fresh state
  // Prop data should only be used in single-project mode (when props are explicitly passed)
  const selectedProject = propSelectedProject !== undefined ? propSelectedProject : hookData.selectedProject;
  const tickets = propTickets !== undefined ? propTickets : hookData.tickets;
  const loading = propLoading !== undefined ? propLoading : hookData.loading;
  
  
  // IMPORTANT: Always use hookData functions for state management operations
  // This ensures drag-and-drop operations work correctly even when using prop data
  
  // Update sortPreferences when prop changes
  React.useEffect(() => {
    if (propSortPreferences) {
      setSortPreferencesState(propSortPreferences);
    }
  }, [propSortPreferences]);
  
  // Use hook data for project switching functionality
  const projects = hookData.projects;
  const setSelectedProject = hookData.setSelectedProject;
  const error = hookData.error;
  const createTicket = hookData.createTicket;
  const refreshProjectTickets = hookData.refreshTickets;
  const updateTicket = hookData.updateTicket;
  const clearError = hookData.clearError;

  // Save preferences when they change
  const handleSortPreferencesChange = (newPreferences: SortPreferences) => {
    setSortPreferencesState(newPreferences);
    setSortPreferences(newPreferences);
  };
  
  const handleDrop = useCallback(async (status: Status, ticket: Ticket) => {
    // Always allow the drop - remove the status check that was causing issues
    // The backend and file system are the source of truth, not the potentially stale UI state
    
    try {
      // Send only the status - let backend handle implementation fields automatically
      const updateData: Partial<Ticket> = { status };
      
      // Use the appropriate update function based on mode
      const updateFunction = onTicketUpdate || updateTicket;
      await updateFunction(ticket.code, updateData);
    } catch (error) {
      console.error('Board: Failed to move ticket:', error);
    }
  }, [onTicketUpdate, updateTicket]);

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
    // Validate ticket placement
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
  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="text-6xl text-gray-300 mb-4">📋</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Project Selected</h3>
          <p className="text-sm text-gray-600 mb-4">Choose a project from the header to view its change requests.</p>
          {projects.length === 0 && (
            <p className="text-sm text-red-600">No projects found. Make sure projects are properly configured.</p>
          )}
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
    <div className={showHeader ? "p-6 space-y-6 h-full flex flex-col" : "p-2 h-full flex flex-col"}>
      {showHeader && (
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
            <HamburgerMenu 
              onAddProject={() => console.log('Add Project clicked from Board')}
              onEditProject={() => console.log('Edit Project clicked from Board')}
              hasActiveProject={true}
            />
          </div>
        </div>
      )}

      {/* Board Grid - render regardless of showHeader */}
      <div className="board-container flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full overflow-x-auto min-h-0">
        {visibleColumns.map((column) => (
          <Column
            key={column.label}
            column={column}
            tickets={ticketsByColumn[column.label]}
            allTickets={tickets}
            sortAttribute={sortPreferences.selectedAttribute}
            sortDirection={sortPreferences.selectedDirection}
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

const Board: React.FC<BoardProps> = (props) => {
  return (
    <DndProvider backend={HTML5Backend}>
      <BoardContent {...props} />
    </DndProvider>
  );
};

export default Board;