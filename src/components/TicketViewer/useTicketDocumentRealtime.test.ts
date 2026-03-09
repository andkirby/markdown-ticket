/**
 * useTicketDocumentRealtime Unit Tests - MDT-093.
 *
 * Tests SSE-driven reconciliation of the visible sub-document structure.
 *
 * Covers:
 * - BR-5.1: Visible navigation updates when sub-document structure changes
 * - BR-5.2: Active document removed by update → fall back to main
 * - BR-5.4: Manual navigation continues when realtime delivery is unavailable
 * - C5: Realtime delivery failure does not block manual navigation
 */

import { describe, it, expect, mock } from 'bun:test'
import { act, renderHook } from '@testing-library/react'
import { useTicketDocumentRealtime } from './useTicketDocumentRealtime'

// RED phase: hook does not exist yet. Tests define the expected public interface.

/** Minimal SubDocument shape used by the hook */
interface SubDocEntry {
  name: string
  kind: 'file' | 'folder'
  children: SubDocEntry[]
}

describe('useTicketDocumentRealtime', () => {
  // ─── Initial state ────────────────────────────────────────────────────────

  it('exposes the current subdocuments list and an SSE event handler', () => {
    const initial: SubDocEntry[] = [{ name: 'requirements', kind: 'file', children: [] }]
    const { result } = renderHook(() =>
      useTicketDocumentRealtime({
        initialSubdocuments: initial,
        selectedPath: 'main',
        onActiveRemoved: mock(),
      }),
    )
    expect(Array.isArray(result.current.subdocuments)).toBe(true)
    expect(typeof result.current.handleSSEUpdate).toBe('function')
  })

  // ─── Structure reconciliation (BR-5.1) ────────────────────────────────────

  it('updates the subdocuments list when an SSE event delivers new structure (BR-5.1)', () => {
    const initial: SubDocEntry[] = [{ name: 'requirements', kind: 'file', children: [] }]
    const { result } = renderHook(() =>
      useTicketDocumentRealtime({
        initialSubdocuments: initial,
        selectedPath: 'main',
        onActiveRemoved: mock(),
      }),
    )

    const updated: SubDocEntry[] = [
      { name: 'requirements', kind: 'file', children: [] },
      { name: 'tasks', kind: 'file', children: [] },
    ]

    act(() => {
      result.current.handleSSEUpdate(updated)
    })

    const names = result.current.subdocuments.map((s: SubDocEntry) => s.name)
    expect(names).toContain('requirements')
    expect(names).toContain('tasks')
  })

  it('removes a tab that no longer exists in the updated structure (BR-5.1)', () => {
    const initial: SubDocEntry[] = [
      { name: 'requirements', kind: 'file', children: [] },
      { name: 'tasks', kind: 'file', children: [] },
    ]
    const { result } = renderHook(() =>
      useTicketDocumentRealtime({
        initialSubdocuments: initial,
        selectedPath: 'main',
        onActiveRemoved: mock(),
      }),
    )

    act(() => {
      result.current.handleSSEUpdate([{ name: 'requirements', kind: 'file', children: [] }])
    })

    const names = result.current.subdocuments.map((s: SubDocEntry) => s.name)
    expect(names).not.toContain('tasks')
  })

  // ─── Active document removed (BR-5.2) ────────────────────────────────────

  it('calls onActiveRemoved when the currently selected document disappears (BR-5.2)', () => {
    const onActiveRemoved = mock()
    const initial: SubDocEntry[] = [
      { name: 'tasks', kind: 'file', children: [] },
    ]
    const { result } = renderHook(() =>
      useTicketDocumentRealtime({
        initialSubdocuments: initial,
        selectedPath: 'tasks',
        onActiveRemoved,
      }),
    )

    act(() => {
      result.current.handleSSEUpdate([])
    })

    expect(onActiveRemoved).toHaveBeenCalledTimes(1)
  })

  it('does not call onActiveRemoved when selected document remains in updated structure (BR-5.2)', () => {
    const onActiveRemoved = mock()
    const initial: SubDocEntry[] = [
      { name: 'requirements', kind: 'file', children: [] },
      { name: 'tasks', kind: 'file', children: [] },
    ]
    const { result } = renderHook(() =>
      useTicketDocumentRealtime({
        initialSubdocuments: initial,
        selectedPath: 'requirements',
        onActiveRemoved,
      }),
    )

    act(() => {
      result.current.handleSSEUpdate([{ name: 'requirements', kind: 'file', children: [] }])
    })

    expect(onActiveRemoved).not.toHaveBeenCalled()
  })

  // ─── Realtime unavailable (BR-5.4, C5) ───────────────────────────────────

  it('retains last known structure when no SSE update is received (BR-5.4, C5)', () => {
    const initial: SubDocEntry[] = [
      { name: 'requirements', kind: 'file', children: [] },
    ]
    const { result } = renderHook(() =>
      useTicketDocumentRealtime({
        initialSubdocuments: initial,
        selectedPath: 'main',
        onActiveRemoved: mock(),
      }),
    )

    // No act — simulate SSE never arriving
    expect(result.current.subdocuments.map((s: SubDocEntry) => s.name)).toContain('requirements')
  })

  it('does not block re-renders when SSE is unavailable (BR-5.4, C5)', () => {
    const initial: SubDocEntry[] = [{ name: 'tasks', kind: 'file', children: [] }]
    // Rendering without calling handleSSEUpdate must not throw
    expect(() => {
      renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'tasks',
          onActiveRemoved: mock(),
        }),
      )
    }).not.toThrow()
  })
})
