/**
 * ProjectSelectorRail Component (MDT-129)
 *
 * Composes the selector rail with active card and inactive chips.
 * Implements responsive layout that adapts to mobile viewports.
 *
 * Behavior Requirements:
 * - BR-1.3: Active project always visible in rail, click to open browser
 * - BR-2.1-2.3: Inactive projects shown as chips based on compactInactive
 * - BR-9.1: Mobile shows only active project
 * - BR-6.1-6.4: Rail ordering prioritizes favorites
 *
 * Responsibilities:
 * - Compose active project card with ProjectSelectorCard (clicks open browser)
 * - Render inactive visible projects with ProjectSelectorChip
 * - Apply mobile responsive layout (collapse to active only)
 */

import * as React from 'react'
import type { Project } from '@mdt/shared/models/Project'
import type { SelectorPreferences, SelectorState } from './types'
import { useProjectSelectorManager } from './useProjectSelectorManager'
import ProjectSelectorCard from './ProjectSelectorCard'
import ProjectSelectorChip from './ProjectSelectorChip'

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
}

/**
 * ProjectSelectorRail component
 *
 * Displays a horizontal rail of project selectors:
 * - Active project as larger card (always first), click to open browser
 * - Inactive visible projects as chips (based on compactInactive)
 *
 * Mobile responsive behavior:
 * - Desktop: Shows active + visible inactive projects
 * - Mobile: Shows only active project (BR-9.1)
 *
 * @testid project-selector-rail — Rail container
 * @testid project-selector-rail-active — Active project card slot
 * @testid project-selector-rail-inactive — Inactive projects container
 *
 * Behavior scenarios:
 * - active_project_always_visible: Active project always rendered
 * - active_project_opens_browser: Click active card to open project browser
 * - inactive_projects_display_mode: Chips based on compactInactive
 * - mobile_responsive_selector: Mobile shows active only
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

  // On mobile, only show active (BR-9.1)
  const visibleInactiveProjects = isMobile ? [] : inactiveProjects

  const handleActiveCardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onLauncherClick()
  }

  return (
    <div
      className="flex items-center gap-2"
      data-testid="project-selector-rail"
    >
      {/* Active project card (always visible, click to open browser) */}
      {activeProject && (
        <div
          className="px-2 cursor-pointer"
          data-testid="project-selector-rail-active"
          onClick={handleActiveCardClick}
        >
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
    </div>
  )
}

export default ProjectSelectorRail
