import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Ticket, Status } from '../types';
import { getVisibleColumns, getColumnForStatus } from '../config';
import Column from './Column';
import { Button } from './UI/index';
import { useProjectManager } from '../hooks/useProjectManager';
import { SortControls } from './SortControls';
import { FilterControls } from './FilterControls';
import { HamburgerMenu } from './HamburgerMenu';
import { getSortPreferences, setSortPreferences, SortPreferences } from '../config/sorting';
import { sortTickets } from '../utils/sorting';
import { Project } from '../../shared/models/Project';

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
  const [filterQuery, setFilterQuery] = useState('');
  
  // Only use the hook when no selectedProject prop is provided (multi-project mode)
  const hookData = useProjectManager({
    autoSelectFirst: enableProjectSwitching && !propSelectedProject,
    handleSSEEvents: true // Enable SSE events to refresh project list when new projects are created
  });
  
  // IMPORTANT: Always use hook data for multi-project mode to ensure fresh state
  // Prop data should only be used in single-project mode (when props are explicitly passed)
  const selectedProject = propSelectedProject !== undefined ? propSelectedProject : hookData.selectedProject;
  const baseTickets = propTickets !== undefined ? propTickets : hookData.tickets;
  const loading = propLoading !== undefined ? propLoading : hookData.loading;
  
  // Local state for immediate UI updates during drag-and-drop
  const [localTicketUpdates, setLocalTicketUpdates] = useState<Record<string, Partial<Ticket>>>({});
  
  // Clear optimistic updates when server state matches
  useEffect(() => {
    setLocalTicketUpdates(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      for (const [ticketCode, localUpdate] of Object.entries(prev)) {
        const serverTicket = baseTickets.find(t => t.code === ticketCode);
        if (serverTicket) {
          // Check if server state matches our optimistic update
          const isMatching = Object.entries(localUpdate).every(([key, value]) => 
            serverTicket[key as keyof Ticket] === value
          );
          
          if (isMatching) {
            delete updated[ticketCode];
            hasChanges = true;
          }
        }
      }
      
      return hasChanges ? updated : prev;
    });
  }, [baseTickets]);
  
  // Merge base tickets with local updates for immediate UI feedback
  const tickets = useMemo(() => {
    return baseTickets.map(ticket => ({
      ...ticket,
      ...localTicketUpdates[ticket.code]
    }));
  }, [baseTickets, localTicketUpdates]);
  
  
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
  const updateTicketOptimistic = hookData.updateTicketOptimistic;
  const clearError = hookData.clearError;

  // Save preferences when they change
  const handleSortPreferencesChange = (newPreferences: SortPreferences) => {
    setSortPreferencesState(newPreferences);
    setSortPreferences(newPreferences);
  };
  
  const handleDrop = useCallback((status: Status, ticket: Ticket) => {
    // Skip if ticket is already in the correct status
    if (ticket.status === status) {
      return;
    }
    
    // Extract filename for tracking (matches SSE event format)
    const trackingKey = ticket.filePath ? 
      ticket.filePath.split('/').pop()?.replace('.md', '') || ticket.code : 
      ticket.code;
    
    // Update local state immediately for optimistic UI
    setLocalTicketUpdates(prev => ({
      ...prev,
      [ticket.code]: { status }
    }));
    
    // Send update to backend with tracking key
    const updateData: Partial<Ticket> = { status };
    const updateFunction = onTicketUpdate || updateTicketOptimistic;
    
    // Pass tracking key for optimistic updates
    if (updateFunction === updateTicketOptimistic) {
      updateFunction(ticket.code, updateData, trackingKey);
    } else {
      updateFunction(ticket.code, updateData);
    }
  }, [onTicketUpdate, updateTicketOptimistic]);

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

  // Filter tickets based on search query
  const filteredTickets = React.useMemo(() => {
    if (!filterQuery.trim()) {
      return tickets;
    }

    const searchTerms = filterQuery.toLowerCase().trim().split(/\s+/);
    return tickets.filter(ticket => {
      const title = ticket.title?.toLowerCase() || '';
      const code = ticket.code?.toLowerCase() || '';
      const description = ticket.description?.toLowerCase() || '';

      // Check if all search terms match at least one of: title, code, or description
      return searchTerms.every(term =>
        title.includes(term) ||
        code.includes(term) ||
        description.includes(term)
      );
    });
  }, [tickets, filterQuery]);

  // Group filtered tickets by column with sorting
  const ticketsByColumn: Record<string, Ticket[]> = {};
  const visibleColumns = getVisibleColumns();

  // Initialize with empty arrays
  visibleColumns.forEach((column) => {
    ticketsByColumn[column.label] = [];
  });

  // Group filtered tickets by their column
  filteredTickets.forEach(ticket => {
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
            <FilterControls
              searchQuery={filterQuery}
              onSearchChange={setFilterQuery}
              placeholder="Filter tickets..."
            />
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
              onCounterAPI={() => console.log('Counter API clicked from Board')}
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