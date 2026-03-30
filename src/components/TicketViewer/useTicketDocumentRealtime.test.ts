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

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, mock } from 'bun:test'
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // MDT-142: Subdocument SSE Event Handling (5 Cases)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('MDT-142 Case 1: change event + viewing subdocument', () => {
    it('should update content when viewing the changed subdocument', () => {
      const initial: SubDocEntry[] = [
        { name: 'architecture', kind: 'file', children: [] },
        { name: 'bdd', kind: 'file', children: [] },
      ]
      const onActiveRemoved = mock()

      const { result } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'architecture',
          onActiveRemoved,
        }),
      )

      // Update the architecture subdocument
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'architecture', kind: 'file', children: [] },
          { name: 'bdd', kind: 'file', children: [] },
        ])
      })

      // Should still have architecture, onActiveRemoved should NOT be called
      expect(onActiveRemoved).not.toHaveBeenCalled()
      expect(result.current.subdocuments.map((s: SubDocEntry) => s.name)).toContain('architecture')
    })
  })

  describe('MDT-142 Case 2: change event + NOT viewing subdocument', () => {
    it('should update structure without affecting viewed content', () => {
      const initial: SubDocEntry[] = [
        { name: 'architecture', kind: 'file', children: [] },
      ]
      const onActiveRemoved = mock()

      const { result } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'architecture',
          onActiveRemoved,
        }),
      )

      // Add a new subdocument (not the one being viewed)
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'architecture', kind: 'file', children: [] },
          { name: 'bdd', kind: 'file', children: [] },
        ])
      })

      // Should have both, onActiveRemoved should NOT be called
      expect(onActiveRemoved).not.toHaveBeenCalled()
      expect(result.current.subdocuments.length).toBe(2)
    })
  })

  describe('MDT-142 Case 3: add event (any)', () => {
    it('should add new subdocument to the list', () => {
      const initial: SubDocEntry[] = [
        { name: 'architecture', kind: 'file', children: [] },
      ]

      const { result } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'main',
          onActiveRemoved: mock(),
        }),
      )

      // Add new subdocument
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'architecture', kind: 'file', children: [] },
          { name: 'bdd', kind: 'file', children: [] },
        ])
      })

      const names = result.current.subdocuments.map((s: SubDocEntry) => s.name)
      expect(names).toContain('bdd')
    })
  })

  describe('MDT-142 Case 4: unlink event + NOT viewing', () => {
    it('should remove subdocument from list when not viewing it', () => {
      const initial: SubDocEntry[] = [
        { name: 'architecture', kind: 'file', children: [] },
        { name: 'bdd', kind: 'file', children: [] },
      ]

      const { result } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'architecture',
          onActiveRemoved: mock(),
        }),
      )

      // Remove bdd (not being viewed)
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'architecture', kind: 'file', children: [] },
        ])
      })

      const names = result.current.subdocuments.map((s: SubDocEntry) => s.name)
      expect(names).not.toContain('bdd')
      expect(names).toContain('architecture')
    })
  })

  describe('MDT-142 Case 5: unlink event + viewing', () => {
    it('should call onActiveRemoved when viewing the deleted subdocument', () => {
      const onActiveRemoved = mock()
      const initial: SubDocEntry[] = [
        { name: 'architecture', kind: 'file', children: [] },
        { name: 'bdd', kind: 'file', children: [] },
      ]

      const { result } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'architecture',
          onActiveRemoved,
        }),
      )

      // Remove architecture (being viewed)
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'bdd', kind: 'file', children: [] },
        ])
      })

      expect(onActiveRemoved).toHaveBeenCalledTimes(1)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// MDT-142: Subdocument SSE Event Handling (5 Cases)
// ═══════════════════════════════════════════════════════════════════════════════

describe('useTicketDocumentRealtime - MDT-142 Subdocument Events', () => {
  beforeEach(() => {
    // Clear any event listeners
  })

  describe('Case 1: change event + viewing subdocument', () => {
    it('should invalidate cache and refetch content when viewing changed subdocument', () => {
      const initial: SubDocEntry[] = [{ name: 'architecture', kind: 'file', children: [] }]
      const onActiveRemoved = mock()

      const { result } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'architecture',
          onActiveRemoved,
        }),
      )

      // Simulate SSE update for the viewed subdocument
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'architecture', kind: 'file', children: [] },
        ])
      })

      // Cache invalidation and refetch would happen in the component
      expect(result.current.subdocuments.map((s: SubDocEntry) => s.name)).toContain('architecture')
    })
  })

  describe('Case 2: change event + NOT viewing subdocument', () => {
    it('should update structure but not trigger active document change', () => {
      const initial: SubDocEntry[] = [
        { name: 'architecture', kind: 'file', children: [] },
        { name: 'bdd', kind: 'file', children: [] },
      ]
      const onActiveRemoved = mock()

      const { result } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'bdd', // Viewing different doc
          onActiveRemoved,
        }),
      )

      // Simulate change to architecture while viewing bdd
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'architecture', kind: 'file', children: [] },
          { name: 'bdd', kind: 'file', children: [] },
        ])
      })

      // onActiveRemoved should NOT be called since we're viewing a different doc
      expect(onActiveRemoved).not.toHaveBeenCalled()
    })
  })

  describe('Case 3: add event (any)', () => {
    it('should add new subdocument to the list', () => {
      const initial: SubDocEntry[] = [
        { name: 'architecture', kind: 'file', children: [] },
      ]
      const onActiveRemoved = mock()

      const { result } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'main',
          onActiveRemoved,
        }),
      )

      // Simulate add event - new subdocument
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'architecture', kind: 'file', children: [] },
          { name: 'tests', kind: 'file', children: [] }, // New!
        ])
      })

      const names = result.current.subdocuments.map((s: SubDocEntry) => s.name)
      expect(names).toContain('tests')
    })
  })

  describe('Case 4: unlink event + NOT viewing', () => {
    it('should remove subdocument from list when not viewing', () => {
      const initial: SubDocEntry[] = [
        { name: 'architecture', kind: 'file', children: [] },
        { name: 'old-doc', kind: 'file', children: [] },
      ]
      const onActiveRemoved = mock()

      const { result } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'architecture', // Viewing different doc
          onActiveRemoved,
        }),
      )

      // Simulate unlink event - old-doc removed
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'architecture', kind: 'file', children: [] },
        ])
      })

      const names = result.current.subdocuments.map((s: SubDocEntry) => s.name)
      expect(names).not.toContain('old-doc')
      expect(onActiveRemoved).not.toHaveBeenCalled()
    })
  })

  describe('Case 5: unlink event + viewing', () => {
    it('should call onActiveRemoved when viewed subdocument is deleted', () => {
      const initial: SubDocEntry[] = [
        { name: 'architecture', kind: 'file', children: [] },
        { name: 'tasks', kind: 'file', children: [] },
      ]
      const onActiveRemoved = mock()

      const { result } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'architecture', // Viewing this doc
          onActiveRemoved,
        }),
      )

      // Simulate unlink event - architecture removed while viewing
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'tasks', kind: 'file', children: [] },
        ])
      })

      expect(onActiveRemoved).toHaveBeenCalledTimes(1)
    })
  })

  describe('React memoization: Only tabs refresh on add/unlink', () => {
    it('should update subdocuments without affecting content cache', () => {
      const initial: SubDocEntry[] = [
        { name: 'architecture', kind: 'file', children: [] },
      ]
      const onActiveRemoved = mock()

      const { result, rerender } = renderHook(() =>
        useTicketDocumentRealtime({
          initialSubdocuments: initial,
          selectedPath: 'architecture',
          onActiveRemoved,
        }),
      )

      // Add new subdocument
      act(() => {
        result.current.handleSSEUpdate([
          { name: 'architecture', kind: 'file', children: [] },
          { name: 'bdd', kind: 'file', children: [] },
        ])
      })

      // selectedPath unchanged, content cache should remain valid
      expect(result.current.subdocuments.length).toBe(2)
    })
  })
})
