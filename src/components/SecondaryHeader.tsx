import React from 'react';
import { Button } from './UI/index';
import { HamburgerMenu } from './HamburgerMenu';
import { SortControls } from './SortControls';
import { SortPreferences } from '../config/sorting';

type ViewMode = 'board' | 'list' | 'documents';

interface SecondaryHeaderProps {
  viewMode: ViewMode;
  sortPreferences?: SortPreferences;
  onSortPreferencesChange?: (preferences: SortPreferences) => void;
  onAddProject?: () => void;
  onEditProject?: () => void;
  onCounterAPI?: () => void;
  selectedProject?: any;
  onCreateTicket?: () => void;
}

export const SecondaryHeader: React.FC<SecondaryHeaderProps> = ({
  viewMode,
  sortPreferences,
  onSortPreferencesChange,
  onAddProject,
  onEditProject,
  onCounterAPI,
  selectedProject,
  onCreateTicket
}) => {
  return (
    <div className="flex items-center space-x-4">
      {/* Sort Controls - visible in Board and List views */}
      {(viewMode === 'board' || viewMode === 'list') && sortPreferences && onSortPreferencesChange && (
        <SortControls
          preferences={sortPreferences}
          onPreferencesChange={onSortPreferencesChange}
        />
      )}

      {/* Create Button - visible in Board and List views when project is selected */}
      {(viewMode === 'board' || viewMode === 'list') && selectedProject && onCreateTicket && (
        <Button
          onClick={onCreateTicket}
          className="btn btn-primary"
        >
          Create
        </Button>
      )}

      {/* Hamburger Menu - visible in all views */}
      {onAddProject && (
        <HamburgerMenu
          onAddProject={onAddProject}
          onEditProject={onEditProject}
          onCounterAPI={onCounterAPI}
          hasActiveProject={!!selectedProject}
        />
      )}
    </div>
  );
};
