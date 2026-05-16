/**
 * ProjectBrowserPanel Component (MDT-129, MDT-152)
 *
 * Full project list panel that opens when launcher is activated.
 * Displays all projects as cards with favorites first, then sorted by usage.
 * Includes client-side search filtering by project code or name (MDT-152).
 *
 * Behavior Requirements:
 * - BR-4.1: Show all projects as cards with code, title, description
 * - BR-4.2: Favorites appear first with favorite indicators
 * - BR-4.3: Non-favorites sorted by lastUsedAt descending
 * - BR-4.4: Cards are clickable to select project
 * - BR-4.5: Panel positioned below selector rail
 * - BR-1.1: Search input visible when panel opens
 * - BR-1.2: Filter by code or name, case-insensitive
 * - BR-1.3: Current project excluded when query matches
 * - BR-1.4: Empty state when no projects match
 * - BR-1.5: Escape closes panel
 * - BR-1.6: Autofocus search input on open
 *
 * @testid project-browser-panel — Panel container
 * @testid project-browser-search-input — Search input
 * @testid project-browser-card-{code} — Project card in panel
 * @testid project-browser-empty-state — Empty search state
 */

import type { Project } from '@mdt/shared/models/Project'
import type { ProjectWithSelectorState, SelectorPreferences, SelectorState } from './types'
import * as React from 'react'
import { Modal, ModalBody, ModalHeader } from '@/components/ui/Modal'
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
  selectorState: Record<string, SelectorState>,
): ProjectWithSelectorState {
  const state = selectorState[project.project.code || project.id] || {
    favorite: false,
    lastUsedAt: null,
    count: 0,
  }

  return {
    ...project,
    selectorState: state,
    favorite: state.favorite,
    lastUsedAt: state.lastUsedAt,
    count: state.count,
  }
}

/**
 * Compute panel order: favorites first, then by lastUsedAt descending
 * This delegates to useProjectSelectorManager for ordering logic
 */
function computePanelOrder(
  projects: Project[],
  selectorState: Record<string, SelectorState>,
): ProjectWithSelectorState[] {
  const projectsWithState = projects.map(project =>
    mergeProjectWithSelectorState(project, selectorState),
  )

  // Sort: favorites first, then by lastUsedAt descending
  return projectsWithState.sort((a, b) => {
    // Favorites first
    if (a.favorite && !b.favorite)
      return -1
    if (!a.favorite && b.favorite)
      return 1

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
  // Search state
  const [searchQuery, setSearchQuery] = React.useState('')
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Reset search and autofocus when panel opens
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      // Slight delay to ensure DOM is ready before focusing
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    }
  }, [isOpen])

  // Compute panel order (favorites first, then by lastUsedAt)
  // MUST be before early return to avoid hooks rule violation
  const panelProjects = React.useMemo(
    () => computePanelOrder(projects, selectorState),
    [projects, selectorState],
  )

  // Filter projects by search query (case-insensitive code OR name match)
  const displayProjects = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return panelProjects
    }

    return panelProjects.filter((project) => {
      // Exclude current project when searching
      if ((project.project.code || project.id) === activeProjectKey) {
        return false
      }
      const code = (project.project.code || project.id).toLowerCase()
      const name = (project.project.name || '').toLowerCase()
      return code.includes(query) || name.includes(query)
    })
  }, [panelProjects, searchQuery, activeProjectKey])

  if (!isOpen)
    return null

  const handleProjectSelect = (projectKey: string) => {
    onProjectSelect(projectKey)
    onClose() // Close panel after selection
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" overlayClassName="backdrop-blur-sm" data-testid="project-browser-panel">
      <ModalBody className="p-0">
        {/* Header with search input */}
        <ModalHeader
          title="Select Project"
          onClose={onClose}
          closeTestId="project-browser-close"
          className="border-b-0 pb-0"
        />
        <div className="px-4 pb-3 pt-0">
          {/* Search input (MDT-152) */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
              data-testid="project-browser-search-input"
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Project list */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {displayProjects.length === 0
            ? (
                <div
                  data-testid="project-browser-empty-state"
                  className="text-center py-12 text-gray-500 dark:text-gray-400"
                >
                  {searchQuery.trim()
                    ? 'No projects match your search'
                    : 'No projects available'}
                </div>
              )
            : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {displayProjects.map(project => (
                    <ProjectSelectorCard
                      key={project.project.code || project.id}
                      project={project}
                      isActive={
                        (project.project.code || project.id) === activeProjectKey
                      }
                      onSelect={handleProjectSelect}
                      showDescription={true}
                      onFavoriteToggle={onFavoriteToggle}
                      testIdPrefix="project-browser-card"
                    />
                  ))}
                </div>
              )}
        </div>
      </ModalBody>
    </Modal>
  )
}

export default ProjectBrowserPanel
export { ProjectBrowserPanel, type ProjectBrowserPanelProps }
