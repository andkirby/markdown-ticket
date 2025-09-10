import React, { useState, useCallback } from 'react';
import Board from './Board';
import { DocumentsLayout } from './DocumentsView';
import { DuplicateResolver } from './DuplicateResolver';
import { Ticket } from '../types';
import { SortControls } from './SortControls';
import { Button } from './UI/index';
import { SecondaryHeader } from './SecondaryHeader';
import { AddProjectModal } from './AddProjectModal';
import { getSortPreferences, setSortPreferences, SortPreferences } from '../config/sorting';
import { sortTickets } from '../utils/sorting';
import { TicketCode } from './TicketCode';
import { normalizeTicket } from '../../shared';
import { getProjectCode } from './ProjectSelector';

type SingleProjectViewMode = 'board' | 'list' | 'documents';

const VIEW_MODE_KEY = 'single-project-view-mode';

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

interface SingleProjectViewProps {
  onTicketClick: (ticket: Ticket) => void;
  selectedProject: Project | null;
  tickets?: Ticket[];
  updateTicketOptimistic?: (ticketCode: string, updates: Partial<Ticket>) => Promise<Ticket>;
  onAddProject?: () => void;
  viewMode?: string;
  refreshProjects?: () => Promise<void>;
}

export default function SingleProjectView({ onTicketClick, selectedProject, tickets: propTickets, updateTicketOptimistic, onAddProject, viewMode: externalViewMode, refreshProjects }: SingleProjectViewProps) {
  // Use external viewMode if provided, otherwise fall back to internal state
  const [internalViewMode, setInternalViewMode] = useState<SingleProjectViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return (saved as SingleProjectViewMode) || 'board';
  });
  
  const viewMode = externalViewMode || internalViewMode;

  const [sortPreferences, setSortPreferencesState] = useState<SortPreferences>(getSortPreferences);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDuplicateResolver, setShowDuplicateResolver] = useState(false);

  const handleViewModeChange = (mode: SingleProjectViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  const handleSortPreferencesChange = useCallback((newPreferences: SortPreferences) => {
    setSortPreferencesState(newPreferences);
    setSortPreferences(newPreferences);
  }, []);

  const handleRefresh = useCallback(async () => {
    // Refresh is now handled by the parent component
  }, []);

  const handleTicketUpdate = useCallback(async (ticketCode: string, updates: Partial<Ticket>) => {
    if (!selectedProject) {
      throw new Error('No project selected');
    }

    try {
      const response = await fetch(`/api/projects/${selectedProject.id}/crs/${ticketCode}`, {
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
  }, [selectedProject]);

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
              onRefresh={handleRefresh}
              onAddProject={() => setShowAddProjectModal(true)}
              onEditProject={() => setShowEditProjectModal(true)}
              selectedProject={selectedProject}
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
        ) : viewMode === 'docs' || viewMode === 'documents' ? (
          selectedProject ? (
            <DocumentsLayout projectPath={selectedProject.project.path} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No project selected
            </div>
          )
        ) : null}
      </div>
      
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
