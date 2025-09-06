import React, { useState } from 'react';
import Board from './Board';
import { DocumentsLayout } from './DocumentsView';
import { Ticket } from '../types';
import { useMultiProjectData } from '../hooks/useMultiProjectData';

type SingleProjectViewMode = 'board' | 'documents';

const VIEW_MODE_KEY = 'single-project-view-mode';

function ViewModeToggle({ 
  viewMode, 
  onViewModeChange 
}: { 
  viewMode: SingleProjectViewMode; 
  onViewModeChange: (mode: SingleProjectViewMode) => void; 
}) {
  return (
    <div className="flex rounded-md border border-border bg-muted p-1">
      <button
        onClick={() => onViewModeChange('board')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-sm transition-all ${
          viewMode === 'board'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
        }`}
      >
        Board
      </button>
      <button
        onClick={() => onViewModeChange('documents')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-sm transition-all ${
          viewMode === 'documents'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
        }`}
      >
        Documents
      </button>
    </div>
  );
}

interface SingleProjectViewProps {
  onTicketClick: (ticket: Ticket) => void;
}

export default function SingleProjectView({ onTicketClick }: SingleProjectViewProps) {
  const [viewMode, setViewMode] = useState<SingleProjectViewMode>(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return (saved as SingleProjectViewMode) || 'board';
  });

  const { selectedProject } = useMultiProjectData({ autoSelectFirst: true });

  const handleViewModeChange = (mode: SingleProjectViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">
            {selectedProject?.project.name || 'Single Project'}
          </h1>
          <ViewModeToggle 
            viewMode={viewMode} 
            onViewModeChange={handleViewModeChange} 
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' ? (
          <Board onTicketClick={onTicketClick} showHeader={false} />
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
    </div>
  );
}
