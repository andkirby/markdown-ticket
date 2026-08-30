import type { NavigateFunction } from 'react-router-dom'
/**
 * useTicketModalRoute tests (controlled refactor stage 3c).
 *
 * Pins the ticket-from-URL effect contract: modal opens for a known ticket,
 * inline error for an unknown one (only once the project has loaded), cleared
 * state off the ticket route, and the ?view= round-trip in open/close.
 */
import type { Ticket } from '../../../types'
import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { useTicketModalRoute } from './useTicketModalRoute'

function makeTicket(code: string): Ticket {
  return { code, title: `Ticket ${code}` } as unknown as Ticket
}

const tickets = [makeTicket('MDT-101'), makeTicket('MDT-102')]

const base = {
  tickets,
  projectsLoading: false,
  selectedProject: { project: { code: 'MDT' } } as never,
  projectCode: 'MDT',
  viewParam: null,
  viewMode: 'board' as const,
}

function render(params: Partial<Parameters<typeof useTicketModalRoute>[0]> = {}) {
  const navigate = mock(() => {}) as unknown as NavigateFunction
  const pathname = params.pathname ?? '/prj/MDT'
  const result = renderHook(() =>
    useTicketModalRoute({ ...base, ...params, pathname, navigate }))
  return { result, navigate, pathname }
}

afterEach(() => {
  // no state to reset beyond the hook instances
})

describe('useTicketModalRoute ticket-from-URL effect', () => {
  it('selects the ticket whose key is in the URL', () => {
    const { result } = render({ pathname: '/prj/MDT/ticket/MDT-101' })

    expect(result.result.current.selectedTicket?.code).toBe('MDT-101')
    expect(result.result.current.ticketError).toBe(null)
  })

  it('normalizes the ticket key from the URL (zero-padded number reformats)', () => {
    const { result } = render({ pathname: '/prj/MDT/ticket/MDT-0101' })

    expect(result.result.current.selectedTicket?.code).toBe('MDT-101')
  })

  it('shows the inline error for an unknown ticket once the project is loaded', () => {
    const { result } = render({ pathname: '/prj/MDT/ticket/MDT-404' })

    expect(result.result.current.selectedTicket).toBe(null)
    expect(result.result.current.ticketError).toBe(`Ticket 'MDT-404' not found`)
  })

  it('keeps quiet for an unknown ticket while the project is still loading', () => {
    const { result } = render({ pathname: '/prj/MDT/ticket/MDT-404', projectsLoading: true })

    expect(result.result.current.selectedTicket).toBe(null)
    expect(result.result.current.ticketError).toBe(null)
  })

  it('clears state when the URL leaves the ticket route', async () => {
    const props = { ...base, pathname: '/prj/MDT/ticket/MDT-101' }
    const navigate = mock(() => {}) as unknown as NavigateFunction
    const { result, rerender } = renderHook(() => useTicketModalRoute({ ...props, navigate }))

    expect(result.current.selectedTicket?.code).toBe('MDT-101')

    await act(async () => {
      props.pathname = '/prj/MDT/list'
      rerender()
    })
    expect(result.current.selectedTicket).toBe(null)
    expect(result.current.ticketError).toBe(null)
  })
})

describe('useTicketModalRoute open/close navigation', () => {
  it('navigates to the ticket in the current project carrying a non-board view param', () => {
    const { result, navigate } = render({ viewMode: 'list' })

    act(() => result.result.current.handleTicketClick(tickets[0]))
    expect(navigate).toHaveBeenCalledWith('/prj/MDT/ticket/MDT-101?view=list')
  })

  it('omits the view param for the board view', () => {
    const { result, navigate } = render({ viewMode: 'board' })

    act(() => result.result.current.handleTicketClick(tickets[0]))
    expect(navigate).toHaveBeenCalledWith('/prj/MDT/ticket/MDT-101')
  })

  it('carries epics when opening from the /epics route even though viewMode is board', () => {
    const navigate2 = mock(() => {}) as unknown as NavigateFunction
    const r2 = renderHook(() =>
      useTicketModalRoute({ ...base, pathname: '/prj/MDT/epics', viewMode: 'board', navigate: navigate2 }))
    act(() => r2.result.current.handleTicketClick(tickets[0]))
    expect(navigate2).toHaveBeenCalledWith('/prj/MDT/ticket/MDT-101?view=epics')
  })

  it('routes cross-project clicks to the owning project', () => {
    const { result, navigate } = render({})

    act(() => result.result.current.handleTicketClick(makeTicket('OTHER-9'), 'OTHER'))
    expect(navigate).toHaveBeenCalledWith('/prj/OTHER/ticket/OTHER-9')
  })

  it('closes back to the plain board path without a view param', () => {
    const { result, navigate } = render({ viewParam: null })

    act(() => result.result.current.handleTicketClose())
    expect(navigate).toHaveBeenCalledWith('/prj/MDT')
  })

  it('closes back to the originating view from the param', () => {
    const { result, navigate } = render({ viewParam: 'list' })

    act(() => result.result.current.handleTicketClose())
    expect(navigate).toHaveBeenCalledWith('/prj/MDT/list')
  })

  it('closes back to the epics route from the epics param', () => {
    const { result, navigate } = render({ viewParam: 'epics' })

    act(() => result.result.current.handleTicketClose())
    expect(navigate).toHaveBeenCalledWith('/prj/MDT/epics')
  })
})
