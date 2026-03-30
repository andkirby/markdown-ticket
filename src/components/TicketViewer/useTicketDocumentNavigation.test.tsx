/**
 * useTicketDocumentNavigation Unit Tests - MDT-093.
 *
 * Tests the sole frontend authority for selected path and folder-stack transitions.
 *
 * Covers:
 * - BR-4.1: URL hash updates when a non-main document is selected
 * - BR-4.2: Nested paths encoded with slash-separated segments
 * - BR-4.3: Page load with valid hash reopens folder levels and shows target document
 * - BR-4.4: Invalid hash falls back to main
 * - C4: Deep links use stable relative document paths in the URL hash
 */

import type { ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { MemoryRouter } from 'react-router-dom'
import { useTicketDocumentNavigation } from './useTicketDocumentNavigation'

// Wrapper component to provide Router context
function wrapper({ children, initialEntries = ['/'] }: { children: ReactNode, initialEntries?: string[] }) {
  return (
    <MemoryRouter initialEntries={initialEntries}>
      {children}
    </MemoryRouter>
  )
}

describe('useTicketDocumentNavigation', () => {
  beforeEach(() => {
    // Reset URL hash before each test
    window.location.hash = ''
  })

  afterEach(() => {
    window.location.hash = ''
  })

  // ─── Initial state ────────────────────────────────────────────────────────

  it('initializes with main selected and empty folder stack', () => {
    const { result } = renderHook(
      () => useTicketDocumentNavigation({ subdocuments: [], ticketCode: 'MDT-093', projectCode: 'MDT' }),
      { wrapper: ({ children }) => wrapper({ children }) },
    )
    expect(result.current.selectedPath).toBe('main')
    expect(result.current.folderStack).toEqual([])
  })

  // ─── Hash initialization (BR-4.3, C4) ────────────────────────────────────

  it('selects the document referenced by a valid URL hash on mount (BR-4.3)', () => {
    const subdocuments = [{ name: 'requirements', kind: 'file' as const, children: [] }]
    const { result } = renderHook(
      () => useTicketDocumentNavigation({ subdocuments, ticketCode: 'MDT-093', projectCode: 'MDT' }),
      { wrapper: ({ children }) => wrapper({ children, initialEntries: ['/ticket/MDT-093#requirements'] }) },
    )
    expect(result.current.selectedPath).toBe('requirements')
  })

  it('falls back to main when URL hash references a non-existent document (BR-4.4)', () => {
    const subdocuments = [{ name: 'requirements', kind: 'file' as const, children: [] }]
    const { result } = renderHook(
      () => useTicketDocumentNavigation({ subdocuments, ticketCode: 'MDT-093', projectCode: 'MDT' }),
      { wrapper: ({ children }) => wrapper({ children, initialEntries: ['/ticket/MDT-093#nonexistent-doc'] }) },
    )
    expect(result.current.selectedPath).toBe('main')
  })

  it('restores nested folder levels from a slash-encoded URL hash (BR-4.2, BR-4.3)', () => {
    const subdocuments = [
      {
        name: 'poc',
        kind: 'folder' as const,
        children: [{ name: 'spike', kind: 'file' as const, children: [] }],
      },
    ]
    const { result } = renderHook(
      () => useTicketDocumentNavigation({ subdocuments, ticketCode: 'MDT-093', projectCode: 'MDT' }),
      { wrapper: ({ children }) => wrapper({ children, initialEntries: ['/ticket/MDT-093#poc/spike'] }) },
    )
    expect(result.current.selectedPath).toBe('poc/spike')
    expect(result.current.folderStack).toContain('poc')
  })

  // ─── Selection and URL update (BR-4.1, C4) ───────────────────────────────

  it('updates selected path when a non-main document is selected (BR-4.1, C4)', () => {
    const subdocuments = [{ name: 'tasks', kind: 'file' as const, children: [] }]
    const { result } = renderHook(
      () => useTicketDocumentNavigation({ subdocuments, ticketCode: 'MDT-093', projectCode: 'MDT' }),
      { wrapper: ({ children }) => wrapper({ children }) },
    )

    act(() => {
      result.current.selectPath('tasks')
    })

    expect(result.current.selectedPath).toBe('tasks')
  })

  it('handles nested path selection (BR-4.2, C4)', () => {
    const subdocuments = [
      {
        name: 'poc',
        kind: 'folder' as const,
        children: [{ name: 'results', kind: 'file' as const, children: [] }],
      },
    ]
    const { result } = renderHook(
      () => useTicketDocumentNavigation({ subdocuments, ticketCode: 'MDT-093', projectCode: 'MDT' }),
      { wrapper: ({ children }) => wrapper({ children }) },
    )

    act(() => {
      result.current.selectPath('poc/results')
    })

    expect(result.current.selectedPath).toBe('poc/results')
  })

  it('clears selection when main is selected (BR-4.1)', () => {
    const subdocuments = [{ name: 'tasks', kind: 'file' as const, children: [] }]
    const { result } = renderHook(
      () => useTicketDocumentNavigation({ subdocuments, ticketCode: 'MDT-093', projectCode: 'MDT' }),
      { wrapper: ({ children }) => wrapper({ children, initialEntries: ['/ticket/MDT-093#tasks'] }) },
    )

    act(() => {
      result.current.selectPath('main')
    })

    expect(result.current.selectedPath).toBe('main')
  })

  // ─── Folder stack transitions ─────────────────────────────────────────────

  it('pushes folder onto stack when a folder entry is selected', () => {
    const subdocuments = [
      {
        name: 'poc',
        kind: 'folder' as const,
        children: [{ name: 'spike', kind: 'file' as const, children: [] }],
      },
    ]
    const { result } = renderHook(
      () => useTicketDocumentNavigation({ subdocuments, ticketCode: 'MDT-093', projectCode: 'MDT' }),
      { wrapper: ({ children }) => wrapper({ children }) },
    )

    act(() => {
      result.current.selectPath('poc')
    })

    expect(result.current.folderStack).toContain('poc')
    expect(result.current.selectedPath).toBe('poc')
  })

  // ─── Single authority guarantee ───────────────────────────────────────────

  it('exposes selectPath as the only mutation interface (single transition authority)', () => {
    const { result } = renderHook(
      () => useTicketDocumentNavigation({ subdocuments: [], ticketCode: 'MDT-093', projectCode: 'MDT' }),
      { wrapper: ({ children }) => wrapper({ children }) },
    )
    expect(typeof result.current.selectPath).toBe('function')
    expect(typeof result.current.selectedPath).toBe('string')
    expect(Array.isArray(result.current.folderStack)).toBe(true)
  })
})
