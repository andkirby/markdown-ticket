import React, { useState, useCallback, useEffect } from 'react';
import Board from './Board';
import { DocumentsLayout } from './DocumentsView';
import { DuplicateResolver } from './DuplicateResolver';
import { Ticket } from '../types';
import { SortControls } from './SortControls';
import { Button } from './UI/index';
import { SecondaryHeader } from './SecondaryHeader';
import { AddProjectModal } from './AddProjectModal';
import { getSortPreferences, setSortPreferences, SortPreferences } from '../config/sorting';

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
  onAddProject?: () => void;
}

export default function SingleProjectView({ onTicketClick, selectedProject, onAddProject }: SingleProjectViewProps) {
  const [viewMode, setViewMode] = useState<SingleProjectViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return (saved as SingleProjectViewMode) || 'board';
  });

  const [sortPreferences, setSortPreferencesState] = useState<SortPreferences>(getSortPreferences);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
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

  // Fetch tickets for the selected project
  const fetchTickets = useCallback(async () => {
    if (!selectedProject) {
      setTickets([]);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${selectedProject.id}/crs`);
      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.statusText}`);
      }
      
      const crsData = await response.json();
      
      // Convert CR data to Ticket format
      const convertedTickets: Ticket[] = crsData.map((cr: any) => ({
        code: cr.code || 'Unknown',
        title: cr.title || 'Untitled',
        status: cr.status || 'Pending',
        priority: cr.priority || 'Medium',
        type: cr.type || 'Feature Enhancement',
        dateCreated: new Date(cr.dateCreated || Date.now()),
        content: cr.content || '',
        filePath: cr.path || '',
        lastModified: new Date(cr.lastModified || Date.now()),
        phaseEpic: cr.header?.phaseEpic || cr.phaseEpic || '',
      }));

      setTickets(convertedTickets);
      
      // Check for duplicates
      const codes = convertedTickets.map(t => t.code);
      const duplicateCodes = codes.filter((code, index) => codes.indexOf(code) !== index);
      if (duplicateCodes.length > 0) {
        setShowDuplicateResolver(true);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProject]);

  const handleRefresh = useCallback(async () => {
    await fetchTickets();
  }, [fetchTickets]);

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
      
      // Refresh tickets to get the latest state
      await fetchTickets();
      
      return updatedTicket;
    } catch (error) {
      console.error('Failed to update ticket:', error);
      throw error;
    }
  }, [selectedProject, fetchTickets]);

  // Fetch tickets when selected project changes
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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
              selectedProject={selectedProject}
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' ? (
          <Board 
            onTicketClick={onTicketClick} 
            onTicketUpdate={handleTicketUpdate}
            showHeader={false} 
            enableProjectSwitching={false}
            selectedProject={selectedProject}
            tickets={tickets}
            loading={loading}
            sortPreferences={sortPreferences}
          />
        ) : viewMode === 'list' ? (
          <div className="h-full overflow-auto p-6">
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <div
                  key={ticket.code}
                  onClick={() => onTicketClick(ticket)}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm text-muted-foreground">{ticket.code}</span>
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
                      {new Date(ticket.lastModified).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          selectedProject ? (
            <DocumentsLayout projectPath={selectedProject.project.path} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No project selected
            </div>
          )
        )}
      </div>
      
      {/* Duplicate Resolver Modal */}
      {showDuplicateResolver && selectedProject && (
        <DuplicateResolver
          projectId={selectedProject.id}
          onResolved={() => {
            setShowDuplicateResolver(false);
            fetchTickets(); // Reload tickets after resolution
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
    </div>
  );
}
