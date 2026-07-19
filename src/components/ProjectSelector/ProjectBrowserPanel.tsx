/**
 * ProjectBrowserPanel Component (MDT-129, MDT-152)
 *
 * Full project list panel that opens when launcher is activated.
 * Displays all projects as cards with favorites first, then sorted by usage.
 * Includes client-side search filtering by project code, title, or description (MDT-152).
 *
 * Behavior Requirements:
 * - BR-4.1: Show all projects as cards with code, title, description
 * - BR-4.2: Favorites appear first with favorite indicators
 * - BR-4.3: Non-favorites sorted by lastUsedAt descending
 * - BR-4.4: Cards are clickable to select project
 * - BR-4.5: Panel positioned below selector rail
 * - BR-1.1: Search input visible when panel opens
 * - BR-1.2: Filter by code, title, or description, case-insensitive
 * - BR-1.3: Current project excluded when query matches
 * - BR-1.4: Empty state when no projects match
 * - BR-1.5: Escape closes panel
 * - BR-1.6: Autofocus search input on open
 * - BR-11.1: ArrowDown from search highlights the first card
 * - BR-11.2: ArrowUp/ArrowDown move the highlight through the filtered list
 * - BR-11.3: Cyclic wrap at list edges (last->first, first->last)
 * - BR-11.4: Typing keeps focus in the search field and updates the query
 * - BR-11.5: Enter selects the highlighted project and closes the panel
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
import { ScrollArea } from '@/components/ui/scroll-area'
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
    accent: state.accent,
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
 * Read the rendered grid column count so keyboard nav can move within columns
 * (Excel-grid behavior) instead of zigzagging linearly across a multi-column grid.
 */
function getGridColumnCount(element: HTMLElement): number {
  const columns = window.getComputedStyle(element).gridTemplateColumns
  const columnCount = columns.split(' ').filter(Boolean).length

  return Math.max(columnCount, 1)
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
  preferences,
}) => {
  // Search + active-descendant highlight state (BR-11)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [selectedProjectIndex, setSelectedProjectIndex] = React.useState(-1)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const projectGridRef = React.useRef<HTMLDivElement>(null)

  // Compute panel order (favorites first, then by lastUsedAt)
  // MUST be before early return to avoid hooks rule violation
  const panelProjects = React.useMemo(
    () => computePanelOrder(projects, selectorState),
    [projects, selectorState],
  )

  // Reset search, autofocus, and highlight the active project when the panel opens.
  // Runs after panelProjects is declared; no query on open so the active project
  // is present in the list and becomes the starting highlight.
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      const activeIndex = panelProjects.findIndex(
        p => (p.project.code || p.id) === activeProjectKey,
      )
      setSelectedProjectIndex(activeIndex)
      // Slight delay to ensure DOM is ready before focusing
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    }
  }, [isOpen, panelProjects, activeProjectKey])

  // Filter projects by search query (case-insensitive code, title/name, or description match)
  const displayProjects = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) {
      return panelProjects
    }

    return panelProjects.filter((project) => {
      // Exclude current project when searching.
      if ((project.project.code || project.id) === activeProjectKey) {
        return false
      }
      const code = (project.project.code || project.id).toLowerCase()
      const name = (project.project.name || '').toLowerCase()
      const description = (project.project.description || '').toLowerCase()
      return code.includes(query) || name.includes(query) || description.includes(query)
    })
  }, [panelProjects, searchQuery, activeProjectKey])

  // Clamp highlight within the filtered list (stale-index guard; BR-11.2)
  React.useEffect(() => {
    setSelectedProjectIndex((prev) => {
      if (displayProjects.length === 0)
        return -1
      if (prev >= displayProjects.length)
        return displayProjects.length - 1
      return prev
    })
  }, [displayProjects.length])

  // Keep the highlighted card scrolled into view whenever the highlight moves
  // (BR-11.6). Runs before paint so the viewport follows the highlight with no
  // visible jump. `block: 'nearest'` only scrolls when the card is outside the
  // visible area, so it never fights the user.
  React.useLayoutEffect(() => {
    if (selectedProjectIndex < 0)
      return
    const highlighted = projectGridRef.current?.querySelector<HTMLElement>('[data-selected="true"]')
    highlighted?.scrollIntoView({ block: 'nearest' })
  }, [selectedProjectIndex])

  if (!isOpen)
    return null

  const handleProjectSelect = (projectKey: string) => {
    onProjectSelect(projectKey)
    onClose() // Close panel after selection
  }

  // Excel-grid active-descendant keyboard nav (BR-11). The panel is a
  // multi-column grid: Down/Up move within the SAME column (±columnCount),
  // Left/Right move between adjacent columns (±1), all with cyclic wrap.
  // Tab/Shift+Tab act as down/up so focus never escapes to <body> (the
  // regression where arrow keys went dead once focus left the search field).
  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const count = displayProjects.length
    const isVertical = e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)
    const isVerticalUp = e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)

    if (!isVertical && !isVerticalUp && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Enter')
      return

    if (e.key === 'Enter') {
      if (selectedProjectIndex >= 0 && selectedProjectIndex < count) {
        e.preventDefault()
        const selected = displayProjects[selectedProjectIndex]
        handleProjectSelect(selected.project.code || selected.id)
      }
      return
    }

    e.preventDefault()
    if (count === 0)
      return

    const cols = projectGridRef.current ? getGridColumnCount(projectGridRef.current) : 1
    const lastIndex = count - 1
    const cur = selectedProjectIndex === -1 ? 0 : selectedProjectIndex
    const col = cur % cols
    let next = cur

    if (isVertical) {
      next = cur + cols
      if (next > lastIndex)
        next = col // wrap to top of the same column
    }
    else if (isVerticalUp) {
      next = cur - cols
      if (next < 0) {
        // wrap to the bottom of the same column
        next = col
        while (next + cols <= lastIndex)
          next += cols
      }
    }
    else if (e.key === 'ArrowRight') {
      next = (cur + 1) % count
    }
    else if (e.key === 'ArrowLeft') {
      next = (cur - 1 + count) % count
    }

    setSelectedProjectIndex(next)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" overlayClassName="backdrop-blur-sm" data-testid="project-browser-panel">
      <ModalBody className="modal__body--constrained" onKeyDown={handlePanelKeyDown}>
        {/* Header with inline search input */}
        <ModalHeader
          onClose={onClose}
          closeTestId="project-browser-close"
          closeButtonTabIndex={-1}
          className="flex items-center gap-3"
        >
          <h1 className="modal__headline shrink-0">
            Projects
          </h1>
          {/* Search input (MDT-152) */}
          <div className="relative min-w-0 flex-1">
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
              onChange={(e) => {
                setSearchQuery(e.target.value)
                // Keep the highlight on the active project if it is still in the
                // filtered results; otherwise drop the highlight so the next
                // ArrowDown lands on the first result.
                const q = e.target.value.trim().toLowerCase()
                if (!q) {
                  setSelectedProjectIndex(panelProjects.findIndex(p => (p.project.code || p.id) === activeProjectKey))
                }
                else {
                  setSelectedProjectIndex(-1)
                }
              }}
              placeholder="Search projects..."
              data-testid="project-browser-search-input"
              className="project-search"
            />
          </div>
        </ModalHeader>

        {/* Project list */}
        <ScrollArea type="hover" scrollHideDelay={600} className="flex-1 min-h-0 overflow-hidden">
          <div className="p-4">
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
                  <div
                    ref={projectGridRef}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    role="listbox"
                    aria-label="Projects"
                  >
                    {displayProjects.map((project, index) => (
                      <ProjectSelectorCard
                        key={project.project.code || project.id}
                        project={project}
                        isActive={
                          (project.project.code || project.id) === activeProjectKey
                        }
                        highlighted={index === selectedProjectIndex}
                        onSelect={handleProjectSelect}
                        showDescription={true}
                        onFavoriteToggle={onFavoriteToggle}
                        testIdPrefix="project-browser-card"
                        accentEnabled={preferences.accentEnabled}
                        accentStyle={preferences.accentStyle}
                        autocolor={preferences.autocolor}
                        hasAccent={!!project.selectorState.accent}
                      />
                    ))}
                  </div>
                )}
          </div>
        </ScrollArea>
      </ModalBody>
    </Modal>
  )
}

export default ProjectBrowserPanel
export { ProjectBrowserPanel, type ProjectBrowserPanelProps }
