/**
 * useProjectRouteValidation tests (controlled refactor stage 3a).
 *
 * The effect body moved verbatim from ProjectRouteHandler; these tests pin its
 * observable contract: gate conditions, read-only escalation, code validation,
 * not-found messaging per access mode, and selection side effects.
 */
import type { Project } from '@mdt/shared/models/Project'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { useProjectRouteValidation } from './useProjectRouteValidation'

function makeProject(code: string): Project {
  return { project: { code, name: code, path: `/tmp/${code}` } } as unknown as Project
}

const base = {
  projects: [makeProject('MDT')],
  selectedProject: null,
  projectsLoading: false,
  authRefreshInFlight: false,
  accessMode: 'owner-admin' as const,
  projectCode: 'MDT',
  markLocked: mock(() => {}),
  setSelectedProject: mock((_p: Project | null) => {}),
}

beforeEach(() => {
  localStorage.clear()
  base.markLocked.mockClear()
  base.setSelectedProject.mockClear()
})

afterEach(() => {
  localStorage.clear()
})

describe('useProjectRouteValidation', () => {
  it('selects and records the current project when the code matches', () => {
    const { result } = renderHook(() => useProjectRouteValidation({ ...base }))

    expect(result.current.error).toBe(null)
    expect(base.setSelectedProject).toHaveBeenCalledTimes(1)
    expect(base.setSelectedProject).toHaveBeenCalledWith(base.projects[0])
    expect(localStorage.getItem('selectedProject')).toBe('MDT')
  })

  it('does not reselect when the selected project already matches', () => {
    const { result } = renderHook(() =>
      useProjectRouteValidation({ ...base, selectedProject: base.projects[0] }))

    expect(result.current.error).toBe(null)
    expect(base.setSelectedProject).not.toHaveBeenCalled()
  })

  it('rejects an invalid project code format', () => {
    const { result } = renderHook(() =>
      useProjectRouteValidation({ ...base, projectCode: 'bad_code!' }))

    expect(result.current.error).toBe(`Invalid project code format: 'bad_code!'`)
    expect(base.setSelectedProject).not.toHaveBeenCalled()
  })

  it('reports not found for an unknown code in owner mode', () => {
    const { result } = renderHook(() =>
      useProjectRouteValidation({ ...base, projectCode: 'ZZZ' }))

    expect(result.current.error).toBe(`Project 'ZZZ' not found`)
  })

  it('reports the access-restricted message in read-only mode', () => {
    const { result } = renderHook(() =>
      useProjectRouteValidation({ ...base, accessMode: 'read-only', projectCode: 'ZZZ' }))

    expect(result.current.error).toContain(`Project 'ZZZ' does not exist or is not available with current access`)
  })

  it('escalates to locked when read-only has no projects at all', () => {
    const { result } = renderHook(() =>
      useProjectRouteValidation({ ...base, accessMode: 'read-only', projects: [] }))

    expect(base.markLocked).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe(null)
  })

  it('stays quiet while gated (loading / auth refresh / unknown / locked / backend-down)', () => {
    for (const override of [
      { projectsLoading: true },
      { authRefreshInFlight: true },
      { accessMode: 'unknown' as const },
      { accessMode: 'locked' as const },
      { accessMode: 'backend-down' as const },
    ]) {
      const markLocked = mock(() => {})
      const { result } = renderHook(() =>
        useProjectRouteValidation({ ...base, ...override, markLocked }))
      expect(result.current.error).toBe(null)
      expect(markLocked).not.toHaveBeenCalled()
      expect(base.setSelectedProject).not.toHaveBeenCalled()
    }
  })

  it('does nothing without a project code (non-project route)', () => {
    const { result } = renderHook(() =>
      useProjectRouteValidation({ ...base, projectCode: undefined }))

    expect(result.current.error).toBe(null)
    expect(base.setSelectedProject).not.toHaveBeenCalled()
  })

  it('reacts to a project list that later contains the code', () => {
    const props = { ...base, projects: [] as Project[] }
    const { result, rerender } = renderHook(() => useProjectRouteValidation(props))

    expect(result.current.error).toBe(`Project 'MDT' not found`)

    props.projects = [makeProject('MDT')]
    rerender()
    expect(result.current.error).toBe(null)
    expect(base.setSelectedProject).toHaveBeenCalledTimes(1)
  })

  it('clears a stale error once the project appears (errorRef pattern)', async () => {
    const props = { ...base, projects: [], accessMode: 'owner-admin' as const }
    const { result, rerender } = renderHook(() => useProjectRouteValidation(props))
    expect(result.current.error).toBe(`Project 'MDT' not found`)

    props.projects = [makeProject('MDT')]
    await act(async () => {
      rerender()
    })
    expect(result.current.error).toBe(null)
  })
})
