import { useState, useCallback, useRef, useEffect } from 'react';
import Board from './Board';
import { DocumentsLayout } from './DocumentsView';
import { DuplicateResolver } from './DuplicateResolver';
import { CounterAPI } from './CounterAPI';
import { Ticket } from '../types';
import { SecondaryHeader } from './SecondaryHeader';
import { AddProjectModal } from './AddProjectModal';
import { getSortPreferences, setSortPreferences, SortPreferences } from '../config/sorting';
import { sortTickets } from '../utils/sorting';
import { TicketCode } from './TicketCode';
import { getProjectCode } from './ProjectSelector';
import { Project } from '../../shared/models/Project';

type ViewMode = 'board' | 'list' | 'documents';

const VIEW_MODE_KEY = 'single-project-view-mode';

interface ProjectViewProps {
  onTicketClick: (ticket: Ticket) => void;
  selectedProject: Project | null;
  tickets?: Ticket[];
  updateTicketOptimistic?: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>;
  onAddProject?: () => void;
  viewMode?: ViewMode;
  refreshProjects?: () => Promise<void>;
}

export default function ProjectView({ onTicketClick, selectedProject, tickets: propTickets, updateTicketOptimistic, onAddProject, viewMode: externalViewMode, refreshProjects }: ProjectViewProps) {
  // Use external viewMode if provided, otherwise fall back to internal state
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    const validModes: ViewMode[] = ['board', 'list', 'documents'];
    return (saved && validModes.includes(saved as ViewMode)) 
      ? (saved as ViewMode) 
      : 'board';
  });
  
  const viewMode = externalViewMode || internalViewMode;

  const [sortPreferences, setSortPreferencesState] = useState<SortPreferences>(getSortPreferences);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCounterAPIModal, setShowCounterAPIModal] = useState(false);
  const [showDuplicateResolver, setShowDuplicateResolver] = useState(false);

  // Use ref to prevent stale closure bug when switching projects
  const selectedProjectRef = useRef<Project | null>(selectedProject);

  useEffect(() => {
    selectedProjectRef.current = selectedProject;
  }, [selectedProject]);

  const handleViewModeChange = (mode: ViewMode) => {
    setInternalViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const handleSortPreferencesChange = useCallback((newPreferences: SortPreferences) => {
    setSortPreferencesState(newPreferences);
    setSortPreferences(newPreferences);
  }, []);

  const handleTicketUpdate = useCallback(async (ticketCode: string, updates: Partial<Ticket>) => {
    const currentProject = selectedProjectRef.current;
    if (!currentProject) {
      throw new Error('No project selected');
    }

    try {
      const response = await fetch(`/api/projects/${currentProject.id}/crs/${ticketCode}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update ticket: ${response.statusText}`);
      }

      const updatedTicket = await response.json();

      // Ticket updates are now handled by SSE events automatically

      return updatedTicket;
    } catch (error) {
      console.error('Failed to update ticket:', error);
      throw error;
    }
  }, []); // Removed selectedProject from deps - using ref instead

  const handleCreateTicket = useCallback(async () => {
    const currentProject = selectedProjectRef.current;
    if (!currentProject) {
      console.error('No project selected');
      return;
    }

    try {
      const response = await fetch(`/api/projects/${currentProject.id}/crs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Change Request',
          type: 'Feature Enhancement',
          status: 'Proposed'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create ticket: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Created ticket:', result);

      // Tickets will be updated via SSE events automatically
    } catch (error) {
      console.error('Failed to create ticket:', error);
    }
  }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 py-3 border-b border-border">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            {selectedProject?.project.name || 'Board View'}
          </h1>
          <div className="flex items-center space-x-4">
            <SecondaryHeader
              viewMode={viewMode}
              sortPreferences={(viewMode === 'board' || viewMode === 'list') ? sortPreferences : undefined}
              onSortPreferencesChange={(viewMode === 'board' || viewMode === 'list') ? handleSortPreferencesChange : undefined}
              onAddProject={() => setShowAddProjectModal(true)}
              onEditProject={() => setShowEditProjectModal(true)}
              onCounterAPI={() => setShowCounterAPIModal(true)}
              selectedProject={selectedProject}
              onCreateTicket={handleCreateTicket}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' ? (
          <Board 
            onTicketClick={onTicketClick} 
            onTicketUpdate={updateTicketOptimistic || handleTicketUpdate}
            showHeader={false} 
            enableProjectSwitching={false}
            selectedProject={selectedProject}
            tickets={propTickets || []}
            loading={loading}
            sortPreferences={sortPreferences}
          />
        ) : viewMode === 'list' ? (
          <div className="h-full overflow-auto p-6">
            <div className="space-y-2">
              {sortTickets(propTickets || [], sortPreferences.selectedAttribute, sortPreferences.selectedDirection).map((ticket) => (
                <div
                  key={ticket.code}
                  onClick={() => onTicketClick(ticket)}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <TicketCode code={ticket.code} />
                      <span className="font-medium">{ticket.title}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      ticket.status === 'Proposed' ? 'bg-blue-100 text-blue-800' :
                      ticket.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      ticket.status === 'Implemented' ? 'bg-purple-100 text-purple-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {ticket.status}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {ticket.lastModified ? new Date(ticket.lastModified).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : viewMode === 'documents' ? (
          selectedProject ? (
            <DocumentsLayout projectId={selectedProject.id} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No project selected
            </div>
          )
        ) : null}
      </div>
      
      {/* Counter API Modal */}
      {showCounterAPIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto m-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Counter API</h2>
              <button
                onClick={() => setShowCounterAPIModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <CounterAPI />
            </div>
          </div>
        </div>
      )}
      
      {/* Duplicate Resolver Modal */}
      {showDuplicateResolver && selectedProject && (
        <DuplicateResolver
          projectId={selectedProject.id}
          onResolved={() => {
            setShowDuplicateResolver(false);
            // Ticket updates are now handled by SSE events automatically
          }}
        />
      )}

      <AddProjectModal
        isOpen={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        onProjectCreated={() => {
          setShowAddProjectModal(false);
          // Optionally refresh projects or show success message
        }}
      />

      {selectedProject && (
        <AddProjectModal
          isOpen={showEditProjectModal}
          onClose={() => setShowEditProjectModal(false)}
          onProjectCreated={async () => {
            console.log('Edit project onProjectCreated called');
            setShowEditProjectModal(false);
            if (refreshProjects) {
              console.log('Calling refreshProjects...');
              await refreshProjects();
              console.log('refreshProjects completed');
            } else {
              console.log('refreshProjects not available');
            }
          }}
          editMode={true}
          editProject={{
            name: selectedProject.project.name,
            code: getProjectCode(selectedProject),
            path: selectedProject.project.path,
            crsPath: 'docs/CRs',
            description: selectedProject.project.description || '',
            repositoryUrl: ''
          }}
        />
      )}
    </div>
  );
}
