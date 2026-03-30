/**
 * ProjectSelector Component (MDT-129)
 *
 * Main entry point for the project selector system.
 * Composes the rail and panel with panel state management.
 *
 * Behavior Requirements:
 * - BR-3.1-3.3: Launcher opens panel below selector
 * - BR-4.1-4.5: Panel displays full project list with favorites first
 * - BR-5.1-5.5: Project selection updates usage state
 * - BR-8.1-8.7: State persists to file after changes
 * - BR-9.1-9.3: Mobile responsive behavior
 *
 * Responsibilities:
 * - Manage panel open/close state
 * - Compose ProjectSelectorRail and ProjectBrowserPanel
 * - Integrate useSelectorData and useProjectSelectorManager hooks
 * - Handle project switching via useProjectManager.setSelectedProject
 * - Track usage state after selection
 * - Support mobile responsive behavior
 *
 * @testid project-selector — Main project selector container
 * @testid project-selector-rail — Rail component
 * @testid project-panel — Panel component
 */

import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProjectManager } from '@/hooks/useProjectManager'
import { getProjectCode } from '@/utils/projectUtils'
import { TooltipProvider } from '../ui/tooltip'
import ProjectBrowserPanel from './ProjectBrowserPanel'
import ProjectSelectorRail from './ProjectSelectorRail'
import { useSelectorData } from './useSelectorData'

/**
 * ProjectSelector component
 *
 * Main entry point for the project selector system.
 * Displays a rail of project selectors and a panel for full project access.
 *
 * State management:
 * - Panel open/close state (local)
 * - Project selection (via useProjectManager.setSelectedProject)
 * - Usage tracking (via useSelectorData.trackProjectUsage)
 * - Navigation (updates URL when project changes)
 *
 * Mobile responsive behavior:
 * - Desktop: Shows active + visible inactive projects + launcher
 * - Mobile: Shows only active + launcher (BR-9.1)
 *
 * @testid project-selector — Main selector container
 */
function ProjectSelector({ className = '' }: { className?: string }) {
  const { projectCode: urlProjectCode } = useParams<{ projectCode: string }>()
  const navigate = useNavigate()

  // Load selector data (preferences, state, and mutation functions)
  const {
    preferences,
    selectorState,
    trackProjectUsage,
    toggleFavorite,
    error: selectorError,
    loaded: selectorLoaded,
  } = useSelectorData()

  // Load projects and selection logic from useProjectManager
  // This instance handles SSE events since ProjectSelector is the main project switcher
  const {
    projects,
    selectedProject,
    setSelectedProject,
    loading: projectsLoading,
  } = useProjectManager({
    autoSelectFirst: false, // Don't auto-select - URL controls initial selection
    handleSSEEvents: true, // Handle SSE events for project updates
  })

  // Panel open/close state (managed locally)
  const [isPanelOpen, setIsPanelOpen] = React.useState(false)

  // Handle launcher click to open panel
  const handleLauncherClick = React.useCallback(() => {
    setIsPanelOpen(true)
  }, [])

  // Handle panel close
  const handlePanelClose = React.useCallback(() => {
    setIsPanelOpen(false)
  }, [])

  // Handle project selection from rail or panel
  const handleProjectSelect = React.useCallback(
    (projectKey: string) => {
      const project = projects.find(p => getProjectCode(p) === projectKey)
      if (!project) {
        console.error(`Project not found: ${projectKey}`)
        return
      }

      // Track usage state (increments count, updates lastUsedAt)
      trackProjectUsage(projectKey)

      // Update selected project via useProjectManager (single transition authority)
      setSelectedProject(project)

      // Preserve current view mode when switching projects
      const lastViewMode = localStorage.getItem('lastViewMode') || 'board'
      const basePath = `/prj/${projectKey}`
      const newPath = lastViewMode === 'board' ? basePath : `${basePath}/${lastViewMode}`
      navigate(newPath)

      // Panel closes automatically via ProjectBrowserPanel's onSelect handler
    },
    [projects, trackProjectUsage, setSelectedProject, navigate],
  )

  // Handle favorite toggle
  const handleFavoriteToggle = React.useCallback(
    (projectKey: string, e: React.MouseEvent) => {
      e.stopPropagation()
      toggleFavorite(projectKey)
    },
    [toggleFavorite],
  )

  // Get active project key for display
  // Use URL param first, fallback to selectedProject from useProjectManager
  const activeProjectKey = React.useMemo(() => {
    if (urlProjectCode) {
      return urlProjectCode
    }
    return selectedProject ? getProjectCode(selectedProject) : null
  }, [urlProjectCode, selectedProject])

  // Don't render until selector data is loaded
  // This prevents flashing with incorrect state
  if (!selectorLoaded) {
    return null
  }

  // Show error state if selector data failed to load
  if (selectorError) {
    console.error('Failed to load selector data:', selectorError)
    // Still render - fail gracefully
  }

  // Don't render if projects are still loading or empty
  if (projectsLoading || projects.length === 0) {
    return null
  }

  // Don't render if we don't have an active project
  if (!activeProjectKey) {
    return null
  }

  return (
    <div
      className={`project-selector ${className}`.trim()}
      data-testid="project-selector"
    >
      {/* Rail: active project + inactive visible projects */}
      <TooltipProvider>
        <ProjectSelectorRail
          projects={projects}
          activeProjectKey={activeProjectKey}
          preferences={preferences}
          selectorState={selectorState}
          onProjectSelect={handleProjectSelect}
          onLauncherClick={handleLauncherClick}
          onFavoriteToggle={handleFavoriteToggle}
        />
      </TooltipProvider>

      {/* Panel: full project list (opens when launcher is clicked) */}
      <ProjectBrowserPanel
        projects={projects}
        activeProjectKey={activeProjectKey}
        preferences={preferences}
        selectorState={selectorState}
        onProjectSelect={handleProjectSelect}
        onFavoriteToggle={handleFavoriteToggle}
        isOpen={isPanelOpen}
        onClose={handlePanelClose}
      />
    </div>
  )
}

export default ProjectSelector
export { ProjectSelector }
