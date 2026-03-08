/**
 * ProjectSelectorRail Component (MDT-129)
 *
 * Composes the selector rail with active card, inactive chips, and launcher.
 * Implements responsive layout that adapts to mobile viewports.
 *
 * Behavior Requirements:
 * - BR-1.3: Active project always visible in rail
 * - BR-2.1-2.3: Inactive projects shown as chips or cards based on compactInactive
 * - BR-9.1: Mobile shows only active project + launcher
 * - BR-6.1-6.4: Rail ordering prioritizes favorites
 *
 * Responsibilities:
 * - Compose active project card with ProjectSelectorCard
 * - Render inactive visible projects with ProjectSelectorChip
 * - Display launcher button at end (opens panel)
 * - Apply mobile responsive layout (collapse to active + launcher)
 */

import * as React from 'react'
import type { Project } from '@mdt/shared/models/Project'
import type { SelectorPreferences, SelectorState } from './types'
import { useProjectSelectorManager } from './useProjectSelectorManager'
import ProjectSelectorCard from './ProjectSelectorCard'
import ProjectSelectorChip from './ProjectSelectorChip'
import LauncherButton from './LauncherButton'

/**
 * Props for ProjectSelectorRail component
 */
export interface ProjectSelectorRailProps {
  /** All available projects */
  projects: Project[]
  /** Key of currently active project */
  activeProjectKey: string
  /** User preferences for selector presentation */
  preferences: SelectorPreferences
  /** Per-project selector state */
  selectorState: Record<string, SelectorState>
  /** Callback when user selects a project */
  onProjectSelect: (projectKey: string) => void
  /** Callback when launcher is clicked (opens panel) */
  onLauncherClick: () => void
  /** Callback when favorite star is clicked */
  onFavoriteToggle?: (projectKey: string, e: React.MouseEvent) => void
  /** Whether the selector panel is currently open */
  isPanelOpen?: boolean
}

/**
 * ProjectSelectorRail component
 *
 * Displays a horizontal rail of project selectors:
 * - Active project as larger card (always first)
 * - Inactive visible projects as chips or cards (based on compactInactive)
 * - Launcher button at end (opens full panel in TASK-9)
 *
 * Mobile responsive behavior:
 * - Desktop: Shows active + visible inactive projects + launcher
 * - Mobile: Shows only active + launcher (BR-9.1)
 *
 * @testid project-selector-rail — Rail container
 * @testid project-selector-rail-active — Active project card slot
 * @testid project-selector-rail-inactive — Inactive projects container
 *
 * Behavior scenarios:
 * - active_project_always_visible: Active project always rendered
 * - inactive_projects_display_mode: Chips/cards based on compactInactive
 * - mobile_responsive_selector: Mobile shows active + launcher only
 * - rail_ordering_prioritizes_favorites: Ordering from useProjectSelectorManager
 */
const ProjectSelectorRail: React.FC<ProjectSelectorRailProps> = ({
  projects,
  activeProjectKey,
  preferences,
  selectorState,
  onProjectSelect,
  onLauncherClick,
  onFavoriteToggle,
  isPanelOpen = false,
}) => {
  // Get ordered rail projects with mobile responsive behavior
  const { railProjects, isMobile } = useProjectSelectorManager(
    projects,
    activeProjectKey,
    preferences,
    selectorState
  )

  // Separate active and inactive projects
  const activeProject = railProjects.find(
    p => (p.project.code || p.id) === activeProjectKey
  )
  const inactiveProjects = railProjects.filter(
    p => (p.project.code || p.id) !== activeProjectKey
  )

  // On mobile, only show active + launcher (BR-9.1)
  const visibleInactiveProjects = isMobile ? [] : inactiveProjects

  return (
    <div
      className="flex items-center gap-2"
      data-testid="project-selector-rail"
    >
      {/* Active project card (always visible) */}
      {activeProject && (
        <div data-testid="project-selector-rail-active">
          <ProjectSelectorCard
            project={activeProject}
            isActive={true}
            onSelect={onProjectSelect}
            onFavoriteToggle={onFavoriteToggle}
            useRailWidthConstraints={true}
          />
        </div>
      )}

      {/* Inactive visible projects (hidden on mobile) */}
      {!isMobile && visibleInactiveProjects.length > 0 && (
        <div
          className="flex items-center gap-2"
          data-testid="project-selector-rail-inactive"
        >
          {visibleInactiveProjects.map(project => (
            <ProjectSelectorChip
              key={project.project.code || project.id}
              project={project}
              compact={preferences.compactInactive}
              onSelect={onProjectSelect}
            />
          ))}
        </div>
      )}

      {/* Launcher button (always visible) */}
      <LauncherButton onLauncherClick={onLauncherClick} isPanelOpen={isPanelOpen} />
    </div>
  )
}

export default ProjectSelectorRail
