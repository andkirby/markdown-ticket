/**
 * Project Selector Manager Hook (MDT-129)
 *
 * Computes the visible subset of projects for rail and panel views.
 * Implements BR-6 ordering requirements and BR-9 mobile responsive behavior.
 *
 * Responsibilities:
 * - Merge Project[] with selector state (favorites, usage tracking)
 * - Compute rail order with active project prioritization and visible count limit
 * - Compute panel order showing all projects
 * - Handle mobile responsive collapse (BR-9)
 */

import type { Project } from '@mdt/shared/models/Project'
import type { ProjectWithSelectorState as ProjectWithSelectorStateType, SelectorPreferences, SelectorState } from './types'
import type { ProjectWithSelectorState } from '@/utils/selectorOrdering'
import { useEffect, useMemo, useState } from 'react'
import { computePanelOrder, computeRailOrder } from '@/utils/selectorOrdering'

/**
 * Return value from useProjectSelectorManager hook
 */
export interface ProjectSelectorManagerResult {
  /** Projects ordered for rail display (respecting visibleCount and mobile) */
  railProjects: ProjectWithSelectorStateType[]
  /** All projects ordered for panel display */
  panelProjects: ProjectWithSelectorStateType[]
  /** Whether viewport is mobile-sized (< 768px) */
  isMobile: boolean
}

/**
 * Merge Project with selector state into ProjectWithSelectorState
 */
function mergeProjectWithSelectorState(
  project: Project,
  selectorState: Record<string, SelectorState>,
): ProjectWithSelectorStateType {
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
 * Mobile breakpoint for responsive selector behavior (BR-9)
 */
const MOBILE_BREAKPOINT = 768 // px

/**
 * Detect mobile viewport using matchMedia
 */
function useMobileDetection(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Skip on server
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    // Set initial value
    setIsMobile(mediaQuery.matches)

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }

    // Modern browsers
    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return isMobile
}

/**
 * Compute visible subset of projects for rail and panel
 *
 * @param projects - All available projects
 * @param activeProjectKey - Key of currently active project
 * @param preferences - User preferences from user.toml
 * @param selectorState - Per-project selector state from project-selector.json
 *
 * @returns Rail and panel project lists with mobile responsive behavior
 *
 * Behavior scenarios:
 * - active_project_always_visible: Active project always in rail
 * - panel_displays_full_project_list: Panel shows all projects
 * - rail_ordering_prioritizes_favorites: Favorites sorted first in rail
 * - mobile_responsive_selector: Mobile shows only active + launcher
 *
 * Mobile responsive (BR-9):
 * - On mobile, rail shows only active + launcher
 * - Panel provides access to all projects
 */
export function useProjectSelectorManager(
  projects: Project[],
  activeProjectKey: string,
  preferences: SelectorPreferences,
  selectorState: Record<string, SelectorState>,
): ProjectSelectorManagerResult {
  const isMobile = useMobileDetection()

  // Merge projects with selector state
  const projectsWithState = useMemo(() => {
    return projects.map(project =>
      mergeProjectWithSelectorState(project, selectorState),
    )
  }, [projects, selectorState])

  // Convert to selectorOrdering format (flat structure)
  const orderingProjects = useMemo(() => {
    return projectsWithState.map(p => ({
      key: p.project.code || p.id,
      name: p.project.name,
      code: p.project.code || p.id, // Ensure code is never undefined
      favorite: p.favorite,
      lastUsedAt: p.lastUsedAt,
      count: p.count,
    }))
  }, [projectsWithState])

  // Compute rail order with mobile responsive behavior
  const railProjects = useMemo(() => {
    if (isMobile) {
      // BR-9.1: On mobile, show only active project
      const activeProject = orderingProjects.find(p => p.key === activeProjectKey)
      return activeProject ? [activeProject] : []
    }

    // Desktop: Use standard rail ordering with visibleCount limit
    return computeRailOrder(orderingProjects, activeProjectKey, preferences)
  }, [orderingProjects, activeProjectKey, preferences, isMobile])

  // Compute panel order (all projects, ordered)
  const panelProjects = useMemo(() => {
    return computePanelOrder(orderingProjects, activeProjectKey)
  }, [orderingProjects, activeProjectKey])

  // Map ordering results back to ProjectWithSelectorStateType
  const mapToFullProject = (p: ProjectWithSelectorState): ProjectWithSelectorStateType => {
    const fullProject = projectsWithState.find(
      proj => (proj.project.code || proj.id) === p.key,
    )

    if (fullProject) {
      return fullProject
    }

    // Fallback: Create a minimal ProjectWithSelectorStateType
    const state = selectorState[p.key] || {
      favorite: false,
      lastUsedAt: null,
      count: 0,
    }

    return {
      id: p.key,
      project: {
        id: p.key,
        name: p.name,
        code: p.code,
        path: '',
        configFile: '',
        active: false,
        description: '',
        repository: '',
        ticketsPath: '',
      },
      metadata: {
        dateRegistered: '',
        lastAccessed: '',
        version: '1.0',
      },
      selectorState: state,
      favorite: state.favorite,
      lastUsedAt: state.lastUsedAt,
      count: state.count,
    }
  }

  return {
    railProjects: railProjects.map(mapToFullProject),
    panelProjects: panelProjects.map(mapToFullProject),
    isMobile,
  }
}
