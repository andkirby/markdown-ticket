import type { NavigateFunction } from 'react-router-dom'
import type { ViewSwitcherMode } from '../../ViewModeSwitcher'
import { useEffect, useState } from 'react'
import {
  BoardLayoutMode,
  getBoardLayoutModePreference,
  setBoardLayoutModePreference,
} from '../../../config/boardLayoutMode'
import {
  getDefaultView,
  setDefaultViewPreference,
} from '../../../config/settingsPreferences'
import {
  buildProjectPath,
  ROUTE_PROJECT,
  routePatternToRegex,
} from '../../../routes'

export interface UseViewModeRoutingParams {
  projectCode?: string
  pathname: string
  navigate: NavigateFunction
}

/**
 * Default-view redirect + board-layout persistence for the project route
 * (controlled refactor 3b).
 *
 * Owns the board layout mode state and is the single owner of all view-mode
 * persistence writes (INV-4: lastViewMode, lastBoardListMode legacy sync,
 * mdt-board-mode and the Default View key via their config modules — raw
 * writes kept verbatim). The redirect effect and switch handler moved
 * verbatim from ProjectRouteHandler.
 *
 * Contract refinement vs plan (recorded in result.md): the pure view
 * derivation (viewMode / onEpicsRoute / effectiveBoardLayoutMode) stays at
 * its original render-time position in the component — moving it here would
 * force this hook to be called before useProjectRouteValidation, breaking
 * the pinned effect order (INV-6). The hook exposes the raw
 * `boardLayoutMode` instead; the component derives the effective layout from
 * it exactly as before (three pure lines over viewModeDerivation + pathname).
 *
 * This hook must be called after useProjectRouteValidation and before the
 * ticket-from-URL effect (effect order, plan INV-6).
 */
export function useViewModeRouting({ projectCode, pathname, navigate }: UseViewModeRoutingParams) {
  const [boardLayoutMode, setBoardLayoutMode] = useState(getBoardLayoutModePreference)

  // Initialize view mode from localStorage when URL has no view suffix
  useEffect(() => {
    if (!projectCode)
      return

    // Check if URL is just /prj/:code (no view suffix)
    // Derive from ROUTE_PROJECT pattern constant — MDT-184
    const isRootProjectPath = routePatternToRegex(ROUTE_PROJECT).test(
      pathname,
    )

    if (isRootProjectPath) {
      // MDT-206: the bare /prj/:code path redirects to the user's Default View
      // (Settings → Default View). This is the authoritative landing preference;
      // the switcher keeps it in sync on every view change.
      const defaultView = getDefaultView()
      if (defaultView === 'list') {
        navigate(buildProjectPath(projectCode, 'list'), { replace: true })
      }
      else if (defaultView === 'epics') {
        navigate(buildProjectPath(projectCode, 'epics'), { replace: true })
      }
      // Otherwise stay on flat board view (default)
    }
  }, [projectCode, pathname, navigate])

  const handleViewModeChange = (mode: ViewSwitcherMode) => {
    const basePath = buildProjectPath(projectCode!)
    // MDT-206: swimlanes now has its own /epics route (deep-linkable), mirroring /list.
    const pathView = mode === 'swimlanes' ? 'epics' : mode
    const newPath = mode === 'board' ? basePath : buildProjectPath(projectCode!, pathView)

    if (mode === 'swimlanes') {
      setBoardLayoutMode(BoardLayoutMode.SWIMLANES)
      setBoardLayoutModePreference(BoardLayoutMode.SWIMLANES)
    }
    else if (mode === 'board') {
      setBoardLayoutMode(BoardLayoutMode.FLAT)
      setBoardLayoutModePreference(BoardLayoutMode.FLAT)
    }

    // MDT-206: "Default View" = the view a user lands on. Persist the chosen
    // board/list/epics view as the default so the bare /prj/:code redirect
    // (below) lands on the last-used view. This unifies the previously orphaned
    // settings preference with the actual landing behavior.
    if (mode === 'board' || mode === 'list' || mode === 'swimlanes') {
      const defaultView = mode === 'swimlanes' ? 'epics' : mode
      setDefaultViewPreference(defaultView)
      // Keep the legacy key in sync for any reader still on it.
      localStorage.setItem('lastBoardListMode', mode === 'list' ? 'list' : 'board')
    }
    localStorage.setItem('lastViewMode', mode === 'swimlanes' ? 'epics' : mode)

    navigate(newPath)
  }

  return { boardLayoutMode, handleViewModeChange }
}
