/**
 * MDT-246: EpicBoardAction unit tests (BR-1.1)
 *
 * Renders the "Epics →" CTA for the CompactTicketHeader action slot on epic
 * tickets: Rows3 leading glyph, trailing arrow-right, full-sentence accessible
 * name (Label-in-Name), and one-navigation to the focused Epics deep link
 * (BR-1.3). The level gating itself lives in TicketViewer (covered E2E).
 */
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'bun:test'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { EpicBoardAction } from './EpicBoardAction'

function renderWithProbe(projectCode: string, ticketCode: string) {
  const locationLog: string[] = []
  function LocationProbe() {
    const location = useLocation()
    locationLog.push(`${location.pathname}${location.search}`)
    return null
  }
  const utils = render(
    <MemoryRouter initialEntries={[`/prj/${projectCode}/ticket/${ticketCode}`]}>
      <LocationProbe />
      <Routes>
        <Route
          path="/prj/:projectCode/ticket/:ticketKey"
          element={<EpicBoardAction projectCode={projectCode} ticketCode={ticketCode} />}
        />
        <Route path="/prj/:projectCode/epics" element={<div data-testid="epics-route" />} />
      </Routes>
    </MemoryRouter>,
  )
  return { ...utils, locationLog }
}

describe('EpicBoardAction (MDT-246)', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the Epics label with leading Rows3 and trailing arrow glyphs', () => {
    const { container } = renderWithProbe('MDT', 'MDT-231')
    const button = container.querySelector('[data-testid="epic-board-action"]') as HTMLElement
    expect(button).not.toBeNull()
    expect(button.textContent).toContain('Epics')
    // Two decorative glyphs: leading rows-3 + trailing arrow-right.
    expect(button.querySelectorAll('svg[aria-hidden="true"]').length).toBe(2)
  })

  it('carries the full-sentence accessible name and tooltip (C-1)', () => {
    const { container } = renderWithProbe('MDT', 'MDT-231')
    const button = container.querySelector('[data-testid="epic-board-action"]') as HTMLElement
    expect(button.getAttribute('aria-label')).toBe('Show MDT-231 on Epics board')
    expect(button.getAttribute('title')).toBe('Show MDT-231 on Epics board')
    // Label-in-Name: visible label ⊂ accessible name.
    expect(button.getAttribute('aria-label')).toContain('Epics')
  })

  it('navigates in one step to the focused Epics deep link (BR-1.3)', () => {
    const { container, locationLog } = renderWithProbe('MDT', 'MDT-231')
    fireEvent.click(container.querySelector('[data-testid="epic-board-action"]') as HTMLElement)
    expect(locationLog[locationLog.length - 1]).toBe('/prj/MDT/epics?epic=MDT-231')
  })
})
