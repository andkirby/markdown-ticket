import type { AccessMode } from '@mdt/domain-contracts'
import type { Project } from '@mdt/shared/models/Project'
import { useEffect, useRef, useState } from 'react'
import { getProjectCode } from '../../../utils/projectUtils'
import { setCurrentProject, validateProjectCode } from '../../../utils/routing'

export interface UseProjectRouteValidationParams {
  projects: Project[]
  selectedProject: Project | null
  projectsLoading: boolean
  authRefreshInFlight: boolean
  accessMode: AccessMode
  projectCode?: string
  markLocked: () => void
  setSelectedProject: (project: Project | null) => void
}

/**
 * Route-level project code validation and selection (controlled refactor 3a).
 *
 * Owns the route error state and the errorRef pattern (setters stored in refs
 * so the effect can write state without re-subscribing). The effect body and
 * dependency array moved verbatim from ProjectRouteHandler; effect order is
 * load-bearing — this hook must be called after the auth-gate effects and
 * before the view-mode redirect effect (see plan INV-6).
 */
export function useProjectRouteValidation({
  projects,
  selectedProject,
  projectsLoading,
  authRefreshInFlight,
  accessMode,
  projectCode,
  markLocked,
  setSelectedProject,
}: UseProjectRouteValidationParams) {
  const [error, setError] = useState<string | null>(null)

  // Store state setters in refs to avoid direct setState in useEffect
  const errorRef = useRef(error)
  errorRef.current = error
  const setErrorRef = useRef(setError)
  setErrorRef.current = setError

  // Handle project selection and validation
  useEffect(() => {
    if (
      projectsLoading
      || authRefreshInFlight
      || accessMode === 'unknown'
      || accessMode === 'locked'
      || accessMode === 'backend-down'
    ) {
      setErrorRef.current(null) // Clear errors when loading
      return
    }

    if (accessMode === 'read-only' && projects.length === 0) {
      markLocked()
      return
    }

    if (!projectCode)
      return

    // Validate project code format
    if (!validateProjectCode(projectCode)) {
      setErrorRef.current(`Invalid project code format: '${projectCode}'`)
      return
    }

    const project = projects.find(p => getProjectCode(p) === projectCode)
    if (!project) {
      setErrorRef.current(
        accessMode === 'read-only'
          ? `Project '${projectCode}' does not exist or is not available with current access. Open an allowed project from the home route or unlock access.`
          : `Project '${projectCode}' not found`,
      )
      return
    }

    if (!selectedProject || getProjectCode(selectedProject) !== projectCode) {
      setSelectedProject(project)
      setCurrentProject(projectCode)
    }
    setErrorRef.current(null)
  }, [
    accessMode,
    authRefreshInFlight,
    markLocked,
    projectCode,
    projects,
    projectsLoading,
    selectedProject,
    setSelectedProject,
  ])

  return { error }
}
