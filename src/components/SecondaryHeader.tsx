import type { SortPreferences } from '../config/sorting'
import * as React from 'react'
import { HamburgerMenu } from './HamburgerMenu'
import { SortControls } from './SortControls'

type ViewMode = 'board' | 'list' | 'documents'

interface SecondaryHeaderProps {
  viewMode: ViewMode
  sortPreferences?: SortPreferences
  onSortPreferencesChange?: (preferences: SortPreferences) => void
  onAddProject?: () => void
  onEditProject?: () => void
  onCounterAPI?: () => void
  selectedProject?: any
}

export const SecondaryHeader: React.FC<SecondaryHeaderProps> = ({
  viewMode,
  sortPreferences,
  onSortPreferencesChange,
  onAddProject,
  onEditProject,
  onCounterAPI,
  selectedProject,
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
  )
}
