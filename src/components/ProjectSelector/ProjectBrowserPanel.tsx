/**
 * ProjectBrowserPanel Component (MDT-129)
 *
 * Full project list panel that opens when launcher is activated.
 * Displays all projects as cards with favorites first, then sorted by usage.
 *
 * Behavior Requirements:
 * - BR-4.1: Show all projects as cards with code, title, description
 * - BR-4.2: Favorites appear first with favorite indicators
 * - BR-4.3: Non-favorites sorted by lastUsedAt descending
 * - BR-4.4: Cards are clickable to select project
 * - BR-4.5: Panel positioned below selector rail
 *
 * @testid project-panel — Panel container
 * @testid project-panel-card — Individual project card in panel
 */

import type { ProjectWithSelectorState, SelectorPreferences, SelectorState } from './types'
import type { Project } from '@mdt/shared/models/Project'
import * as React from 'react'
import ProjectSelectorCard from './ProjectSelectorCard'

interface ProjectBrowserPanelProps {
  /** All available projects */
  projects: Project[]
  /** Currently active project key */
  activeProjectKey: string
  /** User preferences from user.toml */
  preferences: SelectorPreferences
  /** Per-project selector state from project-selector.json */
  selectorState: Record<string, SelectorState>
  /** Callback when user selects a different project */
  onProjectSelect: (projectKey: string) => void
  /** Callback when favorite star is clicked */
  onFavoriteToggle?: (projectKey: string, e: React.MouseEvent) => void
  /** Whether panel is currently open */
  isOpen: boolean
  /** Callback to close panel */
  onClose: () => void
}

/**
 * Merge Project with selector state into ProjectWithSelectorState
 */
function mergeProjectWithSelectorState(
  project: Project,
  selectorState: Record<string, SelectorState>
): ProjectWithSelectorState {
  const state = selectorState[project.project.code || project.id] || {
    favorite: false,
    lastUsedAt: null,
    count: 0
  }

  return {
    ...project,
    selectorState: state,
    favorite: state.favorite,
    lastUsedAt: state.lastUsedAt,
    count: state.count
  }
}

/**
 * Compute panel order: favorites first, then by lastUsedAt descending
 * This delegates to useProjectSelectorManager for ordering logic
 */
function computePanelOrder(
  projects: Project[],
  selectorState: Record<string, SelectorState>
): ProjectWithSelectorState[] {
  const projectsWithState = projects.map(project =>
    mergeProjectWithSelectorState(project, selectorState)
  )

  // Sort: favorites first, then by lastUsedAt descending
  return projectsWithState.sort((a, b) => {
    // Favorites first
    if (a.favorite && !b.favorite) return -1
    if (!a.favorite && b.favorite) return 1

    // Both favorites or both non-favorites: sort by lastUsedAt descending
    const aLastUsed = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0
    const bLastUsed = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0

    if (aLastUsed !== bLastUsed) {
      return bLastUsed - aLastUsed // Descending
    }

    // Tiebreaker: by count descending
    return b.count - a.count
  })
}

/**
 * ProjectBrowserPanel component
 *
 * Displays a panel with all projects when the launcher is opened.
 * - Projects shown as cards with code, title, description
 * - Favorites appear first with star indicators
 * - Non-favorites sorted by lastUsedAt descending
 * - Click card to select project
 * - Backdrop dims the rest of the app
 * - Close on backdrop click or Escape key
 */
const ProjectBrowserPanel: React.FC<ProjectBrowserPanelProps> = ({
  projects,
  activeProjectKey,
  selectorState,
  onProjectSelect,
  onFavoriteToggle,
  isOpen,
  onClose,
}) => {
  // Handle Escape key to close panel
  React.useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when panel is open
  React.useEffect(() => {
    if (!isOpen) return

    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Compute panel order (favorites first, then by lastUsedAt)
  // MUST be before early return to avoid hooks rule violation
  const panelProjects = React.useMemo(
    () => computePanelOrder(projects, selectorState),
    [projects, selectorState]
  )

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking outside the panel content
    const target = e.target as HTMLElement
    if (!target.closest('[data-testid="project-panel-content"]')) {
      onClose()
    }
  }

  const handleProjectSelect = (projectKey: string) => {
    onProjectSelect(projectKey)
    onClose() // Close panel after selection
  }

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={handleBackdropClick}
      data-testid="project-panel"
    >
      {/* Backdrop - full screen with dimming effect */}
      <div className="fixed inset-0 w-screen h-screen bg-black/50 backdrop-blur-sm" />

      {/* Panel container - centered */}
      <div className="relative flex items-start justify-center pt-20 pointer-events-none min-h-screen">
        <div
          data-testid="project-panel-content"
          onClick={e => e.stopPropagation()}
          className="pointer-events-auto relative w-full max-w-4xl mx-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden"
        >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Select Project
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close panel"
          >
            <svg
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Project list */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {panelProjects.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No projects available
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {panelProjects.map((project) => (
                <ProjectSelectorCard
                  key={project.project.code || project.id}
                  project={project}
                  isActive={
                    (project.project.code || project.id) === activeProjectKey
                  }
                  onSelect={handleProjectSelect}
                  showDescription={true}
                  onFavoriteToggle={onFavoriteToggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  )
}

export default ProjectBrowserPanel
export { ProjectBrowserPanel, type ProjectBrowserPanelProps }
