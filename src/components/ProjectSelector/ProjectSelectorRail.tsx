/**
 * ProjectSelectorRail Component (MDT-129, MDT-185)
 *
 * Composes the selector rail: the active project card plus inactive project
 * chips revealed on hover.
 *
 * Behavior Requirements:
 * - BR-1.3: Active project always visible in rail, click to open browser
 * - BR-9.1: Mobile shows only active project
 * - BR-6.1-6.4: Rail ordering prioritizes favorites
 * - MDT-185: Inactive chips are hidden by default and revealed inline to the
 *   right of the active card on hover. Selecting a chip hides them again.
 *
 * The revealed strip is an absolutely-positioned child of the active card
 * wrapper. It overlays subsequent header elements (the header's
 * overflow-hidden is not applied to this section) and stays open while the
 * pointer remains within the wrapper (card or strip), so no debounce is
 * needed.
 */

import type { Project } from '@mdt/shared/models/Project'
import type { SelectorPreferences, SelectorState } from './types'
import * as React from 'react'
import ProjectSelectorCard from './ProjectSelectorCard'
import ProjectSelectorChip from './ProjectSelectorChip'
import { useProjectSelectorManager } from './useProjectSelectorManager'

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
 * @testid project-selector-rail — Rail container
 * @testid project-selector-rail-active — Active project card slot
 * @testid collapsed-chips-overlay — Hover-revealed inactive chips strip
 * @testid rail-expand-hint — Chevron hint on the active card edge
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
  const { railProjects, isMobile } = useProjectSelectorManager(
    projects,
    activeProjectKey,
    preferences,
    selectorState,
  )

  const [isExpanded, setIsExpanded] = React.useState(false)

  const activeProject = railProjects.find(
    p => (p.project.code || p.id) === activeProjectKey,
  )
  const inactiveProjects = railProjects.filter(
    p => (p.project.code || p.id) !== activeProjectKey,
  )

  // On mobile, only show active (BR-9.1)
  const visibleInactiveProjects = isMobile ? [] : inactiveProjects
  const hasChips = visibleInactiveProjects.length > 0

  const handleActiveCardClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onLauncherClick()
  }

  // Handle pointer leave from the active card wrapper - only collapse if
  // not moving into the chips overlay (a child element)
  const handleWrapperPointerLeave = (e: React.PointerEvent) => {
    // Check if the pointer is moving to a child element (the chips overlay)
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return // Moving to a child, don't collapse
    }
    setIsExpanded(false)
  }

  // Selecting a project from the revealed chips also hides the strip (MDT-185),
  // even if the pointer remains on the clicked chip.
  const handleChipSelect = (projectKey: string) => {
    onProjectSelect(projectKey)
    setIsExpanded(false)
  }

  return (
    <div
      className="flex items-center gap-2"
      data-testid="project-selector-rail"
    >
      {/* Active project card (always visible, click to open browser) */}
      {activeProject && (
        <div
          className="relative"
          data-testid="project-selector-rail-active"
          onClick={handleActiveCardClick}
          onPointerEnter={hasChips ? () => setIsExpanded(true) : undefined}
          onPointerLeave={hasChips ? handleWrapperPointerLeave : undefined}
        >
          <ProjectSelectorCard
            project={activeProject}
            isActive={true}
            onSelect={onLauncherClick}
            onFavoriteToggle={onFavoriteToggle}
            useRailWidthConstraints={true}
            accentEnabled={preferences.accentEnabled}
            accentStyle={preferences.accentStyle}
            autocolor={preferences.autocolor}
            hasAccent={!!activeProject.selectorState.accent}
          />

          {/* Hover affordance: hint that more projects reveal on hover */}
          {hasChips && !isExpanded && (
            <span
              className="project-expand-hint"
              aria-hidden="true"
              data-testid="rail-expand-hint"
            >
              ‹
            </span>
          )}

          {/* Inactive chips — revealed to the right of the active card on hover (MDT-185) */}
          {hasChips && isExpanded && (
            <div
              className="project-chips-overlay"
              data-testid="collapsed-chips-overlay"
              onPointerEnter={() => setIsExpanded(true)}
            >
              <div className="project-chips-overlay__inner">
                {visibleInactiveProjects.map((project, index) => (
                  <div
                    key={project.project.code || project.id}
                    className="project-chips-overlay__chip"
                    style={{ animationDelay: `${Math.min(index, 8) * 25}ms` }}
                  >
                    <ProjectSelectorChip
                      project={project}
                      onSelect={handleChipSelect}
                      accentEnabled={preferences.accentEnabled}
                      accentStyle={preferences.accentStyle}
                      autocolor={preferences.autocolor}
                      hasAccent={!!project.selectorState.accent}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProjectSelectorRail
export { ProjectSelectorRail }
