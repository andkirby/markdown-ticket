/**
 * useTicketDocumentContent Unit Tests - MDT-144.
 *
 * The subdocument API returns fs timestamps alongside content; the hook must
 * surface the active path's timestamps so the ticket view can describe the
 * document actually being displayed (not the ticket root).
 *
 * Covers:
 * - Main document: no active timestamps (caller falls back to ticket dates)
 * - Subdoc fetch: activeTimestamps mirror the API response
 * - Cache hit: timestamps served without a second fetch
 * - invalidateAndRefetch (SSE external-edit path): fresh timestamps picked up
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { useTicketDocumentContent } from './useTicketDocumentContent'

const fetchSubDocument = mock(async (_projectId: string, _ticketCode: string, subDocName: string) => ({
  code: subDocName,
  content: `# ${subDocName}`,
  dateCreated: '2026-09-01T10:00:00Z',
  lastModified: '2026-09-29T11:41:00Z',
}))

mock.module('../../services/dataLayer', () => ({
  dataLayer: { fetchSubDocument },
}))

type ContentHookOptions = Parameters<typeof useTicketDocumentContent>[0]

const baseOptions: ContentHookOptions = {
  projectId: 'MDT',
  ticketCode: 'MDT-173',
  selectedPath: 'uat',
  mainContent: '# Main',
  pendingPath: null,
}

function renderContentHook(overrides: Partial<ContentHookOptions> = {}) {
  return renderHook(
    (props: ContentHookOptions) => useTicketDocumentContent(props),
    { initialProps: { ...baseOptions, ...overrides } },
  )
}

describe('useTicketDocumentContent activeTimestamps', () => {
  beforeEach(() => {
    fetchSubDocument.mockClear()
    fetchSubDocument.mockImplementation(async (_projectId: string, _ticketCode: string, subDocName: string) => ({
      code: subDocName,
      content: `# ${subDocName}`,
      dateCreated: '2026-09-01T10:00:00Z',
      lastModified: '2026-09-29T11:41:00Z',
    }))
  })

  afterEach(() => {
    mock.restore()
  })

  it('exposes no active timestamps for the main document', () => {
    const { result } = renderContentHook({ selectedPath: 'main' })

    expect(result.current.content).toBe('# Main')
    expect(result.current.activeTimestamps).toBeNull()
    expect(fetchSubDocument).not.toHaveBeenCalled()
  })

  it('exposes the fetched subdocument timestamps', async () => {
    const { result } = renderContentHook({ selectedPath: 'uat' })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchSubDocument).toHaveBeenCalledWith('MDT', 'MDT-173', 'uat')
    expect(result.current.activeTimestamps).toEqual({
      dateCreated: '2026-09-01T10:00:00Z',
      lastModified: '2026-09-29T11:41:00Z',
    })
  })

  it('serves cached timestamps on re-select without refetching', async () => {
    const { result, rerender } = renderContentHook()
    await waitFor(() => expect(result.current.loading).toBe(false))

    rerender({ ...baseOptions, selectedPath: 'main' })
    expect(result.current.activeTimestamps).toBeNull()

    rerender({ ...baseOptions, selectedPath: 'uat' })
    expect(result.current.activeTimestamps).toEqual({
      dateCreated: '2026-09-01T10:00:00Z',
      lastModified: '2026-09-29T11:41:00Z',
    })
    expect(fetchSubDocument).toHaveBeenCalledTimes(1)
  })

  it('picks up fresh timestamps after invalidateAndRefetch (external edit)', async () => {
    const { result } = renderContentHook({ selectedPath: 'uat' })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // External edit lands: fs mtime moves, SSE invalidates the path
    fetchSubDocument.mockImplementation(async (_projectId: string, _ticketCode: string, subDocName: string) => ({
      code: subDocName,
      content: `# ${subDocName} v2`,
      dateCreated: '2026-09-01T10:00:00Z',
      lastModified: '2026-09-30T20:35:00Z',
    }))

    act(() => {
      result.current.invalidateAndRefetch('uat')
    })

    await waitFor(() => expect(result.current.content).toBe('# uat v2'))
    expect(result.current.activeTimestamps?.lastModified).toBe('2026-09-30T20:35:00Z')
  })
})
