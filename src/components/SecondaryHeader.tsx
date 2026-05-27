import type { Project } from '@mdt/shared/models/Project'
import type { SortPreferences } from '../config/sorting'
import type { AccessMode, AuthAccessIndicator } from '@/auth/AuthSessionContext'
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
  selectedProject?: Project | null
  onOpenSettings?: () => void
  onUnlockOwnerAccess?: () => void
  onLock?: () => Promise<void> | void
  accessMode?: AccessMode
  accessIndicator?: AuthAccessIndicator
  canManageProjects?: boolean
  canManageSharing?: boolean
  canUseOwnerEndpoints?: boolean
}

export const SecondaryHeader: React.FC<SecondaryHeaderProps> = ({
  viewMode,
  sortPreferences,
  onSortPreferencesChange,
  onAddProject,
  onEditProject,
  selectedProject,
  onOpenSettings,
  onUnlockOwnerAccess,
  onLock,
  accessMode,
  accessIndicator = 'none',
  canManageProjects = true,
  canManageSharing = canManageProjects,
  canUseOwnerEndpoints = canManageProjects,
}) => {
  return (
    <div className="flex items-center space-x-1 sm:space-x-4">
      {/* Sort Controls - desktop only (mobile inside hamburger menu) */}
      {(viewMode === 'board' || viewMode === 'list') && sortPreferences && onSortPreferencesChange && (
        <SortControls
          preferences={sortPreferences}
          onPreferencesChange={onSortPreferencesChange}
        />
      )}

      {/* Hamburger Menu - visible in all views */}
      <HamburgerMenu
        onAddProject={onAddProject}
        onEditProject={onEditProject}
        hasActiveProject={!!selectedProject}
        sortPreferences={sortPreferences}
        onSortPreferencesChange={onSortPreferencesChange}
        onOpenSettings={onOpenSettings}
        onUnlockOwnerAccess={onUnlockOwnerAccess}
        onLock={onLock}
        accessMode={accessMode}
        accessIndicator={accessIndicator}
        canManageProjects={canManageProjects}
        canManageSharing={canManageSharing}
        canUseOwnerEndpoints={canUseOwnerEndpoints}
      />
    </div>
  )
}
