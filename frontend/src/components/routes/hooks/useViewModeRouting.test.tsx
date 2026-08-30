/**
 * useViewModeRouting tests (controlled refactor stage 3b).
 *
 * Pins INV-4 (persistence writes) and the MDT-206 default-view redirect:
 * every localStorage write moved verbatim, so these lock the exact keys and
 * values, including the legacy lastBoardListMode sync.
 */
import type { ReactNode } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { useViewModeRouting } from './useViewModeRouting'

const initialPathRef = { current: '/prj/MDT' }

function RouterWrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter initialEntries={[initialPathRef.current]}>{children}</MemoryRouter>
}

/** Renders the hook against a real router at the given path (handler cases). */
function renderHookInRouter(projectCode: string | undefined, path: string) {
  initialPathRef.current = path
  const { result } = renderHook(
    () => {
      const navigate = useNavigate()
      const hook = useViewModeRouting({ projectCode, pathname: path, navigate })
      return { navigate, hook }
    },
    { wrapper: RouterWrapper },
  )
  return { result }
}

/** Renders the hook with a stubbed navigate (redirect-effect cases). */
function renderWithStubNavigate(projectCode: string | undefined, pathname: string) {
  const navigate = mock(() => {}) as unknown as NavigateFunction
  const { result } = renderHook(() => useViewModeRouting({ projectCode, pathname, navigate }))
  return { result, navigate }
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('useViewModeRouting handleViewModeChange (INV-4 persistence)', () => {
  it('persists list mode across all three keys', () => {
    const { result } = renderHookInRouter('MDT', '/prj/MDT/list')

    act(() => result.current.hook.handleViewModeChange('list'))

    expect(localStorage.getItem('lastViewMode')).toBe('list')
    expect(localStorage.getItem('lastBoardListMode')).toBe('list')
    expect(localStorage.getItem('mdt-settings-default-view')).toBe('list')
  })

  it('persists swimlanes as epics in view keys and syncs legacy key to board', () => {
    const { result } = renderHookInRouter('MDT', '/prj/MDT/epics')

    act(() => result.current.hook.handleViewModeChange('swimlanes'))

    expect(localStorage.getItem('lastViewMode')).toBe('epics')
    expect(localStorage.getItem('lastBoardListMode')).toBe('board')
    expect(localStorage.getItem('mdt-settings-default-view')).toBe('epics')
    expect(localStorage.getItem('mdt-board-mode')).toBe('swimlanes')
  })

  it('persists flat board and clears swimlane layout preference', () => {
    const { result } = renderHookInRouter('MDT', '/prj/MDT')

    act(() => result.current.hook.handleViewModeChange('board'))

    expect(localStorage.getItem('lastViewMode')).toBe('board')
    expect(localStorage.getItem('lastBoardListMode')).toBe('board')
    expect(localStorage.getItem('mdt-settings-default-view')).toBe('board')
    expect(localStorage.getItem('mdt-board-mode')).toBe('flat')
  })

  it('documents mode writes lastViewMode but not the board/list keys', () => {
    const { result } = renderHookInRouter('MDT', '/prj/MDT/documents')

    act(() => result.current.hook.handleViewModeChange('documents'))

    expect(localStorage.getItem('lastViewMode')).toBe('documents')
    expect(localStorage.getItem('lastBoardListMode')).toBe(null)
    expect(localStorage.getItem('mdt-settings-default-view')).toBe(null)
  })
})

describe('useViewModeRouting default-view redirect (MDT-206)', () => {
  it('redirects a bare project path to the persisted default list view', () => {
    localStorage.setItem('mdt-settings-default-view', 'list')
    const { navigate } = renderWithStubNavigate('MDT', '/prj/MDT')

    expect(navigate).toHaveBeenCalledWith('/prj/MDT/list', { replace: true })
  })

  it('redirects a bare project path to the persisted default epics view', () => {
    localStorage.setItem('mdt-settings-default-view', 'epics')
    const { navigate } = renderWithStubNavigate('MDT', '/prj/MDT')

    expect(navigate).toHaveBeenCalledWith('/prj/MDT/epics', { replace: true })
  })

  it('stays on the bare board path when the default is board', () => {
    localStorage.setItem('mdt-settings-default-view', 'board')
    const { navigate } = renderWithStubNavigate('MDT', '/prj/MDT')

    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not redirect non-root project paths', () => {
    localStorage.setItem('mdt-settings-default-view', 'list')
    const { navigate } = renderWithStubNavigate('MDT', '/prj/MDT/list')

    expect(navigate).not.toHaveBeenCalled()
  })

  it('does nothing without a project code', () => {
    const { navigate } = renderWithStubNavigate(undefined, '/prj/MDT')

    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('useViewModeRouting board layout state', () => {
  it('exposes the persisted preference as initial layout', () => {
    localStorage.setItem('mdt-board-mode', 'swimlanes')

    const { result } = renderWithStubNavigate('MDT', '/prj/MDT')

    expect(result.current.boardLayoutMode).toBe('swimlanes')
  })
})
